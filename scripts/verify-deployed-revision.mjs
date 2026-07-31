#!/usr/bin/env node
// Verifies that the *currently live* GitHub Pages deployment for this
// repository was built from a specific commit, before the deployed Playwright
// suite (npm run test:deployed) is trusted to say anything about that commit.
//
// Why this exists: GitHub Pages deployment is asynchronous relative to a push
// to `main`. Sleeping for a fixed period and assuming the deploy finished is
// not reliable — deploy time varies, and a fixed sleep can neither detect a
// deploy that is still in progress nor one that failed outright. Instead,
// this polls the GitHub REST "deployments" API for the `github-pages`
// environment, which records the exact commit SHA each deployment was built
// from and its resulting state, and waits (bounded, not indefinitely) until
// the most recent successful deployment's SHA matches the target commit.
//
// This is a real, checkable fact about GitHub's own deployment record — not
// an assumption. It cannot detect a deploy that GitHub silently never
// registers, and it requires network access to api.github.com (a
// GITHUB_TOKEN raises the unauthenticated 60-requests/hour rate limit but is
// not required for a public repository).
//
// Usage:
//   node scripts/verify-deployed-revision.mjs
// Env vars:
//   TARGET_SHA        commit to expect deployed (default: `git rev-parse HEAD`)
//   GITHUB_REPOSITORY "owner/repo" (default: jaustinanderson/cytogenetics-cg-course)
//   GITHUB_TOKEN       optional bearer token for higher API rate limits
//   POLL_ATTEMPTS      max poll attempts (default: 20)
//   POLL_INTERVAL_MS   delay between attempts (default: 15000)

import { execFileSync } from "node:child_process";

const REPO = process.env.GITHUB_REPOSITORY || "jaustinanderson/cytogenetics-cg-course";
const TARGET_SHA = process.env.TARGET_SHA || execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
const POLL_ATTEMPTS = Number(process.env.POLL_ATTEMPTS || 20);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15_000);

function authHeaders() {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "cytogenetics-cg-course-ci" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function latestPagesDeployment() {
  const url = `https://api.github.com/repos/${REPO}/deployments?environment=github-pages&per_page=1`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status} ${res.statusText} for ${url}`);
  }
  const deployments = await res.json();
  return deployments[0] || null;
}

async function latestDeploymentState(deploymentId) {
  const url = `https://api.github.com/repos/${REPO}/deployments/${deploymentId}/statuses?per_page=1`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status} ${res.statusText} for ${url}`);
  }
  const statuses = await res.json();
  return statuses[0]?.state || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Verifying the live github-pages deployment for ${REPO} matches commit ${TARGET_SHA}...`);

  let lastSeen = null;
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt += 1) {
    let deployment;
    try {
      deployment = await latestPagesDeployment();
    } catch (error) {
      console.error(
        `Attempt ${attempt}/${POLL_ATTEMPTS}: could not reach the GitHub deployments API (${error.message}). ` +
          "This method cannot verify the deployed revision without network access to api.github.com.",
      );
      if (attempt === POLL_ATTEMPTS) {
        process.exitCode = 1;
        return;
      }
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (!deployment) {
      console.error(`No github-pages deployments were found at all for ${REPO}.`);
      process.exitCode = 1;
      return;
    }

    lastSeen = deployment;
    const state = await latestDeploymentState(deployment.id);

    console.log(
      `Attempt ${attempt}/${POLL_ATTEMPTS}: latest github-pages deployment is ${deployment.sha} ` +
        `(ref ${deployment.ref}, state ${state}).`,
    );

    if (deployment.sha === TARGET_SHA && state === "success") {
      console.log(
        `Verified: github-pages deployment ${deployment.id} built commit ${TARGET_SHA} and reports state "success".`,
      );
      return;
    }

    if (attempt < POLL_ATTEMPTS) await sleep(POLL_INTERVAL_MS);
  }

  console.error(
    `Timed out after ${POLL_ATTEMPTS} attempts (~${Math.round(
      (POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000,
    )}s). Target commit ${TARGET_SHA} was never observed as the latest successful github-pages ` +
      `deployment; the most recent one seen was ${lastSeen?.sha ?? "none"}. Refusing to assume the ` +
      "deployment completed.",
  );
  process.exitCode = 1;
}

main();
