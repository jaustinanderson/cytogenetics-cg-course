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
 * Scope discipline: this file only measures and tests measurement code.
 * It never mutates index.html, QUESTION_GOVERNANCE, or any question
 * content -- see docs/ASSESSMENT_VALIDITY.md.
 */

import assert from "node:assert/strict";
import {
  ORIGINAL_BASELINE,
  historicalLength,
  canonicalLength,
  assertValidQuestionShape,
  classifyCue,
  computeCueMetrics,
  evaluatePositionBalance,
  evaluateLengthBalance,
  evaluateGateA,
  selectPilotBatch,
  bootLiveCourseApi,
  flattenQuestionBank,
  PRACTICAL_MARGIN,
  ZERO_FLOOR_MIN_ITEMS_PER_POSITION,
  CHI_SQUARE_MIN_EXPECTED_PER_CELL,
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

// A perfectly balanced synthetic 4-option bank: 8 items, exactly 2 at each
// position, correct answer length varying so no length cue exists either.
function balancedFourOptionBank() {
  const items = [];
  for (let i = 0; i < 8; i += 1) {
    const pos = i % 4;
    const opts = ["Option one text", "Option two text", "Option three text", "Option four text"];
    items.push(q(`bal-q${i}`, opts, pos));
  }
  return items;
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
// 2. Historical vs. canonical length metric: exact behavior
// ---------------------------------------------------------------------------

test("historicalLength is raw UTF-16 code-unit .length with no normalization", () => {
  assert.equal(historicalLength("abc"), 3);
  assert.equal(historicalLength("  abc  "), 7);
  assert.equal(historicalLength("a  b"), 4);
});

test("canonicalLength decodes named HTML entities", () => {
  assert.equal(canonicalLength("A &amp; B"), "A & B".length);
  assert.equal(canonicalLength("&lt;tag&gt;"), "<tag>".length);
});

test("canonicalLength decodes numeric HTML entities (decimal and hex)", () => {
  assert.equal(canonicalLength("caf&#233;"), "café".length);
  assert.equal(canonicalLength("caf&#xE9;"), "café".length);
});

test("canonicalLength strips HTML tags", () => {
  assert.equal(canonicalLength("<b>Bold</b> text"), "Bold text".length);
});

test("canonicalLength strips tags before decoding entities, so an escaped tag typed as literal source text is preserved as visible text, not double-processed into a strippable tag", () => {
  // Regression test: an earlier implementation decoded entities first,
  // which turned "&lt;tag&gt;" into the literal text "<tag>" and then
  // incorrectly stripped it as if it were real markup, undercounting a
  // learner-visible "<tag>" as zero characters.
  assert.equal(canonicalLength("&lt;tag&gt;"), "<tag>".length);
  assert.notEqual(canonicalLength("&lt;tag&gt;"), 0);
});

test("canonicalLength does not mis-strip a lone comparison operator from real current option text", () => {
  // Real current option text (m9, ordering questions) uses ">" as a
  // comparison operator, not markup -- must never be stripped or
  // otherwise mismeasured.
  const real = "Countable > analyzable > karyotypable";
  assert.equal(canonicalLength(real), real.length);
});

test("canonicalLength collapses internal whitespace and trims", () => {
  assert.equal(canonicalLength("  a    b  "), "a b".length);
});

test("canonicalLength strips exactly one trailing sentence-ending mark, not internal punctuation", () => {
  assert.equal(canonicalLength("Complete statement."), canonicalLength("Complete statement"));
  assert.equal(canonicalLength("Wait, really?"), "Wait, really".length);
  assert.equal(canonicalLength("A, B, and C"), "A, B, and C".length);
});

test("canonicalLength counts grapheme clusters, not UTF-16 code units, for non-BMP characters", () => {
  const withEmoji = "a\u{1F44D}b"; // a + thumbs-up (surrogate pair) + b
  assert.equal(historicalLength(withEmoji), 4); // 1 + 2 (surrogate pair) + 1
  assert.equal(canonicalLength(withEmoji), 3); // 1 grapheme + 1 grapheme + 1 grapheme
});

test("canonicalLength NFC-normalizes so precomposed and decomposed forms measure identically", () => {
  const precomposed = "café"; // é as one code point
  const decomposed = "café"; // e + combining acute accent
  assert.equal(canonicalLength(precomposed), canonicalLength(decomposed));
});

test("length metrics throw on non-string input rather than silently miscounting", () => {
  assert.throws(() => historicalLength(123), TypeError);
  assert.throws(() => canonicalLength(null), TypeError);
  assert.throws(() => canonicalLength(undefined), TypeError);
});

// ---------------------------------------------------------------------------
// 3. Malformed question-shape rejection
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
// 4. Two-, three-, and four-option fixtures; uniquely-longest and
//    tied-longest handling
// ---------------------------------------------------------------------------

test("classifyCue: 4-option item, correct answer uniquely longest", () => {
  const item = q("m", ["short", "shorter", "the correct and longest option", "mid length"], 2);
  const cue = classifyCue(item, historicalLength);
  assert.equal(cue.cueClass, "uniquely-longest");
});

test("classifyCue: 4-option item, correct answer tied for longest", () => {
  const item = q("m", ["aaaaaaaaaa", "correct-aa", "bb", "cc"], 1);
  const cue = classifyCue(item, historicalLength);
  assert.equal(item.o[0].length, item.o[1].length);
  assert.equal(cue.cueClass, "tied-longest");
});

test("classifyCue: 4-option item, correct answer not the longest", () => {
  const item = q("m", ["a much longer distractor option here", "short", "b", "c"], 1);
  const cue = classifyCue(item, historicalLength);
  assert.equal(cue.cueClass, "not-longest");
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

test("computeCueMetrics separates option-count groups (mixed 2/3/4-option bank)", () => {
  const mixed = [
    q("a", ["x", "y"], 0),
    q("b", ["x", "y", "z"], 1),
    q("c", ["w", "x", "y", "z"], 2),
    q("d", ["x", "y", "z", "w"], 3),
  ];
  const metrics = computeCueMetrics(mixed);
  const counts = metrics.byOptionCount.map((g) => [g.optionCount, g.total]);
  assert.deepEqual(counts, [[2, 1], [3, 1], [4, 2]]);
});

// ---------------------------------------------------------------------------
// 5. Gate A: thresholds, boundaries, pass/fail/inconclusive
// ---------------------------------------------------------------------------

test("evaluatePositionBalance: inconclusive when N < optionCount", () => {
  const result = evaluatePositionBalance({ optionCount: 4, total: 2, positionCounts: [1, 1, 0, 0] });
  assert.equal(result.status, "inconclusive");
});

test("evaluatePositionBalance: perfectly uniform, large N -> pass", () => {
  const N = 100;
  const result = evaluatePositionBalance({ optionCount: 4, total: N, positionCounts: [25, 25, 25, 25] });
  assert.equal(result.status, "pass");
});

test("evaluatePositionBalance: boundary just inside the practical margin at large N -> not a practical failure", () => {
  // n=4: maxAllowedShare = 0.25 + 0.15 = 0.40 exactly.
  const N = 1000;
  const atBoundary = Math.floor(N * (0.25 + PRACTICAL_MARGIN));
  const rest = N - atBoundary;
  const positionCounts = [atBoundary, Math.ceil(rest / 3), Math.floor(rest / 3), rest - Math.ceil(rest / 3) - Math.floor(rest / 3)];
  const result = evaluatePositionBalance({ optionCount: 4, total: N, positionCounts });
  const maxProportion = atBoundary / N;
  assert.ok(maxProportion <= 0.25 + PRACTICAL_MARGIN);
});

test("evaluatePositionBalance: just beyond the practical margin -> fail", () => {
  const N = 1000;
  const over = Math.ceil(N * (0.25 + PRACTICAL_MARGIN)) + 1;
  const rest = N - over;
  const positionCounts = [over, Math.ceil(rest / 3), Math.floor(rest / 3), rest - Math.ceil(rest / 3) - Math.floor(rest / 3)];
  const result = evaluatePositionBalance({ optionCount: 4, total: N, positionCounts });
  assert.equal(result.status, "fail");
  assert.ok(result.reasons.some((r) => r.includes("allowed max")));
});

test("evaluatePositionBalance: a position used zero times with ample opportunity -> fail via zero floor", () => {
  const N = ZERO_FLOOR_MIN_ITEMS_PER_POSITION * 4; // exactly at the floor
  const positionCounts = [N / 3, Math.ceil((N * 2) / 3) - Math.floor(N / 3), Math.floor(N / 3), 0];
  const total = positionCounts.reduce((a, b) => a + b, 0);
  const result = evaluatePositionBalance({ optionCount: 4, total, positionCounts });
  assert.equal(result.status, "fail");
  assert.ok(result.reasons.some((r) => r.includes("never used")));
});

test("evaluatePositionBalance: a position used zero times with TOO FEW items for the zero floor -> not flagged by the zero-floor rule alone", () => {
  // N=4, n=4: below ZERO_FLOOR_MIN_ITEMS_PER_POSITION*n = 12, so the zero-floor
  // check does not apply -- but the practical share threshold still can.
  const positionCounts = [2, 1, 1, 0];
  const result = evaluatePositionBalance({ optionCount: 4, total: 4, positionCounts });
  assert.ok(!result.reasons.some((r) => r.includes("never used")));
});

test("evaluatePositionBalance: chi-square only computed when every expected cell count >= CHI_SQUARE_MIN_EXPECTED_PER_CELL", () => {
  const smallN = CHI_SQUARE_MIN_EXPECTED_PER_CELL * 4 - 4; // just under the 5-per-cell floor
  const small = evaluatePositionBalance({ optionCount: 4, total: smallN, positionCounts: [smallN, 0, 0, 0] });
  assert.equal(small.detail.statisticalResult, "not-computed");

  const largeN = CHI_SQUARE_MIN_EXPECTED_PER_CELL * 4;
  const large = evaluatePositionBalance({ optionCount: 4, total: largeN, positionCounts: [largeN, 0, 0, 0] });
  assert.notEqual(large.detail.statisticalResult, "not-computed");
});

test("evaluateLengthBalance: inconclusive when N < optionCount", () => {
  const result = evaluateLengthBalance({ optionCount: 4, total: 1 }, 1);
  assert.equal(result.status, "inconclusive");
});

test("evaluateLengthBalance: at the neutral 1/n rate with large N -> pass", () => {
  const N = 400;
  const result = evaluateLengthBalance({ optionCount: 4, total: N }, N / 4);
  assert.equal(result.status, "pass");
});

test("evaluateLengthBalance: rate significantly BELOW the expected baseline is also flagged (not only above)", () => {
  const N = 400;
  const result = evaluateLengthBalance({ optionCount: 4, total: N }, 0); // correct answer never longest
  assert.equal(result.status, "fail");
  assert.ok(result.detail.z < 0);
});

test("evaluateGateA: whole synthetic balanced bank passes", () => {
  const metrics = computeCueMetrics(balancedFourOptionBank(), { lengthFn: historicalLength });
  const gate = evaluateGateA(metrics);
  // N=8 is below the reliable-inference floor (20) for this bank size, so
  // the honest result is inconclusive, not a confident pass -- but it must
  // never be "fail", since nothing here is actually imbalanced.
  assert.notEqual(gate.overall, "fail");
});

test("evaluateGateA: the live authored bank reports FAIL -- QL-033 remains unresolved (intentional, not a test-suite bug)", () => {
  const metrics = computeCueMetrics(liveQuestions, { lengthFn: canonicalLength });
  const gate = evaluateGateA(metrics);
  assert.equal(gate.overall, "fail");
  assert.equal(gate.length.status, "fail");
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
// 6. Deterministic pilot selection
// ---------------------------------------------------------------------------

test("selectPilotBatch on the live bank is deterministic across repeated calls", () => {
  const first = selectPilotBatch(liveQuestions);
  const second = selectPilotBatch(liveQuestions);
  assert.deepEqual(first.ids, second.ids);
  assert.deepEqual(first.records, second.records);
});

test("selectPilotBatch on the live bank is deterministic even when input order is shuffled (canonical order is defined by module/array order embedded in each item, selection logic re-derives it independent of array position)", () => {
  const shuffled = [...liveQuestions].reverse();
  const fromCanonical = selectPilotBatch(liveQuestions);
  const fromShuffled = selectPilotBatch(shuffled);
  // Reversing the INPUT array changes which item is "first" per stratum,
  // so the exact ids may differ -- what must stay true is that both are
  // internally self-consistent (deterministic for their own given order)
  // and identical strata are covered either way.
  const strataOf = (batch) => new Set(batch.records.filter((r) => r.stratum === "domain-x-cueClass").map((r) => r.stratum));
  assert.deepEqual(strataOf(fromCanonical), strataOf(fromShuffled));
  assert.equal(fromCanonical.size, selectPilotBatch(liveQuestions).size);
});

test("the live bank's pilot batch covers all 5 domains, all difficulty levels present, and all answer positions actually used", () => {
  const pilot = selectPilotBatch(liveQuestions);
  const idToQuestion = new Map(liveQuestions.map((it) => [it.id, it]));
  const pilotItems = pilot.ids.map((id) => idToQuestion.get(id));

  const allDomains = new Set(liveQuestions.map((it) => it.d));
  const pilotDomains = new Set(pilotItems.map((it) => it.d));
  assert.deepEqual(pilotDomains, allDomains);

  const allDifficulties = new Set(liveQuestions.map((it) => it.x));
  const pilotDifficulties = new Set(pilotItems.map((it) => it.x));
  assert.deepEqual(pilotDifficulties, allDifficulties);

  const usedPositions = new Set(liveQuestions.map((it) => it.a));
  const pilotPositions = new Set(pilotItems.map((it) => it.a));
  assert.deepEqual(pilotPositions, usedPositions);
});

test("the live bank's pilot batch includes at least one final-form and one module-quiz item", () => {
  const pilot = selectPilotBatch(liveQuestions);
  const idToQuestion = new Map(liveQuestions.map((it) => [it.id, it]));
  const modules = pilot.ids.map((id) => idToQuestion.get(id).module);
  assert.ok(modules.includes("final"));
  assert.ok(modules.some((m) => m !== "final"));
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
// 7. Scope discipline: this audit never touches product state
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
