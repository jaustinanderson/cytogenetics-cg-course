#!/usr/bin/env node
// Verifies that the *currently live* GitHub Pages deployment for this
// repository was built from a specific commit, before the deployed Playwright
// suite (npm run test:deployed) is trusted to say anything about that commit.
//
// Why this exists: GitHub Pages deployment is asynchronous relative to a push
// to `main`. Sleeping for a fixed period and assuming the deploy finished is
// not reliable — deploy time varies, and a fixed sleep can neither detect a
// deploy that is still in progress nor one that failed outright.
//
// SCOPE — read this before trusting the output:
// This script combines two genuinely different checks, and each proves a
// different, narrower thing than "the live URL is definitely serving exactly
// this commit":
//
//   1. The GitHub REST "deployments" API for the `github-pages` environment
//      records the exact commit SHA each Pages deployment was built from and
//      its resulting state. A match here proves GitHub registered a
//      successful build FOR THIS SHA. It does NOT by itself prove that the
//      bytes currently returned by DEPLOYED_BASE_URL right now are those
//      bytes — CDN caching, propagation delay, or a custom domain pointed
//      elsewhere could all make the API record and the live response
//      disagree.
//   2. A cache-busted, no-cache fetch of DEPLOYED_BASE_URL's index.html,
//      hashed with SHA-256 and compared byte-for-byte against the checked-out
//      index.html. A match here proves the LIVE ARTIFACT'S BYTES are
//      currently identical to the checked-out file. It does NOT by itself
//      prove which commit produced those bytes — if index.html is
//      byte-identical across multiple commits (as it is across every commit
//      in the branch that introduced this script), a hash match cannot
//      distinguish between them on its own.
//
// Only when BOTH agree — the deployment record names the target commit with
// state "success", AND the live hash matches the checked-out file — does this
// script report success, and even then the two checks are complementary
// evidence, not a single logical proof reducible to either one alone. Neither
// check is described here as independently establishing "the currently
// served commit."
//
// This requires network access to api.github.com (a GITHUB_TOKEN raises the
// unauthenticated 60-requests/hour rate limit but is not required for a
// public repository) and to DEPLOYED_BASE_URL itself.
//
// URL/repo binding: DEPLOYED_BASE_URL, GITHUB_REPOSITORY, and TARGET_SHA must
// describe the SAME deployment for this script's result to mean anything.
// Overriding DEPLOYED_BASE_URL alone (e.g. to a fork's Pages URL) without also
// setting GITHUB_REPOSITORY/TARGET_SHA to match leaves the deployment-record
// check verifying an unrelated repository while the hash check runs against
// whatever DEPLOYED_BASE_URL actually serves; this script warns loudly when
// DEPLOYED_BASE_URL doesn't match the canonical Pages URL derived from
// GITHUB_REPOSITORY. A custom domain/CNAME for the SAME repository is a
// legitimate reason for that mismatch and is not itself an error — a
// different fork or repository is.
//
// Usage:
//   node scripts/verify-deployed-revision.mjs
// Env vars:
//   TARGET_SHA        commit to expect deployed (default: `git rev-parse HEAD`)
//   GITHUB_REPOSITORY "owner/repo" (default: jaustinanderson/cytogenetics-cg-course)
//   DEPLOYED_BASE_URL the exact URL Playwright's deployed suite will target
//                     (default: https://jaustinanderson.github.io/cytogenetics-cg-course/) —
//                     pass the same value used for `npm run test:deployed`
//   GITHUB_TOKEN       optional bearer token for higher API rate limits
//   POLL_ATTEMPTS      max poll attempts (default: 20)
//   POLL_INTERVAL_MS   delay between attempts (default: 15000)

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_INDEX_PATH = path.join(__dirname, "..", "index.html");
const DEFAULT_REPO = "jaustinanderson/cytogenetics-cg-course";
const DEFAULT_DEPLOYED_URL = "https://jaustinanderson.github.io/cytogenetics-cg-course/";

export const REPO = process.env.GITHUB_REPOSITORY || DEFAULT_REPO;
export const DEPLOYED_BASE_URL = process.env.DEPLOYED_BASE_URL || DEFAULT_DEPLOYED_URL;
const TARGET_SHA = process.env.TARGET_SHA || execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
const POLL_ATTEMPTS = Number(process.env.POLL_ATTEMPTS || 20);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15_000);

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

// Derives the canonical GitHub Pages URL for a project site from "owner/repo",
// used only for the same-target sanity warning described above.
export function canonicalPagesUrl(repoSlug) {
  const [owner, name] = repoSlug.split("/");
  return `https://${owner}.github.io/${name}/`;
}

function authHeaders() {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "cytogenetics-cg-course-ci" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function latestPagesDeployment(repo) {
  const url = `https://api.github.com/repos/${repo}/deployments?environment=github-pages&per_page=1`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status} ${res.statusText} for ${url}`);
  }
  const deployments = await res.json();
  return deployments[0] || null;
}

async function latestDeploymentState(repo, deploymentId) {
  const url = `https://api.github.com/repos/${repo}/deployments/${deploymentId}/statuses?per_page=1`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status} ${res.statusText} for ${url}`);
  }
  const statuses = await res.json();
  return statuses[0]?.state || null;
}

// Fetches a URL with a cache-busting query parameter and no-cache request
// headers, so a CDN in front of the origin (GitHub Pages sits behind Fastly)
// serves a fresh response instead of a previously cached one keyed on the
// unmodified URL. Returns the raw response body as a Buffer — the caller
// hashes it, never assuming a 200 status alone means the expected bytes.
export async function fetchLive(url) {
  const target = new URL(url);
  target.searchParams.set("_cb", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const res = await fetch(target, { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } });
  if (!res.ok) {
    throw new Error(`fetching ${target} returned ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function verify({
  repo = REPO,
  deployedBaseUrl = DEPLOYED_BASE_URL,
  targetSha = TARGET_SHA,
  pollAttempts = POLL_ATTEMPTS,
  pollIntervalMs = POLL_INTERVAL_MS,
  localIndexPath = LOCAL_INDEX_PATH,
  log = console.log,
  warn = console.error,
} = {}) {
  const localHash = sha256(readFileSync(localIndexPath));

  const expectedUrl = canonicalPagesUrl(repo);
  if (new URL(deployedBaseUrl).href !== new URL(expectedUrl).href) {
    warn(
      `WARNING: DEPLOYED_BASE_URL (${deployedBaseUrl}) does not match the canonical GitHub Pages URL derived ` +
        `from GITHUB_REPOSITORY (${expectedUrl}). The deployment record checked below belongs to ${repo} only — ` +
        "it does not verify that DEPLOYED_BASE_URL is actually served by that repository. If this is a custom " +
        "domain/CNAME for the SAME repository, that's expected and the hash check below still applies to it " +
        "correctly. If it points at a different fork or repository, set GITHUB_REPOSITORY and TARGET_SHA to " +
        "match that repository/commit too, or this result proves nothing about what DEPLOYED_BASE_URL serves.",
    );
  }

  log(
    `Verifying the live github-pages deployment for ${repo} matches commit ${targetSha}, and that ` +
      `${deployedBaseUrl} currently serves byte-identical content (sha256 ${localHash}) to the checked-out ` +
      "index.html...",
  );

  let lastSeen = null;
  let lastHashResult = null;

  for (let attempt = 1; attempt <= pollAttempts; attempt += 1) {
    try {
      const deployment = await latestPagesDeployment(repo);

      if (!deployment) {
        log(`Attempt ${attempt}/${pollAttempts}: no github-pages deployments recorded yet for ${repo}.`);
      } else {
        lastSeen = deployment;
        const state = await latestDeploymentState(repo, deployment.id);
        const recordMatches = deployment.sha === targetSha && state === "success";
        log(
          `Attempt ${attempt}/${pollAttempts}: latest deployment record is ${deployment.sha} ` +
            `(ref ${deployment.ref}, state ${state})${recordMatches ? " — matches target" : ""}.`,
        );

        if (recordMatches) {
          const liveBuffer = await fetchLive(deployedBaseUrl);
          const liveHash = sha256(liveBuffer);
          const hashMatches = liveHash === localHash;
          lastHashResult = { liveHash, hashMatches };
          log(
            `Attempt ${attempt}/${pollAttempts}: live index.html sha256 is ${liveHash} ` +
              `(local is ${localHash}) — ${hashMatches ? "MATCH" : "MISMATCH"}.`,
          );

          if (hashMatches) {
            log(
              `Verified: github-pages deployment ${deployment.id} records commit ${targetSha} with state ` +
                `"success", AND ${deployedBaseUrl} currently serves byte-identical content (sha256 ${liveHash}). ` +
                "Scope: the deployment record proves GitHub registered a successful build for this exact " +
                "commit; the hash proves the live artifact's current bytes match the checked-out file for that " +
                "commit. Together they are strong, complementary evidence the deployment matches this commit — " +
                "not an independent proof of it from either check alone, and not a guarantee for any other " +
                "commit whose index.html happens to hash identically.",
            );
            return { ok: true, deployment, liveHash, localHash };
          }
        }
      }
    } catch (error) {
      warn(`Attempt ${attempt}/${pollAttempts}: transient error (${error.message}); will retry.`);
    }

    if (attempt < pollAttempts) await sleep(pollIntervalMs);
  }

  warn(
    `Timed out after ${pollAttempts} attempts (~${Math.round((pollAttempts * pollIntervalMs) / 1000)}s). ` +
      `Target commit ${targetSha} was never observed as a github-pages deployment record with a matching live ` +
      `index.html hash; the most recent deployment record seen was ${lastSeen?.sha ?? "none"}` +
      (lastHashResult ? `, whose live hash was ${lastHashResult.hashMatches ? "a match" : "a mismatch"}` : "") +
      ". Refusing to assume the deployment completed.",
  );
  return { ok: false, deployment: lastSeen, hashResult: lastHashResult };
}

async function main() {
  const result = await verify();
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
