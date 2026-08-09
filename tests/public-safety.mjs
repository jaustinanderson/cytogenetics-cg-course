/**
 * Regression suite for scripts/check_public_safety.py, this repository's
 * dependency-free public-repository privacy/secret guard (Issue: public
 * safety hardening, PR #27).
 *
 * Every scenario below runs the REAL scanner script (never a
 * reimplementation) against an isolated, ephemeral git fixture repository
 * created fresh per test -- never against this repository's own tracked
 * tree, except for the one dedicated "real tree" check at the end. Each
 * fixture repo gets its own copy of the scanner so the script's own
 * `Path(__file__).resolve().parents[1]` root-detection resolves to the
 * fixture, not this project, keeping every test fully self-contained.
 *
 * Every sensitive-looking value used below (a fake key, token, personal
 * email, or credential) is assembled at runtime from fragments/generated
 * characters -- never written as a single contiguous matching literal in
 * this source file. This file is itself part of the tracked tree the
 * scanner scans, so if a fixture value were embedded literally here, the
 * "the real repository tree passes the scan" check below would catch it.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(here, "..");
const SCANNER_SOURCE = path.join(REPO_ROOT, "scripts", "check_public_safety.py");

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`✗ ${name}`);
    failures.push({ name, error });
  }
}

// ---------------------------------------------------------------------------
// Fixture-repo harness
// ---------------------------------------------------------------------------

const scratchDirs = [];

function makeFixtureRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), "public-safety-fixture-"));
  scratchDirs.push(dir);
  mkdirSync(path.join(dir, "scripts"), { recursive: true });
  copyFileSync(SCANNER_SOURCE, path.join(dir, "scripts", "check_public_safety.py"));
  git(dir, ["init", "--quiet", "-b", "main"]);
  git(dir, ["config", "user.name", "Fixture Author"]);
  git(dir, ["config", "user.email", "fixture-author@example.invalid"]);
  return dir;
}

function git(dir, args, opts = {}) {
  return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", ...opts });
}

function writeTrackedFile(dir, relativePath, content) {
  const full = path.join(dir, relativePath);
  mkdirSync(path.dirname(full), { recursive: true });
  if (Buffer.isBuffer(content)) writeFileSync(full, content);
  else writeFileSync(full, content, "utf8");
}

function commit(dir, message, identity = {}) {
  git(dir, ["add", "-A"]);
  const env = { ...process.env };
  if (identity.authorName) env.GIT_AUTHOR_NAME = identity.authorName;
  if (identity.authorEmail) env.GIT_AUTHOR_EMAIL = identity.authorEmail;
  if (identity.committerName) env.GIT_COMMITTER_NAME = identity.committerName;
  if (identity.committerEmail) env.GIT_COMMITTER_EMAIL = identity.committerEmail;
  git(dir, ["commit", "--quiet", "--allow-empty", "-m", message], { env });
  return git(dir, ["rev-parse", "HEAD"]).trim();
}

function runScanner(dir, args = []) {
  try {
    const stdout = execFileSync(
      "python3",
      [path.join(dir, "scripts", "check_public_safety.py"), ...args],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      code: typeof error.status === "number" ? error.status : 1,
      stdout: error.stdout ? error.stdout.toString() : "",
      stderr: error.stderr ? error.stderr.toString() : "",
    };
  }
}

function cleanupFixtures() {
  for (const dir of scratchDirs) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

// ---------------------------------------------------------------------------
// Runtime-constructed sensitive-looking fixtures (never literal in this
// tracked source -- see the file-level comment above).
// ---------------------------------------------------------------------------

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function pseudoRandom(length, seed) {
  let out = "";
  let x = seed;
  for (let i = 0; i < length; i += 1) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out += ALPHABET[x % ALPHABET.length];
  }
  return out;
}

const fake = {
  privateKeyHeader: () => ["-----BEGIN ", "RSA", " PRIVATE", " KEY", "-----"].join(""),
  githubToken: () => ["gh", "p", "_"].join("") + pseudoRandom(36, 7),
  awsAccessKey: () => "AKIA" + pseudoRandom(16, 11).toUpperCase(),
  googleApiKey: () => "AIza" + pseudoRandom(35, 13),
  openAiKey: () => ["sk", "-", "proj-"].join("") + pseudoRandom(24, 17),
  slackToken: () => ["xox", "b", "-"].join("") + pseudoRandom(24, 19),
  stripeLiveKey: () => ["sk", "_live_"].join("") + pseudoRandom(20, 23),
  credentialedUrl: () => {
    // Built via explicit concatenation, not a compact template literal --
    // a `${user}:${pw}@`-shaped template literal is itself a contiguous
    // "user:pass@" pattern in the SOURCE text (the regex is
    // syntax-unaware), which would trip the very rule this fixture tests
    // when this file is itself scanned as tracked text.
    const user = ["u", "ser"].join("");
    const pw = ["pa", "ss"].join("") + pseudoRandom(6, 29);
    return "https://" + user + ":" + pw + "@example.invalid/path";
  },
  personalEmail: (domain = "gmail.com") => {
    const local = ["personal", ".", "example", pseudoRandom(4, 31)].join("");
    return `${local}@${domain}`;
  },
  assignmentSecretValue: () => pseudoRandom(16, 37),
};

// ---------------------------------------------------------------------------
// 1-3. Personal email in tracked text, and in newly introduced author /
//      committer commit metadata.
// ---------------------------------------------------------------------------

test("a personal consumer-email address in tracked text is rejected", () => {
  const dir = makeFixtureRepo();
  const email = fake.personalEmail("gmail.com");
  writeTrackedFile(dir, "notes.txt", `contact: ${email}\n`);
  commit(dir, "add notes");
  const result = runScanner(dir);
  assert.notEqual(result.code, 0);
  assert.ok(result.stderr.includes("personal-email"), "must name the personal-email rule");
  assert.ok(!result.stderr.includes(email), "must not print the matched address");
});

test("a personal consumer-email address in newly introduced AUTHOR metadata is rejected", () => {
  const dir = makeFixtureRepo();
  const base = commit(dir, "base");
  const email = fake.personalEmail("yahoo.com");
  writeTrackedFile(dir, "change.txt", "content\n");
  const head = commit(dir, "change", { authorEmail: email, authorName: "Someone" });
  const result = runScanner(dir, ["--commit-range", `${base}..${head}`]);
  assert.notEqual(result.code, 0);
  assert.ok(result.stderr.includes("personal-author-email"), "must name the personal-author-email rule");
  assert.ok(!result.stderr.includes(email), "must not print the matched address");
});

test("a personal consumer-email address in newly introduced COMMITTER metadata is rejected", () => {
  const dir = makeFixtureRepo();
  const base = commit(dir, "base");
  const email = fake.personalEmail("outlook.com");
  writeTrackedFile(dir, "change2.txt", "content\n");
  const head = commit(dir, "change", { committerEmail: email, committerName: "Someone" });
  const result = runScanner(dir, ["--commit-range", `${base}..${head}`]);
  assert.notEqual(result.code, 0);
  assert.ok(result.stderr.includes("personal-committer-email"), "must name the personal-committer-email rule");
  assert.ok(!result.stderr.includes(email), "must not print the matched address");
});

// ---------------------------------------------------------------------------
// 4-5. GitHub ID-based noreply addresses accepted; automation/co-author
//      noreply addresses not misclassified as personal.
// ---------------------------------------------------------------------------

test("a GitHub ID-based noreply address in commit metadata is accepted, not rejected", () => {
  const dir = makeFixtureRepo();
  const base = commit(dir, "base");
  writeTrackedFile(dir, "change3.txt", "content\n");
  const noreply = "12345678+octocat@users.noreply.github.com";
  const head = commit(dir, "change", { authorEmail: noreply, committerEmail: noreply, authorName: "octocat", committerName: "octocat" });
  const result = runScanner(dir, ["--commit-range", `${base}..${head}`]);
  assert.equal(result.code, 0, `expected a clean pass for a noreply address, got: ${result.stderr}`);
});

test("expected automation/co-author noreply addresses (GitHub Actions bot, AI co-author trailer email) are not misclassified as personal", () => {
  const dir = makeFixtureRepo();
  const base = commit(dir, "base");
  writeTrackedFile(dir, "change4.txt", "content\n");
  const botEmail = "41898282+github-actions[bot]@users.noreply.github.com";
  const head = commit(dir, "automated change\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>", {
    authorEmail: botEmail,
    authorName: "github-actions[bot]",
    committerEmail: botEmail,
    committerName: "github-actions[bot]",
  });
  const result = runScanner(dir, ["--commit-range", `${base}..${head}`]);
  assert.equal(result.code, 0, `expected a clean pass for bot/co-author noreply addresses, got: ${result.stderr}`);

  // The Co-Authored-By trailer's noreply@anthropic.com address, present in
  // the commit MESSAGE (tracked text, not just metadata), must not be
  // misclassified as a personal address either -- confirmed by the same
  // clean exit above (the commit message is not scanned as tracked text by
  // this scanner, only files are; this assertion documents that scope).
  assert.ok(!/noreply@anthropic\.com/.test(result.stderr));
});

// ---------------------------------------------------------------------------
// 6-7. Representative secret patterns are rejected; findings name the rule
//      and location without printing the matched value.
// ---------------------------------------------------------------------------

function secretFixture(rule, build) {
  const value = build();
  return { rule, value, firstLine: value.split("\n")[0] };
}

const secretFixtures = [
  secretFixture("private-key", () => `${fake.privateKeyHeader()}\nMIIBogIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----`),
  secretFixture("github-token", () => `token: ${fake.githubToken()}`),
  secretFixture("aws-access-key", () => `aws_key=${fake.awsAccessKey()}`),
  secretFixture("google-api-key", () => `key: ${fake.googleApiKey()}`),
  secretFixture("openai-api-key", () => `OPENAI_API_KEY=${fake.openAiKey()}`),
  secretFixture("slack-token", () => `slack: ${fake.slackToken()}`),
  secretFixture("stripe-live-key", () => `stripe: ${fake.stripeLiveKey()}`),
  secretFixture("credentialed-url", () => `source: ${fake.credentialedUrl()}`),
];

for (const fixture of secretFixtures) {
  test(`representative ${fixture.rule} pattern is rejected, and the finding names the rule/location without printing the matched value`, () => {
    const dir = makeFixtureRepo();
    writeTrackedFile(dir, "config.txt", `${fixture.value}\n`);
    commit(dir, "add config");
    const result = runScanner(dir);
    assert.notEqual(result.code, 0, `expected ${fixture.rule} to be rejected`);
    assert.ok(result.stderr.includes(fixture.rule), `expected the ${fixture.rule} rule name in the findings, got: ${result.stderr}`);
    assert.ok(result.stderr.includes("config.txt:1:"), "expected the file:line location in the findings");
    assert.ok(!result.stderr.includes(fixture.firstLine), `must not print the matched ${fixture.rule} value`);
  });
}

test("a credential-assignment pattern (password = <non-placeholder value>) is rejected", () => {
  const dir = makeFixtureRepo();
  const value = fake.assignmentSecretValue();
  writeTrackedFile(dir, "settings.txt", `password = "${value}"\n`);
  commit(dir, "add settings");
  const result = runScanner(dir);
  assert.notEqual(result.code, 0);
  assert.ok(result.stderr.includes("credential-assignment"));
  assert.ok(!result.stderr.includes(value), "must not print the matched credential value");
});

// ---------------------------------------------------------------------------
// 8-9. IP-address policy: loopback/unspecified/RFC-documentation ranges
//      allowed; a reportable non-documentation address rejected.
// ---------------------------------------------------------------------------

test("loopback, unspecified, and RFC 5737 documentation IP ranges remain allowed", () => {
  const dir = makeFixtureRepo();
  const allowed = ["127.0.0.1", "0.0.0.0", "192.0.2.5", "198.51.100.7", "203.0.113.9"];
  writeTrackedFile(dir, "hosts.txt", allowed.map((ip) => `host: ${ip}`).join("\n") + "\n");
  commit(dir, "add hosts");
  const result = runScanner(dir);
  assert.equal(result.code, 0, `expected loopback/unspecified/documentation IPs to pass, got: ${result.stderr}`);
});

// Reportable IPs are built from octet arrays, not literal dotted-quad
// text -- a reportable address written directly in this SOURCE file,
// even inside a comment or string literal, would itself trip the
// ip-address rule when this tracked file is scanned (the scanner is
// syntax-unaware; it matches the literal text wherever it appears).
function ipFromOctets(...octets) {
  return octets.join(".");
}

test("a reportable non-documentation IP address is rejected", () => {
  const dir = makeFixtureRepo();
  // A well-known PUBLIC infrastructure address (Google Public DNS), not a
  // personal or private address -- outside every allowed range
  // (loopback/unspecified/RFC 5737 documentation).
  const ip = ipFromOctets(8, 8, 8, 8);
  writeTrackedFile(dir, "hosts2.txt", `resolver: ${ip}\n`);
  commit(dir, "add hosts2");
  const result = runScanner(dir);
  assert.notEqual(result.code, 0);
  assert.ok(result.stderr.includes("ip-address"));
});

test("an address one integer past the documented RFC 5737 TEST-NET-3 upper boundary is rejected, proving the exclusion is scoped to the exact documented ranges", () => {
  const dir = makeFixtureRepo();
  const ip = ipFromOctets(203, 0, 114, 1); // one past 203.0.113.0/24
  writeTrackedFile(dir, "hosts3.txt", `resolver: ${ip}\n`);
  commit(dir, "add hosts3");
  const result = runScanner(dir);
  assert.notEqual(result.code, 0);
  assert.ok(result.stderr.includes("ip-address"));
});

// ---------------------------------------------------------------------------
// 10-11. Obvious placeholders allowed; the explicit allow-marker works
//        only as documented (same line only).
// ---------------------------------------------------------------------------

test("an obvious placeholder credential-assignment value is allowed", () => {
  const dir = makeFixtureRepo();
  writeTrackedFile(dir, "settings2.txt", 'api_key = "changeme"\n');
  commit(dir, "add settings2");
  const result = runScanner(dir);
  assert.equal(result.code, 0, `expected an obvious placeholder to pass, got: ${result.stderr}`);
});

test("the 'public-safety: allow' marker suppresses a finding only on the SAME line it appears on", () => {
  const dir = makeFixtureRepo();
  const value = fake.assignmentSecretValue();
  writeTrackedFile(dir, "settings3.txt", `password = "${value}"  # public-safety: allow\n`);
  commit(dir, "add settings3");
  const result = runScanner(dir);
  assert.equal(result.code, 0, `expected the same-line marker to suppress the finding, got: ${result.stderr}`);
});

test("the 'public-safety: allow' marker does NOT suppress a finding when placed on a different line", () => {
  const dir = makeFixtureRepo();
  const value = fake.assignmentSecretValue();
  writeTrackedFile(dir, "settings4.txt", `# public-safety: allow\npassword = "${value}"\n`);
  commit(dir, "add settings4");
  const result = runScanner(dir);
  assert.notEqual(result.code, 0, "a marker on a different line must not suppress the finding");
  assert.ok(result.stderr.includes("credential-assignment"));
});

// ---------------------------------------------------------------------------
// 12. Binary, non-UTF-8, and oversized files follow the documented policy.
// ---------------------------------------------------------------------------

test("a binary file (contains a NUL byte) with an embedded secret-shaped value is skipped, not flagged", () => {
  const dir = makeFixtureRepo();
  const email = fake.personalEmail("gmail.com");
  const buf = Buffer.concat([Buffer.from("prefix "), Buffer.from([0x00]), Buffer.from(` ${email}`)]);
  writeTrackedFile(dir, "asset.bin", buf);
  commit(dir, "add binary asset");
  const result = runScanner(dir);
  assert.equal(result.code, 0, `expected a binary file to be skipped, got: ${result.stderr}`);
});

test("a non-UTF-8 file (no NUL byte, invalid UTF-8 sequence) with an embedded secret-shaped value is skipped, not flagged", () => {
  const dir = makeFixtureRepo();
  const email = fake.personalEmail("gmail.com");
  const buf = Buffer.concat([Buffer.from("prefix "), Buffer.from([0xff, 0xfe]), Buffer.from(` ${email}`)]);
  writeTrackedFile(dir, "legacy.dat", buf);
  commit(dir, "add non-utf8 file");
  const result = runScanner(dir);
  assert.equal(result.code, 0, `expected a non-UTF-8 file to be skipped, got: ${result.stderr}`);
});

test("a deliberately oversized file (over the documented size limit) with an embedded secret-shaped value is skipped, not flagged", () => {
  const dir = makeFixtureRepo();
  const email = fake.personalEmail("gmail.com");
  const oversized = Buffer.concat([Buffer.alloc(5 * 1024 * 1024 + 1024, 0x41), Buffer.from(` ${email}\n`)]);
  writeTrackedFile(dir, "huge.txt", oversized);
  commit(dir, "add oversized file");
  const result = runScanner(dir);
  assert.equal(result.code, 0, `expected an oversized file to be skipped, got: ${result.stderr}`);
});

// ---------------------------------------------------------------------------
// 13. A malformed/invalid requested commit range fails nonzero, not a
//     silent success.
// ---------------------------------------------------------------------------

test("a malformed or invalid requested commit range fails nonzero rather than silently reporting success", () => {
  const dir = makeFixtureRepo();
  commit(dir, "base");
  const result = runScanner(dir, ["--commit-range", "not-a-real-range..also-not-real"]);
  assert.notEqual(result.code, 0, "a malformed commit range must not exit zero");
  assert.ok(!result.stdout.includes("passed"), "must not print a success message for a malformed range");
});

// ---------------------------------------------------------------------------
// 14. The real repository tree passes the scan (also the empirical proof
//     for point 15: no sensitive-looking fixture value in THIS file, or
//     any other tracked file, is a literal match -- if one were, this
//     check would fail).
// ---------------------------------------------------------------------------

test("the real repository's tracked tree passes the public-safety scan", () => {
  const result = runScannerAgainstRealRepo();
  assert.equal(result.code, 0, `expected the real repository tree to pass, got: ${result.stderr || result.stdout}`);
  assert.ok(result.stdout.includes("passed"));
});

function runScannerAgainstRealRepo() {
  try {
    const stdout = execFileSync("python3", [SCANNER_SOURCE], { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      code: typeof error.status === "number" ? error.status : 1,
      stdout: error.stdout ? error.stdout.toString() : "",
      stderr: error.stderr ? error.stderr.toString() : "",
    };
  }
}

cleanupFixtures();

console.log(`\n${passed} public-safety scanner checks passed.`);
if (failures.length) {
  console.error(`\n${failures.length} public-safety scanner check(s) FAILED:`);
  for (const failure of failures) {
    console.error(`\n--- ${failure.name} ---`);
    console.error(failure.error);
  }
  process.exit(1);
}
