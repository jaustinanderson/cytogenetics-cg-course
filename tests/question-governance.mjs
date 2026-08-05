/**
 * Question provenance & scientific-review governance tests (Issue #3 /
 * Milestone 1, docs/CONTENT_GOVERNANCE.md, docs/SCIENTIFIC_REVIEW.md).
 *
 * Covers the QUESTION_GOVERNANCE registry, its construction-time
 * duplicate-id guard (buildGovernanceRegistry()), its load-time integrity
 * gate (assertGovernanceRegistryIntegrity()), and the public
 * window.CytoCourse.getQuestionGovernance() read method. Runs on stock
 * Node with no dependencies, same technique as tests/validate-course.mjs
 * and tests/dom-behavior.mjs: the real inline <script> from index.html is
 * extracted and executed inside an isolated `vm` sandbox.
 *
 * Corrected 2026-08-04 after independent review found several ways the
 * original mechanism could certify incomplete or contradictory records:
 * duplicate governance ids silently collapsing, an inexact citation
 * satisfying "source-checked", an arbitrary reviewer string satisfying
 * "SME-reviewed", a review-scope length heuristic standing in for actual
 * verification, a Draft record with complete evidence reporting zero
 * blockers, and independent-review evidence fields that were not
 * bidirectionally consistent. This file's coverage was substantially
 * rewritten to match; see docs/QUALITY_LOG.md for the full record.
 *
 * Several tests below PATCH a single QUESTION_GOVERNANCE_ENTRIES entry's
 * source text (replacing `["id", DRAFT_GOVERNANCE_RECORD()]` with a
 * literal `["id", {...}]` pair) before running the patched script in a
 * fresh sandbox. This is the only way to fixture-test
 * isValidGovernanceRecord()'s internal prerequisite logic, since it is
 * deliberately not exposed on the public, read-only window.CytoCourse API
 * (there is no public write method for governance data by design).
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

/** Replace one QUESTION_GOVERNANCE_ENTRIES pair's source text with a literal record. */
function patchGovernanceRecord(source, id, record) {
  const target = `["${id}", DRAFT_GOVERNANCE_RECORD()]`;
  assert.ok(source.includes(target), `patch target not found for id "${id}" -- has the source layout changed?`);
  const replacement = `["${id}", ${JSON.stringify(record)}]`;
  return source.replace(target, replacement);
}

function bootWithPatchedRecord(id, record) {
  return bootScript(patchGovernanceRecord(inlineScript, id, record));
}

// The production APPROVED_INDEPENDENT_REVIEWERS_BY_PACK entry for this
// course's subject pack is deliberately EMPTY (no real independent
// reviewer exists yet) -- see index.html's own comment. Fixture tests
// that need a record to actually SATISFY release-qualified must patch a
// clearly test-only name into that approved list, in the SAME script
// mutation as the governance-record patch, exactly as instructed
// ("Test fixtures may patch in a clearly test-only approved reviewer").
const TEST_APPROVED_INDEPENDENT_REVIEWER = "Test-Only Approved Independent Reviewer (fixture, not a real reviewer)";
function patchApprovedIndependentReviewer(source) {
  const target = "'cytogenetics-cg-ascp-v1': []";
  assert.ok(source.includes(target), "approved-independent-reviewer patch target not found -- has the source layout changed?");
  return source.replace(target, `'cytogenetics-cg-ascp-v1': [${JSON.stringify(TEST_APPROVED_INDEPENDENT_REVIEWER)}]`);
}
function bootWithApprovedTestReviewerAndPatchedRecord(id, record) {
  const source = patchApprovedIndependentReviewer(patchGovernanceRecord(inlineScript, id, record));
  return bootScript(source);
}

const baselineApi = boot();
const authoredIds = Object.values(baselineApi.getQuestions()).flat().map((q) => q.id);
const GOVERNANCE_VIEW_KEYS = [
  "id", "lifecycle", "drafter", "sources", "sourceCheckedBy", "sourceCheckedDate",
  "reviewer", "reviewDate", "reviewScope", "reviewChecks",
  "independentReviewDocumented", "independentReviewer", "independentReviewDate",
  "independentReviewScope", "independentReviewChecks", "independentReviewNoConflictDeclared",
  "editionSensitive", "notes", "releaseQualified", "blockers",
];
const DRAFT_BLOCKERS = [
  "missing-drafter", "missing-sources", "missing-source-check",
  "missing-reviewer", "missing-review-date", "incomplete-review-checks",
  "unresolved-edition-sensitivity", "missing-independent-review",
];
const APPROVED_REVIEWER = "Jerad Austin Anderson";
const ALL_REVIEW_CHECKS = [
  "best-answer-defensible", "rationale-accuracy", "distractor-quality",
  "domain-difficulty-correct", "original-wording", "no-recalled-exam-content",
  "no-phi-or-confidential",
];

/** A minimal SUFFICIENT source, satisfying isSufficientGovernanceSource(). */
function sufficientSource(overrides = {}) {
  return {
    citation: "ASCP BOC CG(ASCP) and CG(ASCPi) Examination Content Guideline",
    publisher: "American Society for Clinical Pathology Board of Certification",
    edition: null,
    date: "2025-09-25",
    locator: "Section 3, Table 2",
    url: null,
    ...overrides,
  };
}

/** A fully complete, valid draft record shape -- callers override specific fields. */
function blankRecord(overrides = {}) {
  return {
    lifecycle: "draft", drafter: null, sources: [], sourceCheckedBy: null, sourceCheckedDate: null,
    reviewer: null, reviewDate: null, reviewScope: null, reviewChecks: [],
    independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
    independentReviewScope: null, independentReviewChecks: [], independentReviewNoConflictDeclared: null,
    editionSensitive: null, notes: null,
    ...overrides,
  };
}

function completeSourceCheckedFields() {
  return {
    sources: [sufficientSource()],
    sourceCheckedBy: APPROVED_REVIEWER,
    sourceCheckedDate: "2026-08-04",
  };
}

function completeSmeReviewedFields() {
  return {
    ...completeSourceCheckedFields(),
    reviewer: APPROVED_REVIEWER,
    reviewDate: "2026-08-04",
    reviewScope: "all mandatory review checks for m2-q1: best answer, rationale, distractors, domain/difficulty, originality, exam integrity, privacy",
    reviewChecks: [...ALL_REVIEW_CHECKS],
  };
}

// Uses the TEST-ONLY approved independent reviewer -- callers using this
// fixture MUST boot via bootWithApprovedTestReviewerAndPatchedRecord(),
// not bootWithPatchedRecord(), or the reviewer will correctly fail the
// (empty, production) approved-independent-reviewer gate.
function completeReleaseQualifiedFields() {
  return {
    ...completeSmeReviewedFields(),
    drafter: APPROVED_REVIEWER,
    editionSensitive: false,
    independentReviewDocumented: true,
    independentReviewer: TEST_APPROVED_INDEPENDENT_REVIEWER,
    independentReviewDate: "2026-08-04",
    independentReviewScope: "independent verification of all mandatory review checks for m2-q1, performed separately from the SME review by a distinct second person",
    independentReviewChecks: [...ALL_REVIEW_CHECKS],
    independentReviewNoConflictDeclared: true,
  };
}

const FIXTURE_ID = "m2-q1"; // a real authored id, used only as a patch target for these fixtures

/* ============================ registry completeness ============================ */

test("the governance registry's exact key set equals all 153 authored question ids -- no missing, no stale, no duplicate", () => {
  const all = baselineApi.getQuestionGovernance();
  const registryIds = Object.keys(all);
  assert.equal(authoredIds.length, 153);
  assert.equal(new Set(authoredIds).size, 153);
  assert.equal(registryIds.length, 153);
  assert.deepEqual(registryIds.sort(), [...authoredIds].sort());
});

/* ============================ 1. duplicate governance IDs ============================ */

test("a duplicate governance-entry id is rejected at construction, not silently collapsed (the original object-literal design could not detect this)", () => {
  const target = '["m1-q1", DRAFT_GOVERNANCE_RECORD()]';
  assert.ok(inlineScript.includes(target));
  const patched = inlineScript.replace(target, `${target},\n    ["m1-q1", DRAFT_GOVERNANCE_RECORD()]`);
  const result = bootScript(patched);
  assert.equal(result.ok, false, "a duplicate governance entry id must fail to load");
  assert.match(String(result.error), /duplicate governance registry id: m1-q1/);
});

test("buildGovernanceRegistry produces exactly 153 entries with no silent collapse when ids are all unique", () => {
  const all = baselineApi.getQuestionGovernance();
  assert.equal(Object.keys(all).length, 153);
});

test("a duplicate AUTHORED QUESTION id (in QUIZZES, not the governance registry) is independently detected -- fixing the governance-registry dedup alone left this gap", () => {
  // Renaming one authored question's id to collide with another's, and
  // removing the now-orphaned governance entry for the renamed id, makes
  // the (collapsed) authored-id key set and the governance registry's
  // key set line up exactly -- confirmed by direct reproduction that,
  // before this correction, this exact scenario loaded with NO error at
  // all: 153 question objects, but only 152 unique ids.
  const idTarget = '{id:"m1-q2",d:"orientation"';
  const govTarget = '["m1-q2", DRAFT_GOVERNANCE_RECORD()],\n';
  assert.ok(inlineScript.includes(idTarget), "id patch target not found -- has the source layout changed?");
  assert.ok(inlineScript.includes(govTarget), "governance patch target not found -- has the source layout changed?");
  let patched = inlineScript.replace(idTarget, '{id:"m1-q1",d:"orientation"');
  patched = patched.replace(govTarget, "");
  const result = bootScript(patched);
  assert.equal(result.ok, false, "a duplicate authored question id must fail to load, independent of the governance registry's own dedup");
  assert.match(String(result.error), /duplicate authored question id detected: 153 authored questions but only 152 unique ids/);
});

/* ============================ per-record structural validation ============================ */

test("every governance record has the exact documented own-property shape and allowed types", () => {
  const all = baselineApi.getQuestionGovernance();
  for (const id of authoredIds) {
    const rec = all[id];
    assert.deepEqual(Object.keys(rec).sort(), [...GOVERNANCE_VIEW_KEYS].sort(), `${id}: unexpected key set`);
    assert.equal(rec.id, id);
    assert.ok(["draft", "source-checked", "sme-reviewed", "release-qualified"].includes(rec.lifecycle));
    assert.ok(Array.isArray(rec.sources));
    assert.ok(Array.isArray(rec.reviewChecks));
    assert.equal(typeof rec.independentReviewDocumented, "boolean");
    assert.equal(typeof rec.releaseQualified, "boolean");
    assert.ok(Array.isArray(rec.blockers));
  }
});

/* ============================ truthfulness of current data ============================ */

test("all 153 current questions remain Draft, none is release-qualified, and no reviewer is asserted", () => {
  const all = baselineApi.getQuestionGovernance();
  for (const [id, rec] of Object.entries(all)) {
    assert.equal(rec.lifecycle, "draft", `${id}: must remain draft`);
    assert.equal(rec.releaseQualified, false, `${id}: must not be release-qualified`);
    assert.equal(rec.reviewer, null, `${id}: no reviewer may be asserted`);
    assert.equal(rec.drafter, null, `${id}: no drafter may be asserted`);
    assert.deepEqual(rec.sources, [], `${id}: no sources may be asserted`);
    assert.deepEqual(rec.reviewChecks, [], `${id}: no review checks may be asserted`);
    assert.equal(rec.independentReviewDocumented, false, `${id}: independent review must not be claimed`);
    assert.deepEqual(rec.blockers.sort(), [...DRAFT_BLOCKERS].sort(), `${id}: every blocker must be present`);
  }
});

/* ============================ 2. source-reference sufficiency ============================ */

test("a placeholder citation ('x'), even with an otherwise-complete publisher/date/locator, does not satisfy source-checked -- isolates the citation-placeholder check specifically", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    sources: [sufficientSource({ citation: "x" })],
    sourceCheckedBy: APPROVED_REVIEWER, sourceCheckedDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "a placeholder citation must be rejected even with everything else present");
});

test("a placeholder publisher ('TBD'), even with an otherwise-complete citation/date/locator, does not satisfy source-checked -- isolates the publisher-placeholder check specifically", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    sources: [sufficientSource({ publisher: "TBD" })],
    sourceCheckedBy: APPROVED_REVIEWER, sourceCheckedDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "a placeholder publisher must be rejected even with everything else present");
});

test("a missing publisher (null), even with a genuine citation/date/locator, does not satisfy source-checked", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    sources: [sufficientSource({ publisher: null })],
    sourceCheckedBy: APPROVED_REVIEWER, sourceCheckedDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "a source with no publisher at all must be rejected");
});

test("a genuine title that happens to contain a placeholder-adjacent word ('Test') as part of a real name is NOT penalized -- exact-token match only, never a substring match", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    sources: [sufficientSource({ citation: "Test Battery for Cytogenetic Proficiency, 3rd Edition" })],
    sourceCheckedBy: APPROVED_REVIEWER, sourceCheckedDate: "2026-08-04",
  }));
  assert.equal(result.ok, true, `a genuine title containing "Test" as a substring must not be rejected: ${result.error}`);
});

test("an organization-name-only citation with no publisher, date, or locator ({citation:'x', publisher:null, edition:null, date:null, locator:null, url:null}) does not satisfy source-checked -- the exact original counterexample", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    sources: [{ citation: "x", publisher: null, edition: null, date: null, locator: null, url: null }],
    sourceCheckedBy: APPROVED_REVIEWER, sourceCheckedDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "the exact reported counterexample must be rejected");
});

test("a source missing an exact edition/revision/publication date does not satisfy source-checked", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    sources: [sufficientSource({ edition: null, date: null })],
    sourceCheckedBy: APPROVED_REVIEWER, sourceCheckedDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "a source with no edition and no date must be rejected");
});

test("a source missing a question-specific locator or URL does not satisfy source-checked", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    sources: [sufficientSource({ locator: null, url: null })],
    sourceCheckedBy: APPROVED_REVIEWER, sourceCheckedDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "a source with no locator and no url must be rejected");
});

test("a malformed source date (impossible calendar date) is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    sources: [sufficientSource({ date: "2024-02-30" })],
    sourceCheckedBy: APPROVED_REVIEWER, sourceCheckedDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "an impossible calendar date must be rejected");
});

test("a malformed source URL (non-https) is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    sources: [sufficientSource({ locator: null, url: "http://example.com/insecure" })],
    sourceCheckedBy: APPROVED_REVIEWER, sourceCheckedDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "a non-https source URL must be rejected");
});

test("whitespace-only source citation/locator values are rejected", () => {
  const r1 = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    sources: [sufficientSource({ citation: "   " })],
  }));
  assert.equal(r1.ok, false, "a whitespace-only citation must be rejected");
  const r2 = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    sources: [sufficientSource({ locator: "   ", url: null })],
  }));
  assert.equal(r2.ok, false, "a whitespace-only locator (with no url) must be rejected");
});

test("a source record with extra or missing properties is rejected", () => {
  const extra = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    sources: [{ ...sufficientSource(), extra: "field" }],
  }));
  assert.equal(extra.ok, false, "a source with an extra property must be rejected");
  const missing = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    sources: [{ citation: "x".repeat(30), edition: null, date: "2026-01-01" }], // missing locator, url
  }));
  assert.equal(missing.ok, false, "a source missing required own properties must be rejected");
});

test("a complete, well-formed future source satisfies source-checked", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    ...completeSourceCheckedFields(),
  }));
  assert.equal(result.ok, true, `expected a complete source-checked record to load cleanly: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.lifecycle, "source-checked");
  assert.deepEqual(rec.blockers.sort(), ["missing-drafter", "missing-reviewer", "missing-review-date", "incomplete-review-checks", "unresolved-edition-sensitivity", "missing-independent-review"].sort());
});

/* ============================ 3. approved-SME-reviewer identity ============================ */

test("an unknown or unapproved reviewer ('Nobody') cannot produce sme-reviewed status", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...completeSmeReviewedFields(),
    reviewer: "Nobody",
  }));
  assert.equal(result.ok, false, "an unapproved reviewer must be rejected");
});

test("the approved reviewer identity is represented consistently and satisfies sme-reviewed", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...completeSmeReviewedFields(),
  }));
  assert.equal(result.ok, true, `expected the approved reviewer to satisfy sme-reviewed: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.reviewer, APPROVED_REVIEWER);
  assert.equal(rec.lifecycle, "sme-reviewed");
});

test("capitalization or whitespace variants of the approved reviewer name are recognized as the SAME identity, not a second one", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...completeSmeReviewedFields(),
    reviewer: "  jerad AUSTIN   anderson  ",
  }));
  assert.equal(result.ok, true, `a case/whitespace variant of the approved reviewer must still be recognized: ${result.error}`);
});

test("detached API callers cannot alter the approved-reviewer record -- there is no public accessor for it", () => {
  // getQuestionGovernance()'s output never exposes an approved-reviewer
  // list or any field a caller could mutate to add themselves; only the
  // per-record `reviewer` string (which must independently satisfy
  // isApprovedSmeReviewer at load time, not at read time) is exposed.
  const rec = baselineApi.getQuestionGovernance("m1-q1");
  assert.deepEqual(Object.keys(rec).sort(), [...GOVERNANCE_VIEW_KEYS].sort());
  assert.ok(!("approvedReviewers" in rec) && !("APPROVED_SME_REVIEWERS" in baselineApi));
});

/* ============================ 4. structured review-check enum ============================ */

test("an sme-reviewed record missing one mandatory review check is rejected", () => {
  for (const omit of ALL_REVIEW_CHECKS) {
    const checks = ALL_REVIEW_CHECKS.filter((c) => c !== omit);
    const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
      lifecycle: "sme-reviewed",
      ...completeSmeReviewedFields(),
      reviewChecks: checks,
    }));
    assert.equal(result.ok, false, `omitting "${omit}" must be rejected for sme-reviewed`);
  }
});

test("a duplicate review-check entry is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...completeSmeReviewedFields(),
    reviewChecks: [...ALL_REVIEW_CHECKS, ALL_REVIEW_CHECKS[0]],
  }));
  assert.equal(result.ok, false, "a duplicate review-check value must be rejected");
});

test("an unknown review-check value is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...completeSmeReviewedFields(),
    reviewChecks: [...ALL_REVIEW_CHECKS.slice(0, 6), "made-up-check"],
  }));
  assert.equal(result.ok, false, "an unrecognized review-check value must be rejected");
});

test("a malformed (non-string, e.g. boolean) value in reviewChecks is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "draft",
    reviewChecks: [true, "rationale-accuracy"],
  }));
  assert.equal(result.ok, false, "a non-string entry in reviewChecks must be rejected, even for an otherwise-Draft record");
});

test("an empty reviewChecks array is valid for Draft but not for sme-reviewed", () => {
  const draft = bootWithPatchedRecord(FIXTURE_ID, blankRecord({ lifecycle: "draft" }));
  assert.equal(draft.ok, true, "Draft with empty reviewChecks must remain valid");
  const smeReviewed = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...completeSmeReviewedFields(),
    reviewChecks: [],
  }));
  assert.equal(smeReviewed.ok, false, "sme-reviewed with empty reviewChecks must be rejected");
});

test("narrative notes cannot substitute for the structured reviewChecks -- a filled-in reviewScope/notes with an incomplete checklist still fails", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...completeSmeReviewedFields(),
    reviewChecks: ["rationale-accuracy"],
    notes: "Thoroughly reviewed every aspect of this question in detail.",
  }));
  assert.equal(result.ok, false, "narrative notes must not substitute for the structured checklist");
});

test("a complete, well-formed future record satisfies every mandatory review check for sme-reviewed", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...completeSmeReviewedFields(),
  }));
  assert.equal(result.ok, true, `expected complete reviewChecks to satisfy sme-reviewed: ${result.error}`);
});

/* ============================ 5. lifecycle / releaseQualified / blocker invariants ============================ */

test("Draft with complete evidence: releaseQualified is false and the release-approval-pending blocker appears, never a bare empty blockers array", () => {
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "draft",
    ...completeReleaseQualifiedFields(),
  }));
  assert.equal(result.ok, true, `expected a draft record with complete evidence to still load: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.lifecycle, "draft");
  assert.equal(rec.releaseQualified, false);
  assert.deepEqual(rec.blockers, ["release-approval-pending"]);
});

test("source-checked with later-stage (sme-reviewed-worthy) evidence: releaseQualified false, release-approval-pending blocker only", () => {
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "source-checked",
    ...completeReleaseQualifiedFields(),
  }));
  assert.equal(result.ok, true, `expected source-checked with excess evidence to load: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.lifecycle, "source-checked");
  assert.equal(rec.releaseQualified, false);
  assert.deepEqual(rec.blockers, ["release-approval-pending"]);
});

test("sme-reviewed with complete release evidence: releaseQualified false, release-approval-pending blocker only, until explicitly promoted", () => {
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...completeReleaseQualifiedFields(),
  }));
  assert.equal(result.ok, true, `expected sme-reviewed with complete release evidence to load: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.lifecycle, "sme-reviewed");
  assert.equal(rec.releaseQualified, false);
  assert.deepEqual(rec.blockers, ["release-approval-pending"]);
});

test("valid release-qualified: releaseQualified true, zero blockers", () => {
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...completeReleaseQualifiedFields(),
  }));
  assert.equal(result.ok, true, `expected a complete release-qualified record to load: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.lifecycle, "release-qualified");
  assert.equal(rec.releaseQualified, true);
  assert.deepEqual(rec.blockers, []);
});

test("invalid release-qualified (missing drafter) is rejected at load time -- a label alone cannot bypass the gate", () => {
  const fields = completeReleaseQualifiedFields();
  delete fields.drafter;
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
    drafter: null,
  }));
  assert.equal(result.ok, false, "release-qualified with no drafter must be rejected");
});

test("blocker ordering and stable names are exact and deterministic", () => {
  const rec = baselineApi.getQuestionGovernance("m1-q1");
  assert.deepEqual(rec.blockers, [
    "missing-drafter", "missing-sources", "missing-source-check",
    "missing-reviewer", "missing-review-date", "incomplete-review-checks",
    "unresolved-edition-sensitivity", "missing-independent-review",
  ]);
});

test("zero blockers and releaseQualified never drift apart, across a matrix of valid and adversarial fixtures", () => {
  const fixtures = [
    ["current Draft baseline (m1-q1, no patch)", null],
    ["draft with complete evidence", blankRecord({ lifecycle: "draft", ...completeReleaseQualifiedFields() })],
    ["source-checked with complete evidence", blankRecord({ lifecycle: "source-checked", ...completeReleaseQualifiedFields() })],
    ["sme-reviewed with complete evidence", blankRecord({ lifecycle: "sme-reviewed", ...completeReleaseQualifiedFields() })],
    ["sme-reviewed missing only independent review", blankRecord({
      lifecycle: "sme-reviewed", ...completeReleaseQualifiedFields(),
      independentReviewDocumented: false, independentReviewer: null, independentReviewDate: null,
      independentReviewScope: null, independentReviewChecks: [], independentReviewNoConflictDeclared: null,
    })],
    ["sme-reviewed with an UNAPPROVED independent reviewer (documented, distinct, dated -- but not on the approved list)", blankRecord({
      lifecycle: "sme-reviewed", ...completeReleaseQualifiedFields(),
      independentReviewer: "A Distinct But Unapproved Reviewer",
    })],
    ["valid release-qualified", blankRecord({ lifecycle: "release-qualified", ...completeReleaseQualifiedFields() })],
  ];
  for (const [label, record] of fixtures) {
    const api = record === null ? baselineApi : bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, record).api;
    const id = record === null ? "m1-q1" : FIXTURE_ID;
    const rec = api.getQuestionGovernance(id);
    assert.equal(
      rec.blockers.length === 0, rec.releaseQualified,
      `${label}: blockers.length===0 (${rec.blockers.length === 0}) must equal releaseQualified (${rec.releaseQualified}) -- got blockers ${JSON.stringify(rec.blockers)}`,
    );
  }
});

/* ============================ 6. independent-review evidence model ============================ */

test("independentReviewDocumented:false with reviewer/date evidence present is rejected (false must require every independent-review field blank)", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    independentReviewDocumented: false,
    independentReviewer: "Some Reviewer",
    independentReviewDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "false with reviewer/date present must be rejected");
});

test("independentReviewDocumented:false with a stray independentReviewScope is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    independentReviewDocumented: false,
    independentReviewScope: "some scope text",
  }));
  assert.equal(result.ok, false, "false with a stray independentReviewScope must be rejected");
});

test("independentReviewDocumented:false with stray independentReviewChecks is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    independentReviewDocumented: false,
    independentReviewChecks: ["rationale-accuracy"],
  }));
  assert.equal(result.ok, false, "false with stray independentReviewChecks must be rejected");
});

test("independentReviewDocumented:false with a stray independentReviewNoConflictDeclared is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    independentReviewDocumented: false,
    independentReviewNoConflictDeclared: true,
  }));
  assert.equal(result.ok, false, "false with a stray independentReviewNoConflictDeclared must be rejected");
});

test("independentReviewDocumented:true with no supporting evidence is rejected (true must require identity/date present)", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    drafter: APPROVED_REVIEWER,
    independentReviewDocumented: true,
    independentReviewer: null,
    independentReviewDate: null,
  }));
  assert.equal(result.ok, false, "true with no evidence must be rejected");
});

test("an independent reviewer identical to the drafter is rejected (cannot be one's own independent reviewer)", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    drafter: APPROVED_REVIEWER,
    independentReviewDocumented: true,
    independentReviewer: APPROVED_REVIEWER,
    independentReviewDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "independent reviewer === drafter must be rejected");
});

test("an independent reviewer identical to the primary reviewer is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    drafter: "Some Other Drafter",
    reviewer: APPROVED_REVIEWER,
    independentReviewDocumented: true,
    independentReviewer: APPROVED_REVIEWER,
    independentReviewDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "independent reviewer === primary reviewer must be rejected");
});

test("a whitespace/case variant of the same person as drafter is still recognized as the same identity and rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    drafter: "Jerad Austin Anderson",
    independentReviewDocumented: true,
    independentReviewer: "  JERAD austin Anderson ",
    independentReviewDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "a case/whitespace variant of the drafter must still be recognized as the same person");
});

test("a whitespace/case variant of the same person as the primary SME reviewer is still recognized as the same identity and rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    drafter: "Some Other Drafter",
    reviewer: "Jerad Austin Anderson",
    independentReviewDocumented: true,
    independentReviewer: "jerad   AUSTIN Anderson",
    independentReviewDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "a case/whitespace variant of the primary reviewer must still be recognized as the same person");
});

test("independent review cannot be claimed while the drafter is unknown (independence is relative to authorship)", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    drafter: null,
    independentReviewDocumented: true,
    independentReviewer: "A Distinct Reviewer",
    independentReviewDate: "2026-08-04",
  }));
  assert.equal(result.ok, false, "independent review with an unknown drafter must be rejected");
});

/* --- the confirmed loophole (independent-review evidence correction) --- */

test("THE CONFIRMED LOOPHOLE: an arbitrary, unapproved, unqualified independent-reviewer name ('A Distinct Reviewer') with only identity+date no longer satisfies release-qualified", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
    independentReviewer: "A Distinct Reviewer", // NOT the test-approved identity
    independentReviewScope: null,
    independentReviewChecks: [],
    independentReviewNoConflictDeclared: null,
  }));
  assert.equal(result.ok, false, "an arbitrary distinct name with no approval/scope/checklist/conflict-declaration must be rejected -- this is the exact reported loophole");
});

test("an arbitrary distinct but UNAPPROVED reviewer name is rejected even with a complete scope, checklist, and conflict declaration", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
    independentReviewer: "Someone Else Entirely, Not On The Approved List",
  }));
  assert.equal(result.ok, false, "approval is required independent of how complete the rest of the evidence is");
});

test("an APPROVED test reviewer missing the independent review scope is rejected", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
    independentReviewScope: null,
  }));
  assert.equal(result.ok, false, "an approved reviewer with no recorded independent scope must be rejected");
});

test("an APPROVED test reviewer with an EMPTY independent checklist is rejected", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
    independentReviewChecks: [],
  }));
  assert.equal(result.ok, false, "an approved reviewer with an empty independent checklist must be rejected");
});

test("an APPROVED test reviewer with a PARTIALLY complete independent checklist is rejected", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
    independentReviewChecks: ["rationale-accuracy", "distractor-quality"],
  }));
  assert.equal(result.ok, false, "an approved reviewer with a partial independent checklist must be rejected");
});

test("the SME review's OWN checklist cannot substitute for a separately recorded independent checklist -- reusing reviewChecks for independentReviewChecks by omission still fails", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
    independentReviewChecks: [], // the SME reviewChecks field is separately complete, but that must not count
  }));
  assert.equal(result.ok, false, "an empty independentReviewChecks must be rejected even though reviewChecks (the SME's own) is complete");
});

test("an APPROVED test reviewer with no independence/no-authorship-stake declaration (null) is rejected", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
    independentReviewNoConflictDeclared: null,
  }));
  assert.equal(result.ok, false, "a null (not yet assessed) conflict declaration must be rejected");
});

test("an APPROVED test reviewer with an EXPLICIT conflict declared (false) is rejected -- false is a valid, structurally recorded, but disqualifying value", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
    independentReviewNoConflictDeclared: false,
  }));
  assert.equal(result.ok, false, "an explicitly declared conflict (false) must never satisfy release-qualified");
});

test("independentReviewDocumented:true with a malformed (non-boolean) independentReviewNoConflictDeclared is rejected", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    drafter: APPROVED_REVIEWER,
    independentReviewDocumented: true,
    independentReviewer: "Some Reviewer",
    independentReviewDate: "2026-08-04",
    independentReviewNoConflictDeclared: "yes",
  }));
  assert.equal(result.ok, false, "a non-boolean, non-null independentReviewNoConflictDeclared must be rejected");
});

test("a FULLY POPULATED, test-only approved independent-review fixture satisfies release-qualified, and the public result remains fully detached", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithApprovedTestReviewerAndPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
  }));
  assert.equal(result.ok, true, `expected the fully populated, approved test fixture to be accepted: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.releaseQualified, true);
  assert.equal(rec.independentReviewDocumented, true);
  assert.equal(rec.independentReviewer, TEST_APPROVED_INDEPENDENT_REVIEWER);
  assert.equal(rec.independentReviewNoConflictDeclared, true);
  assert.deepEqual(rec.blockers, []);

  // Detachment: mutating the returned independent-review evidence must
  // not reach the live registry.
  rec.independentReviewChecks.push("fabricated-check");
  rec.independentReviewScope = "MUTATED";
  const recAgain = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.deepEqual(recAgain.independentReviewChecks, fields.independentReviewChecks);
  assert.equal(recAgain.independentReviewScope, fields.independentReviewScope);
});

test("release-qualified WITHOUT a documented independent review is rejected -- independent review is now a hard release-qualified prerequisite", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "release-qualified",
    ...fields,
    independentReviewDocumented: false,
    independentReviewer: null,
    independentReviewDate: null,
    independentReviewScope: null,
    independentReviewChecks: [],
    independentReviewNoConflictDeclared: null,
  }));
  assert.equal(result.ok, false, "release-qualified without independent review must be rejected at load time");
});

test("an sme-reviewed record with complete release evidence but no independent review reports exactly missing-independent-review as its sole blocker (release-approval-pending only appears once every evidence gap, including this one, is closed)", () => {
  const fields = completeReleaseQualifiedFields();
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...fields,
    independentReviewDocumented: false,
    independentReviewer: null,
    independentReviewDate: null,
    independentReviewScope: null,
    independentReviewChecks: [],
    independentReviewNoConflictDeclared: null,
  }));
  assert.equal(result.ok, true, `expected sme-reviewed with no independent review to still load: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.releaseQualified, false);
  assert.deepEqual(rec.blockers, ["missing-independent-review"]);
});

test("an sme-reviewed record with an independent review DOCUMENTED but missing scope/checklist/conflict-declaration reports the exact granular blockers, not the aggregate code", () => {
  const result = bootWithPatchedRecord(FIXTURE_ID, blankRecord({
    lifecycle: "sme-reviewed",
    ...completeSmeReviewedFields(),
    drafter: APPROVED_REVIEWER,
    editionSensitive: false,
    independentReviewDocumented: true,
    independentReviewer: "Some Distinct, Unapproved, Otherwise-Bare Reviewer",
    independentReviewDate: "2026-08-04",
  }));
  assert.equal(result.ok, true, `expected a bare-but-structurally-valid documented independent review to load: ${result.error}`);
  const rec = result.api.getQuestionGovernance(FIXTURE_ID);
  assert.equal(rec.releaseQualified, false);
  assert.deepEqual(rec.blockers.sort(), [
    "missing-independent-reviewer", "missing-independent-review-scope",
    "incomplete-independent-review-checks", "missing-independent-review-conflict-declaration",
  ].sort());
});

/* ============================ public API tests ============================ */

test("getQuestionGovernance(knownId) returns the exact documented shape for a known authored id", () => {
  const rec = baselineApi.getQuestionGovernance("m1-q1");
  assert.deepEqual(Object.keys(rec).sort(), [...GOVERNANCE_VIEW_KEYS].sort());
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
    assert.deepEqual(Object.keys(all[id]).sort(), [...GOVERNANCE_VIEW_KEYS].sort());
    assert.equal(all[id].id, id);
  }
});

test("getQuestionGovernance() returns fully detached data -- mutating a single-id result or a registry result cannot affect a later call", () => {
  const single = baselineApi.getQuestionGovernance("m1-q1");
  single.lifecycle = "release-qualified";
  single.sources.push({ citation: "fabricated" });
  single.blockers.length = 0;
  const singleAgain = baselineApi.getQuestionGovernance("m1-q1");
  assert.equal(singleAgain.lifecycle, "draft");
  assert.deepEqual(singleAgain.sources, []);
  assert.equal(singleAgain.blockers.length, 8);

  const all = baselineApi.getQuestionGovernance();
  all["m1-q1"].lifecycle = "release-qualified";
  delete all["m2-q1"];
  const allAgain = baselineApi.getQuestionGovernance();
  assert.equal(allAgain["m1-q1"].lifecycle, "draft");
  assert.ok(allAgain["m2-q1"]);
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
  assert.equal(before, after);
});

test("SCHEMA_V is unchanged (2), and getProgress()/exportJSON() carry no governance data", () => {
  assert.equal(baselineApi.schema, 2);
  const exported = JSON.parse(baselineApi.exportJSON());
  assert.deepEqual(Object.keys(exported.state).sort(), ["answers", "exercises", "modules", "started", "v"]);
  assert.doesNotMatch(baselineApi.exportJSON(), /lifecycle|sourceCheckedBy|reviewScope|independentReview/);
});

/* ============================ runtime-injected question isolation ============================ */

test("a runtime-injected question never enters QUESTION_GOVERNANCE, and its id is treated exactly like any unknown id", () => {
  const env = bootScript(inlineScript);
  const api = env.api;
  const before = Object.keys(api.getQuestionGovernance()).length;
  const injected = api.addQuestions("m2", [{
    id: "runtime-governance-probe-1", d: "operations", t: "lab-ops", x: 1,
    q: "probe", o: ["a", "b"], a: 0, why: "probe",
  }]);
  assert.equal(injected.ok, true);
  assert.equal(Object.keys(api.getQuestionGovernance()).length, before);
  assert.equal(api.getQuestionGovernance("runtime-governance-probe-1"), null);
});

test("a caller cannot self-certify a runtime-injected question's governance status -- governance-shaped fields on the input are rejected as unrecognized", () => {
  const env = bootScript(inlineScript);
  const api = env.api;
  const attempt = api.addQuestions("m2", [{
    id: "runtime-governance-selfcert-1", d: "operations", t: "lab-ops", x: 1,
    q: "probe", o: ["a", "b"], a: 0, why: "probe",
    lifecycle: "release-qualified", reviewer: APPROVED_REVIEWER, reviewChecks: ALL_REVIEW_CHECKS,
  }]);
  assert.equal(attempt.ok, false, "an injected question carrying governance-shaped fields must be rejected outright");
  assert.equal(api.getQuestionGovernance("runtime-governance-selfcert-1"), null);
});

test("addQuestions()/validateRuntimeQuestion() and the runtime-content policy are unchanged by this task", () => {
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
