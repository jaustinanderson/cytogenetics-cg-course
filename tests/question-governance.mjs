/**
 * Question provenance & scientific-review governance tests (Issue #3 /
 * Milestone 1, docs/CONTENT_GOVERNANCE.md, docs/SCIENTIFIC_REVIEW.md).
 *
 * Covers the QUESTION_GOVERNANCE registry, its load-time integrity gate
 * (assertGovernanceRegistryIntegrity() in index.html), and the public
 * window.CytoCourse.getQuestionGovernance() read method. Runs on stock
 * Node with no dependencies, same technique as tests/validate-course.mjs
 * and tests/dom-behavior.mjs: the real inline <script> from index.html is
 * extracted and executed inside an isolated `vm` sandbox.
 *
 * Several tests below PATCH a single QUESTION_GOVERNANCE entry's source
 * text (replacing `"id": DRAFT_GOVERNANCE_RECORD()` with a literal JSON
 * object) before running the patched script in a fresh sandbox. This is
 * the only way to fixture-test isValidGovernanceRecord() and the
 * lifecycle-prerequisite gate: they are internal to the inline script's
 * IIFE and deliberately not exposed on the public, read-only
 * window.CytoCourse API (there is no public write method for governance
 * data by design -- see index.html's own comment on QUESTION_GOVERNANCE).
 * A malformed or self-contradictory patched record is expected to make
 * the script THROW at load time (assertGovernanceRegistryIntegrity()),
 * exactly like a real bad hand-edit to the committed table would.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createEnvironment } from "./dom-harness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const inlineScript = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim())[0];

const staticBody = html
  .replace(/[\s\S]*?<body[^>]*>/i, "")
  .replace(/<script[\s\S]*$/i, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "");

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

/** Run a script string in a fresh, fully-stubbed DOM environment. Never throws -- returns {ok, api|error}. */
function bootScript(scriptSource) {
  const env = createEnvironment(staticBody, {});
  vm.createContext(env.sandbox);
  try {
    vm.runInContext(scriptSource, env.sandbox, { filename: "index.inline.js", timeout: 5_000 });
    if (env.ready) env.ready();
    return { ok: true, api: env.sandbox.window.CytoCourse };
  } catch (error) {
    return { ok: false, error };
  }
}

function boot() {
  const result = bootScript(inlineScript);
  assert.equal(result.ok, true, `baseline script failed to load: ${result.error}`);
  return result.api;
}

/** Replace one QUESTION_GOVERNANCE entry's source text with a literal record. */
function patchGovernanceRecord(id, record) {
  const target = `"${id}": DRAFT_GOVERNANCE_RECORD()`;
  assert.ok(inlineScript.includes(target), `patch target not found for id "${id}" -- has the source layout changed?`);
  const replacement = `"${id}": ${JSON.stringify(record)}`;
  return inlineScript.replace(target, replacement);
}

function bootWithPatchedRecord(id, record) {
  return bootScript(patchGovernanceRecord(id, record));
}

const baselineApi = boot();
const authoredIds = Object.values(baselineApi.getQuestions()).flat().map((q) => q.id);
const GOVERNANCE_RECORD_KEYS = [
  "id", "lifecycle", "drafter", "sources", "sourceCheckedBy", "sourceCheckedDate",
  "reviewer", "reviewDate", "reviewScope",
  "independentReviewDocumented", "independentReviewer", "independentReviewDate",
  "editionSensitive", "notes", "blockers",
];
const ALL_BLOCKERS = [
  "missing-drafter", "missing-sources", "missing-source-check",
  "missing-reviewer", "missing-review-date", "missing-review-scope",
  "unresolved-edition-sensitivity",
];

/* ============================ registry completeness (validation requirement 1) ============================ */

test("the governance registry's exact key set equals all 153 authored question ids -- no missing, no stale, no duplicate", () => {
  const all = baselineApi.getQuestionGovernance();
  const registryIds = Object.keys(all);
  assert.equal(authoredIds.length, 153);
  assert.equal(new Set(authoredIds).size, 153, "authored ids must be unique (duplicate-id impossibility check on the source data itself)");
  assert.equal(registryIds.length, 153);
  assert.deepEqual(registryIds.sort(), [...authoredIds].sort());
});

/* ============================ per-record structural validation (validation requirement 2) ============================ */

test("every governance record has the exact documented own-property shape and allowed types", () => {
  const all = baselineApi.getQuestionGovernance();
  for (const id of authoredIds) {
    const rec = all[id];
    assert.deepEqual(Object.keys(rec).sort(), [...GOVERNANCE_RECORD_KEYS].sort(), `${id}: unexpected key set`);
    assert.equal(rec.id, id);
    assert.equal(typeof rec.lifecycle, "string");
    assert.ok(["draft", "source-checked", "sme-reviewed", "release-qualified"].includes(rec.lifecycle), `${id}: invalid lifecycle enum value "${rec.lifecycle}"`);
    assert.ok(rec.drafter === null || (typeof rec.drafter === "string" && rec.drafter.trim()), `${id}: drafter must be null or a non-empty string`);
    assert.ok(Array.isArray(rec.sources), `${id}: sources must be an array`);
    for (const s of rec.sources) {
      assert.deepEqual(Object.keys(s).sort(), ["citation", "date", "edition", "url"], `${id}: malformed source shape`);
      assert.equal(typeof s.citation, "string");
      assert.ok(s.citation.trim().length > 0, `${id}: source citation must be non-empty`);
    }
    for (const [field, value] of [
      ["sourceCheckedBy", rec.sourceCheckedBy], ["reviewer", rec.reviewer],
      ["reviewScope", rec.reviewScope], ["independentReviewer", rec.independentReviewer], ["notes", rec.notes],
    ]) {
      assert.ok(value === null || (typeof value === "string" && value.trim()), `${id}: ${field} must be null or a non-empty string`);
    }
    for (const [field, value] of [
      ["sourceCheckedDate", rec.sourceCheckedDate], ["reviewDate", rec.reviewDate], ["independentReviewDate", rec.independentReviewDate],
    ]) {
      assert.ok(value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), `${id}: ${field} must be null or an ISO date string`);
    }
    assert.equal(typeof rec.independentReviewDocumented, "boolean", `${id}: independentReviewDocumented must be a boolean`);
    assert.ok(rec.editionSensitive === null || typeof rec.editionSensitive === "boolean", `${id}: editionSensitive must be null or a boolean`);
    assert.ok(Array.isArray(rec.blockers), `${id}: blockers must be an array`);
  }
});

/* ============================ truthfulness of current data (validation requirements 3 and 4) ============================ */

test("all 153 current questions remain Draft, and none is release-qualified", () => {
  const all = baselineApi.getQuestionGovernance();
  const lifecycles = Object.values(all).map((r) => r.lifecycle);
  assert.deepEqual(new Set(lifecycles), new Set(["draft"]));
  assert.equal(Object.values(all).filter((r) => r.lifecycle === "release-qualified").length, 0);
});

test("no current record fabricates a drafter, source, source-checker, reviewer, review date, review scope, independent review, or release qualification", () => {
  const all = baselineApi.getQuestionGovernance();
  for (const [id, rec] of Object.entries(all)) {
    assert.equal(rec.drafter, null, `${id}: drafter must not be asserted`);
    assert.deepEqual(rec.sources, [], `${id}: sources must be empty`);
    assert.equal(rec.sourceCheckedBy, null, `${id}: sourceCheckedBy must not be asserted`);
    assert.equal(rec.sourceCheckedDate, null, `${id}: sourceCheckedDate must not be asserted`);
    assert.equal(rec.reviewer, null, `${id}: reviewer must not be asserted`);
    assert.equal(rec.reviewDate, null, `${id}: reviewDate must not be asserted`);
    assert.equal(rec.reviewScope, null, `${id}: reviewScope must not be asserted`);
    assert.equal(rec.independentReviewDocumented, false, `${id}: independent review must not be claimed`);
    assert.equal(rec.independentReviewer, null);
    assert.equal(rec.independentReviewDate, null);
    assert.equal(rec.lifecycle, "draft", `${id}: must not be release-qualified or any promoted state`);
    assert.deepEqual(rec.blockers.sort(), [...ALL_BLOCKERS].sort(), `${id}: every blocker must be present since nothing is recorded`);
  }
});

/* ============================ fixture-based lifecycle transition tests (validation requirement 5) ============================ */

const FIXTURE_ID = "m2-q1"; // a real authored id, used only as a patch target for these fixtures

test("a correctly complete record can satisfy the 'source-checked' transition", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, {
    lifecycle: "source-checked",
    drafter: null,
    sources: [{ citation: "ASCP BOC CG(ASCP) Content Guideline", edition: null, date: "2025-09-25", url: "https://www.ascp.org/boc/docs/example.pdf" }],
    sourceCheckedBy: "Jerad Austin Anderson", sourceCheckedDate: "2026-08-04",
    reviewer: null, reviewDate: null, reviewScope: null,
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    editionSensitive: null, notes: null,
  });
  assert.equal(result.ok, true, `expected a complete source-checked record to load cleanly: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.lifecycle, "source-checked");
  assert.deepEqual(rec.blockers.sort(), ["missing-drafter", "missing-reviewer", "missing-review-date", "missing-review-scope", "unresolved-edition-sensitivity"].sort());
});

test("a correctly complete record can satisfy the 'sme-reviewed' transition", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, {
    lifecycle: "sme-reviewed",
    drafter: null,
    sources: [{ citation: "ISCN 2024", edition: "2024", date: "2024-01-01", url: null }],
    sourceCheckedBy: "Jerad Austin Anderson", sourceCheckedDate: "2026-08-04",
    reviewer: "Jerad Austin Anderson", reviewDate: "2026-08-04",
    reviewScope: "rationale and distractor accuracy for m2-q1 only",
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    editionSensitive: null, notes: null,
  });
  assert.equal(result.ok, true, `expected a complete sme-reviewed record to load cleanly: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.lifecycle, "sme-reviewed");
  assert.deepEqual(rec.blockers.sort(), ["missing-drafter", "unresolved-edition-sensitivity"].sort());
});

test("a correctly complete record can satisfy the 'release-qualified' transition, with zero blockers", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, {
    lifecycle: "release-qualified",
    drafter: "Jerad Austin Anderson",
    sources: [{ citation: "ISCN 2024", edition: "2024", date: "2024-01-01", url: null }],
    sourceCheckedBy: "Jerad Austin Anderson", sourceCheckedDate: "2026-08-04",
    reviewer: "Jerad Austin Anderson", reviewDate: "2026-08-04",
    reviewScope: "rationale and distractor accuracy for m2-q1 only",
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    editionSensitive: false, notes: null,
  });
  assert.equal(result.ok, true, `expected a complete release-qualified record to load cleanly: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.lifecycle, "release-qualified");
  assert.deepEqual(rec.blockers, []);
});

test("missing prerequisites prevent promotion: 'sme-reviewed' with no reviewer is rejected at load time", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, {
    lifecycle: "sme-reviewed",
    drafter: null,
    sources: [{ citation: "ISCN 2024", edition: null, date: null, url: null }],
    sourceCheckedBy: "Jerad Austin Anderson", sourceCheckedDate: "2026-08-04",
    reviewer: null, reviewDate: null, reviewScope: null,
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    editionSensitive: null, notes: null,
  });
  assert.equal(result.ok, false, "a sme-reviewed record with no reviewer must fail to load");
  assert.match(String(result.error), /invalid or self-contradictory governance record/);
});

test("a state label alone cannot bypass the gate: 'release-qualified' with otherwise-default (nothing recorded) fields is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, {
    lifecycle: "release-qualified",
    drafter: null, sources: [], sourceCheckedBy: null, sourceCheckedDate: null,
    reviewer: null, reviewDate: null, reviewScope: null,
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    editionSensitive: null, notes: null,
  });
  assert.equal(result.ok, false, "a bare release-qualified label with no supporting evidence must be rejected");
});

test("a malformed (empty) source citation is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, {
    lifecycle: "source-checked",
    drafter: null, sources: [{ citation: "", edition: null, date: null, url: null }],
    sourceCheckedBy: "Jerad Austin Anderson", sourceCheckedDate: "2026-08-04",
    reviewer: null, reviewDate: null, reviewScope: null,
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    editionSensitive: null, notes: null,
  });
  assert.equal(result.ok, false, "an empty-string citation must be rejected");
});

test("a malformed (impossible calendar) review date is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, {
    lifecycle: "sme-reviewed",
    drafter: null, sources: [{ citation: "ISCN 2024", edition: null, date: null, url: null }],
    sourceCheckedBy: "Jerad Austin Anderson", sourceCheckedDate: "2026-08-04",
    reviewer: "Jerad Austin Anderson", reviewDate: "2024-02-30",
    reviewScope: "rationale and distractor accuracy for m2-q1 only",
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    editionSensitive: null, notes: null,
  });
  assert.equal(result.ok, false, "an impossible calendar date (2024-02-30) must be rejected");
});

test("a vague, unqualified review scope ('reviewed') is rejected -- a bare label cannot stand in for a real scope", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, {
    lifecycle: "sme-reviewed",
    drafter: null, sources: [{ citation: "ISCN 2024", edition: null, date: null, url: null }],
    sourceCheckedBy: "Jerad Austin Anderson", sourceCheckedDate: "2026-08-04",
    reviewer: "Jerad Austin Anderson", reviewDate: "2026-08-04",
    reviewScope: "reviewed",
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    editionSensitive: null, notes: null,
  });
  assert.equal(result.ok, false, "a vague reviewScope of 'reviewed' must be rejected");
});

test("independentReviewDocumented:true with no supporting independentReviewer/independentReviewDate is rejected -- cannot be implied", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, {
    lifecycle: "sme-reviewed",
    drafter: null, sources: [{ citation: "ISCN 2024", edition: null, date: null, url: null }],
    sourceCheckedBy: "Jerad Austin Anderson", sourceCheckedDate: "2026-08-04",
    reviewer: "Jerad Austin Anderson", reviewDate: "2026-08-04",
    reviewScope: "rationale and distractor accuracy for m2-q1 only",
    independentReviewDocumented: true, independentReviewer: null, independentReviewDate: null,
    editionSensitive: null, notes: null,
  });
  assert.equal(result.ok, false, "independentReviewDocumented:true must require its own evidence, not merely be assertable");
});

test("an unknown lifecycle enum value is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, {
    lifecycle: "totally-reviewed",
    drafter: null, sources: [], sourceCheckedBy: null, sourceCheckedDate: null,
    reviewer: null, reviewDate: null, reviewScope: null,
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    editionSensitive: null, notes: null,
  });
  assert.equal(result.ok, false, "an invented lifecycle value must be rejected");
});

test("a record missing an own property (malformed shape) is rejected", () => {
  const patched = patchGovernanceRecord(FIXTURE_ID, {
    lifecycle: "draft", drafter: null, sources: [], sourceCheckedBy: null, sourceCheckedDate: null,
    reviewer: null, reviewDate: null, reviewScope: null,
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    editionSensitive: null,
    // `notes` deliberately omitted -- malformed shape (12 keys instead of 13)
  });
  const result = bootScript(patched);
  assert.equal(result.ok, false, "a record missing a required own property must be rejected");
});

/* ============================ public API tests (validation requirement 6) ============================ */

test("getQuestionGovernance(knownId) returns the exact documented shape for a known authored id", () => {
  const rec = baselineApi.getQuestionGovernance("m1-q1");
  assert.deepEqual(Object.keys(rec).sort(), [...GOVERNANCE_RECORD_KEYS].sort());
  assert.equal(rec.id, "m1-q1");
});

test("getQuestionGovernance(unknownId) returns null, not a default/empty record", () => {
  assert.equal(baselineApi.getQuestionGovernance("does-not-exist"), null);
  assert.equal(baselineApi.getQuestionGovernance(""), null);
  assert.equal(baselineApi.getQuestionGovernance(123), null);
});

test("getQuestionGovernance() with no argument returns the complete registry keyed by id, same shape as the single-id form", () => {
  const all = baselineApi.getQuestionGovernance();
  assert.equal(Object.keys(all).length, 153);
  for (const id of Object.keys(all)) {
    assert.deepEqual(Object.keys(all[id]).sort(), [...GOVERNANCE_RECORD_KEYS].sort());
    assert.equal(all[id].id, id);
  }
});

test("getQuestionGovernance()'s blockers are always computed fresh, not stored -- they match computeGovernanceBlockers() logic for a draft record", () => {
  const rec = baselineApi.getQuestionGovernance("m1-q1");
  assert.deepEqual(rec.blockers.sort(), [...ALL_BLOCKERS].sort());
});

test("getQuestionGovernance() returns fully detached data -- mutating a single-id result or a registry result cannot affect a later call", () => {
  const single = baselineApi.getQuestionGovernance("m1-q1");
  single.lifecycle = "release-qualified";
  single.sources.push({ citation: "fabricated" });
  single.blockers.length = 0;
  const singleAgain = baselineApi.getQuestionGovernance("m1-q1");
  assert.equal(singleAgain.lifecycle, "draft");
  assert.deepEqual(singleAgain.sources, []);
  assert.equal(singleAgain.blockers.length, 7);

  const all = baselineApi.getQuestionGovernance();
  all["m1-q1"].lifecycle = "release-qualified";
  delete all["m2-q1"];
  const allAgain = baselineApi.getQuestionGovernance();
  assert.equal(allAgain["m1-q1"].lifecycle, "draft");
  assert.ok(allAgain["m2-q1"], "deleting a key on the returned object must not delete it from the live registry");
});

test("getQuestionGovernance() emits no progress, answer, exercise, content, or persistence event, and does not touch learner progress", () => {
  const env = bootScript(inlineScript);
  assert.equal(env.ok, true);
  const api = env.api;
  const seen = [];
  ["progress", "answer", "exercise", "content", "persistence"].forEach((evt) => api.on(evt, (payload) => seen.push({ evt, payload })));
  const before = JSON.stringify(api.getProgress());
  api.getQuestionGovernance();
  api.getQuestionGovernance("m1-q1");
  api.getQuestionGovernance("unknown-id");
  const after = JSON.stringify(api.getProgress());
  assert.deepEqual(seen, []);
  assert.equal(before, after, "reading governance must not change learner progress");
});

test("SCHEMA_V is unchanged (2), and getProgress()/exportJSON() carry no governance data", () => {
  assert.equal(baselineApi.schema, 2);
  const exported = JSON.parse(baselineApi.exportJSON());
  assert.deepEqual(Object.keys(exported.state).sort(), ["answers", "exercises", "modules", "started", "v"]);
  assert.doesNotMatch(baselineApi.exportJSON(), /lifecycle|sourceCheckedBy|reviewScope|independentReview/);
});

/* ============================ runtime-injected question isolation (validation requirement 7) ============================ */

test("a runtime-injected question never enters QUESTION_GOVERNANCE, and its id is treated exactly like any unknown id", () => {
  const env = bootScript(inlineScript);
  const api = env.api;
  const before = Object.keys(api.getQuestionGovernance()).length;
  const injected = api.addQuestions("m2", [{
    id: "runtime-governance-probe-1", d: "operations", t: "lab-ops", x: 1,
    q: "probe", o: ["a", "b"], a: 0, why: "probe",
  }]);
  assert.equal(injected.ok, true);
  assert.equal(Object.keys(api.getQuestionGovernance()).length, before, "registry size must not change when a runtime question is injected");
  assert.equal(api.getQuestionGovernance("runtime-governance-probe-1"), null);
});

test("a caller cannot self-certify a runtime-injected question's governance status -- governance-shaped fields on the input are rejected as unrecognized", () => {
  const env = bootScript(inlineScript);
  const api = env.api;
  const attempt = api.addQuestions("m2", [{
    id: "runtime-governance-selfcert-1", d: "operations", t: "lab-ops", x: 1,
    q: "probe", o: ["a", "b"], a: 0, why: "probe",
    lifecycle: "release-qualified", reviewer: "Nobody", reviewScope: "self-certified",
  }]);
  assert.equal(attempt.ok, false, "an injected question carrying governance-shaped fields must be rejected outright");
  assert.equal(api.getQuestionGovernance("runtime-governance-selfcert-1"), null);
});

test("addQuestions()/validateRuntimeQuestion() and the runtime-content policy are unchanged by this task", () => {
  // Cross-realm object (returned from inside the vm sandbox) compared
  // against a plain outer-realm literal: round-trip through JSON first,
  // since assert.deepEqual can otherwise report cross-realm objects as
  // structurally-equal-but-not-reference-equal even when every own
  // property matches.
  const policy = JSON.parse(JSON.stringify(baselineApi.getRuntimeContentPolicy()));
  assert.deepEqual(policy, {
    policyModel: "runtime-content-lifecycle-v1",
    definitionsSessionOnly: true,
    outcomesPersisted: true,
    outcomeSchemaVersion: 2,
    reinjectionRevivesOutcome: true,
    callerOwnsIdStability: true,
    contentPacksSupported: false,
  });
});

console.log(`\n${passed} governance checks passed.`);
if (failures.length) {
  console.error(`\n${failures.length} governance check(s) FAILED:`);
  for (const failure of failures) {
    console.error(`\n--- ${failure.name} ---`);
    console.error(failure.error);
  }
  process.exit(1);
}
