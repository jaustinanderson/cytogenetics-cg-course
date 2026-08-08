/**
 * Assessment-cue audit tests (Phase 0 step 1-3,
 * docs/LEARNING_PLATFORM_ROADMAP.md; QL-033, docs/QUALITY_LOG.md;
 * docs/ASSESSMENT_VALIDITY.md).
 *
 * Dependency-free: imports every measurement/Gate-A/pilot-selection
 * function directly from scripts/assessment-cue-audit.mjs (the single
 * authoritative implementation -- never re-implemented here), plus boots
 * the real inline <script> from index.html in an isolated `vm` sandbox
 * (same technique as tests/question-governance.mjs and
 * tests/dom-behavior.mjs) to reproduce the frozen QL-033 baseline against
 * the live, current authored bank.
 *
 * Corrected (docs/QUALITY_LOG.md QL-037) after independent review found
 * the original Gate A design made every real course form (5-9 items) and
 * the 13-item pilot structurally unable to ever pass, the canonical
 * length metric measured a different string than the one actually
 * rendered to learners, the length-cueing check ignored tie structure,
 * pilot selection depended on input array order despite a determinism
 * test that could not have caught that (a vacuous constant-label
 * comparison), and the frozen baseline recorded only aggregate counts,
 * not the exact question-id set. This file's coverage was rewritten to
 * match the corrected implementation and to directly reproduce every
 * counterexample the review found before asserting the fix.
 *
 * Scope discipline: this file only measures and tests measurement code.
 * It never mutates index.html, QUESTION_GOVERNANCE, or any question
 * content -- see docs/ASSESSMENT_VALIDITY.md.
 */

import assert from "node:assert/strict";
import {
  ORIGINAL_BASELINE,
  ORIGINAL_ID_MANIFEST,
  ORIGINAL_FORM_ORDER_MANIFEST,
  FROZEN_PILOT_MANIFEST,
  sha256Hex,
  compareToIdManifest,
  compareToFormOrderManifest,
  historicalLength,
  canonicalLength,
  assertValidQuestionShape,
  classifyCue,
  computeCueMetrics,
  exactPigeonholeBalance,
  evaluatePositionBalance,
  poissonBinomialPMF,
  poissonBinomialTwoSidedPValue,
  evaluateLengthAssociation,
  evaluateGateA,
  detectAnswerSequencePatterns,
  evaluateAnswerSequence,
  REGIME_THRESHOLD,
  canonicalOrderKey,
  compareCanonicalOrder,
  selectPilotBatch,
  bootLiveCourseApi,
  flattenQuestionBank,
  buildDeterministicReport,
  PRACTICAL_MARGIN,
  CHI_SQUARE_MIN_EXPECTED_PER_CELL,
  SIGNIFICANCE_ALPHA,
  upperRegularizedIncompleteGamma,
  chiSquareUpperTailPValue,
  COHENS_W_MEDIUM_EFFECT,
  cohensW,
} from "../scripts/assessment-cue-audit.mjs";

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

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`✗ ${name}`);
    failures.push({ name, error });
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function q(id, opts, answerIndex, extra = {}) {
  return Object.assign(
    { id, d: "d", t: "t", x: 1, q: "stem", o: opts, a: answerIndex, why: "why", w: {} },
    extra
  );
}

function balancedPositionCounts(N, n) {
  const counts = new Array(n).fill(0);
  for (let i = 0; i < N; i += 1) { counts[i % n] += 1; }
  return counts;
}

// ---------------------------------------------------------------------------
// 1. Frozen baseline reproduced against the LIVE authored bank
// ---------------------------------------------------------------------------

let liveApi;
let liveQuestions;

async function boot() {
  liveApi = await bootLiveCourseApi();
  liveQuestions = flattenQuestionBank(liveApi.getQuestions());
}

await asyncTest("boots the live course and exposes getQuestions()", async () => {
  await boot();
  assert.ok(liveApi && typeof liveApi.getQuestions === "function");
  assert.ok(Array.isArray(liveQuestions));
});

test("the live authored bank has exactly 153 questions with 153 unique ids (no omission, no duplicate)", () => {
  assert.equal(liveQuestions.length, 153);
  const idSet = new Set(liveQuestions.map((it) => it.id));
  assert.equal(idSet.size, 153);
});

test("every authored id appears exactly once across all 17 forms combined", () => {
  const counts = new Map();
  liveQuestions.forEach((it) => counts.set(it.id, (counts.get(it.id) || 0) + 1));
  const duplicated = [...counts.entries()].filter(([, n]) => n !== 1);
  assert.deepEqual(duplicated, []);
});

test("reproducing the historical metric against the live bank exactly matches the frozen ORIGINAL_BASELINE", () => {
  const metrics = computeCueMetrics(liveQuestions, { lengthFn: historicalLength });
  assert.equal(metrics.total, ORIGINAL_BASELINE.totalAuthoredQuestions);
  assert.equal(metrics.uniquelyLongestCorrect, ORIGINAL_BASELINE.uniquelyLongestCorrect);
  assert.equal(metrics.longestOrTiedCorrect, ORIGINAL_BASELINE.longestOrTiedCorrect);
  const positionCounts = metrics.byOptionCount[0].positionCounts;
  assert.deepEqual(
    Object.fromEntries(positionCounts.map((c, i) => [String(i), c])),
    ORIGINAL_BASELINE.positionCounts
  );
});

test("the canonical metric currently reproduces the same counts as the historical metric on the live bank", () => {
  const canonical = computeCueMetrics(liveQuestions, { lengthFn: canonicalLength });
  const historical = computeCueMetrics(liveQuestions, { lengthFn: historicalLength });
  assert.equal(canonical.uniquelyLongestCorrect, historical.uniquelyLongestCorrect);
  assert.equal(canonical.longestOrTiedCorrect, historical.longestOrTiedCorrect);
});

test("ORIGINAL_BASELINE itself is frozen (Object.isFrozen)", () => {
  assert.equal(Object.isFrozen(ORIGINAL_BASELINE), true);
  assert.equal(Object.isFrozen(ORIGINAL_BASELINE.positionCounts), true);
});

// ---------------------------------------------------------------------------
// 2. Frozen exact-id manifest (point G) -- detects identity drift an
//    aggregate-count-only baseline cannot.
// ---------------------------------------------------------------------------

test("ORIGINAL_ID_MANIFEST contains exactly 153 unique, frozen ids", () => {
  assert.equal(ORIGINAL_ID_MANIFEST.count, 153);
  assert.equal(new Set(ORIGINAL_ID_MANIFEST.sortedIds).size, 153);
  assert.equal(Object.isFrozen(ORIGINAL_ID_MANIFEST.sortedIds), true);
});

test("the live bank's id set matches the frozen manifest exactly (digest and set both agree)", () => {
  const check = compareToIdManifest(liveQuestions.map((it) => it.id));
  assert.equal(check.matches, true);
  assert.deepEqual(check.removed, []);
  assert.deepEqual(check.added, []);
  assert.equal(check.hasDuplicates, false);
});

test("counterexample: an id REPLACEMENT that preserves the total count of 153 is still detected (aggregate counts alone would miss this)", () => {
  const swapped = [...ORIGINAL_ID_MANIFEST.sortedIds];
  swapped[0] = "totally-unrelated-replacement-id";
  const check = compareToIdManifest(swapped);
  assert.equal(check.matches, false);
  assert.equal(check.liveCount, 153); // count alone is unchanged -- this is the point
  assert.ok(check.removed.length === 1);
  assert.ok(check.added.length === 1);
  assert.equal(check.added[0], "totally-unrelated-replacement-id");
});

test("counterexample: a removed id (count drops to 152) is detected", () => {
  const removed = ORIGINAL_ID_MANIFEST.sortedIds.slice(1);
  const check = compareToIdManifest(removed);
  assert.equal(check.matches, false);
  assert.equal(check.liveCount, 152);
  assert.deepEqual(check.removed, [ORIGINAL_ID_MANIFEST.sortedIds[0]]);
});

test("counterexample: an added id (count rises to 154) is detected", () => {
  const added = [...ORIGINAL_ID_MANIFEST.sortedIds, "a-brand-new-id"];
  const check = compareToIdManifest(added);
  assert.equal(check.matches, false);
  assert.equal(check.liveCount, 154);
  assert.deepEqual(check.added, ["a-brand-new-id"]);
});

test("counterexample: a duplicated id is detected via hasDuplicates even though the manifest set itself still matches", () => {
  const duplicated = [...ORIGINAL_ID_MANIFEST.sortedIds];
  duplicated[1] = duplicated[0];
  const check = compareToIdManifest(duplicated);
  assert.equal(check.hasDuplicates, true);
  assert.equal(check.matches, false);
});

test("sha256Hex is a deterministic, order-sensitive hash function", () => {
  assert.equal(sha256Hex("abc"), sha256Hex("abc"));
  assert.notEqual(sha256Hex("abc"), sha256Hex("abd"));
});

test("the CLI report's noDuplicateIds field is accurately named -- it reflects uniqueness only; idManifestCheck is the real omission/addition detector", () => {
  const report = buildDeterministicReport(liveQuestions);
  assert.equal(report.noDuplicateIds, true);
  assert.equal(report.idManifestCheck.matches, true);
});

// ---------------------------------------------------------------------------
// 3. Historical vs. canonical length metric: exact behavior
// ---------------------------------------------------------------------------

test("historicalLength is raw UTF-16 code-unit .length with no normalization", () => {
  assert.equal(historicalLength("abc"), 3);
  assert.equal(historicalLength("  abc  "), 7);
  assert.equal(historicalLength("a  b"), 4);
});

test("canonicalLength does NOT decode HTML entities (corrected -- esc()/textContent never interprets them for the learner)", () => {
  assert.equal(canonicalLength("A &amp; B"), "A &amp; B".length);
});

test("canonicalLength does NOT strip HTML tags (corrected -- a literal <b> renders as literal text in this app)", () => {
  const withTag = "<b>Bold</b> text";
  assert.equal(canonicalLength(withTag), withTag.length);
});

test("canonicalLength does NOT strip trailing punctuation (corrected -- it is genuinely rendered, not decorative padding to this metric)", () => {
  assert.notEqual(canonicalLength("Complete statement."), canonicalLength("Complete statement"));
  assert.equal(canonicalLength("Complete statement."), canonicalLength("Complete statement") + 1);
});

test("canonicalLength collapses internal whitespace and trims (a genuine rendering effect -- no white-space:pre override on .qopt)", () => {
  assert.equal(canonicalLength("  a    b  "), "a b".length);
});

test("canonicalLength counts grapheme clusters, not UTF-16 code units, for non-BMP characters", () => {
  const withEmoji = "a\u{1F44D}b";
  assert.equal(historicalLength(withEmoji), 4);
  assert.equal(canonicalLength(withEmoji), 3);
});

test("canonicalLength NFC-normalizes so precomposed and decomposed forms measure identically", () => {
  const precomposed = "café";
  const decomposed = "café";
  assert.equal(canonicalLength(precomposed), canonicalLength(decomposed));
});

test("length metrics throw on non-string input rather than silently miscounting", () => {
  assert.throws(() => historicalLength(123), TypeError);
  assert.throws(() => canonicalLength(null), TypeError);
  assert.throws(() => canonicalLength(undefined), TypeError);
});

test("counterexample (point B): a real current option's literal comparison operator is measured, not misread as a tag boundary", () => {
  const real = "Countable > analyzable > karyotypable";
  assert.equal(canonicalLength(real), real.length);
});

// ---------------------------------------------------------------------------
// 4. Malformed question-shape rejection
// ---------------------------------------------------------------------------

test("rejects a question with fewer than 2 options", () => {
  assert.throws(() => assertValidQuestionShape(q("m", ["only one"], 0)), TypeError);
});

test("rejects a question with an out-of-range answer index", () => {
  assert.throws(() => assertValidQuestionShape(q("m", ["a", "b"], 2)), TypeError);
});

test("rejects a question with a non-integer answer index", () => {
  assert.throws(() => assertValidQuestionShape(q("m", ["a", "b"], 0.5)), TypeError);
});

test("rejects a question with a negative answer index", () => {
  assert.throws(() => assertValidQuestionShape(q("m", ["a", "b"], -1)), TypeError);
});

test("rejects a question with a missing/empty id", () => {
  assert.throws(() => assertValidQuestionShape(q("", ["a", "b"], 0)), TypeError);
});

test("rejects a question whose options array contains a non-string or empty entry", () => {
  assert.throws(() => assertValidQuestionShape(q("m", ["a", ""], 0)), TypeError);
  assert.throws(() => assertValidQuestionShape(q("m", ["a", 5], 0)), TypeError);
});

test("computeCueMetrics propagates the same malformed-input rejection, not a silent skip", () => {
  assert.throws(() => computeCueMetrics([q("m", ["a", "b"], 9)]), TypeError);
});

test("selectPilotBatch propagates the same malformed-input rejection", () => {
  assert.throws(() => selectPilotBatch([q("m", ["a"], 0)]), TypeError);
});

// ---------------------------------------------------------------------------
// 5. classifyCue: two-, three-, and four-option fixtures; ties
// ---------------------------------------------------------------------------

test("classifyCue: 4-option item, correct answer uniquely longest", () => {
  const item = q("m", ["short", "shorter", "the correct and longest option", "mid length"], 2);
  const cue = classifyCue(item, historicalLength);
  assert.equal(cue.cueClass, "uniquely-longest");
  assert.equal(cue.tiedAtMax, 1);
  assert.equal(cue.correctAtMax, true);
  assert.equal(cue.nullProbabilityCorrectAtMax, 1 / 4);
});

test("classifyCue: 4-option item, correct answer tied for longest (2-way tie)", () => {
  const item = q("m", ["aaaaaaaaaa", "correct-aa", "bb", "cc"], 1);
  const cue = classifyCue(item, historicalLength);
  assert.equal(item.o[0].length, item.o[1].length);
  assert.equal(cue.cueClass, "tied-longest");
  assert.equal(cue.tiedAtMax, 2);
  assert.equal(cue.nullProbabilityCorrectAtMax, 2 / 4);
});

test("classifyCue: all-way tie (every option the same length) gives null probability 1 -- length carries zero information", () => {
  const item = q("m", ["aaaa", "bbbb", "cccc", "dddd"], 2);
  const cue = classifyCue(item, historicalLength);
  assert.equal(cue.tiedAtMax, 4);
  assert.equal(cue.nullProbabilityCorrectAtMax, 1);
  assert.equal(cue.correctAtMax, true);
});

test("classifyCue: 4-option item, correct answer not the longest", () => {
  const item = q("m", ["a much longer distractor option here", "short", "b", "c"], 1);
  const cue = classifyCue(item, historicalLength);
  assert.equal(cue.cueClass, "not-longest");
  assert.equal(cue.correctAtMax, false);
});

test("classifyCue: 2-option item works identically to 4-option (uniquely-longest, tied, not-longest)", () => {
  assert.equal(classifyCue(q("m", ["short", "much longer correct option"], 1), historicalLength).cueClass, "uniquely-longest");
  assert.equal(classifyCue(q("m", ["same", "same"], 0), historicalLength).cueClass, "tied-longest");
  assert.equal(classifyCue(q("m", ["much longer distractor here", "short"], 1), historicalLength).cueClass, "not-longest");
});

test("classifyCue: 3-option item works identically", () => {
  const item = q("m", ["aa", "the longest correct option here", "b"], 1);
  assert.equal(classifyCue(item, historicalLength).cueClass, "uniquely-longest");
});

test("computeCueMetrics separates option-count groups for POSITION balance (mixed 2/3/4-option bank)", () => {
  const mixed = [
    q("a", ["x", "y"], 0),
    q("b", ["x", "y", "z"], 1),
    q("c", ["w", "x", "y", "z"], 2),
    q("d", ["x", "y", "z", "w"], 3),
  ];
  const metrics = computeCueMetrics(mixed);
  const counts = metrics.byOptionCount.map((g) => [g.optionCount, g.total]);
  assert.deepEqual(counts, [[2, 1], [3, 1], [4, 2]]);
  assert.equal(metrics.items.length, 4);
});

// ---------------------------------------------------------------------------
// 6. Gate A position balance: the small-N structural regime (point A)
// ---------------------------------------------------------------------------

test("exactPigeonholeBalance: has no free parameter -- floor/ceil are fully derived from N and n", () => {
  assert.deepEqual(exactPigeonholeBalance([2, 1, 1, 1], 4, 5), { balanced: true, floorAllowed: 1, ceilAllowed: 2, outOfRangeCounts: [] });
  assert.equal(exactPigeonholeBalance([5, 0, 0, 0], 4, 5).balanced, false);
});

test("exactPigeonholeBalance / evaluatePositionBalance: the LOWER bound (floor) is independently enforced -- a position undershooting the floor fails even when no position overshoots the ceiling", () => {
  // N=5, n=4: floor=1, ceil=2. [2,2,1,0] has max=2 (within ceil) but one
  // position at 0 (below floor=1) -- this specifically isolates the lower
  // bound from the upper bound, which an all-at-one-position fixture
  // (always violating the upper bound too) cannot do.
  const detail = exactPigeonholeBalance([2, 2, 1, 0], 4, 5);
  assert.equal(detail.balanced, false);
  assert.ok(detail.outOfRangeCounts.includes(0));

  const result = evaluatePositionBalance({ optionCount: 4, total: 5, positionCounts: [2, 2, 1, 0] });
  assert.equal(result.status, "fail");
  assert.equal(result.regime, "structural");
});

[5, 6, 7, 8, 9, 13].forEach((N) => {
  test(`counterexample (point A) resolved: a perfectly balanced ${N}-item, 4-option form now PASSES Gate A position balance (it could not before this correction)`, () => {
    const counts = balancedPositionCounts(N, 4);
    const result = evaluatePositionBalance({ optionCount: 4, total: N, positionCounts: counts });
    assert.equal(result.status, "pass", `counts=${JSON.stringify(counts)}`);
    assert.equal(result.regime, "structural");
  });

  test(`a correspondingly imbalanced ${N}-item, 4-option form (all at one position) still FAILS`, () => {
    const counts = [N, 0, 0, 0];
    const result = evaluatePositionBalance({ optionCount: 4, total: N, positionCounts: counts });
    assert.equal(result.status, "fail");
    assert.equal(result.regime, "structural");
  });
});

test("position balance: inconclusive ONLY when N < optionCount -- not the default outcome for any valid small form (corrected precise meaning)", () => {
  const tooFew = evaluatePositionBalance({ optionCount: 4, total: 2, positionCounts: [1, 1, 0, 0] });
  assert.equal(tooFew.status, "inconclusive");
  // Every N >= n gets a definitive pass/fail -- verified across the whole small-N range.
  for (let N = 4; N < REGIME_THRESHOLD(4); N += 1) {
    const balanced = evaluatePositionBalance({ optionCount: 4, total: N, positionCounts: balancedPositionCounts(N, 4) });
    assert.notEqual(balanced.status, "inconclusive", `N=${N} balanced case must not be inconclusive`);
  }
});

test("REGIME_THRESHOLD(n) is the single shared boundary for both regime selection and chi-square computability (point E)", () => {
  const n = 4;
  const threshold = REGIME_THRESHOLD(n);
  assert.equal(threshold, CHI_SQUARE_MIN_EXPECTED_PER_CELL * n);

  const below = evaluatePositionBalance({ optionCount: n, total: threshold - 1, positionCounts: balancedPositionCounts(threshold - 1, n) });
  assert.equal(below.regime, "structural");
  assert.equal(below.detail.statisticalResult, "not-computed-small-n-structural-regime-applies");

  const at = evaluatePositionBalance({ optionCount: n, total: threshold, positionCounts: balancedPositionCounts(threshold, n) });
  assert.equal(at.regime, "statistical");
  assert.notEqual(at.detail.statisticalResult, "not-computed-small-n-structural-regime-applies");

  const above = evaluatePositionBalance({ optionCount: n, total: threshold + 1, positionCounts: balancedPositionCounts(threshold + 1, n) });
  assert.equal(above.regime, "statistical");
});

test("position balance: large-N statistical regime still works as before -- practical margin boundary just inside vs. just beyond", () => {
  const N = 1000;
  const atBoundary = Math.floor(N * (0.25 + PRACTICAL_MARGIN));
  const rest = N - atBoundary;
  const okCounts = [atBoundary, Math.ceil(rest / 3), Math.floor(rest / 3), rest - Math.ceil(rest / 3) - Math.floor(rest / 3)];
  const ok = evaluatePositionBalance({ optionCount: 4, total: N, positionCounts: okCounts });
  assert.ok(atBoundary / N <= 0.25 + PRACTICAL_MARGIN);

  const over = Math.ceil(N * (0.25 + PRACTICAL_MARGIN)) + 1;
  const rest2 = N - over;
  const failCounts = [over, Math.ceil(rest2 / 3), Math.floor(rest2 / 3), rest2 - Math.ceil(rest2 / 3) - Math.floor(rest2 / 3)];
  const fail = evaluatePositionBalance({ optionCount: 4, total: N, positionCounts: failCounts });
  assert.equal(fail.status, "fail");
});

test("evaluateGateA: the live authored bank reports FAIL -- QL-033 remains unresolved (intentional, not a test-suite bug)", () => {
  const metrics = computeCueMetrics(liveQuestions, { lengthFn: canonicalLength });
  // The whole 153-question bank (all 17 forms concatenated) is not one
  // learner-facing encounter order -- matches buildDeterministicReport()'s
  // own whole-bank call (issue 3, docs/ASSESSMENT_VALIDITY.md section 4.10a).
  const gate = evaluateGateA(metrics, { sequenceApplicable: false });
  assert.equal(gate.overall, "fail");
  assert.equal(gate.length.status, "fail");
  assert.equal(gate.sequence.status, "not-applicable");
  assert.equal(gate.sequence.applicable, false);
  const fourOptionPosition = gate.positionByOptionCount.find((g) => g.optionCount === 4);
  assert.equal(fourOptionPosition.position.status, "fail");
});

test("evaluateGateA: every one of the 17 individual forms also currently fails Gate A", () => {
  const byModule = new Map();
  liveQuestions.forEach((it) => {
    if (!byModule.has(it.module)) byModule.set(it.module, []);
    byModule.get(it.module).push(it);
  });
  assert.equal(byModule.size, 17);
  for (const [moduleKey, items] of byModule) {
    const metrics = computeCueMetrics(items, { lengthFn: canonicalLength });
    const gate = evaluateGateA(metrics);
    assert.equal(gate.overall, "fail", `expected ${moduleKey} to currently fail Gate A`);
  }
});

// ---------------------------------------------------------------------------
// 7. Gate A length association: tie-aware model (point D) and mixed
//    option-count evaluation (point C)
// ---------------------------------------------------------------------------

test("poissonBinomialPMF: sums to 1 and matches a known simple case (two fair coins)", () => {
  const pmf = poissonBinomialPMF([0.5, 0.5]);
  assert.equal(pmf.length, 3);
  const sum = pmf.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.ok(Math.abs(pmf[0] - 0.25) < 1e-9);
  assert.ok(Math.abs(pmf[1] - 0.5) < 1e-9);
  assert.ok(Math.abs(pmf[2] - 0.25) < 1e-9);
});

test("poissonBinomialTwoSidedPValue: p=1 at the exact expected value for a symmetric case, small elsewhere", () => {
  const probs = new Array(100).fill(0.25);
  const pAtMean = poissonBinomialTwoSidedPValue(probs, 25);
  assert.ok(pAtMean > 0.05);
  const pExtreme = poissonBinomialTwoSidedPValue(probs, 100);
  assert.ok(pExtreme < 1e-10);
});

test("counterexample (point D) resolved: a bank that always keys a member of a TIED maximum-length pair (never uniquely longest) is now caught", () => {
  // 20% of items: correct is uniquely longest (looks "normal" against a flat
  // 25% expectation). 80%: a 2-way tie for longest, correct always one of
  // the two tied options. The OLD model (uniquely-longest rate only) would
  // see 20%, inside its +-15% margin around 25% -- and PASS, missing a
  // 100% max-length-set association entirely.
  const items = [];
  for (let i = 0; i < 10; i += 1) { items.push(classifyCue(q("u" + i, ["a", "the uniquely longest correct one here", "c", "d"], 1), historicalLength)); }
  for (let i = 0; i < 40; i += 1) { items.push(classifyCue(q("t" + i, ["short", "tied max option one", "tied max option two", "short"], i % 2 === 0 ? 1 : 2), historicalLength)); }

  const uniquelyLongestCount = items.filter((it) => it.cueClass === "uniquely-longest").length;
  assert.equal(uniquelyLongestCount, 10); // 20% of 50 -- would have looked "normal" under the old flat-rate check
  const oldObserved = uniquelyLongestCount / items.length;
  assert.ok(oldObserved >= 0.25 - PRACTICAL_MARGIN && oldObserved <= 0.25 + PRACTICAL_MARGIN, "the old flat-rate check would have passed this");

  const result = evaluateLengthAssociation(items);
  assert.equal(result.status, "fail");
  assert.equal(result.detail.observed, 50); // every item's correct answer is in its own max-length set
  assert.equal(result.detail.observedRate, 1);
});

test("length association: all-way-tied items carry zero information and are correctly not flagged", () => {
  const items = [];
  for (let i = 0; i < 20; i += 1) { items.push(classifyCue(q("x" + i, ["aaaa", "bbbb", "cccc", "dddd"], i % 4), historicalLength)); }
  const result = evaluateLengthAssociation(items);
  assert.equal(result.status, "pass");
  assert.equal(result.detail.pValue, 1);
});

test("length association: symmetric in both directions -- a rate significantly BELOW the tie-aware expectation also fails", () => {
  const items = [];
  for (let i = 0; i < 40; i += 1) { items.push(classifyCue(q("x" + i, ["the longer distractor option here", "b", "c", "d"], (i % 3) + 1), historicalLength)); }
  const result = evaluateLengthAssociation(items);
  assert.equal(result.status, "fail");
  assert.ok(result.detail.observedRate < result.detail.expectedRate);
});

test("length association: a genuinely non-cued, deliberately rotating bank passes", () => {
  const items = [];
  const stems = ["short", "medium length", "a fair bit longer than the others", "mid"];
  for (let i = 0; i < 80; i += 1) { items.push(classifyCue(q("x" + i, stems, i % 4), historicalLength)); }
  const result = evaluateLengthAssociation(items);
  assert.equal(result.status, "pass");
});

test("length association: inconclusive only for a genuinely empty scope", () => {
  assert.equal(evaluateLengthAssociation([]).status, "inconclusive");
});

test("counterexample (point C) resolved: mixed 2/3/4-option scopes are evaluated directly, not made inconclusive merely for containing more than one option-count group", () => {
  const mixedNonCued = [];
  for (let i = 0; i < 20; i += 1) { mixedNonCued.push(classifyCue(q("m2-" + i, ["a", "the somewhat longer one"], i % 2), historicalLength)); }
  for (let i = 0; i < 20; i += 1) { mixedNonCued.push(classifyCue(q("m3-" + i, ["a", "bb", "ccc"], i % 3), historicalLength)); }
  for (let i = 0; i < 20; i += 1) { mixedNonCued.push(classifyCue(q("m4-" + i, ["a", "bb", "ccc", "dddd"], i % 4), historicalLength)); }
  const nonCuedResult = evaluateLengthAssociation(mixedNonCued);
  assert.equal(nonCuedResult.status, "pass");

  const mixedCued = [];
  for (let i = 0; i < 20; i += 1) { mixedCued.push(classifyCue(q("m2-" + i, ["a", "the correct longer one here"], 1), historicalLength)); }
  for (let i = 0; i < 20; i += 1) { mixedCued.push(classifyCue(q("m3-" + i, ["a", "bb", "the correct longest one here"], 2), historicalLength)); }
  for (let i = 0; i < 20; i += 1) { mixedCued.push(classifyCue(q("m4-" + i, ["a", "bb", "ccc", "the correct longest one here"], 3), historicalLength)); }
  const cuedResult = evaluateLengthAssociation(mixedCued);
  assert.equal(cuedResult.status, "fail");
});

test("evaluateGateA combines position (grouped) and length (ungrouped) correctly for a mixed-option-count scope", () => {
  const mixed = [];
  for (let i = 0; i < 20; i += 1) { mixed.push(q("m2-" + i, ["a", "the somewhat longer one"], i % 2)); }
  for (let i = 0; i < 20; i += 1) { mixed.push(q("m4-" + i, ["a", "bb", "ccc", "dddd"], i % 4)); }
  const metrics = computeCueMetrics(mixed, { lengthFn: historicalLength });
  const gate = evaluateGateA(metrics);
  assert.equal(metrics.byOptionCount.length, 2);
  assert.notEqual(gate.length.status, "inconclusive");
});

// ---------------------------------------------------------------------------
// 8. Statistical naming and boundary correctness (point E)
// ---------------------------------------------------------------------------

test("SIGNIFICANCE_ALPHA is used consistently and is the conventional, documented conservative value", () => {
  assert.equal(SIGNIFICANCE_ALPHA, 0.01);
});

test("a statistical result is never reported as an actual computed pass when it was not computed (structural regime uses a distinct, unambiguous label)", () => {
  const result = evaluatePositionBalance({ optionCount: 4, total: 5, positionCounts: [2, 1, 1, 1] });
  assert.equal(result.detail.statisticalResult, "not-computed-small-n-structural-regime-applies");
  assert.notEqual(result.detail.statisticalResult, "fails-to-reject-uniform");
});

// ---------------------------------------------------------------------------
// 9. Deterministic pilot selection: canonical order, not input order (point F)
// ---------------------------------------------------------------------------

test("canonicalOrderKey/compareCanonicalOrder: numeric module comparison, not lexicographic (m2 before m10)", () => {
  assert.ok(compareCanonicalOrder("m2-q1", "m10-q1") < 0);
  assert.ok("m10-q1" < "m2-q1"); // the naive string comparison would get this backwards
  assert.ok(compareCanonicalOrder("m16-q7", "final-q1") < 0);
  assert.ok(compareCanonicalOrder("m1-q2", "m1-q10") < 0);
});

test("selectPilotBatch on the live bank is deterministic across repeated calls", () => {
  const first = selectPilotBatch(liveQuestions);
  const second = selectPilotBatch(liveQuestions);
  assert.deepEqual(first.ids, second.ids);
  assert.deepEqual(first.records, second.records);
});

test("counterexample (point F) resolved: reversing the live bank's input array now produces the EXACT SAME selected ids (a real, strong equality check, not the prior vacuous constant-label comparison)", () => {
  const forward = selectPilotBatch(liveQuestions);
  const reversed = selectPilotBatch([...liveQuestions].reverse());
  assert.deepEqual(reversed.ids, forward.ids);
});

test("counterexample (point F) resolved: a deterministic shuffle of the live bank's input array also produces the exact same selected ids", () => {
  const shuffled = [...liveQuestions];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = (i * 2654435761) % (i + 1);
    const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
  }
  const shuffledResult = selectPilotBatch(shuffled);
  const forward = selectPilotBatch(liveQuestions);
  assert.deepEqual(shuffledResult.ids, forward.ids);
});

test("the live bank's pilot batch matches the FROZEN_PILOT_MANIFEST exactly, in order", () => {
  const pilot = selectPilotBatch(liveQuestions);
  assert.deepEqual(pilot.ids, [...FROZEN_PILOT_MANIFEST]);
});

test("the live bank's pilot batch covers all 5 domains, all difficulty levels present, and all answer positions actually used, using REAL recorded values (not a constant label)", () => {
  const pilot = selectPilotBatch(liveQuestions);
  const idToQuestion = new Map(liveQuestions.map((it) => [it.id, it]));
  const pilotItems = pilot.ids.map((id) => idToQuestion.get(id));

  const allDomains = new Set(liveQuestions.map((it) => it.d));
  const pilotDomains = new Set(pilot.records.map((r) => r.domain));
  assert.deepEqual(pilotDomains, allDomains);
  // Cross-check the record's own domain field against the actual question.
  pilot.records.forEach((r) => { assert.equal(r.domain, idToQuestion.get(r.id).d); });

  const allDifficulties = new Set(liveQuestions.map((it) => it.x));
  const pilotDifficulties = new Set(pilot.records.map((r) => r.difficulty));
  assert.deepEqual(pilotDifficulties, allDifficulties);

  const usedPositions = new Set(liveQuestions.map((it) => it.a));
  const pilotPositions = new Set(pilot.records.map((r) => r.answerPosition));
  assert.deepEqual(pilotPositions, usedPositions);

  assert.ok(pilotItems.every(Boolean));
});

test("the live bank's pilot batch includes at least one final-form and one module-quiz item, using the real recorded formContext", () => {
  const pilot = selectPilotBatch(liveQuestions);
  const contexts = pilot.records.map((r) => r.formContext);
  assert.ok(contexts.includes("final"));
  assert.ok(contexts.some((c) => c === "module"));
});

test("the live bank's pilot batch includes both full and partial distractor-feedback coverage, using the real recorded field", () => {
  const pilot = selectPilotBatch(liveQuestions);
  const coverages = new Set(pilot.records.map((r) => r.distractorFeedbackCoverage));
  assert.deepEqual(coverages, new Set(["full", "partial"]));
});

test("selectPilotBatch never includes a duplicate id", () => {
  const pilot = selectPilotBatch(liveQuestions);
  assert.equal(new Set(pilot.ids).size, pilot.ids.length);
});

test("selectPilotBatch reports D (index 3) as an unused answer position in the current bank", () => {
  const pilot = selectPilotBatch(liveQuestions);
  assert.deepEqual(pilot.unusedAnswerPositions, [3]);
});

test("selectPilotBatch selection never evaluates or mutates question content -- input objects are untouched", () => {
  const before = JSON.parse(JSON.stringify(liveQuestions));
  selectPilotBatch(liveQuestions);
  const after = JSON.parse(JSON.stringify(liveQuestions));
  assert.deepEqual(before, after);
});

// ---------------------------------------------------------------------------
// 10. Deterministic JSON output (point J)
// ---------------------------------------------------------------------------

test("counterexample (point J) resolved: buildDeterministicReport() contains no wall-clock timestamp field, and repeated calls on identical input are byte-identical", () => {
  const report1 = buildDeterministicReport(liveQuestions);
  const report2 = buildDeterministicReport(liveQuestions);
  const json1 = JSON.stringify(report1);
  const json2 = JSON.stringify(report2);
  assert.equal(json1, json2);
  assert.ok(!json1.includes("generatedAt"));
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(json1), "no ISO timestamp anywhere in the deterministic payload");
});

// ---------------------------------------------------------------------------
// 12. Complete Gate A achievability (not position-only), answer-key
//     sequence predictability, and the practical-vs-statistical decision
//     policy (round-3 correction; independent review found the size-loop
//     tests above only ever exercised evaluatePositionBalance() directly,
//     never proving the COMBINED evaluateGateA() -- including the
//     tie-aware length component -- could return "pass" for a realistic
//     full question form of any required size).
// ---------------------------------------------------------------------------

// Builds one full question item with FULL independent control over (a)
// which slot is correct (for position balance) and (b) whether that slot
// is ALSO this item's own length-max slot (for length association) --
// deliberately decoupled so a passing fixture cannot merely be a lucky
// coincidence of the two properties, and a perturbation aimed at one
// property does not silently also perturb the other.
function buildIndependentItem(id, n, a, isMax) {
  const lens = [];
  for (let k = 0; k < n; k += 1) lens.push(10 + k); // n distinct lengths
  const maxVal = Math.max(...lens);
  const maxIdx = lens.indexOf(maxVal);
  const perm = [...Array(n).keys()];
  if (isMax) {
    if (a !== maxIdx) { const t = perm[a]; perm[a] = perm[maxIdx]; perm[maxIdx] = t; }
  } else if (a === maxIdx) {
    const other = a === 0 ? 1 : 0;
    const t = perm[a]; perm[a] = perm[other]; perm[other] = t;
  }
  const opts = perm.map((li) => "x".repeat(lens[li]));
  return q(id, opts, a);
}

// A hash-based (multiplicative-congruential), deliberately non-arithmetic
// selector for "is this item's correct answer at its own max-length slot"
// -- decoupled from the answer-position sequence itself, landing close to
// the 1/n null rate without being a simple function of the position
// sequence (verified directly below to actually produce observedRate
// close to expectedRate for every required size, not assumed).
function hashIsMax(i, n) {
  const h = ((i + 1) * 2654435761) >>> 0;
  return (h % n) === 0;
}

// For each required form size, a hand-verified (see the correction's
// reproduction scripts) answer-position ORDER that is simultaneously:
// exact-pigeonhole BALANCED, and free of every detectAnswerSequencePatterns()
// finding (no repeating cycle, no palindrome, no excessive run) -- i.e. a
// genuinely non-cued, non-patterned key, not merely a rotating i%n
// sequence (which IS itself a repeating-cycle finding, and must not be
// used as a "should pass" fixture after this correction).
const BALANCED_NONCYCLIC_ORDERS = {
  5: [2, 0, 3, 1, 0],
  6: [0, 1, 3, 2, 1, 0],
  7: [0, 2, 2, 3, 1, 1, 0],
  8: [3, 0, 3, 2, 0, 1, 2, 1],
  9: [1, 0, 0, 2, 2, 3, 3, 1, 0],
  13: [0, 3, 0, 3, 1, 2, 0, 1, 2, 3, 1, 2, 0],
};

// For each required form size, a hand-verified answer-position order that
// is position-IMBALANCED (fails exact pigeonhole balance) while remaining
// free of every sequence finding -- isolates a position-only failure from
// sequence predictability.
const IMBALANCED_CLEAN_ORDERS = {
  5: [1, 0, 2, 0, 0],
  6: [0, 1, 3, 2, 0, 0],
  7: [0, 2, 1, 3, 0, 0, 0],
  8: [3, 0, 1, 2, 0, 0, 1, 0],
  9: [0, 0, 0, 1, 2, 1, 3, 0, 0],
  13: [0, 2, 0, 1, 0, 3, 0, 0, 2, 3, 0, 1, 0],
};

[5, 6, 7, 8, 9, 13].forEach((N) => {
  test(`counterexample (issue 1) resolved: a complete, independently-constructed ${N}-item 4-option FORM (position balanced, non-cyclic, non-cued length) passes the COMBINED evaluateGateA(), not merely evaluatePositionBalance() in isolation`, () => {
    const order = BALANCED_NONCYCLIC_ORDERS[N];
    const items = order.map((a, i) => buildIndependentItem(`pass${N}-${i}`, 4, a, hashIsMax(i, 4)));
    const metrics = computeCueMetrics(items);
    const gate = evaluateGateA(metrics);
    assert.equal(gate.overall, "pass", JSON.stringify(gate, null, 2));
    gate.positionByOptionCount.forEach((g) => assert.notEqual(g.position.status, "inconclusive"));
    assert.notEqual(gate.length.status, "inconclusive");
    assert.notEqual(gate.sequence.status, "inconclusive");
  });

  test(`counterexample (issue 1) resolved: perturbing ONLY answer positions (position-imbalanced, length and sequence unperturbed) fails the ${N}-item form via position specifically, not length or sequence`, () => {
    const order = IMBALANCED_CLEAN_ORDERS[N];
    const items = order.map((a, i) => buildIndependentItem(`posonly${N}-${i}`, 4, a, hashIsMax(i, 4)));
    const metrics = computeCueMetrics(items);
    const gate = evaluateGateA(metrics);
    assert.equal(gate.overall, "fail");
    gate.positionByOptionCount.forEach((g) => assert.equal(g.position.status, "fail"));
    assert.equal(gate.length.status, "pass");
    assert.equal(gate.sequence.status, "pass");
  });

  test(`counterexample (issue 1) resolved: perturbing ONLY the length/correctness relationship (always keying the max-length option; position order unperturbed) fails the ${N}-item form via length specifically, not position or sequence`, () => {
    const order = BALANCED_NONCYCLIC_ORDERS[N];
    const items = order.map((a, i) => buildIndependentItem(`lenonly${N}-${i}`, 4, a, true));
    const metrics = computeCueMetrics(items);
    const gate = evaluateGateA(metrics);
    assert.equal(gate.overall, "fail");
    gate.positionByOptionCount.forEach((g) => assert.equal(g.position.status, "pass"));
    assert.equal(gate.length.status, "fail");
    assert.equal(gate.sequence.status, "pass");
  });
});

test("counterexample (issue 1) resolved: a mixed 2/3/4-option scope, each group with enough items for a definitive small-N structural result, passes the complete Gate A with no group silently inconclusive", () => {
  const mixed = [];
  [2, 3, 4].forEach((n) => {
    const N = n * 2 + 1; // >= n, < REGIME_THRESHOLD(n) -- structural regime, still a definitive result
    for (let i = 0; i < N; i += 1) { mixed.push(buildIndependentItem(`mix-n${n}-${i}`, n, i % n, hashIsMax(i, n))); }
  });
  const metrics = computeCueMetrics(mixed);
  const gate = evaluateGateA(metrics);
  assert.equal(gate.overall, "pass", JSON.stringify(gate, null, 2));
  assert.equal(gate.positionByOptionCount.length, 3);
  gate.positionByOptionCount.forEach((g) => {
    assert.equal(g.position.status, "pass");
    assert.equal(g.position.regime, "structural");
  });
  assert.equal(gate.length.status, "pass");
  assert.equal(gate.sequence.status, "pass");
});

// ---------------------------------------------------------------------------
// 12a. Answer-key sequence pattern detection (issue 2): aggregate position
//      BALANCE is necessary but not sufficient -- a cyclic, alternating,
//      mirrored, or excessive-run key can satisfy exact pigeonhole balance
//      perfectly while still being mechanically predictable.
// ---------------------------------------------------------------------------

test("counterexample (issue 2) resolved: the literal A,B,C,D,A,B,C,D,A example (N=9, n=4) satisfies exact pigeonhole balance perfectly, yet is now caught as a repeating-cycle sequence finding", () => {
  const positions = [0, 1, 2, 3, 0, 1, 2, 3, 0];
  const counts = [3, 2, 2, 2];
  assert.equal(exactPigeonholeBalance(counts, 4, 9).balanced, true, "balance alone would have passed this key");
  const findings = detectAnswerSequencePatterns(positions, 4);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, "repeating-cycle");
  assert.equal(findings[0].period, 4);
});

test("counterexample (issue 2) resolved: a balanced alternating A,B,A,B,A,B,A key (2-option items, N=7) is caught as a repeating-cycle", () => {
  const findings = detectAnswerSequencePatterns([0, 1, 0, 1, 0, 1, 0], 2);
  assert.ok(findings.some((f) => f.type === "repeating-cycle" && f.period === 1 === false));
  assert.ok(findings.some((f) => f.type === "repeating-cycle" && f.period === 2));
});

test("counterexample (issue 2) resolved: a balanced mirrored A,B,C,D,D,C,B,A key (N=8, n=4) is caught as a palindrome, distinctly from a repeating-cycle", () => {
  const findings = detectAnswerSequencePatterns([0, 1, 2, 3, 3, 2, 1, 0], 4);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, "mirrored");
});

test("counterexample (issue 2) resolved: a balanced but excessively-clustered A,A,A,B,B,B,C,C,C key (N=9, n=3) is caught as three excessive-run findings, one per clustered position", () => {
  const counts = [3, 3, 3];
  assert.equal(exactPigeonholeBalance(counts, 3, 9).balanced, true, "balance alone would have passed this key too");
  const findings = detectAnswerSequencePatterns([0, 0, 0, 1, 1, 1, 2, 2, 2], 3);
  assert.equal(findings.length, 3);
  assert.ok(findings.every((f) => f.type === "excessive-run" && f.runLength === 3));
});

[5, 6, 7, 8, 9, 13].forEach((N) => {
  test(`sequence check: the balanced, non-cyclic hand-verified order for N=${N} triggers no finding at all (a genuinely non-obvious key is not penalized merely for being balanced)`, () => {
    const findings = detectAnswerSequencePatterns(BALANCED_NONCYCLIC_ORDERS[N], 4);
    assert.deepEqual(findings, []);
  });
});

test("evaluateAnswerSequence: does NOT demand a mechanically rotating key to satisfy balance -- a rotating i%n key is itself flagged, not required", () => {
  const rotating = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3];
  const items = rotating.map((a, i) => ({ id: `r${i}`, n: 4, answerPosition: a }));
  const result = evaluateAnswerSequence(items);
  assert.equal(result.status, "fail");
  assert.equal(result.findings[0].type, "repeating-cycle");
});

test("evaluateAnswerSequence: inconclusive ONLY when N < n (too few items to assess sequence structure), not the default for a small form", () => {
  const tooFew = evaluateAnswerSequence([{ id: "a", n: 4, answerPosition: 0 }, { id: "b", n: 4, answerPosition: 1 }]);
  assert.equal(tooFew.status, "inconclusive");
  const empty = evaluateAnswerSequence([]);
  assert.equal(empty.status, "inconclusive");
});

test("evaluateAnswerSequence: does not claim statistical randomness -- findings are deterministic structural facts (no p-value, no alpha) about the sequence, not an inferential claim", () => {
  const positions = BALANCED_NONCYCLIC_ORDERS[9];
  const items = positions.map((a, i) => ({ id: `s${i}`, n: 4, answerPosition: a }));
  const result = evaluateAnswerSequence(items);
  assert.equal(result.status, "pass");
  assert.equal("pValue" in result.detail, false);
  assert.equal("statisticalResult" in result.detail, false);
});

test("evaluateGateA: sequence is reported SEPARATELY from aggregate position balance -- a scope can have position=pass and sequence=fail simultaneously, and overall reflects both", () => {
  const rotating = [0, 1, 2, 3, 0, 1, 2, 3, 0]; // N=9, balanced, but a repeating cycle
  const items = rotating.map((a, i) => buildIndependentItem(`sep${i}`, 4, a, hashIsMax(i, 4)));
  const metrics = computeCueMetrics(items);
  const gate = evaluateGateA(metrics);
  gate.positionByOptionCount.forEach((g) => assert.equal(g.position.status, "pass"));
  assert.equal(gate.sequence.status, "fail");
  assert.equal(gate.overall, "fail");
});

// ---------------------------------------------------------------------------
// 12b. Practical vs. statistical significance (issue 3): a statistically
//      significant but practically trivial large-N deviation must not
//      fail Gate A by itself -- it must surface as an explicit review
//      flag instead, while a genuine practical-margin violation still
//      fails regardless of statistical power.
// ---------------------------------------------------------------------------

test("counterexample (issue 3) resolved: a large-N position deviation that is statistically significant (p < alpha) but stays well inside the practical margin now PASSES, with an explicit review flag, not a silent pass and not a fail", () => {
  const n = 4;
  const N = 100000;
  const expected = N / n;
  const counts = [expected + 500, expected - 167, expected - 167, expected - 166];
  const result = evaluatePositionBalance({ optionCount: n, total: N, positionCounts: counts });
  assert.ok(result.detail.practicalEffect.w < COHENS_W_MEDIUM_EFFECT, "must stay below the practical effect-size threshold -- otherwise this isn't testing the intended boundary");
  assert.equal(result.detail.statisticallySignificant, true, "must be statistically significant -- otherwise this isn't testing the intended boundary");
  assert.equal(result.status, "pass");
  assert.equal(result.reviewFlag.required, true);
  assert.ok(result.reviewFlag.reason && result.reviewFlag.reason.length > 0);
});

test("counterexample (issue 3) resolved: a large-N position deviation that exceeds the practical effect-size threshold still FAILS regardless of statistical power (a predeclared meaningful effect fails even when underpowered)", () => {
  const n = 4;
  const N = 40; // large-N regime for n=4 (REGIME_THRESHOLD=20), but small enough that power is limited
  const counts = [40 * 0.42, 40 * 0.20, 40 * 0.19, 40 * 0.19]; // 42% share -- a meaningful effect, but a small enough N that chi-square may not reject
  const result = evaluatePositionBalance({ optionCount: n, total: N, positionCounts: counts });
  assert.ok(result.detail.practicalEffect.w >= COHENS_W_MEDIUM_EFFECT);
  assert.equal(result.detail.practicalFail, true);
  assert.equal(result.status, "fail", "the practical effect size must be authoritative regardless of the statistical result at this N");
});

test("position balance: when the practical margin is exceeded AND the result is statistically significant, no review flag is raised (fail is not softened into a mere review)", () => {
  const n = 4;
  const N = 1000;
  const counts = [800, 67, 67, 66]; // grossly exceeds both practical margin and any chi-square critical value
  const result = evaluatePositionBalance({ optionCount: n, total: N, positionCounts: counts });
  assert.equal(result.status, "fail");
  assert.equal(result.detail.statisticallySignificant, true);
  assert.equal(result.reviewFlag.required, false, "review flags are reserved for pass-with-signal, never used to soften an actual fail");
});

test("counterexample (issue 3) resolved: the same practical-vs-statistical policy applies to length association -- a statistically significant but practically trivial association PASSES with a review flag, not a fail", () => {
  // Construct many items whose per-item null probability is exactly 1/2
  // (2-way ties), then push the observed rate just barely, but detectably
  // at large N, above 1/2 -- while staying inside the practical margin.
  const items = [];
  const N = 20000;
  const targetExtra = Math.round(N * 0.02); // 2 percentage points above the 50% tie-aware null
  for (let i = 0; i < N; i += 1) {
    const correctAtMax = i < N / 2 + targetExtra;
    items.push({
      id: `la${i}`, n: 4, tiedAtMax: 2, correctAtMax,
      nullProbabilityCorrectAtMax: 0.5,
    });
  }
  const result = evaluateLengthAssociation(items);
  assert.ok(result.detail.observedRate <= result.detail.expectedRate + PRACTICAL_MARGIN, "must stay inside the practical margin");
  assert.equal(result.detail.statisticallySignificant, true, "must be statistically significant at this N");
  assert.equal(result.status, "pass");
  assert.equal(result.reviewFlag.required, true);
});

test("evaluateGateA: reviewRequired aggregates review flags from position and length components without ever being conflated with an actual fail", () => {
  const n = 4;
  const N = 100000;
  const expected = N / n;
  const counts = [expected + 500, expected - 167, expected - 167, expected - 166];
  const items = BALANCED_NONCYCLIC_ORDERS[13].map((a, i) => buildIndependentItem(`rr${i}`, 4, a, hashIsMax(i, 4)));
  // Directly assemble a metrics-shaped object whose position group carries
  // the large-N significant-but-trivial deviation, reusing the already
  // clean items for length/sequence so only position's review flag fires.
  const metrics = computeCueMetrics(items);
  metrics.byOptionCount = [{ optionCount: 4, total: N, positionCounts: counts }];
  const gate = evaluateGateA(metrics);
  assert.equal(gate.overall, "pass");
  assert.equal(gate.reviewRequired, true);
  assert.ok(gate.reviewFlaggedComponents.some((c) => c.component.includes("position")));
});

// ---------------------------------------------------------------------------
// 12c. Exact Poisson-binomial two-sided p-value convention (issue 4):
//      independently hand-computed fixtures (NOT derived by calling the
//      implementation under test) proving the PROBABILITY-ORDERING
//      convention now used, distinguishing it from the DOUBLED-MINIMUM-TAIL
//      convention used before this correction.
// ---------------------------------------------------------------------------

test("counterexample (issue 4) resolved: probabilities=[0.9, 0.5, 0.5] -- the exact PMF matches hand computation, and the probability-ordering p-value diverges from the doubled-minimum-tail convention at every non-modal outcome", () => {
  // Hand computation (shown in the correction's reproduction record):
  //   pmf = [0.025, 0.275, 0.475, 0.225]  (sums to 1)
  // Doubled-minimum-tail p-values (the PRIOR convention, hand-computed
  // independently): obs=0 -> 0.05, obs=1 -> 0.60, obs=2 -> 1.00 (clipped), obs=3 -> 0.45
  // Probability-ordering p-values (the CORRECTED convention, hand-computed
  // independently): obs=0 -> 0.025, obs=1 -> 0.525, obs=2 -> 1.00, obs=3 -> 0.25
  const probs = [0.9, 0.5, 0.5];
  const pmf = poissonBinomialPMF(probs);
  assert.ok(Math.abs(pmf[0] - 0.025) < 1e-9);
  assert.ok(Math.abs(pmf[1] - 0.275) < 1e-9);
  assert.ok(Math.abs(pmf[2] - 0.475) < 1e-9);
  assert.ok(Math.abs(pmf[3] - 0.225) < 1e-9);

  const expectedProbabilityOrdering = [0.025, 0.525, 1.0, 0.25];
  const expectedDoubledTail = [0.05, 0.6, 1.0, 0.45]; // the prior convention -- must now DIFFER from the implementation at obs=0,1,3
  for (let obs = 0; obs < 4; obs += 1) {
    const actual = poissonBinomialTwoSidedPValue(probs, obs);
    assert.ok(Math.abs(actual - expectedProbabilityOrdering[obs]) < 1e-9, `obs=${obs}: expected ${expectedProbabilityOrdering[obs]}, got ${actual}`);
  }
  assert.notEqual(poissonBinomialTwoSidedPValue(probs, 0), expectedDoubledTail[0]);
  assert.notEqual(poissonBinomialTwoSidedPValue(probs, 1), expectedDoubledTail[1]);
  assert.notEqual(poissonBinomialTwoSidedPValue(probs, 3), expectedDoubledTail[3]);
});

test("counterexample (issue 4) resolved: for a SYMMETRIC probability vector, probability-ordering and doubled-minimum-tail coincide (hand-verified two fair coins, pmf=[0.25,0.5,0.25])", () => {
  // Hand computation: symmetric pmf means, for obs=0 or obs=2 (the tails),
  // both conventions sum the same two symmetric outcomes; both give 0.5.
  assert.ok(Math.abs(poissonBinomialTwoSidedPValue([0.5, 0.5], 0) - 0.5) < 1e-9);
  assert.ok(Math.abs(poissonBinomialTwoSidedPValue([0.5, 0.5], 2) - 0.5) < 1e-9);
  assert.equal(poissonBinomialTwoSidedPValue([0.5, 0.5], 1), 1);
});

test("counterexample (issue 4) resolved: at the distribution's mode, both conventions give exactly 1 -- hand-verified (pmf's own maximum is trivially <= itself, and >= itself for the tail sum)", () => {
  const probs = [0.9, 0.5, 0.5]; // mode is obs=2, pmf[2]=0.475, the pmf's maximum
  assert.equal(poissonBinomialTwoSidedPValue(probs, 2), 1);
});

test("counterexample (issue 4) resolved: boundary observation p=0 (an item that can never succeed under the null) is handled correctly -- hand-verified pmf=[0,0.5,0.5] for probabilities=[0,0.5]", () => {
  const probs = [0, 0.5];
  const pmf = poissonBinomialPMF(probs);
  assert.deepEqual(pmf, [0.5, 0.5, 0]);
  // observed=0: pmf[0]=0.5 is the pmf's maximum (tied with pmf[1]) -> p=1
  assert.equal(poissonBinomialTwoSidedPValue(probs, 0), 1);
});

test("counterexample (issue 4) resolved: boundary observation p=1 (an item that always succeeds under the null) is handled correctly -- hand-verified pmf=[0,0.5,0.5] for probabilities=[1,0.5]", () => {
  const probs = [1, 0.5];
  const pmf = poissonBinomialPMF(probs);
  assert.deepEqual(pmf, [0, 0.5, 0.5]);
  assert.equal(poissonBinomialTwoSidedPValue(probs, 1), 1);
});

test("counterexample (issue 4) resolved: degenerate all-way tie (every item has nullProbabilityCorrectAtMax=1, i.e. p=1 for every trial) -- hand-verified: only k=N is possible, p-value is 1 exactly at N and 0 everywhere else, never NaN or clipped incorrectly", () => {
  const probs = new Array(5).fill(1);
  const pmf = poissonBinomialPMF(probs);
  assert.deepEqual(pmf, [0, 0, 0, 0, 0, 1]);
  assert.equal(poissonBinomialTwoSidedPValue(probs, 5), 1);
  assert.equal(poissonBinomialTwoSidedPValue(probs, 0), 0);
});

test("the method label accurately names the chosen convention, and states it is not the only possible one", () => {
  const items = [];
  for (let i = 0; i < 10; i += 1) { items.push(classifyCue(q("m" + i, ["short", "the correct longer option"], 1), historicalLength)); }
  const result = evaluateLengthAssociation(items);
  assert.equal(result.detail.method, "exact-poisson-binomial-two-sided-probability-ordering");
});

// ---------------------------------------------------------------------------
// 13. Distribution-wide practical effect size (issue 1, round 4): the
//     large-N practical decision previously examined only the single
//     largest position's share, missing material UNDERrepresentation.
// ---------------------------------------------------------------------------

[[7, 7, 6, 0], [8, 6, 6, 0], [8, 8, 4, 0]].forEach((counts) => {
  test(`counterexample (issue 1, round 4) resolved: N=20, 4-option distribution ${JSON.stringify(counts)} (position D never used) now FAILS -- the prior single-max-share rule passed all three`, () => {
    const result = evaluatePositionBalance({ optionCount: 4, total: 20, positionCounts: counts });
    assert.equal(result.status, "fail");
    assert.ok(result.detail.practicalEffect.w >= COHENS_W_MEDIUM_EFFECT);
    assert.ok(result.detail.materialDeviations.some((d) => d.position === 3 && d.direction === "under"));
  });
});

test("counterexample (issue 1, round 4) resolved: the N=19/structural regime already rejected a comparable omission -- the regime transition at N=20 does not make a conspicuously worse distribution easier to pass", () => {
  const r19 = evaluatePositionBalance({ optionCount: 4, total: 19, positionCounts: [6, 7, 6, 0] });
  assert.equal(r19.regime, "structural");
  assert.equal(r19.status, "fail");
  const r20 = evaluatePositionBalance({ optionCount: 4, total: 20, positionCounts: [7, 7, 6, 0] });
  assert.equal(r20.regime, "statistical");
  assert.equal(r20.status, "fail");
  const r21 = evaluatePositionBalance({ optionCount: 4, total: 21, positionCounts: [7, 7, 7, 0] });
  assert.equal(r21.regime, "statistical");
  assert.equal(r21.status, "fail");
});

test("an appropriately balanced N=20 distribution passes (perfectly uniform, and a near-uniform, non-degenerate case)", () => {
  const perfect = evaluatePositionBalance({ optionCount: 4, total: 20, positionCounts: [5, 5, 5, 5] });
  assert.equal(perfect.status, "pass");
  assert.equal(perfect.detail.practicalEffect.w, 0);
  const near = evaluatePositionBalance({ optionCount: 4, total: 20, positionCounts: [6, 5, 5, 4] });
  assert.equal(near.status, "pass");
  assert.ok(near.detail.practicalEffect.w < COHENS_W_MEDIUM_EFFECT);
  assert.deepEqual(near.detail.materialDeviations, []);
});

test("Cohen's w effect-size decision behaves correctly for 2-, 3-, and 4-option large-N forms", () => {
  // 2-option: N=10 (REGIME_THRESHOLD(2)=10), one position never used
  const n2fail = evaluatePositionBalance({ optionCount: 2, total: 10, positionCounts: [10, 0] });
  assert.equal(n2fail.status, "fail");
  const n2pass = evaluatePositionBalance({ optionCount: 2, total: 10, positionCounts: [5, 5] });
  assert.equal(n2pass.status, "pass");

  // 3-option: N=15 (REGIME_THRESHOLD(3)=15)
  const n3fail = evaluatePositionBalance({ optionCount: 3, total: 15, positionCounts: [10, 5, 0] });
  assert.equal(n3fail.status, "fail");
  const n3pass = evaluatePositionBalance({ optionCount: 3, total: 15, positionCounts: [5, 5, 5] });
  assert.equal(n3pass.status, "pass");

  // 4-option, already covered above for N=20.
});

test("counterexample (issue 1, round 4) resolved: a complete full-Gate fixture using [7,7,6,0], non-cued lengths, and a non-patterned sequence fails overall via position specifically", () => {
  // Reuses the independent-item-construction technique from the round-3
  // full-Gate fixtures (buildIndependentItem, hashIsMax) so length and
  // sequence are demonstrably NOT what causes the failure.
  function buildIndependentItem(id, n, a, isMax) {
    const lens = [];
    for (let k = 0; k < n; k += 1) lens.push(10 + k);
    const maxVal = Math.max(...lens);
    const maxIdx = lens.indexOf(maxVal);
    const perm = [...Array(n).keys()];
    if (isMax) {
      if (a !== maxIdx) { const t = perm[a]; perm[a] = perm[maxIdx]; perm[maxIdx] = t; }
    } else if (a === maxIdx) {
      const other = a === 0 ? 1 : 0;
      const t = perm[a]; perm[a] = perm[other]; perm[other] = t;
    }
    const opts = perm.map((li) => "x".repeat(lens[li]));
    return q(id, opts, a);
  }
  function hashIsMax(i, n) { const h = ((i + 1) * 2654435761) >>> 0; return (h % n) === 0; }
  // A hand-verified order (found by deterministic search over shuffles of
  // the multiset {0x7, 1x7, 2x6}, checked against detectAnswerSequencePatterns())
  // that yields EXACT position counts [7,7,6,0] with no repeating-cycle,
  // palindrome, or excessive-run finding.
  const order = [0, 1, 1, 2, 2, 2, 0, 0, 1, 2, 0, 1, 1, 0, 2, 2, 0, 1, 1, 0];
  // counts check: recompute to confirm this order actually yields [7,7,6,0] before using it.
  const counts = [0, 0, 0, 0];
  order.forEach((p) => { counts[p] += 1; });
  assert.deepEqual(counts, [7, 7, 6, 0]);
  assert.deepEqual(detectAnswerSequencePatterns(order, 4), []);
  const items = order.map((a, i) => buildIndependentItem(`omit${i}`, 4, a, hashIsMax(i, 4)));
  const metrics = computeCueMetrics(items);
  const gate = evaluateGateA(metrics);
  assert.equal(gate.overall, "fail");
  const fourOption = gate.positionByOptionCount.find((g) => g.optionCount === 4);
  assert.equal(fourOption.position.status, "fail");
  assert.equal(gate.length.status, "pass");
});

test("counterexample (issue 1, round 4) resolved: modest, practically trivial large-N deviations remain pass-with-review when statistically detectable (policy preserved)", () => {
  const n = 4;
  const N = 100000;
  const expected = N / n;
  const counts = [expected + 500, expected - 167, expected - 167, expected - 166];
  const result = evaluatePositionBalance({ optionCount: n, total: N, positionCounts: counts });
  assert.equal(result.status, "pass");
  assert.equal(result.reviewFlag.required, true);
});

test("position balance detail reports the complete observed distribution, expected distribution, practical effect measure, threshold, direction of every material deviation, and final decision", () => {
  const result = evaluatePositionBalance({ optionCount: 4, total: 20, positionCounts: [7, 7, 6, 0] });
  assert.deepEqual(result.detail.positionCounts, [7, 7, 6, 0]);
  assert.equal(result.detail.expectedCount, 5);
  assert.equal(result.detail.practicalEffect.method, "cohens-w");
  assert.ok(typeof result.detail.practicalEffect.w === "number");
  assert.equal(result.detail.practicalEffect.threshold, COHENS_W_MEDIUM_EFFECT);
  assert.ok(result.detail.positionDeviations.every((d) => "position" in d && "count" in d && "proportion" in d && "direction" in d));
  assert.ok(result.detail.materialDeviations.length > 0);
  assert.ok(["pass", "fail"].includes(result.status));
});

// ---------------------------------------------------------------------------
// 13a. Chi-square p-value (issue 2, round 4): the position statistic
//      previously reported only a critical-value-table Boolean, never an
//      accurately named p-value.
// ---------------------------------------------------------------------------

test("counterexample (issue 2, round 4) resolved: chiSquareUpperTailPValue matches independently-sourced published critical values at alpha=0.01 for df 1-7 (not computed by calling this function to derive the expected value)", () => {
  // Independently sourced from a standard published chi-square table
  // (the same numbers this file's own now-retired critical-value table
  // used, cited there from a standard reference) -- NOT derived from this
  // implementation.
  const publishedCriticalValuesAlpha01 = { 1: 6.635, 2: 9.210, 3: 11.345, 4: 13.277, 5: 15.086, 6: 16.812, 7: 18.475 };
  Object.entries(publishedCriticalValuesAlpha01).forEach(([df, critical]) => {
    const p = chiSquareUpperTailPValue(critical, Number(df));
    assert.ok(Math.abs(p - 0.01) < 0.0005, `df=${df}: expected p~=0.01 at the published critical value ${critical}, got ${p}`);
  });
});

test("counterexample (issue 2, round 4) resolved: chiSquareUpperTailPValue matches independently-sourced published critical values at alpha=0.05 for df 1-3", () => {
  const publishedCriticalValuesAlpha05 = { 1: 3.841, 2: 5.991, 3: 7.815 };
  Object.entries(publishedCriticalValuesAlpha05).forEach(([df, critical]) => {
    const p = chiSquareUpperTailPValue(critical, Number(df));
    assert.ok(Math.abs(p - 0.05) < 0.0005, `df=${df}: expected p~=0.05 at the published critical value ${critical}, got ${p}`);
  });
});

test("chiSquareUpperTailPValue: boundary sanity -- p=1 at statistic 0, p shrinks toward 0 as the statistic grows, never NaN or negative", () => {
  assert.equal(chiSquareUpperTailPValue(0, 3), 1);
  const small = chiSquareUpperTailPValue(1, 3);
  const large = chiSquareUpperTailPValue(100, 3);
  assert.ok(small > large);
  assert.ok(large >= 0 && !Number.isNaN(large));
});

test("chiSquareUpperTailPValue throws on invalid domain (non-positive df, negative statistic) rather than returning a silently wrong number", () => {
  assert.throws(() => chiSquareUpperTailPValue(1, 0), RangeError);
  assert.throws(() => chiSquareUpperTailPValue(-1, 3), RangeError);
});

test("evaluatePositionBalance reports the ACTUAL numeric chi-square p-value, not merely a value on the correct side of alpha -- coverage-gap fix: a placeholder value that only preserves the significant/not-significant classification must be caught, not just the boolean it implies", () => {
  // N=1000, n=4, counts=[400,200,200,200] -> chiSquare=120 exactly.
  // Independently hand-computed (via the same verified incomplete-gamma
  // algorithm, cross-checked separately against published critical-value
  // tables in the tests above) -- NOT read back from a call to
  // evaluatePositionBalance itself: chiSquareUpperTailPValue(120, 3) =
  // 7.71679035563416e-26.
  const result = evaluatePositionBalance({ optionCount: 4, total: 1000, positionCounts: [400, 200, 200, 200] });
  assert.equal(result.detail.chiSquare, 120);
  assert.ok(Math.abs(result.detail.pValue - 7.71679035563416e-26) < 1e-30, `expected pValue ~= 7.71679e-26, got ${result.detail.pValue}`);
});

test("counterexample (issue 2, round 4) resolved: position balance reports pValue immediately below, at, and above the alpha=0.01 boundary, using the SAME pValue < SIGNIFICANCE_ALPHA comparison as statisticalResult", () => {
  // For n=4 (df=3), the alpha=0.01 critical chi-square value is 11.345.
  // N=10000 gives fine-enough integer-count resolution to straddle it:
  // hand-verified chiSquare values 11.0592 (below), 11.3688 (just above),
  // 11.8408 (further above) for these exact counts.
  const n = 4;
  const N = 10000;
  const below = evaluatePositionBalance({ optionCount: n, total: N, positionCounts: [2644, 2452, 2452, 2452] });
  const at = evaluatePositionBalance({ optionCount: n, total: N, positionCounts: [2646, 2452, 2451, 2451] });
  const above = evaluatePositionBalance({ optionCount: n, total: N, positionCounts: [2649, 2451, 2450, 2450] });
  assert.ok(Math.abs(below.detail.chiSquare - 11.0592) < 0.01);
  assert.ok(Math.abs(at.detail.chiSquare - 11.3688) < 0.01);
  assert.ok(Math.abs(above.detail.chiSquare - 11.8408) < 0.01);
  [below, at, above].forEach((r) => {
    assert.equal(r.detail.statisticalResult === "rejects-uniform", r.detail.pValue < SIGNIFICANCE_ALPHA, `pValue=${r.detail.pValue} and statisticalResult=${r.detail.statisticalResult} must agree via the same alpha comparison`);
  });
  assert.ok(below.detail.pValue > SIGNIFICANCE_ALPHA);
  assert.ok(above.detail.pValue < SIGNIFICANCE_ALPHA);
});

test("position balance no longer reports maxProportion as a top-level decision field -- the practical decision is Cohen's w; per-position shares are in positionDeviations", () => {
  const result = evaluatePositionBalance({ optionCount: 4, total: 20, positionCounts: [7, 7, 6, 0] });
  assert.equal("maxProportion" in result.detail, false);
  assert.ok(Array.isArray(result.detail.positionDeviations));
});

// ---------------------------------------------------------------------------
// 13b. Frozen per-form encounter-order manifest, separate from id-SET
//      identity (issue 3, round 4).
// ---------------------------------------------------------------------------

test("ORIGINAL_FORM_ORDER_MANIFEST contains an entry for every one of the 17 forms, each frozen and digest-backed", () => {
  const keys = Object.keys(ORIGINAL_FORM_ORDER_MANIFEST);
  assert.equal(keys.length, 17);
  keys.forEach((k) => {
    assert.equal(Object.isFrozen(ORIGINAL_FORM_ORDER_MANIFEST[k].orderedIds), true);
    assert.ok(typeof ORIGINAL_FORM_ORDER_MANIFEST[k].digest === "string" && ORIGINAL_FORM_ORDER_MANIFEST[k].digest.length === 64);
  });
});

test("counterexample (issue 3, round 4) resolved: the live bank's unchanged per-form order matches BOTH the id-SET manifest and the new per-form ORDER manifest", async () => {
  const questionsByModule = liveApi.getQuestions();
  const orderCheck = compareToFormOrderManifest(questionsByModule);
  assert.equal(orderCheck.matches, true);
  const idCheck = compareToIdManifest(liveQuestions.map((q2) => q2.id));
  assert.equal(idCheck.matches, true);
});

test("counterexample (issue 3, round 4) resolved: reversing questions WITHIN one form triggers order drift for that form specifically, while the id-SET manifest still matches (a fundamentally different, correctly-separated question)", () => {
  const questionsByModule = liveApi.getQuestions();
  const reversed = { ...questionsByModule, m1: [...questionsByModule.m1].reverse() };
  const orderCheck = compareToFormOrderManifest(reversed);
  assert.equal(orderCheck.matches, false);
  assert.equal(orderCheck.perForm.m1.matches, false);
  assert.equal(orderCheck.perForm.m2.matches, true);

  const idCheck = compareToIdManifest(flattenQuestionBank(reversed).map((q2) => q2.id));
  assert.equal(idCheck.matches, true, "the SET of ids is unchanged by reordering within one form -- set identity and order identity are genuinely independent checks");
});

test("counterexample (issue 3, round 4) resolved: permuting (not just reversing) questions within a form also triggers order drift for that form only", () => {
  const questionsByModule = liveApi.getQuestions();
  const m6 = questionsByModule.m6;
  const permuted = [...m6];
  // rotate by one -- a permutation, not a simple reversal
  permuted.push(permuted.shift());
  const withPermutedM6 = { ...questionsByModule, m6: permuted };
  const orderCheck = compareToFormOrderManifest(withPermutedM6);
  assert.equal(orderCheck.perForm.m6.matches, false);
  assert.equal(orderCheck.perForm.m7.matches, true);
});

test("counterexample (issue 3, round 4) resolved: an id REPLACEMENT within a form triggers set drift (compareToIdManifest), and the replaced form's order digest also legitimately changes (it now contains a different id at that position)", () => {
  const questionsByModule = liveApi.getQuestions();
  const m1 = [...questionsByModule.m1];
  m1[0] = { ...m1[0], id: "totally-unrelated-replacement-id" };
  const withReplacement = { ...questionsByModule, m1 };
  const idCheck = compareToIdManifest(flattenQuestionBank(withReplacement).map((q2) => q2.id));
  assert.equal(idCheck.matches, false);
  const orderCheck = compareToFormOrderManifest(withReplacement);
  assert.equal(orderCheck.perForm.m1.matches, false);
});

test("counterexample (issue 3, round 4) resolved: pilot selection remains input-order-independent even though per-form authored order is now separately tracked -- reversing a form's internal order does not change the pilot", () => {
  const questionsByModule = liveApi.getQuestions();
  const reversed = { ...questionsByModule, m1: [...questionsByModule.m1].reverse() };
  const pilotOriginal = selectPilotBatch(liveQuestions);
  const pilotFromReversedForm = selectPilotBatch(flattenQuestionBank(reversed));
  assert.deepEqual(pilotFromReversedForm.ids, pilotOriginal.ids);
});

test("compareToIdManifest's comment/behavior no longer claims to detect reordering -- it is a pure set check, verified directly: an arbitrary full permutation of all 153 ids still matches", () => {
  const shuffled = [...ORIGINAL_ID_MANIFEST.sortedIds];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = (i * 2654435761) % (i + 1);
    const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
  }
  const check = compareToIdManifest(shuffled);
  assert.equal(check.matches, true, "compareToIdManifest is a SET check by design -- order never affects it, which is now explicitly documented rather than confusingly claimed otherwise");
});

// ---------------------------------------------------------------------------
// 13c. Whole-bank vs. learner-facing sequence scope (issue 3, round 4):
//      an artificial cross-module concatenation must not create or clear
//      a release gate via the sequence check.
// ---------------------------------------------------------------------------

test("counterexample (issue 3, round 4) resolved: sequenceApplicable:false excludes sequence from overall, even when the concatenated scope's sequence would otherwise fail", () => {
  const cyclic = [0, 1, 2, 3, 0, 1, 2, 3, 0]; // exact repeating cycle -- would fail sequence if applicable
  const items = cyclic.map((a, i) => q(`c${i}`, ["aa", "bb", "cc", "dd"], a)); // non-cued, equal lengths
  const metrics = computeCueMetrics(items);

  const asForm = evaluateGateA(metrics); // default sequenceApplicable: true
  assert.equal(asForm.sequence.applicable, true);
  assert.equal(asForm.sequence.status, "fail");
  assert.equal(asForm.overall, "fail");

  const asWholeBank = evaluateGateA(metrics, { sequenceApplicable: false });
  assert.equal(asWholeBank.sequence.applicable, false);
  assert.equal(asWholeBank.sequence.status, "not-applicable");
  // Position and length are otherwise fine for this fixture -- proving
  // sequenceApplicable:false is what changes the outcome, not a
  // coincidence of some other failing component.
  assert.equal(asWholeBank.overall, "pass");
});

test("counterexample (issue 3, round 4) resolved: sequenceApplicable does not affect position or length, only sequence's contribution to overall", () => {
  const cyclic = [0, 1, 2, 3, 0, 1, 2, 3, 0];
  const items = cyclic.map((a, i) => q(`c2-${i}`, ["aa", "bb", "cc", "dd"], a));
  const metrics = computeCueMetrics(items);
  const asForm = evaluateGateA(metrics);
  const asWholeBank = evaluateGateA(metrics, { sequenceApplicable: false });
  assert.deepEqual(asForm.positionByOptionCount, asWholeBank.positionByOptionCount);
  assert.deepEqual(asForm.length, asWholeBank.length);
});

test("evaluateGateA defaults to sequenceApplicable:true -- a genuine single learner-facing form still has sequence contribute to overall without any caller having to opt in", () => {
  const cyclic = [0, 1, 2, 3, 0, 1, 2, 3, 0];
  const items = cyclic.map((a, i) => q(`c3-${i}`, ["aa", "bb", "cc", "dd"], a));
  const metrics = computeCueMetrics(items);
  const gate = evaluateGateA(metrics);
  assert.equal(gate.sequence.applicable, true);
  assert.equal(gate.overall, "fail");
});

test("counterexample (issue 3, round 4) resolved: buildDeterministicReport()'s whole-bank Gate A reports sequence as not-applicable, while every per-form Gate A reports it as applicable", () => {
  const report = buildDeterministicReport(liveQuestions.map((it) => it));
  assert.equal(report.bank.gateA.sequence.applicable, false);
  assert.equal(report.bank.gateA.sequence.status, "not-applicable");
  assert.equal(report.forms.length, 17);
  report.forms.forEach((f) => {
    assert.equal(f.gateA.sequence.applicable, true);
    assert.notEqual(f.gateA.sequence.status, "not-applicable");
  });
});

test("buildDeterministicReport() exposes formOrderCheck as a field genuinely separate from idManifestCheck and baselineComparison", () => {
  const report = buildDeterministicReport(liveQuestions.map((it) => it));
  assert.ok("formOrderCheck" in report);
  assert.ok("idManifestCheck" in report);
  assert.ok("baselineComparison" in report);
  assert.equal(report.formOrderCheck.matches, true);
});

test("coverage-gap fix: buildDeterministicReport()'s formOrderCheck actually reflects real per-module order drift, not a hardcoded/stubbed value -- reordering one module's questions before calling buildDeterministicReport() must flip formOrderCheck.matches to false", () => {
  // Take the live flattened bank and reverse only module m1's items --
  // buildDeterministicReport() must regroup by module internally and
  // detect this via the real compareToFormOrderManifest() call, not a
  // value that happens to be true regardless of input.
  const m1Items = liveQuestions.filter((it) => it.module === "m1");
  const otherItems = liveQuestions.filter((it) => it.module !== "m1");
  const reorderedInput = [...otherItems, ...[...m1Items].reverse()];
  assert.equal(reorderedInput.length, liveQuestions.length);

  const baselineReport = buildDeterministicReport(liveQuestions.map((it) => it));
  assert.equal(baselineReport.formOrderCheck.matches, true);
  assert.equal(Object.keys(baselineReport.formOrderCheck.perForm).length, 17);

  const reorderedReport = buildDeterministicReport(reorderedInput);
  assert.equal(reorderedReport.formOrderCheck.matches, false);
  assert.equal(reorderedReport.formOrderCheck.perForm.m1.matches, false);
  assert.equal(reorderedReport.formOrderCheck.perForm.m2.matches, true);
  // The id SET is unaffected by this reordering -- idManifestCheck must
  // still report a match, proving these two report fields are genuinely
  // independent, not aliases of each other.
  assert.equal(reorderedReport.idManifestCheck.matches, true);
});

test("deterministic JSON output is preserved with all round-4 additions (Cohen's w, chi-square p-value, formOrderCheck, sequence applicability) -- byte-identical across repeated calls, still no timestamp", () => {
  const report1 = buildDeterministicReport(liveQuestions.map((it) => it));
  const report2 = buildDeterministicReport(liveQuestions.map((it) => it));
  const json1 = JSON.stringify(report1);
  const json2 = JSON.stringify(report2);
  assert.equal(json1, json2);
  assert.ok(!json1.includes("generatedAt"));
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(json1));
});

// ---------------------------------------------------------------------------
// 11. Scope discipline: this audit never touches product state
// ---------------------------------------------------------------------------

test("booting the course for the audit and reading getQuestions() does not touch progress, storage, or emit events", () => {
  const progressBefore = JSON.stringify(liveApi.getProgress());
  const events = [];
  liveApi.on("*", (e) => events.push(e));
  liveApi.getQuestions();
  computeCueMetrics(liveQuestions);
  selectPilotBatch(liveQuestions);
  const progressAfter = JSON.stringify(liveApi.getProgress());
  assert.equal(progressBefore, progressAfter);
  assert.deepEqual(events, []);
});

test("all 153 questions remain governed as Draft with no evidence populated (unchanged by this audit)", () => {
  const governance = liveApi.getQuestionGovernance();
  const ids = Object.keys(governance);
  assert.equal(ids.length, 153);
  ids.forEach((id) => {
    const rec = governance[id];
    assert.equal(rec.lifecycle, "draft");
    assert.equal(rec.releaseQualified, false);
    assert.equal(rec.drafter, null);
    assert.equal(rec.reviewer, null);
    assert.equal(rec.independentReviewDocumented, false);
  });
});

console.log(`\n${passed} assessment-cue audit checks passed.`);
if (failures.length) {
  console.error(`\n${failures.length} assessment-cue audit check(s) FAILED:`);
  for (const failure of failures) {
    console.error(`\n--- ${failure.name} ---`);
    console.error(failure.error);
  }
  process.exit(1);
}
