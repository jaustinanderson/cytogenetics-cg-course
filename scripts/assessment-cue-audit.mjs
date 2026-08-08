#!/usr/bin/env node
// Assessment-cue audit: bank/form-level answer-position and answer-length
// cueing measurement for the authored question bank (Phase 0 step 1,
// docs/LEARNING_PLATFORM_ROADMAP.md; QL-033, docs/QUALITY_LOG.md).
//
// This file is the SINGLE authoritative implementation of every
// measurement and Gate A rule described in docs/ASSESSMENT_VALIDITY.md.
// It is imported (never re-implemented) by:
//   - tests/assessment-cue-audit.mjs (dependency-free unit/boundary tests)
//   - tests/e2e/assessment-cue-audit.spec.mjs (real-browser cross-check)
//   - this file's own CLI mode (`npm run audit:assessment-cues`)
// Do not duplicate any formula from this file elsewhere; import instead.
//
// Scope discipline (read before editing): this file MEASURES and
// CLASSIFIES the existing question bank. It never rewrites, reorders, or
// otherwise mutates question content, and it never marks anything
// scientifically reviewed, Gate B-passing, release-qualified,
// diagnostically eligible, or psychometrically validated -- Gate A
// failure/pass is a purely statistical, structural judgment about answer
// position/length distribution, nothing more. See docs/ASSESSMENT_VALIDITY.md
// for the full policy this file implements and its cited sources.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..");

// ============================================================================
// IMMUTABLE ORIGINAL BASELINE (QL-033, docs/QUALITY_LOG.md) -- never edited.
// This is the historical record, frozen at the point QL-033 was first
// confirmed. It exists so later, improved measurements can be compared
// against it without ever silently rewriting history. See
// docs/ASSESSMENT_VALIDITY.md "Frozen historical baseline".
// ============================================================================
export const ORIGINAL_BASELINE = Object.freeze({
  totalAuthoredQuestions: 153,
  positionCounts: Object.freeze({ 0: 11, 1: 139, 2: 3, 3: 0 }),
  uniquelyLongestCorrect: 114,
  longestOrTiedCorrect: 133,
  method: "historical-length",
  recordedIn: "docs/QUALITY_LOG.md QL-033",
});

// ============================================================================
// A. Length measurement
// ============================================================================

/**
 * The HISTORICAL length metric QL-033 actually used: independently
 * reproduced (docs/ASSESSMENT_VALIDITY.md "How QL-033 measured length") to
 * be plain JavaScript string `.length` (UTF-16 code units) with no
 * trimming, normalization, or markup handling of any kind. This exists
 * only to reproduce the frozen baseline exactly -- new tooling should
 * prefer canonicalLength() below.
 */
export function historicalLength(text) {
  if (typeof text !== "string") { throw new TypeError("historicalLength: text must be a string"); }
  return text.length;
}

const ENTITY_MAP = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * The CANONICAL, learner-visible length metric (docs/ASSESSMENT_VALIDITY.md
 * "Canonical learner-visible length metric"). Deliberately more robust than
 * historicalLength() for future content that may contain markup, entities,
 * irregular whitespace, or non-BMP characters -- none of which the current
 * 153-question bank actually contains (verified: canonicalLength() and
 * historicalLength() currently agree on every option in the bank; see
 * docs/ASSESSMENT_VALIDITY.md for the reproduced side-by-side comparison).
 *
 * Steps, in order:
 *   1. Decode common named/numeric HTML entities (&amp; &lt; &gt; &quot;
 *      &apos; &nbsp; and &#NNN;/&#xHH; numeric forms).
 *   2. Strip HTML tags (defensive -- no current option contains any).
 *   3. Unicode NFC-normalize (so a precomposed and a decomposed form of
 *      the same visible character count identically).
 *   4. Collapse internal whitespace runs to a single space and trim
 *      leading/trailing whitespace (defends against padding via extra
 *      spaces).
 *   5. Strip a single trailing sentence-ending mark (./!/?) if present
 *      (defends against padding via a purely decorative trailing mark;
 *      does not touch internal punctuation, which can carry real
 *      content).
 *   6. Count grapheme clusters (Intl.Segmenter, 'grapheme' granularity)
 *      rather than UTF-16 code units or code points, so a single visible
 *      character (including one built from multiple code points, e.g. an
 *      emoji with a modifier) counts once, matching what a learner
 *      actually sees rather than an internal encoding artifact.
 *
 * This metric is NOT immune to a determined item-writer adding a short,
 * plausible-looking extra word or clause -- no automated text metric can
 * be, without rejecting legitimate longer-but-correct answers outright.
 * That residual risk is why Gate A (below) uses an aggregate, bank/form-
 * level statistical threshold rather than a per-item length cutoff, and
 * why Gate B (docs/ASSESSMENT_VALIDITY.md) requires human review of
 * conspicuous individual-item cues this metric cannot itself adjudicate.
 */
export function canonicalLength(text) {
  if (typeof text !== "string") { throw new TypeError("canonicalLength: text must be a string"); }
  // Strip literal tags BEFORE decoding entities -- order matters. If
  // entities were decoded first, an escaped tag typed as literal source
  // text (e.g. "&lt;tag&gt;", meant to be READ as the visible characters
  // "<tag>") would decode into something that then looks exactly like a
  // real tag and get wrongly stripped by this step. Stripping first only
  // ever removes genuine, already-literal markup syntax; entities decoded
  // afterward are preserved as visible text, matching what a learner
  // reading escaped source would actually see.
  let t = text.replace(/<[^>]+>/g, "");
  t = t.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (whole, ent) => {
    if (ENTITY_MAP[ent] !== undefined) return ENTITY_MAP[ent];
    if (ent[0] === "#") {
      const isHex = ent[1] === "x" || ent[1] === "X";
      const codePoint = isHex ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      if (Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) {
        try { return String.fromCodePoint(codePoint); } catch { return whole; }
      }
    }
    return whole;
  });
  t = t.normalize("NFC");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/[.!?]+$/u, "");
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  return [...segmenter.segment(t)].length;
}

// ============================================================================
// B. Per-question cue classification
// ============================================================================

/**
 * Validates a single question object has the minimal shape this module
 * requires. Throws a descriptive error on malformed input rather than
 * silently miscounting -- callers (the CLI, tests) are expected to catch
 * and report, not swallow, a validation failure.
 */
export function assertValidQuestionShape(q, contextLabel) {
  const where = contextLabel ? ` (${contextLabel})` : "";
  if (!q || typeof q !== "object") { throw new TypeError(`assessment-cue-audit: question is not an object${where}`); }
  if (typeof q.id !== "string" || !q.id) { throw new TypeError(`assessment-cue-audit: question missing string id${where}`); }
  if (!Array.isArray(q.o) || q.o.length < 2) { throw new TypeError(`assessment-cue-audit: ${q.id} must have an options array with at least 2 entries`); }
  q.o.forEach((opt, i) => {
    if (typeof opt !== "string" || opt.length === 0) {
      throw new TypeError(`assessment-cue-audit: ${q.id} option ${i} must be a non-empty string`);
    }
  });
  if (!Number.isInteger(q.a) || q.a < 0 || q.a >= q.o.length) {
    throw new TypeError(`assessment-cue-audit: ${q.id} has an out-of-range or non-integer answer index (a=${q.a}, options=${q.o.length})`);
  }
}

/**
 * Classifies one question's correct-answer length relative to its own
 * option set: 'uniquely-longest', 'tied-longest', or 'not-longest'.
 * lengthFn defaults to canonicalLength; pass historicalLength to
 * reproduce the frozen baseline exactly.
 */
export function classifyCue(q, lengthFn = canonicalLength) {
  assertValidQuestionShape(q, "classifyCue");
  const lens = q.o.map((opt) => lengthFn(opt));
  const maxLen = Math.max(...lens);
  const atMax = lens.filter((l) => l === maxLen).length;
  const correctIsAtMax = lens[q.a] === maxLen;
  return {
    lengths: lens,
    correctLength: lens[q.a],
    maxLength: maxLen,
    optionsAtMax: atMax,
    cueClass: !correctIsAtMax ? "not-longest" : atMax === 1 ? "uniquely-longest" : "tied-longest",
  };
}

// ============================================================================
// C. Aggregate metrics (one bank, one form, or any question list)
// ============================================================================

/**
 * Computes the full metric set for an arbitrary list of questions
 * (the whole bank, one module/form, or any other slice). Returns raw
 * counts only -- see evaluateGateA() for pass/fail/inconclusive judgment.
 */
export function computeCueMetrics(questions, { lengthFn = canonicalLength } = {}) {
  if (!Array.isArray(questions)) { throw new TypeError("computeCueMetrics: questions must be an array"); }
  questions.forEach((q) => assertValidQuestionShape(q, "computeCueMetrics"));

  const byOptionCount = new Map();
  let uniquelyLongest = 0;
  let longestOrTied = 0;

  questions.forEach((q) => {
    const n = q.o.length;
    if (!byOptionCount.has(n)) {
      byOptionCount.set(n, { optionCount: n, total: 0, positionCounts: new Array(n).fill(0) });
    }
    const group = byOptionCount.get(n);
    group.total += 1;
    group.positionCounts[q.a] += 1;

    const cue = classifyCue(q, lengthFn);
    if (cue.cueClass === "uniquely-longest") { uniquelyLongest += 1; longestOrTied += 1; }
    else if (cue.cueClass === "tied-longest") { longestOrTied += 1; }
  });

  return {
    total: questions.length,
    ids: questions.map((q) => q.id),
    byOptionCount: [...byOptionCount.values()].sort((a, b) => a.optionCount - b.optionCount),
    uniquelyLongestCorrect: uniquelyLongest,
    longestOrTiedCorrect: longestOrTied,
  };
}

// ============================================================================
// D. Gate A -- bank/form-level statistical guardrails
//    (docs/ASSESSMENT_VALIDITY.md "Gate A" for full rationale and sources)
// ============================================================================

// Additive margin above the uniform 1/n chance rate before a position's
// (or the correct answer's length rank's) observed share counts as a
// practical, effect-size FAIL. Chosen so that, at n=4 (the only option
// count the current bank uses), the allowed maximum is 40% -- clearly
// above ordinary sampling noise around the 25% chance rate, but far below
// the bank's actual observed 90.8% (position B) / 74.5% (uniquely
// longest) rates, so genuine imbalance of the kind QL-033 found is always
// caught while modest, incidental variation is not over-flagged.
export const PRACTICAL_MARGIN = 0.15;

// A position must have had a real opportunity to appear before its
// absence (a "never correct" pattern, matching the current D/index-3
// count of 0) is itself treated as a practical-threshold failure,
// independent of the statistical test below. "Real opportunity" is
// defined as at least this many items per option slot.
export const ZERO_FLOOR_MIN_ITEMS_PER_POSITION = 3;

// Standard rule-of-thumb minimum expected-cell-count for a chi-square
// goodness-of-fit test to be valid (every expected cell count >= 5); also
// used, for consistency, as the minimum sample size for the length
// normal-approximation proportion test. Below this, the statistical test
// is not computed at all (reported "not computed", not "passed").
export const CHI_SQUARE_MIN_EXPECTED_PER_CELL = 5;

// Two-tailed significance level for both statistical tests. Deliberately
// conservative (rather than the conventional 0.05) because the practical
// threshold above is the primary, authoritative gate; the statistical
// test only corroborates it, and a stricter alpha reduces the chance of
// flagging a legitimately balanced small form as a statistical failure
// merely from ordinary sampling variation.
export const SIGNIFICANCE_ALPHA = 0.01;

// Standard chi-square critical values at alpha=0.01, indexed by degrees
// of freedom (df = optionCount - 1). Covers every option count from 2
// through 8; realistic authored MCQ items are 2-6 options. These are
// unmodified, standard values found in any introductory statistics
// reference (e.g. the chi-square distribution table).
const CHI_SQUARE_CRITICAL_ALPHA_01 = { 1: 6.635, 2: 9.210, 3: 11.345, 4: 13.277, 5: 15.086, 6: 16.812, 7: 18.475 };
// Standard two-tailed normal-distribution critical z-value at alpha=0.01.
const Z_CRITICAL_ALPHA_01 = 2.576;

/**
 * Evaluates Gate A for one option-count group's position distribution.
 * Returns {status: 'pass'|'fail'|'inconclusive', reasons: [...], detail}.
 */
export function evaluatePositionBalance(group) {
  const { optionCount: n, total: N, positionCounts } = group;
  if (N < n) {
    return { status: "inconclusive", reasons: [`only ${N} item(s) for ${n} answer positions -- fewer items than positions, no judgment possible`], detail: { n, N, positionCounts } };
  }
  const expectedProportion = 1 / n;
  const maxCount = Math.max(...positionCounts);
  const maxProportion = maxCount / N;
  const minCount = Math.min(...positionCounts);
  const maxAllowedShare = Math.min(1, expectedProportion + PRACTICAL_MARGIN);

  const reasons = [];
  let practicalFail = false;
  if (maxProportion > maxAllowedShare) {
    practicalFail = true;
    reasons.push(`a position accounts for ${(maxProportion * 100).toFixed(1)}% of ${N} items (allowed max ${(maxAllowedShare * 100).toFixed(1)}%, expected ${(expectedProportion * 100).toFixed(1)}% under uniform chance)`);
  }
  if (minCount === 0 && N >= ZERO_FLOOR_MIN_ITEMS_PER_POSITION * n) {
    practicalFail = true;
    reasons.push(`at least one answer position is never used across ${N} items despite adequate opportunity (>= ${ZERO_FLOOR_MIN_ITEMS_PER_POSITION} items per position expected)`);
  }

  let statisticalResult = "not-computed";
  let chiSquare = null;
  const minExpectedCell = N / n;
  if (minExpectedCell >= CHI_SQUARE_MIN_EXPECTED_PER_CELL) {
    chiSquare = positionCounts.reduce((sum, observed) => {
      const expected = N / n;
      return sum + (observed - expected) ** 2 / expected;
    }, 0);
    const df = n - 1;
    const critical = CHI_SQUARE_CRITICAL_ALPHA_01[df];
    if (critical !== undefined) {
      statisticalResult = chiSquare > critical ? "rejects-uniform" : "fails-to-reject-uniform";
      if (statisticalResult === "rejects-uniform") {
        reasons.push(`chi-square goodness-of-fit statistic ${chiSquare.toFixed(2)} exceeds the critical value ${critical} (df=${df}, alpha=${SIGNIFICANCE_ALPHA}) -- position distribution is statistically distinguishable from uniform`);
      }
    } else {
      statisticalResult = "not-computed";
    }
  }

  let status;
  if (practicalFail || statisticalResult === "rejects-uniform") { status = "fail"; }
  else if (N < CHI_SQUARE_MIN_EXPECTED_PER_CELL * n) { status = "inconclusive"; reasons.push(`${N} items is below the reliable-inference floor of ${CHI_SQUARE_MIN_EXPECTED_PER_CELL * n} for ${n} positions -- no confident pass/fail judgment, only that no gross imbalance was observed`); }
  else { status = "pass"; }

  return { status, reasons, detail: { n, N, positionCounts, maxProportion, expectedProportion, maxAllowedShare, chiSquare, statisticalResult } };
}

/**
 * Evaluates Gate A for one option-count group's length-cueing rate
 * (share of items where the correct answer is the uniquely-longest
 * option). Same practical-threshold-first, statistical-test-corroborating
 * structure as evaluatePositionBalance().
 */
export function evaluateLengthBalance(group, uniquelyLongestCount) {
  const { optionCount: n, total: N } = group;
  if (N < n) {
    return { status: "inconclusive", reasons: [`only ${N} item(s) for ${n} answer positions -- too few for any length-cue judgment`], detail: { n, N, uniquelyLongestCount } };
  }
  const expectedProportion = 1 / n;
  const observedProportion = uniquelyLongestCount / N;
  const maxAllowedShare = Math.min(1, expectedProportion + PRACTICAL_MARGIN);

  const reasons = [];
  let practicalFail = false;
  if (observedProportion > maxAllowedShare) {
    practicalFail = true;
    reasons.push(`the correct answer is the uniquely longest option in ${(observedProportion * 100).toFixed(1)}% of ${N} items (allowed max ${(maxAllowedShare * 100).toFixed(1)}%, expected ${(expectedProportion * 100).toFixed(1)}% under a no-cue null model)`);
  }

  let statisticalResult = "not-computed";
  let z = null;
  const p0 = expectedProportion;
  const variance = N * p0 * (1 - p0);
  if (variance >= CHI_SQUARE_MIN_EXPECTED_PER_CELL) {
    const se = Math.sqrt(variance);
    z = (uniquelyLongestCount - N * p0) / se;
    statisticalResult = Math.abs(z) > Z_CRITICAL_ALPHA_01 ? "rejects-null" : "fails-to-reject-null";
    if (statisticalResult === "rejects-null") {
      reasons.push(`normal-approximation z=${z.toFixed(2)} exceeds the two-tailed critical value ${Z_CRITICAL_ALPHA_01} (alpha=${SIGNIFICANCE_ALPHA}) -- uniquely-longest rate is statistically distinguishable from the ${(p0 * 100).toFixed(1)}% no-cue baseline`);
    }
  }

  let status;
  if (practicalFail || statisticalResult === "rejects-null") { status = "fail"; }
  else if (N < CHI_SQUARE_MIN_EXPECTED_PER_CELL * n) { status = "inconclusive"; reasons.push(`${N} items is below the reliable-inference floor of ${CHI_SQUARE_MIN_EXPECTED_PER_CELL * n} -- no confident pass/fail judgment, only that no gross length cueing was observed`); }
  else { status = "pass"; }

  return { status, reasons, detail: { n, N, uniquelyLongestCount, observedProportion, expectedProportion, maxAllowedShare, z, statisticalResult } };
}

/**
 * Full Gate A evaluation for a metrics object (from computeCueMetrics),
 * per option-count group, combined into one overall status. 'fail' if any
 * group fails either check; else 'inconclusive' if any group is
 * inconclusive on either check; else 'pass'.
 *
 * Gate A is a purely STRUCTURAL/STATISTICAL judgment about answer
 * position and length distribution. It never inspects, and can never
 * establish, scientific correctness, item plausibility, or any other
 * Gate B property -- see docs/ASSESSMENT_VALIDITY.md.
 */
export function evaluateGateA(metrics) {
  const groups = metrics.byOptionCount.map((group) => {
    // uniquelyLongestCorrect is bank-wide in computeCueMetrics(); when a
    // scope contains more than one option-count group, callers needing a
    // per-group breakdown should call computeCueMetrics() on the
    // filtered subset for that option count instead.
    const position = evaluatePositionBalance(group);
    return { optionCount: group.optionCount, total: group.total, position };
  });

  const lengthEval =
    metrics.byOptionCount.length === 1
      ? evaluateLengthBalance(metrics.byOptionCount[0], metrics.uniquelyLongestCorrect)
      : { status: "inconclusive", reasons: ["mixed option-count groups present -- evaluate length balance per option-count subset, not on the combined scope"], detail: null };

  const allStatuses = [...groups.map((g) => g.position.status), lengthEval.status];
  const overall = allStatuses.includes("fail") ? "fail" : allStatuses.includes("inconclusive") ? "inconclusive" : "pass";

  return { overall, positionByOptionCount: groups, length: lengthEval };
}

// ============================================================================
// E. Deterministic pilot selection (Phase 0 step 3)
// ============================================================================

/**
 * Deterministically selects a representative pilot batch. The rule is
 * purely mechanical -- no manual judgment enters selection, so the same
 * input always produces the same output and the process cannot be used
 * to cherry-pick favorable-looking items:
 *
 *   1. Iterate questions in their given (canonical, file) order.
 *   2. For each question, compute its stratum key: `${domain}|${cueClass}`.
 *   3. The FIRST question encountered for each distinct stratum key is
 *      selected as that stratum's representative.
 *   4. After every distinct domain x cueClass stratum present in the data
 *      has one representative, scan the already-selected set for
 *      remaining coverage gaps in four further dimensions -- difficulty
 *      level, answer position actually used, final-exam vs. module-quiz
 *      context, and full- vs. partial-distractor-feedback ('w') coverage
 *      -- and, for each still-uncovered value, deterministically add the
 *      first not-yet-selected question (in canonical order) that
 *      supplies it.
 *
 * This selects items; it never evaluates, scores, or modifies them.
 * Selection is not authorization to rewrite -- see
 * docs/ASSESSMENT_VALIDITY.md.
 */
export function selectPilotBatch(questions, { lengthFn = canonicalLength } = {}) {
  questions.forEach((q) => assertValidQuestionShape(q, "selectPilotBatch"));
  const byId = new Map(questions.map((q) => [q.id, q]));
  const cueClassOf = (q) => classifyCue(q, lengthFn).cueClass;
  const hasFullDistractorCoverage = (q) => Object.keys(q.w || {}).length === q.o.length - 1;

  const selected = [];
  const selectedIds = new Set();
  const records = [];

  function select(q, stratum, reason) {
    if (selectedIds.has(q.id)) return;
    selectedIds.add(q.id);
    selected.push(q);
    records.push({ id: q.id, stratum, reason });
  }

  const domainCueSeen = new Set();
  questions.forEach((q) => {
    const key = `${q.d}|${cueClassOf(q)}`;
    if (!domainCueSeen.has(key)) {
      domainCueSeen.add(key);
      select(q, "domain-x-cueClass", `first item for domain="${q.d}" cueClass="${cueClassOf(q)}"`);
    }
  });

  function ensureCoverage(dimensionName, valueOf, values) {
    values.forEach((value) => {
      const covered = selected.some((q) => valueOf(q) === value);
      if (covered) return;
      const candidate = questions.find((q) => valueOf(q) === value && !selectedIds.has(q.id));
      if (candidate) { select(candidate, dimensionName, `first not-yet-selected item with ${dimensionName}="${value}"`); }
    });
  }

  ensureCoverage("difficulty", (q) => q.x, [...new Set(questions.map((q) => q.x))].sort());
  ensureCoverage("answerPosition", (q) => q.a, [...new Set(questions.map((q) => q.a))].sort());
  ensureCoverage("formContext", (q) => (q.module === "final" ? "final" : "module"), ["final", "module"]);
  ensureCoverage("distractorFeedbackCoverage", (q) => (hasFullDistractorCoverage(q) ? "full" : "partial"), ["full", "partial"]);

  return {
    ids: selected.map((q) => q.id).sort(),
    records: records.sort((a, b) => a.id.localeCompare(b.id)),
    size: selected.length,
    totalBankSize: questions.length,
    unusedAnswerPositions: (() => {
      const maxN = Math.max(...questions.map((q) => q.o.length));
      const used = new Set(questions.map((q) => q.a));
      const all = [];
      for (let i = 0; i < maxN; i += 1) { if (!used.has(i)) all.push(i); }
      return all;
    })(),
  };
}

// ============================================================================
// F. Boot the live authored bank without a browser (dependency-free,
//    same technique as tests/question-governance.mjs / tests/dom-behavior.mjs)
// ============================================================================

let cachedDomHarness = null;
async function getDomHarness() {
  if (!cachedDomHarness) { cachedDomHarness = await import(path.join(ROOT, "tests", "dom-harness.mjs")); }
  return cachedDomHarness;
}

/**
 * Boots the real inline <script> from index.html in an isolated `vm`
 * sandbox and returns its public window.CytoCourse API, entirely without
 * a browser. This is the ONLY source of question data this module's CLI
 * and dependency-free tests use -- the exact same runtime code path a
 * real browser executes, so results are guaranteed consistent with what
 * `window.CytoCourse.getQuestions()` returns in production (verified
 * independently, without relying on this claim, by
 * tests/e2e/assessment-cue-audit.spec.mjs's real-browser cross-check).
 */
export async function bootLiveCourseApi() {
  const { createEnvironment } = await getDomHarness();
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const inlineScript = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((source) => source.trim())[0];
  const staticBody = html
    .replace(/[\s\S]*?<body[^>]*>/i, "")
    .replace(/<script[\s\S]*$/i, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  const env = createEnvironment(staticBody, {});
  vm.createContext(env.sandbox);
  vm.runInContext(inlineScript, env.sandbox, { filename: "index.inline.js", timeout: 5_000 });
  if (env.ready) env.ready();
  return env.sandbox.window.CytoCourse;
}

/** Flattens window.CytoCourse.getQuestions()'s {module: [question,...]} shape into one array, tagging each question with its module. */
export function flattenQuestionBank(questionsByModule) {
  const out = [];
  Object.keys(questionsByModule).forEach((moduleKey) => {
    questionsByModule[moduleKey].forEach((q) => out.push(Object.assign({ module: moduleKey }, q)));
  });
  return out;
}

// ============================================================================
// G. CLI report (human-readable + deterministic machine-readable JSON)
// ============================================================================

function buildReport(allQuestions) {
  const idSet = new Set(allQuestions.map((q) => q.id));
  const duplicateCheck = idSet.size === allQuestions.length;

  const bankMetrics = computeCueMetrics(allQuestions, { lengthFn: canonicalLength });
  const bankHistorical = computeCueMetrics(allQuestions, { lengthFn: historicalLength });
  const bankGateA = evaluateGateA(bankMetrics);

  const byModule = new Map();
  allQuestions.forEach((q) => {
    if (!byModule.has(q.module)) byModule.set(q.module, []);
    byModule.get(q.module).push(q);
  });
  const forms = [...byModule.keys()].sort().map((moduleKey) => {
    const qs = byModule.get(moduleKey);
    const metrics = computeCueMetrics(qs, { lengthFn: canonicalLength });
    return { module: moduleKey, metrics, gateA: evaluateGateA(metrics) };
  });

  const byDomain = new Map();
  allQuestions.forEach((q) => {
    if (!byDomain.has(q.d)) byDomain.set(q.d, []);
    byDomain.get(q.d).push(q);
  });
  const domains = [...byDomain.keys()].sort().map((domain) => {
    const qs = byDomain.get(domain);
    return { domain, metrics: computeCueMetrics(qs, { lengthFn: canonicalLength }) };
  });

  const byDifficulty = new Map();
  allQuestions.forEach((q) => {
    if (!byDifficulty.has(q.x)) byDifficulty.set(q.x, []);
    byDifficulty.get(q.x).push(q);
  });
  const difficulties = [...byDifficulty.keys()].sort().map((x) => {
    const qs = byDifficulty.get(x);
    return { difficulty: x, metrics: computeCueMetrics(qs, { lengthFn: canonicalLength }) };
  });

  const byTopic = new Map();
  allQuestions.forEach((q) => {
    if (!byTopic.has(q.t)) byTopic.set(q.t, []);
    byTopic.get(q.t).push(q);
  });
  const topics = [...byTopic.keys()].sort().map((topic) => {
    const qs = byTopic.get(topic);
    return { topic, metrics: computeCueMetrics(qs, { lengthFn: canonicalLength }) };
  });

  const pilot = selectPilotBatch(allQuestions, { lengthFn: canonicalLength });

  const baselineComparison = {
    originalBaseline: ORIGINAL_BASELINE,
    reproducedWithHistoricalMethod: {
      totalAuthoredQuestions: bankHistorical.total,
      positionCounts: Object.fromEntries(bankHistorical.byOptionCount[0].positionCounts.map((c, i) => [i, c])),
      uniquelyLongestCorrect: bankHistorical.uniquelyLongestCorrect,
      longestOrTiedCorrect: bankHistorical.longestOrTiedCorrect,
    },
    matchesOriginalBaselineExactly:
      bankHistorical.total === ORIGINAL_BASELINE.totalAuthoredQuestions &&
      bankHistorical.uniquelyLongestCorrect === ORIGINAL_BASELINE.uniquelyLongestCorrect &&
      bankHistorical.longestOrTiedCorrect === ORIGINAL_BASELINE.longestOrTiedCorrect &&
      JSON.stringify(Object.fromEntries(bankHistorical.byOptionCount[0].positionCounts.map((c, i) => [i, c]))) === JSON.stringify(ORIGINAL_BASELINE.positionCounts),
    canonicalMethodDiffersFromHistorical:
      bankMetrics.uniquelyLongestCorrect !== bankHistorical.uniquelyLongestCorrect ||
      bankMetrics.longestOrTiedCorrect !== bankHistorical.longestOrTiedCorrect,
  };

  return {
    generatedAt: new Date().toISOString(),
    totalAuthoredQuestions: allQuestions.length,
    uniqueIdCount: idSet.size,
    noDuplicateOrOmittedIds: duplicateCheck,
    baselineComparison,
    bank: { metrics: bankMetrics, gateA: bankGateA },
    forms,
    domains,
    difficulties,
    topics,
    pilot,
  };
}

function printHumanReadable(report) {
  const lines = [];
  lines.push("Assessment-cue audit -- authored question bank (Phase 0 step 1, QL-033)");
  lines.push("=".repeat(76));
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Total authored questions: ${report.totalAuthoredQuestions} (unique ids: ${report.uniqueIdCount}, no duplicate/omitted: ${report.noDuplicateOrOmittedIds})`);
  lines.push("");
  lines.push("-- Frozen original baseline (QL-033) vs. reproduced-today (historical method) --");
  const b = report.baselineComparison;
  lines.push(`  original:    total=${b.originalBaseline.totalAuthoredQuestions} positions=${JSON.stringify(b.originalBaseline.positionCounts)} uniquelyLongest=${b.originalBaseline.uniquelyLongestCorrect} longestOrTied=${b.originalBaseline.longestOrTiedCorrect}`);
  lines.push(`  reproduced:  total=${b.reproducedWithHistoricalMethod.totalAuthoredQuestions} positions=${JSON.stringify(b.reproducedWithHistoricalMethod.positionCounts)} uniquelyLongest=${b.reproducedWithHistoricalMethod.uniquelyLongestCorrect} longestOrTied=${b.reproducedWithHistoricalMethod.longestOrTiedCorrect}`);
  lines.push(`  matches original baseline exactly: ${b.matchesOriginalBaselineExactly}`);
  lines.push(`  canonical metric differs from historical: ${b.canonicalMethodDiffersFromHistorical}`);
  lines.push("");
  lines.push("-- Whole-bank Gate A (canonical length metric) --");
  lines.push(`  overall: ${report.bank.gateA.overall.toUpperCase()}`);
  report.bank.gateA.positionByOptionCount.forEach((g) => {
    lines.push(`  position balance (${g.optionCount}-option items, n=${g.total}): ${g.position.status.toUpperCase()}`);
    g.position.reasons.forEach((r) => lines.push(`    - ${r}`));
  });
  lines.push(`  length balance: ${report.bank.gateA.length.status.toUpperCase()}`);
  report.bank.gateA.length.reasons.forEach((r) => lines.push(`    - ${r}`));
  lines.push("");
  lines.push("-- Per-form (module) Gate A --");
  report.forms.forEach((f) => { lines.push(`  ${f.module}: n=${f.metrics.total} overall=${f.gateA.overall.toUpperCase()}`); });
  lines.push("");
  lines.push("-- Per-domain counts --");
  report.domains.forEach((d) => { lines.push(`  ${d.domain}: n=${d.metrics.total} uniquelyLongest=${d.metrics.uniquelyLongestCorrect} longestOrTied=${d.metrics.longestOrTiedCorrect}`); });
  lines.push("");
  lines.push("-- Per-difficulty counts --");
  report.difficulties.forEach((d) => { lines.push(`  x=${d.difficulty}: n=${d.metrics.total} uniquelyLongest=${d.metrics.uniquelyLongestCorrect} longestOrTied=${d.metrics.longestOrTiedCorrect}`); });
  lines.push("");
  lines.push(`-- Per-topic counts (${report.topics.length} distinct topics; full detail in --json) --`);
  report.topics.forEach((t) => { lines.push(`  ${t.topic}: n=${t.metrics.total} uniquelyLongest=${t.metrics.uniquelyLongestCorrect} longestOrTied=${t.metrics.longestOrTiedCorrect}`); });
  lines.push("");
  lines.push(`-- Pilot batch: ${report.pilot.size} of ${report.pilot.totalBankSize} questions --`);
  lines.push(`  unused answer positions in the bank: ${JSON.stringify(report.pilot.unusedAnswerPositions)}`);
  report.pilot.records.forEach((r) => lines.push(`  ${r.id} [${r.stratum}] ${r.reason}`));
  lines.push("");
  lines.push("This audit measures and classifies; it never rewrites content, marks");
  lines.push("anything scientifically reviewed, or claims diagnostic eligibility.");
  return lines.join("\n");
}

async function runCli() {
  const api = await bootLiveCourseApi();
  const questionsByModule = api.getQuestions();
  const allQuestions = flattenQuestionBank(questionsByModule);
  const report = buildReport(allQuestions);

  const wantsJson = process.argv.includes("--json");
  if (wantsJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(printHumanReadable(report));
    console.log("");
    console.log("(Re-run with --json for deterministic machine-readable output.)");
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCli().catch((error) => {
    console.error("assessment-cue-audit failed:", error);
    process.exitCode = 1;
  });
}

export { buildReport, printHumanReadable };
