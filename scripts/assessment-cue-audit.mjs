#!/usr/bin/env node
// Assessment-cue audit: bank/form-level answer-position and answer-length
// cueing measurement for the authored question bank (Phase 0 step 1,
// docs/LEARNING_PLATFORM_ROADMAP.md; QL-033, docs/QUALITY_LOG.md).
//
// This file is the SINGLE authoritative implementation of every
// measurement and Gate A rule described in docs/ASSESSMENT_VALIDITY.md.
// It is imported (never re-implemented) by:
//   - tests/assessment-cue-audit.mjs (dependency-free unit/boundary tests)
//   - tests/e2e/assessment-cue-audit.spec.mjs (real-browser cross-check,
//     including the rendered-text oracle -- see canonicalLength() below)
//   - this file's own CLI mode (`npm run audit:assessment-cues`)
// Do not duplicate any formula from this file elsewhere; import instead.
//
// Scope discipline (read before editing): this file MEASURES and
// CLASSIFIES the existing question bank. It never rewrites, reorders, or
// otherwise mutates question content, and it never marks anything
// scientifically reviewed, Gate B-passing, release-qualified,
// diagnostically eligible, or psychometrically validated -- Gate A
// failure/pass is a purely statistical/structural judgment about answer
// position/length distribution, nothing more. See docs/ASSESSMENT_VALIDITY.md
// for the full policy this file implements and its cited sources.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..");

// ============================================================================
// IMMUTABLE ORIGINAL BASELINE (QL-033, docs/QUALITY_LOG.md) -- never edited.
// This is the historical AGGREGATE record, frozen at the point QL-033 was
// first confirmed. See ORIGINAL_ID_MANIFEST below for the separate, also
// frozen, exact-identity record -- aggregate counts alone cannot detect an
// id substitution that preserves every count (docs/ASSESSMENT_VALIDITY.md
// "Frozen exact-identity manifest").
// ============================================================================
export const ORIGINAL_BASELINE = Object.freeze({
  totalAuthoredQuestions: 153,
  positionCounts: Object.freeze({ 0: 11, 1: 139, 2: 3, 3: 0 }),
  uniquelyLongestCorrect: 114,
  longestOrTiedCorrect: 133,
  method: "historical-length",
  recordedIn: "docs/QUALITY_LOG.md QL-033",
});

// The exact 153 stable ids QL-033's counts were computed against, frozen
// independently of the live bank, sorted for a stable comparison order.
// Populated once at the bottom of this file from the reproduced live bank
// at the time this correction was authored (see docs/ASSESSMENT_VALIDITY.md
// section 2 for the exact reproduction command) -- NOT derived at import
// time from the live bank on every run, which would make it incapable of
// detecting a later id substitution.
import { ORIGINAL_ID_MANIFEST_IDS, ORIGINAL_FORM_ORDER_IDS } from "./assessment-cue-audit-id-manifest.mjs";

export function sha256Hex(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function manifestDigest(sortedIds) {
  return sha256Hex(JSON.stringify(sortedIds));
}

export const ORIGINAL_ID_MANIFEST = Object.freeze({
  sortedIds: Object.freeze([...ORIGINAL_ID_MANIFEST_IDS].sort()),
  count: ORIGINAL_ID_MANIFEST_IDS.length,
  sha256: manifestDigest([...ORIGINAL_ID_MANIFEST_IDS].sort()),
});

/**
 * Compares a live set of ids against the frozen ORIGINAL_ID_MANIFEST.
 * Detects removal, addition, replacement (one id swapped for another,
 * even if the total count and every aggregate metric is unchanged), and
 * duplication.
 *
 * CORRECTED (docs/ASSESSMENT_VALIDITY.md section 2.2): this function's
 * comment previously claimed it also detected "reordering where order is
 * part of the contract" -- that was wrong and self-contradictory with the
 * very next clause, which correctly explains the digest is computed over
 * the SORTED id list and is therefore order-INDEPENDENT by construction.
 * This function answers exactly one question -- "does the same SET of 153
 * ids exist" -- and deliberately does not, and cannot, answer "are they in
 * the same ORDER." Reversing or arbitrarily permuting the live id array
 * before calling this function still reports `matches: true` if the SET
 * is unchanged (verified directly, tests/assessment-cue-audit.mjs) --
 * this is correct behavior for a set-identity check, not a bug, but the
 * old comment's claim about order was inaccurate and has been removed.
 *
 * Per-form AUTHORED ENCOUNTER ORDER is now a separate, independently
 * tracked contract -- see `compareToFormOrderManifest()` below -- because
 * the new answer-key sequence check (section D, `evaluateAnswerSequence()`)
 * makes each learner-facing form's actual rendered order part of Gate A's
 * behavioral contract for the first time (`index.html`'s `buildQuiz()`
 * renders `QUIZZES[key]` in exact array order, never shuffled). Before
 * that check existed, order genuinely was not part of any Gate A
 * decision, so this file correctly didn't track it -- but the old
 * comment already (incorrectly) claimed this function covered it.
 */
export function compareToIdManifest(liveIds) {
  const sortedLive = [...liveIds].sort();
  const liveDigest = manifestDigest(sortedLive);
  const liveSet = new Set(liveIds);
  const frozenSet = new Set(ORIGINAL_ID_MANIFEST.sortedIds);
  const removed = ORIGINAL_ID_MANIFEST.sortedIds.filter((id) => !liveSet.has(id));
  const added = sortedLive.filter((id) => !frozenSet.has(id));
  const hasDuplicates = liveIds.length !== liveSet.size;
  return {
    matches: liveDigest === ORIGINAL_ID_MANIFEST.sha256 && !hasDuplicates,
    liveDigest,
    frozenDigest: ORIGINAL_ID_MANIFEST.sha256,
    liveCount: liveIds.length,
    frozenCount: ORIGINAL_ID_MANIFEST.count,
    hasDuplicates,
    removed,
    added,
  };
}

/** Order-sensitive digest of an ordered id list -- deliberately NOT sorted first, unlike manifestDigest() above. */
function formOrderDigest(orderedIds) {
  return sha256Hex(JSON.stringify(orderedIds));
}

export const ORIGINAL_FORM_ORDER_MANIFEST = Object.freeze(
  Object.fromEntries(
    Object.entries(ORIGINAL_FORM_ORDER_IDS).map(([moduleKey, orderedIds]) => [
      moduleKey,
      Object.freeze({ orderedIds: Object.freeze([...orderedIds]), digest: formOrderDigest(orderedIds) }),
    ])
  )
);

/**
 * Compares each form's LIVE authored encounter order against the frozen
 * ORIGINAL_FORM_ORDER_MANIFEST -- an ORDER-SENSITIVE check, the
 * counterpart `compareToIdManifest()` above deliberately is not.
 *
 * Kept as a genuinely separate concern from `compareToIdManifest()`
 * (set identity), from `baselineComparison` in `buildDeterministicReport()`
 * (mechanical aggregate-metric drift against QL-033's frozen counts), and
 * from `evaluateGateA()` (the CURRENT Gate A status of whatever bank
 * exists today, regardless of whether it matches any frozen record) --
 * four independently meaningful, independently reported questions that
 * must not be conflated: "does the same set of questions exist," "is each
 * form's authored encounter order unchanged," "have the frozen aggregate
 * measurements drifted," and "does the live bank pass Gate A right now."
 *
 * `liveQuestionsByModule` is the `{moduleKey: [question, ...]}` shape
 * `window.CytoCourse.getQuestions()` returns (each module's array
 * already in its real authored/rendered order -- see
 * `flattenQuestionBank()`, which preserves this per-module order when
 * flattening).
 */
export function compareToFormOrderManifest(liveQuestionsByModule) {
  const moduleKeys = new Set([
    ...Object.keys(ORIGINAL_FORM_ORDER_MANIFEST),
    ...Object.keys(liveQuestionsByModule),
  ]);
  const perForm = {};
  let allMatch = true;
  [...moduleKeys].sort().forEach((moduleKey) => {
    const frozen = ORIGINAL_FORM_ORDER_MANIFEST[moduleKey] || null;
    const liveOrderedIds = (liveQuestionsByModule[moduleKey] || []).map((q) => q.id);
    const liveDigest = formOrderDigest(liveOrderedIds);
    const matches = !!frozen && liveDigest === frozen.digest;
    if (!matches) allMatch = false;
    perForm[moduleKey] = {
      matches,
      liveDigest,
      frozenDigest: frozen ? frozen.digest : null,
      liveOrderedIds,
      frozenOrderedIds: frozen ? frozen.orderedIds : null,
    };
  });
  return { matches: allMatch, perForm };
}

// ============================================================================
// A. Length measurement
// ============================================================================

/**
 * The HISTORICAL length metric used only to reproduce QL-033's frozen
 * aggregate counts: raw JavaScript string `.length` (UTF-16 code units),
 * no normalization of any kind.
 *
 * PROVENANCE, STATED PRECISELY (corrected -- docs/ASSESSMENT_VALIDITY.md
 * section 3.1): this metric independently REPRODUCES QL-033's recorded
 * aggregate figures exactly, and a tested alternative (word count) does
 * NOT reproduce them. That is evidence the ORIGINAL one-off audit used a
 * character-count-shaped metric, not evidence of exactly which one --
 * no original script survives in this repository, so the specific
 * original implementation cannot be proven from retained evidence. This
 * function is a reconstruction that matches the recorded aggregate
 * output, not a recovered original.
 */
export function historicalLength(text) {
  if (typeof text !== "string") { throw new TypeError("historicalLength: text must be a string"); }
  return text.length;
}

/**
 * The CANONICAL, RENDERING-ACCURATE length metric
 * (docs/ASSESSMENT_VALIDITY.md "Canonical learner-visible length metric",
 * corrected). Defined to match EXACTLY what a learner sees in a rendered
 * `.qopt` option, per the actual runtime rendering contract in
 * `index.html`'s `esc()` and `buildQuiz()`:
 *
 *   function esc(t){ var d=document.createElement('div');
 *     d.textContent = (t==null?'':String(t)); return d.innerHTML; }
 *   ...
 *   '<span>'+esc(opt)+'</span>'
 *
 * `esc()` round-trips the raw option string through `textContent` (which
 * never interprets its input as markup or entities) and back out through
 * `innerHTML` (which escapes it for safe insertion). The browser then
 * parses that escaped HTML and reconstitutes the ORIGINAL literal
 * characters when rendering -- this is a lossless round trip. Concretely:
 * a raw option string containing the literal characters `<b>Bold</b>` or
 * `&amp;` is displayed to the learner AS THOSE LITERAL CHARACTERS, never
 * interpreted as a bold tag or a decoded ampersand. There is no markup
 * interpretation or entity decoding anywhere in this rendering pipeline.
 *
 * CORRECTED (docs/ASSESSMENT_VALIDITY.md): an earlier version of this
 * metric stripped tag-shaped substrings and decoded HTML entities before
 * counting -- both wrong, because they measured a DIFFERENT string than
 * the one actually rendered, confirmed by direct comparison against a
 * real browser's rendered `.qopt` text (`tests/e2e/assessment-cue-audit.spec.mjs`,
 * the rendered-text oracle). No visible character is ever removed on the
 * theory that it "resembles HTML" -- it is never interpreted as HTML by
 * this application, so it is not HTML from a learner's perspective; it is
 * plain visible text.
 *
 * What this function DOES do, and why each step matches actual rendering
 * (not an assumption about it):
 *   1. Unicode NFC-normalize. Not a rendering effect per se, but a
 *      precomposed and a decomposed representation of the same character
 *      (e.g. one code point for "e with acute accent" vs. "e" followed by
 *      a combining acute-accent code point) render as the same visible
 *      glyph -- this keeps the metric a perceptually consistent
 *      text-length PROXY across both encodings of visually identical
 *      input, rather than an artifact of which encoding an author's
 *      editor happened to save.
 *   2. Collapse internal whitespace runs to a single space and trim
 *      leading/trailing whitespace. This IS a genuine rendering effect:
 *      `.qopt` and its option `<span>` carry no `white-space: pre*`
 *      override anywhere in `index.html` (verified by direct inspection
 *      of the stylesheet), so normal CSS inline-content whitespace
 *      collapsing applies to what a learner visually sees, exactly as
 *      this step reproduces.
 *   3. Count grapheme clusters (`Intl.Segmenter`, 'grapheme' granularity)
 *      rather than UTF-16 code units or raw code points, so one visible
 *      character built from multiple code points (e.g. an emoji with a
 *      modifier) counts once. This is stated honestly as a TEXT-LENGTH
 *      PROXY -- an approximate count of visible character units -- not a
 *      measure of rendered visual width or perceptual salience (a wide
 *      character and a narrow one each count as 1 grapheme regardless of
 *      the pixels they actually occupy). Gate B human review remains the
 *      required check for a cue this metric cannot measure, such as a
 *      genuinely wider-looking but grapheme-equal-length option.
 *
 * What this function deliberately does NOT do, and why:
 *   - No HTML entity decoding. `esc()` never triggers entity
 *     interpretation for the LEARNER (see above) -- decoding would
 *     measure a string the learner never actually sees.
 *   - No tag stripping. Same reason -- a literal `<b>` is visible text,
 *     not a bold instruction, in this application.
 *   - No trailing-punctuation stripping. An earlier version stripped one
 *     trailing `.`/`!`/`?` as an anti-padding measure; removed here
 *     because it is not what a learner sees rendered, and it made the
 *     canonical metric diverge from the live-rendered-text oracle by
 *     definition for any option ending in punctuation. Defending against
 *     trivial decorative-punctuation padding is Gate B's job (item-level
 *     human review, docs/ASSESSMENT_VALIDITY.md section 5), not this
 *     metric's.
 */
export function canonicalLength(text) {
  if (typeof text !== "string") { throw new TypeError("canonicalLength: text must be a string"); }
  let t = text.normalize("NFC");
  t = t.replace(/\s+/g, " ").trim();
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
 * option set. Returns, in addition to the qualitative cueClass
 * (retained as a diagnostic, docs/ASSESSMENT_VALIDITY.md section 4.4):
 *   - n: this item's own option count
 *   - tiedAtMax: how many options (including the correct one or not)
 *     share this item's maximum length -- the tie count k_i the
 *     tie-aware model (section D below) needs
 *   - correctAtMax: whether the correct answer is IN the max-length set
 *     (true whenever cueClass is 'uniquely-longest' or 'tied-longest')
 *   - nullProbabilityCorrectAtMax: k_i/n_i, the probability that a
 *     RANDOMLY selected option (independent of correctness) would fall
 *     in the max-length set, under the null hypothesis that which option
 *     is correct is independent of option length -- this item's own
 *     contribution to the tie-aware Poisson-binomial model in
 *     evaluateLengthAssociation() below.
 */
export function classifyCue(q, lengthFn = canonicalLength) {
  assertValidQuestionShape(q, "classifyCue");
  const lens = q.o.map((opt) => lengthFn(opt));
  const n = q.o.length;
  const maxLen = Math.max(...lens);
  const tiedAtMax = lens.filter((l) => l === maxLen).length;
  const correctAtMax = lens[q.a] === maxLen;
  return {
    lengths: lens,
    correctLength: lens[q.a],
    maxLength: maxLen,
    optionsAtMax: tiedAtMax,
    n,
    tiedAtMax,
    correctAtMax,
    nullProbabilityCorrectAtMax: tiedAtMax / n,
    cueClass: !correctAtMax ? "not-longest" : tiedAtMax === 1 ? "uniquely-longest" : "tied-longest",
  };
}

// ============================================================================
// C. Aggregate metrics (one bank, one form, or any question list)
// ============================================================================

/**
 * Computes the full metric set for an arbitrary list of questions
 * (the whole bank, one module/form, or any other slice). Returns raw
 * counts and per-item cue data only -- see evaluateGateA() for
 * pass/fail/inconclusive judgment. Mixed option-count scopes are fully
 * supported: `byOptionCount` groups items for the POSITION check (which
 * genuinely needs option-count-homogeneous groups, since "position 3"
 * means something different for a 4-option item than for a 2-option
 * one), while `items` (every item's own classifyCue() result) supports
 * the LENGTH association check directly, per item, regardless of option
 * count -- see evaluateLengthAssociation(), which needs no grouping by
 * option count at all (corrected; docs/ASSESSMENT_VALIDITY.md section
 * 4.5, "mixed option-count evaluation").
 */
export function computeCueMetrics(questions, { lengthFn = canonicalLength } = {}) {
  if (!Array.isArray(questions)) { throw new TypeError("computeCueMetrics: questions must be an array"); }
  questions.forEach((q) => assertValidQuestionShape(q, "computeCueMetrics"));

  const byOptionCount = new Map();
  let uniquelyLongest = 0;
  let longestOrTied = 0;
  const items = [];

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
    items.push({ id: q.id, answerPosition: q.a, ...cue });
  });

  return {
    total: questions.length,
    ids: questions.map((q) => q.id),
    byOptionCount: [...byOptionCount.values()].sort((a, b) => a.optionCount - b.optionCount),
    uniquelyLongestCorrect: uniquelyLongest,
    longestOrTiedCorrect: longestOrTied,
    items,
  };
}

// ============================================================================
// D. Gate A -- bank/form-level statistical guardrails
//    (docs/ASSESSMENT_VALIDITY.md "Gate A" for full rationale and sources)
//
//    CORRECTED (docs/ASSESSMENT_VALIDITY.md section 4): the previous
//    version made a scope "inconclusive" whenever it was below the
//    reliable-statistical-inference floor (5 items per position), which
//    made every real course form (5-9 items) and the 13-item pilot
//    UNABLE to ever pass Gate A, even when perfectly balanced -- Phase
//    0's own exit criteria require them to be able to pass. Gate A now
//    uses two DISTINCT, clearly-scoped regimes, chosen by the SAME
//    threshold value everywhere (eliminating the prior disagreement
//    between "is the statistic computable" and "which regime applies"):
//
//      SMALL-N (structural) regime, N < REGIME_THRESHOLD(n):
//        A fully deterministic, always-achievable structural rule
//        (the "exact pigeonhole" rule below) determines pass/fail. No
//        statistical test is attempted here at all -- not "attempted
//        but suppressed", genuinely not needed, since the structural
//        rule alone is a complete, achievable, non-arbitrary decision
//        procedure at this sample size.
//      LARGE-N (statistical) regime, N >= REGIME_THRESHOLD(n):
//        A practical/effect-size margin (primary, authoritative) plus a
//        chi-square goodness-of-fit test (corroborating, computed
//        exactly when this regime applies -- by construction, since the
//        regime threshold IS the chi-square validity threshold).
// ============================================================================

// Additive margin above the uniform 1/n chance rate before a position's
// (large-N regime) observed share counts as a practical, effect-size
// FAIL. At n=4, the allowed maximum is 40% -- clearly above the 25%
// chance rate to tolerate ordinary large-sample authoring variation, but
// far below the bank's actual observed 90.8% rate.
export const PRACTICAL_MARGIN = 0.15;

// Standard rule-of-thumb minimum expected-cell-count for a chi-square
// goodness-of-fit test to be valid (every expected cell count >= 5).
// Also used, by construction (see REGIME_THRESHOLD below), as the single
// dividing line between the small-N structural regime and the large-N
// statistical regime, for BOTH position balance and (historically) the
// length check -- eliminating any possibility of the two disagreeing.
export const CHI_SQUARE_MIN_EXPECTED_PER_CELL = 5;

/** The single small-N/large-N regime boundary for an option-count group of size n. Same value used to decide the regime AND whether chi-square is computable -- see module doc comment above. */
export function REGIME_THRESHOLD(n) {
  return CHI_SQUARE_MIN_EXPECTED_PER_CELL * n;
}

// Two-tailed significance level for the large-N statistical corroboration
// and the tie-aware length association test. Deliberately conservative
// (rather than the conventional 0.05): the practical/structural check is
// primary; the statistical test only corroborates it, and a stricter
// alpha reduces the chance of flagging a legitimately balanced scope from
// ordinary sampling variation alone.
export const SIGNIFICANCE_ALPHA = 0.01;

// Reference chi-square critical values at alpha=0.01 and alpha=0.05,
// indexed by degrees of freedom (df = optionCount - 1). NOT used to drive
// any decision below (docs/ASSESSMENT_VALIDITY.md section 4.6b): retained
// only as an independently-sourced reference table for cross-checking
// chiSquareUpperTailPValue() in tests, and for display alongside the
// computed p-value. Source, directly fetched and transcribed (round 5,
// replacing the previously unsourced "standard published table"
// language): NIST/SEMATECH e-Handbook of Statistical Methods,
// "1.3.6.7.4. Critical Values of the Chi-Square Distribution," National
// Institute of Standards and Technology,
// <https://www.itl.nist.gov/div898/handbook/eda/section3/eda3674.htm>,
// verified 2026-08-08. Covers option counts 2-8; the p-value function
// itself is not limited to this range.
const CHI_SQUARE_CRITICAL_ALPHA_01_REFERENCE = { 1: 6.635, 2: 9.210, 3: 11.345, 4: 13.277, 5: 15.086, 6: 16.812, 7: 18.475 };

// ----------------------------------------------------------------------------
// Chi-square goodness-of-fit p-value (new -- docs/ASSESSMENT_VALIDITY.md
// section 4.6b). CORRECTED: position balance previously reported only a
// chi-square statistic and a Boolean critical-value-table comparison,
// never an actual p-value -- a critical-value lookup is not itself a
// p-value, and the round-3 correction's own stated policy ("report the
// statistical result and p-value separately") was not actually followed
// for position balance (length association already computed a genuine
// p-value via the exact Poisson-binomial method).
//
// Terminology, stated precisely (corrected -- round 5): the chi-square
// distribution's survival function P(X >= x) is MATHEMATICALLY DEFINED,
// exactly, through the regularized upper incomplete gamma function
// Q(df/2, x/2) -- a closed-form relationship, not an approximation. This
// JavaScript implementation NUMERICALLY EVALUATES that function using
// finite-precision floating-point arithmetic (a standard series expansion
// for the argument range where it converges quickly, and a standard
// continued-fraction expansion otherwise) -- the computed floating-point
// RESULT is not called "exact" without that qualification, since any
// finite-precision numerical evaluation carries some (here, extremely
// small -- see the verification below) numerical error. This is a
// separate matter from the chi-square GOODNESS-OF-FIT TEST's own
// well-known statistical approximation -- that the discrete multinomial
// counts are well-approximated by a continuous chi-square distribution in
// the first place, valid only when every expected cell count is
// reasonably large -- which REGIME_THRESHOLD(n)'s minimum-expected-cell
// rule exists to keep satisfied (see the "Approximation and
// applicability" note on chiSquareUpperTailPValue() below for both
// distinctions stated together).
//
// Algorithm provenance (corrected -- round 5): the series-and-continued-
// fraction technique for evaluating the incomplete gamma function is a
// standard, widely-documented numerical method, not exclusive to any one
// text. An earlier version of this comment attributed the specific
// implementation to "Numerical Recipes, 3rd ed., section 6.2" without
// having directly inspected that section's actual content -- the official
// bookreader at <https://numerical.recipes/book.html> is subscription-
// gated; only its table of contents was directly inspected (confirming a
// corresponding section, "6.2 Incomplete Gamma Function and Error
// Function," page 259, exists in that text), not the algorithmic content
// itself, so the specific coefficient set and series/continued-fraction
// structure below are NOT attributed to that source. This implementation
// is instead verified directly against two genuinely independent
// authorities, neither of which shares this function's own recurrence:
//   1. Two ANALYTICALLY REDUCIBLE special cases, derived independently
//      by hand from the chi-square distribution's own definition (not
//      this implementation): df=2 gives the closed form P(X>=x) =
//      exp(-x/2) (chi-square with 2 degrees of freedom is Exponential(
//      mean=2)); df=4 gives P(X>=x) = exp(-x/2)*(1 + x/2) (chi-square
//      with 4 degrees of freedom is Gamma(shape=2, scale=2)). Both
//      verified directly at x=10 (tests/assessment-cue-audit.mjs):
//      df=2 -> 0.006737946999085467; df=4 -> 0.0404276819945128.
//   2. The published critical-value table below (α=0.01) and its
//      α=0.05 counterpart, both cross-checked directly against the NIST/
//      SEMATECH e-Handbook of Statistical Methods, "1.3.6.7.4. Critical
//      Values of the Chi-Square Distribution," National Institute of
//      Standards and Technology, <https://www.itl.nist.gov/div898/handbook/eda/section3/eda3674.htm>,
//      directly fetched and its table transcribed, verified 2026-08-08.
// This is NOT limited to the 2-8 option-count range the reference table
// happens to cover.
// ----------------------------------------------------------------------------

/** Lanczos approximation of ln(Gamma(x)), standard g=7/n=9 coefficient set. */
function logGamma(x) {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) { return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x); }
  const xm1 = x - 1;
  let a = c[0];
  const t = xm1 + g + 0.5;
  for (let i = 1; i < g + 2; i += 1) { a += c[i] / (xm1 + i); }
  return 0.5 * Math.log(2 * Math.PI) + (xm1 + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Lower regularized incomplete gamma P(a,x) via its series expansion -- valid/convergent for x < a+1. */
function lowerRegularizedIncompleteGammaSeries(a, x) {
  if (x <= 0) return 0;
  let sum = 1 / a;
  let term = sum;
  let n = a;
  for (let i = 0; i < 500; i += 1) {
    n += 1;
    term *= x / n;
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

/** Upper regularized incomplete gamma Q(a,x) via a continued fraction (modified Lentz's method) -- valid/convergent for x >= a+1. */
function upperRegularizedIncompleteGammaContinuedFraction(a, x) {
  const FPMIN = 1e-300;
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/**
 * Shared numeric-domain guard (round 6 -- docs/ASSESSMENT_VALIDITY.md
 * section 4.3f). CORRECTED: chiSquareUpperTailPValue, cohensW, and
 * upperRegularizedIncompleteGamma each validated only sign (`<= 0`/`< 0`),
 * which is silently false for NaN and does not exclude Infinity -- so
 * chiSquareUpperTailPValue(NaN, 3), chiSquareUpperTailPValue(Infinity, 3),
 * cohensW(NaN, 100), cohensW(1, Infinity), and
 * upperRegularizedIncompleteGamma(a, NaN)/(NaN, x) all silently returned
 * NaN (or, for cohensW(1, Infinity), a misleadingly finite 0) instead of
 * throwing. ONE reusable finiteness check, used by every numeric helper
 * below, replaces the duplicated ad hoc sign-only checks.
 */
function assertFiniteNumber(value, description) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(`${description} must be a finite number (got ${value})`);
  }
}

/** Upper regularized incomplete gamma Q(a,x) = 1 - P(a,x), for a > 0, x >= 0. */
export function upperRegularizedIncompleteGamma(a, x) {
  assertFiniteNumber(a, "upperRegularizedIncompleteGamma: a");
  assertFiniteNumber(x, "upperRegularizedIncompleteGamma: x");
  if (a <= 0) { throw new RangeError("upperRegularizedIncompleteGamma: a must be positive"); }
  if (x < 0) { throw new RangeError("upperRegularizedIncompleteGamma: x must be non-negative"); }
  if (x === 0) return 1;
  if (x < a + 1) { return 1 - lowerRegularizedIncompleteGammaSeries(a, x); }
  return upperRegularizedIncompleteGammaContinuedFraction(a, x);
}

/**
 * Upper-tail (right-tail) p-value of the chi-square distribution:
 * P(X >= chiSquareStat) for X ~ chi-square(df). This is the accurately
 * named p-value for a chi-square goodness-of-fit test's statistic --
 * NOT a critical-value-table lookup, and not limited to any small,
 * tabulated set of df values.
 *
 * Two distinct approximation questions, both stated honestly, not left
 * implicit (corrected -- round 5, precise terminology):
 *   1. The chi-square survival function ITSELF is mathematically defined,
 *      exactly, via the regularized upper incomplete gamma function --
 *      that relationship is a closed form, not an approximation. This
 *      function NUMERICALLY EVALUATES that closed form using
 *      finite-precision floating-point arithmetic; the returned
 *      floating-point number is a numerical evaluation of the exact
 *      mathematical value, not claimed to be that value with zero error
 *      (verified to agree with independent analytic and published-table
 *      references to at least 4-5 significant figures --
 *      tests/assessment-cue-audit.mjs).
 *   2. Separately, and upstream of this function: the chi-square
 *      GOODNESS-OF-FIT TEST assumes the observed multinomial counts are
 *      well-approximated by a continuous chi-square distribution, which
 *      is only reasonable when every expected cell count is reasonably
 *      large (conventionally >= 5, `CHI_SQUARE_MIN_EXPECTED_PER_CELL`).
 *      This function does not itself enforce that condition -- callers
 *      (currently only `evaluatePositionBalance()`'s large-N regime,
 *      reached exactly when `N >= REGIME_THRESHOLD(n)` guarantees it) are
 *      responsible for only calling it where that approximation is valid.
 */
export function chiSquareUpperTailPValue(chiSquareStat, df) {
  assertFiniteNumber(chiSquareStat, "chiSquareUpperTailPValue: chiSquareStat");
  assertFiniteNumber(df, "chiSquareUpperTailPValue: df");
  if (df <= 0) { throw new RangeError("chiSquareUpperTailPValue: df must be positive"); }
  // This audit only ever calls with df = optionCount - 1, always a
  // positive integer (round 6 -- docs/ASSESSMENT_VALIDITY.md section
  // 4.3f): a fractional df here can only mean a caller bug (e.g. passing
  // optionCount instead of optionCount - 1), not a legitimate use of this
  // function's real-valued generality. Confirmed before this fix:
  // chiSquareUpperTailPValue(5, 2.5) silently computed 0.12308857115265875
  // instead of throwing.
  if (!Number.isInteger(df)) { throw new RangeError(`chiSquareUpperTailPValue: df must be an integer (got ${df}) -- this audit's df is always optionCount - 1`); }
  if (chiSquareStat < 0) { throw new RangeError("chiSquareUpperTailPValue: chiSquareStat must be non-negative"); }
  return upperRegularizedIncompleteGamma(df / 2, chiSquareStat / 2);
}

/**
 * Single shared statistical-significance decision (round 6 -- issue 3):
 * strictly `pValue < alpha` -- `pValue === alpha` does NOT reject. Both
 * evaluatePositionBalance() and evaluateLengthAssociation() previously
 * each wrote their own inline `pValue < SIGNIFICANCE_ALPHA` comparison;
 * identical in effect, but two separate expressions that could silently
 * diverge under a future edit to only one of them. This is now the SINGLE
 * production comparison path both call, so the exact-equality boundary
 * policy is defined in exactly one place and tested there directly (see
 * "isStatisticallySignificant is exact at the alpha boundary" in
 * tests/assessment-cue-audit.mjs, which mutation-tests `<` vs `<=` here).
 */
export function isStatisticallySignificant(pValue, alpha) {
  assertFiniteNumber(pValue, "isStatisticallySignificant: pValue");
  assertFiniteNumber(alpha, "isStatisticallySignificant: alpha");
  // CORRECTED (round 7 -- a probability outside [0,1], or a significance
  // level outside the open interval (0,1), cannot correspond to any real
  // p-value/alpha -- finiteness alone let isStatisticallySignificant(-0.1,
  // 0.01) return true and isStatisticallySignificant(0.01, 2) return true,
  // both confirmed before this fix.
  if (pValue < 0 || pValue > 1) {
    throw new RangeError(`isStatisticallySignificant: pValue must be a finite number in [0,1] (got ${pValue})`);
  }
  if (alpha <= 0 || alpha >= 1) {
    throw new RangeError(`isStatisticallySignificant: alpha must be a finite number strictly within (0,1) (got ${alpha})`);
  }
  return pValue < alpha;
}

// ----------------------------------------------------------------------------
// Cohen's w: distribution-wide multinomial practical effect size (new --
// docs/ASSESSMENT_VALIDITY.md section 4.3b). CORRECTED: the large-N
// practical/effect-size decision previously examined only the single
// LARGEST position's share against `1/n + PRACTICAL_MARGIN` -- it never
// evaluated the complete distribution, so it could not detect material
// UNDERrepresentation (a position receiving zero or few correct answers)
// unless that same imbalance happened to also push some OTHER position's
// share over the max-share threshold. Confirmed directly: at N=20, n=4,
// distributions [7,7,6,0], [8,6,6,0], and [8,8,4,0] -- every one leaving
// position D with ZERO correct answers -- all passed under the prior
// single-max-share rule, since no individual share exceeded 40%.
//
// Cohen's w = sqrt(chiSquare / N) is the standard multinomial/chi-square
// effect size. Source, directly inspected (round 5 -- an earlier version
// of this comment and docs/ASSESSMENT_VALIDITY.md claimed an "algebraic
// agreement" between the old single-cell margin and w=0.3 by describing a
// distribution [0.40, 0.25, 0.25, 0.25] -- summing to 1.15, not 1, so not
// a valid multinomial distribution at all; that claim is FALSE and has
// been removed):
//
//   Jacob Cohen, "Statistical Power Analysis for the Behavioral
//   Sciences," 2nd edition, Lawrence Erlbaum Associates, Publishers,
//   1988. Chapter 7 "Chi-Square Tests for Goodness of Fit and
//   Contingency Tables," section 7.2.3 "'Small,' 'Medium,' and 'Large'
//   w Values," printed pages 224-227. Directly inspected via the
//   publicly hosted scan at
//   <https://utstat.utoronto.ca/brunner/oldclass/378f16/readings/CohenPower.pdf>,
//   verified 2026-08-08 against the title page (confirms 2nd edition,
//   same publisher) and section 7.2.3's own printed text.
//
// Cohen's own m=4 (four-category) medium-effect (w=.30) illustration,
// quoted verbatim from page 226: H0 = .250 .250 .250 .250 (equiprobable);
// H1 = .380 .207 .207 .207 ("a w = .30 departure from equiprobability in
// which the effect is concentrated in the first category, the remainder
// being equiprobable"). CORRECTED (round 6 -- issue 1): an earlier version
// of this comment and the corresponding test called this distribution
// "genuinely normalized" and claimed it "sums to 1" -- it does not.
// .380+.207+.207+.207 = 1.001 exactly, not 1. That is ordinary 3-decimal
// publication rounding (Cohen prints w to 2 decimals and each Hi to 3),
// not a literal normalization, and the prior test only proved the sum was
// within 0.002 of 1 while its own name claimed an exact proof. Cohen's
// printed values are retained VERBATIM as `h1Published` below (not
// claimed to sum to exactly 1); a separate, genuinely normalized `h1`
// (h1Published rescaled to sum to exactly 1, transformation applied
// explicitly in code below, not silently substituted for Cohen's own
// values) is used wherever this file needs an exact probability
// distribution for computation or testing. Cohen also gives an
// equally-spaced m=4 medium-effect H1 on page 225: .149 .216 .284 .351
// (sums to exactly 1.000, needs no such split). Every `h1` below
// (including the rescaled one) independently verified to produce w ≈ 0.30
// via this file's own cohensW()/chiSquare formula
// (tests/assessment-cue-audit.mjs), consistent with Cohen's stated value.
// This does not make Cohen's rounded illustration "prove" this project's
// w=0.30 threshold uniquely correct -- see the ADOPTED, NOT UNIQUELY
// CORRECT paragraph below, unchanged by this correction.
//
// Unlike the raw chi-square statistic itself (which grows with N and is
// therefore a SIGNIFICANCE measure, not a practical-effect measure), w is
// scale-free: it measures the MAGNITUDE of the deviation pattern across
// the WHOLE distribution, independent of sample size, so a single fixed
// threshold is meaningful at any N in the large-N regime. It is symmetric
// to over- AND under-representation by construction, since it is derived
// from the same squared-deviation sum every position contributes to.
//
// ADOPTED, NOT UNIQUELY CORRECT: Cohen's own words (page 224) are explicit
// that his small/medium/large conventions are offered "to serve as
// conventions for these qualitative adjectives," that their use "requires
// particular caution," and that "the investigator is best advised to use
// the conventional definitions as a general frame of reference for ES and
// not to take them too literally." This project ADOPTS w=0.30 ("medium
// effect," Cohen's own conventional reference point) as a deliberately
// CONSERVATIVE, project-defined operational release gate for Gate A's
// large-N regime -- not a claim that 0.30 is the uniquely correct
// threshold, not an item-validity result, and not mathematically
// equivalent to the prior single-cell margin rule it replaced (see the
// counterexample this correction fixes, docs/ASSESSMENT_VALIDITY.md
// section 4.3b, for exactly why the two rules are NOT equivalent).
//
// Limitations and false-positive/false-negative risk, stated honestly:
// a fixed w threshold does not itself indicate WHICH position(s) or in
// WHICH direction a distribution deviates (see evaluatePositionBalance()'s
// positionDeviations/primaryContributors below, docs/ASSESSMENT_VALIDITY.md
// section 4.3d, added for exactly this reason); at very large N, a w just
// under 0.30 can still be statistically significant (an intentional,
// separately-handled case -- section 4.6a's review-flag policy); Cohen
// himself notes w's relationship to other association measures (e.g.
// Cramer's C, phi) varies with table size, so a "medium" effect by this
// convention is not directly comparable across differently-shaped
// contingency tables.
// ----------------------------------------------------------------------------

export const COHENS_W_MEDIUM_EFFECT = 0.3;

// Cohen's own printed page-226 H1 for the "concentrated in one category"
// m=4 medium example, transcribed VERBATIM (round 6 -- issue 1): summed
// as printed, these are 1.001, not 1 (see the comment above). Kept as a
// separate, explicitly-named constant so `h1Published` below is always
// exactly what Cohen printed, never a value that has been silently
// adjusted to make a sum come out even.
const COHEN_CONCENTRATED_H1_PUBLISHED = Object.freeze([0.380, 0.207, 0.207, 0.207]);
const cohenConcentratedH1PublishedSum = COHEN_CONCENTRATED_H1_PUBLISHED.reduce((a, b) => a + b, 0);

// Cohen's own printed m=4 (four-category) illustrative H0/H1 pairs
// (page references above), transcribed verbatim for direct, executable
// verification (tests/assessment-cue-audit.mjs) that every fixture used
// in this file's own rationale is a genuinely normalized probability
// distribution (`h1` sums to exactly 1, within floating-point tolerance)
// and reproduces Cohen's own stated w value -- this is the reusable,
// checkable record the prior impossible [0.40,0.25,0.25,0.25] claim never
// was. For the one example whose printed values do not themselves sum to
// exactly 1 (publication rounding, not a normalization defect), the
// verbatim printed values are ALSO retained as `h1Published`, kept
// separate from the genuinely normalized `h1` used for computation --
// see the comment above.
export const COHENS_M4_ILLUSTRATIVE_EXAMPLES = Object.freeze([
  Object.freeze({ label: "small (w=.10), page 224", w: 0.10, h0: Object.freeze([0.250, 0.250, 0.250, 0.250]), h1: Object.freeze([0.216, 0.239, 0.261, 0.284]) }),
  Object.freeze({ label: "medium (w=.30), equally-spaced, page 225", w: 0.30, h0: Object.freeze([0.250, 0.250, 0.250, 0.250]), h1: Object.freeze([0.149, 0.216, 0.284, 0.351]) }),
  Object.freeze({
    label: "medium (w=.30), concentrated in one category, page 226",
    w: 0.30,
    h0: Object.freeze([0.250, 0.250, 0.250, 0.250]),
    // Cohen's own printed 3-decimal values (sum 1.001) -- NOT claimed to
    // be a normalized probability distribution.
    h1Published: COHEN_CONCENTRATED_H1_PUBLISHED,
    // h1Published rescaled to sum to exactly 1 (transformation: divide by
    // the printed values' own sum) -- genuinely normalized, used for
    // computation/tests requiring an exact distribution. NOT presented as
    // Cohen's verbatim printed values.
    h1: Object.freeze(COHEN_CONCENTRATED_H1_PUBLISHED.map((v) => v / cohenConcentratedH1PublishedSum)),
  }),
  Object.freeze({ label: "large (w=.50), page 225", w: 0.50, h0: Object.freeze([0.250, 0.250, 0.250, 0.250]), h1: Object.freeze([0.082, 0.194, 0.306, 0.418]) }),
]);

/** Cohen's w multinomial effect size: sqrt(chiSquare / N). Scale-free (does not grow with N), unlike chiSquare itself. */
export function cohensW(chiSquare, N) {
  assertFiniteNumber(chiSquare, "cohensW: chiSquare");
  assertFiniteNumber(N, "cohensW: N");
  if (N <= 0) { throw new RangeError("cohensW: N must be positive"); }
  // CORRECTED (round 7): N is this audit's authored-question count, the
  // same quantity assertValidPositionCounts() already requires to be a
  // positive integer -- a fractional N is impossible for a real bank.
  // Confirmed before this fix: cohensW(1, 2.5) silently computed
  // 0.6324555320336759 instead of throwing. chiSquare itself remains a
  // valid finite nonnegative real number (not necessarily an integer).
  if (!Number.isInteger(N)) { throw new RangeError(`cohensW: N must be an integer (got ${N}) -- this audit's N is always an authored-question count`); }
  if (chiSquare < 0) { throw new RangeError("cohensW: chiSquare must be non-negative"); }
  return Math.sqrt(chiSquare / N);
}

// ----------------------------------------------------------------------------
// Aggregate/probability input validation (new -- docs/ASSESSMENT_VALIDITY.md
// section 4.3c). CORRECTED: the aggregate helpers below previously trusted
// caller-supplied summaries without validating them, so a malformed
// positionCounts array (wrong length, sum != N, fractional or negative
// counts) or an invalid probability (outside [0,1], non-finite) could
// silently reach formulas that assume a valid multinomial count vector or
// probability, producing a misleading pass/fail/numeric result instead of
// a descriptive error. Confirmed directly:
// exactPigeonholeBalance([2,1,1], 4, 5) -- an array with only 3 entries
// for 4 positions, summing to 4 rather than N=5 -- reported
// `balanced: true`; poissonBinomialPMF([1.5, 0.5]) produced a NEGATIVE
// probability mass (-0.25) with no error; poissonBinomialTwoSidedPValue()
// with an out-of-range observed index returned a silently wrong number
// instead of throwing.
//
// ONE reusable validation path per input shape (not duplicated formulas)
// is used everywhere the corresponding shape is accepted, exactly the
// same discipline assertValidQuestionShape() already applies to question
// objects above.
// ----------------------------------------------------------------------------

/**
 * Validates a position-count summary as used by exactPigeonholeBalance()
 * and evaluatePositionBalance(): optionCount an integer >= 2, N a
 * positive integer, positionCounts an array of exactly optionCount
 * entries, every entry a finite nonnegative integer, and the entries
 * summing exactly to N (real authored answer counts are always
 * nonnegative integers that partition the total item count).
 */
export function assertValidPositionCounts(positionCounts, optionCount, N) {
  if (!Number.isInteger(optionCount) || optionCount < 2) {
    throw new TypeError(`assertValidPositionCounts: optionCount must be an integer >= 2 (got ${optionCount})`);
  }
  if (!Number.isInteger(N) || N <= 0) {
    throw new TypeError(`assertValidPositionCounts: N must be a positive integer (got ${N})`);
  }
  if (!Array.isArray(positionCounts) || positionCounts.length !== optionCount) {
    throw new TypeError(`assertValidPositionCounts: positionCounts must have exactly optionCount=${optionCount} entries (got ${Array.isArray(positionCounts) ? positionCounts.length : typeof positionCounts})`);
  }
  positionCounts.forEach((c, i) => {
    if (typeof c !== "number" || !Number.isFinite(c) || !Number.isInteger(c) || c < 0) {
      throw new TypeError(`assertValidPositionCounts: positionCounts[${i}] must be a finite nonnegative integer (got ${c})`);
    }
  });
  const sum = positionCounts.reduce((a, b) => a + b, 0);
  if (sum !== N) {
    throw new TypeError(`assertValidPositionCounts: positionCounts ${JSON.stringify(positionCounts)} sum to ${sum}, expected exactly N=${N}`);
  }
}

/**
 * Validates a per-item null-probability array for the Poisson-binomial
 * functions below: a nonempty array of finite probabilities in [0,1]
 * (a probability outside this range, or non-finite, cannot correspond to
 * any real Bernoulli trial).
 */
export function assertValidProbabilities(probabilities) {
  if (!Array.isArray(probabilities) || probabilities.length === 0) {
    throw new TypeError("assertValidProbabilities: probabilities must be a nonempty array");
  }
  probabilities.forEach((p, i) => {
    if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1) {
      throw new TypeError(`assertValidProbabilities: probabilities[${i}] must be a finite number in [0,1] (got ${p})`);
    }
  });
}

/**
 * Validates an observed-success count against the trial count N: N itself
 * must be a finite nonnegative integer, and observed an integer in [0, N].
 * CORRECTED (round 6 -- issue 4): previously validated only `observed`,
 * never `N` -- `observed > N` is `false` whenever `N` is `NaN` (every
 * comparison against NaN is false), so assertValidObservedIndex(1, NaN)
 * silently returned instead of throwing. Confirmed directly before this
 * fix.
 */
export function assertValidObservedIndex(observed, N) {
  if (!Number.isInteger(N) || N < 0) {
    throw new TypeError(`assertValidObservedIndex: N must be a finite nonnegative integer (got ${N})`);
  }
  if (!Number.isInteger(observed) || observed < 0 || observed > N) {
    throw new TypeError(`assertValidObservedIndex: observed must be an integer in [0, ${N}] (got ${observed})`);
  }
}

/**
 * Validates a single classifyCue()-shaped item as consumed by
 * evaluateLengthAssociation(): `correctAtMax` a boolean, and
 * `nullProbabilityCorrectAtMax` a finite number in [0,1] -- exactly the
 * two fields that function actually reads, so a manually constructed
 * (not classifyCue()-derived) test item with a missing or malformed
 * field cannot silently produce a misleading pass/fail.
 *
 * CORRECTED (round 6 -- issue 4): the per-field checks above did not
 * cross-validate the two fields against each other, so two internally
 * impossible combinations could still reach evaluateLengthAssociation()
 * without error:
 *   - nullProbabilityCorrectAtMax === 0: impossible for any real item,
 *     since an item's own tied-at-max-length set always contains AT LEAST
 *     one option (the longest option is trivially tied with itself), so
 *     the true null probability tiedAtMax/optionCount is always > 0.
 *   - nullProbabilityCorrectAtMax === 1 with correctAtMax === false:
 *     probability 1 means EVERY option (including the correct one) is
 *     tied for max length, which makes correctAtMax === false
 *     self-contradictory. (The reverse, probability 1 with
 *     correctAtMax === true, is the valid all-way-tied degenerate case
 *     and remains accepted.)
 */
export function assertValidLengthAssociationItem(item, index) {
  const where = Number.isInteger(index) ? ` (item index ${index})` : "";
  if (!item || typeof item !== "object") { throw new TypeError(`assertValidLengthAssociationItem: item must be an object${where}`); }
  if (typeof item.correctAtMax !== "boolean") {
    throw new TypeError(`assertValidLengthAssociationItem: correctAtMax must be a boolean${where} (got ${JSON.stringify(item.correctAtMax)})`);
  }
  if (typeof item.nullProbabilityCorrectAtMax !== "number" || !Number.isFinite(item.nullProbabilityCorrectAtMax) || item.nullProbabilityCorrectAtMax < 0 || item.nullProbabilityCorrectAtMax > 1) {
    throw new TypeError(`assertValidLengthAssociationItem: nullProbabilityCorrectAtMax must be a finite number in [0,1]${where} (got ${item.nullProbabilityCorrectAtMax})`);
  }
  if (item.nullProbabilityCorrectAtMax === 0) {
    throw new TypeError(`assertValidLengthAssociationItem: nullProbabilityCorrectAtMax must be > 0${where} -- an item's own longest option is always tied with itself, so the true null probability can never be exactly 0 (got 0)`);
  }
  if (item.nullProbabilityCorrectAtMax === 1 && item.correctAtMax === false) {
    throw new TypeError(`assertValidLengthAssociationItem: nullProbabilityCorrectAtMax=1 means every option is tied for max length, which makes correctAtMax=false internally impossible${where}`);
  }
}

/**
 * The deterministic, always-achievable SMALL-N structural rule for
 * position balance ("exact pigeonhole balance"): the most evenly N items
 * can possibly be divided across n positions gives every position a
 * count of either floor(N/n) or ceil(N/n) -- there is no allocation that
 * can do better. A scope is "structurally balanced" exactly when every
 * position's observed count is one of those two values; any allocation
 * strictly more skewed than the mathematically best-possible one fails.
 *
 * This has NO free/tunable parameter -- it is fully derived from N and
 * n, not fit to make any particular bank pass (docs/ASSESSMENT_VALIDITY.md
 * section 4.2 explicitly required this). It is always achievable by an
 * author who deliberately rotates the correct-answer position across a
 * small quiz, which is exactly the deterministic, reachable bar Phase 0's
 * exit criteria need.
 */
export function exactPigeonholeBalance(positionCounts, n, N) {
  assertValidPositionCounts(positionCounts, n, N);
  const lo = Math.floor(N / n);
  const hi = Math.ceil(N / n);
  const outOfRange = positionCounts.filter((c) => c < lo || c > hi);
  return { balanced: outOfRange.length === 0, floorAllowed: lo, ceilAllowed: hi, outOfRangeCounts: outOfRange };
}

/**
 * Evaluates Gate A position balance for one option-count group.
 * Returns {status: 'pass'|'fail'|'inconclusive', regime, reasons, detail}.
 */
export function evaluatePositionBalance(group) {
  const { optionCount: n, total: N, positionCounts } = group;
  assertValidPositionCounts(positionCounts, n, N);
  if (N < n) {
    return { status: "inconclusive", regime: "insufficient-data", reasons: [`only ${N} item(s) for ${n} answer positions -- fewer items than positions, no judgment possible`], reviewFlag: { required: false, reason: null }, detail: { n, N, positionCounts } };
  }

  const threshold = REGIME_THRESHOLD(n);
  if (N < threshold) {
    // SMALL-N STRUCTURAL REGIME.
    const pigeonhole = exactPigeonholeBalance(positionCounts, n, N);
    const reasons = [];
    if (!pigeonhole.balanced) {
      reasons.push(
        `position counts ${JSON.stringify(positionCounts)} are not the most evenly achievable allocation for ${N} items across ${n} positions (every position must be ${pigeonhole.floorAllowed} or ${pigeonhole.ceilAllowed}; found ${JSON.stringify(pigeonhole.outOfRangeCounts)} outside that range)`
      );
    }
    return {
      status: pigeonhole.balanced ? "pass" : "fail",
      regime: "structural",
      reasons,
      reviewFlag: { required: false, reason: null },
      detail: { n, N, positionCounts, floorAllowed: pigeonhole.floorAllowed, ceilAllowed: pigeonhole.ceilAllowed, statisticalResult: "not-computed-small-n-structural-regime-applies" },
    };
  }

  // LARGE-N STATISTICAL REGIME.
  const expectedProportion = 1 / n;
  const expectedCount = N / n;

  // Chi-square is always computable in this branch, by construction
  // (N >= REGIME_THRESHOLD(n) === CHI_SQUARE_MIN_EXPECTED_PER_CELL * n
  // guarantees every expected cell count N/n >= CHI_SQUARE_MIN_EXPECTED_PER_CELL).
  const chiSquare = positionCounts.reduce((sum, observed) => sum + (observed - expectedCount) ** 2 / expectedCount, 0);
  const df = n - 1;
  const pValue = chiSquareUpperTailPValue(chiSquare, df);
  const statisticallySignificant = isStatisticallySignificant(pValue, SIGNIFICANCE_ALPHA);
  const statisticalResult = statisticallySignificant ? "rejects-uniform" : "fails-to-reject-uniform";
  const referenceCriticalValue = CHI_SQUARE_CRITICAL_ALPHA_01_REFERENCE[df] ?? null;

  // PRACTICAL/EFFECT-SIZE DECISION (corrected -- docs/ASSESSMENT_VALIDITY.md
  // section 4.3b): Cohen's w, the distribution-wide multinomial effect
  // size, replaces the prior single-largest-position-share rule, which
  // could not detect material UNDERrepresentation (a position at or near
  // zero) unless it happened to also push some OTHER position over the
  // old share threshold.
  const w = cohensW(chiSquare, N);
  const practicalFail = w >= COHENS_W_MEDIUM_EFFECT;

  // Per-position directional/contribution reporting (corrected -- round 5,
  // docs/ASSESSMENT_VALIDITY.md section 4.3d, "directionally explainable
  // aggregate failures"). CORRECTED: Cohen's w is a nonnegative MAGNITUDE
  // with no direction of its own, and the prior per-cell reporting only
  // labeled a position "over"/"under"/"within-margin" against the
  // separate diagnostic PRACTICAL_MARGIN -- so a distribution that fails
  // Cohen's w while every individual cell stays inside that margin
  // reported ZERO explanation of which position(s) or direction(s) drove
  // the aggregate failure. Confirmed directly: N=100, n=4,
  // positionCounts=[38,24,19,19] -- chiSquare=9.68, w=sqrt(9.68/100)=
  // 0.3111 (fails the 0.30 threshold) -- yet every share (38%, 24%, 19%,
  // 19%) falls inside [10%,40%], so the prior `materialDeviations` was
  // empty and every cell was labeled only "within-margin," with no
  // indication that position 0 (38% vs 25% expected) was the dominant
  // driver.
  //
  // Every position now reports its FULL diagnostic record: observed
  // count/proportion, expected count/proportion, SIGNED count and
  // proportion deviation, a `direction` derived purely from the sign of
  // that deviation (`"above"`/`"below"`/`"equal"` -- never conflated with
  // the separate per-cell diagnostic-margin flag), its own contribution to
  // the chi-square/Cohen's-w total, and `exceedsDiagnosticMargin` (the
  // renamed former "material deviation" concept -- explicitly a
  // DIAGNOSTIC-ONLY per-cell flag, never the decision rule; Cohen's w
  // above remains the sole authoritative decision).
  const maxAllowedShare = Math.min(1, expectedProportion + PRACTICAL_MARGIN);
  const minAllowedShare = Math.max(0, expectedProportion - PRACTICAL_MARGIN);
  const positionDeviations = positionCounts.map((count, position) => {
    const observedProportion = count / N;
    const countDeviation = count - expectedCount;
    const proportionDeviation = observedProportion - expectedProportion;
    const direction = proportionDeviation > 0 ? "above" : proportionDeviation < 0 ? "below" : "equal";
    const chiSquareContribution = (count - expectedCount) ** 2 / expectedCount;
    const exceedsDiagnosticMargin = observedProportion > maxAllowedShare || observedProportion < minAllowedShare;
    return {
      position, observedCount: count, observedProportion,
      expectedCount, expectedProportion,
      countDeviation, proportionDeviation, direction,
      chiSquareContribution, exceedsDiagnosticMargin,
    };
  });
  const materialDeviations = positionDeviations.filter((d) => d.exceedsDiagnosticMargin);

  // Primary contributors to the aggregate effect: sorted by
  // chiSquareContribution descending, accumulated until a STRICT MAJORITY
  // (> 50%, not >=) of the total chi-square is accounted for -- a
  // non-arbitrary criterion ("the position(s) responsible for most of the
  // effect") that adapts to option count, rather than an invented fixed
  // "top N." Always computed (used to explain a Cohen's-w failure even
  // when no individual cell exceeds the separate diagnostic margin).
  //
  // CORRECTED (round 6 -- issue 2): the loop previously stopped at
  // `cumulativeContribution >= chiSquare / 2`, so a position (or set of
  // positions) accounting for EXACTLY 50% -- not a majority -- was
  // reported and described in prose as "a majority of the effect."
  // Confirmed directly: N=20, n=4, positionCounts=[6,3,3,8] -- position 3
  // alone contributes chiSquareContribution=1.8, exactly half of the
  // total chiSquare=3.6 -- the old `>=` stopped there, calling one
  // position "the majority" of an effect it accounted for only half of.
  // The strict `>` below requires cumulativeContribution to exceed 50%
  // before stopping. This also surfaces a second, independent gap: once
  // strict `>` causes the loop to stop partway through a group of
  // POSITIONS TIED at the same chiSquareContribution, stopping after only
  // one of them is an arbitrary pick among equals (array sort order, not
  // a principled distinction) -- so once the strict threshold is crossed,
  // every immediately-following position still tied with the one that
  // just crossed it is included too, never silently dropped. In the same
  // fixture, positions 1 and 2 are tied at chiSquareContribution=0.8;
  // crossing happens while consuming that tied pair, and both are
  // included together (tests/assessment-cue-audit.mjs).
  const sortedByContribution = [...positionDeviations].sort((a, b) => b.chiSquareContribution - a.chiSquareContribution);
  const primaryContributors = [];
  let cumulativeContribution = 0;
  for (let i = 0; i < sortedByContribution.length; i += 1) {
    const d = sortedByContribution[i];
    if (d.chiSquareContribution <= 0) break;
    primaryContributors.push(d);
    cumulativeContribution += d.chiSquareContribution;
    if (chiSquare > 0 && cumulativeContribution > chiSquare / 2) {
      while (
        i + 1 < sortedByContribution.length &&
        sortedByContribution[i + 1].chiSquareContribution === d.chiSquareContribution
      ) {
        i += 1;
        primaryContributors.push(sortedByContribution[i]);
        cumulativeContribution += sortedByContribution[i].chiSquareContribution;
      }
      break;
    }
  }
  const primaryContributorsCumulativeContribution = cumulativeContribution;
  const primaryContributorsCumulativeShare = chiSquare > 0 ? cumulativeContribution / chiSquare : 0;

  const reasons = [];
  if (practicalFail) {
    const contributorSummary = primaryContributors
      .map((d) => `position ${d.position} (observed ${(d.observedProportion * 100).toFixed(1)}% vs expected ${(d.expectedProportion * 100).toFixed(1)}%, ${d.direction} expectation, ${chiSquare > 0 ? ((d.chiSquareContribution / chiSquare) * 100).toFixed(1) : "0.0"}% of the total chi-square)`)
      .join("; ");
    reasons.push(`Cohen's w = ${w.toFixed(3)} meets or exceeds the medium-effect threshold (${COHENS_W_MEDIUM_EFFECT}) for the complete position distribution ${JSON.stringify(positionCounts)} against the expected uniform distribution (${expectedCount.toFixed(2)} per position) -- a practically material DISTRIBUTION-WIDE deviation. Cohen's w is a nonnegative magnitude with no direction of its own; the position(s) accounting for a strict majority (${(primaryContributorsCumulativeShare * 100).toFixed(1)}% > 50%) of this effect are: ${contributorSummary}`);
  }
  materialDeviations.forEach((d) => {
    reasons.push(`position ${d.position} individually exceeds the separate per-cell DIAGNOSTIC margin (${d.direction} expectation, informational only, not the decision rule): ${(d.observedProportion * 100).toFixed(1)}% of ${N} items (expected ${(d.expectedProportion * 100).toFixed(1)}%, diagnostic margin [${(minAllowedShare * 100).toFixed(1)}%, ${(maxAllowedShare * 100).toFixed(1)}%])`);
  });

  // STATISTICAL SIGNIFICANCE (corroboration/review-flag only -- see
  // docs/ASSESSMENT_VALIDITY.md section 4.6a, unchanged policy: the
  // practical effect size above is the SOLE authoritative driver of
  // pass/fail; significance alone, without a practical-effect failure,
  // never fails the gate by itself, and instead raises an explicit review
  // flag, since a large enough N can make an educationally trivial
  // deviation statistically detectable without it being a substantive
  // cueing defect).
  let reviewRequired = false;
  let reviewReason = null;
  if (statisticallySignificant && !practicalFail) {
    reviewRequired = true;
    reviewReason = `chi-square goodness-of-fit p-value ${pValue.toExponential(3)} is below alpha=${SIGNIFICANCE_ALPHA} (statistic ${chiSquare.toFixed(2)}, df=${df}) -- statistically distinguishable from uniform -- even though Cohen's w (${w.toFixed(3)}) stays below the practical medium-effect threshold (${COHENS_W_MEDIUM_EFFECT}); flagged for human review, not failed, since statistical significance alone does not establish an educationally meaningful cueing defect`;
    reasons.push(reviewReason);
  } else if (statisticallySignificant) {
    reasons.push(`chi-square goodness-of-fit p-value ${pValue.toExponential(3)} is below alpha=${SIGNIFICANCE_ALPHA} (statistic ${chiSquare.toFixed(2)}, df=${df}) -- position distribution is statistically distinguishable from uniform, corroborating the practical-effect failure above`);
  }

  const status = practicalFail ? "fail" : "pass";
  return {
    status, regime: "statistical", reasons,
    reviewFlag: { required: reviewRequired, reason: reviewReason },
    detail: {
      n, N, positionCounts, expectedCount, expectedProportion,
      positionDeviations, materialDeviations, primaryContributors,
      primaryContributorsCumulativeContribution, primaryContributorsCumulativeShare,
      practicalEffect: { method: "cohens-w", w, threshold: COHENS_W_MEDIUM_EFFECT, practicalFail },
      // Retained for backward-readability/comparison only -- no longer the fail driver.
      maxAllowedShare, minAllowedShare,
      chiSquare, df, pValue, statisticalResult, statisticallySignificant, referenceCriticalValue,
      practicalFail,
    },
  };
}

// ----------------------------------------------------------------------------
// Tie-aware length association (corrected; docs/ASSESSMENT_VALIDITY.md
// section 4.4). Replaces the old flat-1/n uniquely-longest-only z-test,
// which could be evaded by a bank that always keys a MEMBER of a tied
// maximum-length set (never uniquely longest, so the old check saw
// nothing) while still cueing the correct answer via length.
// ----------------------------------------------------------------------------

/**
 * Exact Poisson-binomial probability mass function via dynamic
 * programming: given per-trial (per-item) success probabilities that may
 * all differ, returns pmf[k] = P(exactly k successes), for k = 0..N.
 * O(N^2) time, numerically stable (probability mass is redistributed at
 * each step, never accumulated as a long product of small numbers).
 */
export function poissonBinomialPMF(probabilities) {
  assertValidProbabilities(probabilities);
  let pmf = [1];
  for (const p of probabilities) {
    const next = new Array(pmf.length + 1).fill(0);
    for (let k = 0; k < pmf.length; k += 1) {
      next[k] += pmf[k] * (1 - p);
      next[k + 1] += pmf[k] * p;
    }
    pmf = next;
  }
  return pmf;
}

/**
 * Exact two-sided Poisson-binomial p-value for observing exactly
 * `observed` successes given per-item null probabilities, using the
 * PROBABILITY-ORDERING convention (corrected -- docs/ASSESSMENT_VALIDITY.md
 * section 4.4a; also called the "minimum-likelihood" or "outcome-ranking"
 * convention): the sum of P(k) over every possible outcome k whose
 * probability is no greater than the observed outcome's own probability
 * (a small relative epsilon tolerance guards against excluding the
 * observed outcome itself due to floating-point rounding).
 *
 * "Two-sided p-value" is not self-defining for an ASYMMETRIC discrete
 * distribution -- this Poisson-binomial is generally asymmetric, since
 * per-item probabilities differ item to item, so more than one convention
 * is defensible. This function previously (before this correction) used a
 * DOUBLED-MINIMUM-TAIL convention instead (`2 * min(P(X<=observed),
 * P(X>=observed))`, clipped to 1). Probability-ordering was chosen over
 * it, and named precisely rather than left as an unstated assumption,
 * because:
 *
 *   - It directly answers "how surprising is this outcome" by summing the
 *     probability of every outcome AT LEAST AS SURPRISING as (no more
 *     likely than) the one observed -- well-defined and self-consistent
 *     for any distribution shape, symmetric or not, with no post-hoc
 *     clipping needed to stay <= 1 (the doubled-tail convention needs
 *     exactly that clipping, a sign it is not directly answering the same
 *     question for a skewed distribution).
 *   - It is the same convention underlying the standard two-sided exact
 *     test for other asymmetric discrete distributions (e.g. Fisher's
 *     exact test), so it is not a bespoke choice invented for this file.
 *   - For a SYMMETRIC probability vector the two conventions coincide
 *     exactly at the distribution's mode and are close elsewhere, but can
 *     diverge substantially away from the mode for a genuinely asymmetric
 *     one -- demonstrated with hand-computed (not implementation-derived)
 *     fixtures in tests/assessment-cue-audit.mjs, probabilities
 *     `[0.9, 0.5, 0.5]`.
 *
 * This is a deliberate, precisely-named choice among multiple valid exact
 * two-sided conventions for an asymmetric discrete distribution -- it is
 * not claimed to be the only possible one.
 */
export function poissonBinomialTwoSidedPValue(probabilities, observed) {
  assertValidProbabilities(probabilities);
  assertValidObservedIndex(observed, probabilities.length);
  const pmf = poissonBinomialPMF(probabilities);
  const observedP = pmf[observed];
  const epsilon = 1e-9;
  let total = 0;
  for (let k = 0; k < pmf.length; k += 1) {
    if (pmf[k] <= observedP * (1 + epsilon)) { total += pmf[k]; }
  }
  return Math.min(1, total);
}

/**
 * Evaluates the tie-aware length association for an arbitrary list of
 * per-item classifyCue() results (any mix of option counts -- no
 * grouping needed, corrected from the prior grouped-only design). Tests
 * whether the correct answer falls in each item's OWN maximum-length set
 * more (or less) often than chance predicts, given that item's own tie
 * structure -- not a flat 1/n across the whole scope, which is only
 * exactly right when no item has a tie.
 *
 * Null model, per item i with n_i options and k_i options tied for that
 * item's maximum length: under the hypothesis that which option is
 * correct is independent of option length, each of the n_i options is
 * equally likely to be correct, so P(correct is in the k_i-member
 * max-length set) = k_i / n_i. This is a Bernoulli trial with its own,
 * item-specific probability; the SUM of these trials across a scope is a
 * Poisson-binomial random variable (independent Bernoulli trials with
 * different probabilities) -- not a single binomial, since p can differ
 * item to item purely because of how many ties happen to exist.
 *
 * Decision (corrected -- docs/ASSESSMENT_VALIDITY.md section 4.6a,
 * "practical vs. statistical significance"): the practical effect-size
 * margin is the SOLE, AUTHORITATIVE driver of pass/fail -- exceeding it
 * fails regardless of what the exact p-value says. The exact
 * Poisson-binomial p-value is always computed and reported, but
 * statistical significance ALONE, without exceeding the practical margin,
 * never fails the scope by itself; it surfaces instead as an explicit,
 * separate review flag (`reviewFlag`), since a large enough item count can
 * make an educationally trivial association statistically detectable
 * without it being a substantive cueing defect. The exact test is
 * well-defined at any N >= 1, so no separate small-N/large-N regime or
 * "not computed" state is needed for this check (unlike position balance,
 * which needs the chi-square-vs-structural split because chi-square
 * specifically requires a large-cell approximation this exact method does
 * not).
 *
 * Symmetric treatment, explicitly: an association that is either
 * significantly ABOVE or significantly BELOW the null rate fails. A rate
 * significantly below (correct answer disproportionately AVOIDS the
 * longest option(s)) is an equally usable inverse cue ("never pick the
 * longest") as a rate significantly above, so both directions are
 * treated identically -- this is not solely a defense against the
 * QL-033 pattern specifically, but against length-based cueing in
 * either direction.
 *
 * This is a statistical association test only. It never claims to prove
 * any item's scientific validity or to fix a distractor -- see Gate B
 * (docs/ASSESSMENT_VALIDITY.md section 5) for the required human review.
 */
export function evaluateLengthAssociation(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { status: "inconclusive", reasons: ["no items in scope"], reviewFlag: { required: false, reason: null }, detail: null };
  }
  items.forEach((it, i) => assertValidLengthAssociationItem(it, i));
  const N = items.length;
  const probabilities = items.map((it) => it.nullProbabilityCorrectAtMax);
  const observed = items.filter((it) => it.correctAtMax).length;
  const expectedMean = probabilities.reduce((a, b) => a + b, 0);
  const observedRate = observed / N;
  const expectedRate = expectedMean / N;
  const maxAllowedShare = Math.min(1, expectedRate + PRACTICAL_MARGIN);
  const minAllowedShare = Math.max(0, expectedRate - PRACTICAL_MARGIN);

  const reasons = [];
  let practicalFail = false;
  if (observedRate > maxAllowedShare) {
    practicalFail = true;
    reasons.push(`the correct answer falls in its item's own maximum-length set in ${(observedRate * 100).toFixed(1)}% of ${N} items (allowed max ${(maxAllowedShare * 100).toFixed(1)}%, tie-aware expected ${(expectedRate * 100).toFixed(1)}%)`);
  } else if (observedRate < minAllowedShare) {
    practicalFail = true;
    reasons.push(`the correct answer falls in its item's own maximum-length set in only ${(observedRate * 100).toFixed(1)}% of ${N} items (allowed min ${(minAllowedShare * 100).toFixed(1)}%, tie-aware expected ${(expectedRate * 100).toFixed(1)}%) -- an unusually LOW rate is an equally usable inverse cue`);
  }

  const pValue = poissonBinomialTwoSidedPValue(probabilities, observed);
  const statisticallySignificant = isStatisticallySignificant(pValue, SIGNIFICANCE_ALPHA);
  const statisticalResult = statisticallySignificant ? "rejects-null" : "fails-to-reject-null";

  // Same decision policy as evaluatePositionBalance's large-N regime:
  // practical margin is authoritative; significance alone (without
  // exceeding the margin) only raises a review flag, never a fail.
  let reviewRequired = false;
  let reviewReason = null;
  if (statisticallySignificant && !practicalFail) {
    reviewRequired = true;
    reviewReason = `exact two-sided Poisson-binomial p-value ${pValue.toExponential(3)} is below alpha=${SIGNIFICANCE_ALPHA} -- statistically distinguishable from the tie-aware null model -- even though the observed rate (${(observedRate * 100).toFixed(2)}%) stays within the practical margin (allowed [${(minAllowedShare * 100).toFixed(1)}%, ${(maxAllowedShare * 100).toFixed(1)}%]); flagged for human review, not failed, since statistical significance alone does not establish an educationally meaningful cueing defect`;
    reasons.push(reviewReason);
  } else if (statisticallySignificant) {
    reasons.push(`exact two-sided Poisson-binomial p-value ${pValue.toExponential(3)} is below alpha=${SIGNIFICANCE_ALPHA} -- the max-length-set association is statistically distinguishable from the tie-aware null model, corroborating the practical-margin failure above`);
  }

  const status = practicalFail ? "fail" : "pass";
  return {
    status,
    reasons,
    reviewFlag: { required: reviewRequired, reason: reviewReason },
    detail: {
      N, observed, observedRate, expectedMean, expectedRate, maxAllowedShare, minAllowedShare,
      practicalFail, pValue, statisticalResult, statisticallySignificant,
      method: "exact-poisson-binomial-two-sided-probability-ordering",
    },
  };
}

// ----------------------------------------------------------------------------
// Answer-key sequence pattern detection (new -- docs/ASSESSMENT_VALIDITY.md
// section 4.10). Aggregate position BALANCE (above) is necessary but not
// sufficient: a key such as A,B,C,D,A,B,C,D satisfies the exact pigeonhole
// rule perfectly (every position appears an equally achievable number of
// times) while still exposing an obvious, mechanically learnable pattern
// to anyone who takes the form once. This is a DIFFERENT property from
// aggregate balance and is evaluated, and reported, separately.
//
// Design choice, compared against the alternatives docs/ASSESSMENT_VALIDITY.md
// section 4.2 lists: this uses fully DETERMINISTIC structural detection
// (exact short repeating cycles, whole-sequence mirroring/palindromes, and
// excessive identical-position runs) rather than a statistical test. A
// repeating cycle, a palindrome, or a long identical run is a fact about
// the sequence that is true or false with no probabilistic ambiguity --
// unlike position/length BALANCE, which needs a null-hypothesis framework
// to separate "expected sampling noise" from "a real deviation," a
// mechanically detectable pattern needs no such framework, and this
// function makes no claim of statistical randomness from a short static
// sequence. Because detection here is exact rather than inferential, a
// detected pattern is reported as `fail`, not `review-required` or
// `inconclusive` -- there is nothing for a human reviewer to adjudicate
// about whether an exact repeating cycle exists; it either does or does
// not. `inconclusive` is reserved, as with position balance, for `N < n`
// (too few items to say anything about sequence structure at all).
// ----------------------------------------------------------------------------

/**
 * Detects mechanically learnable structure in a sequence of answer
 * positions (encounter order -- the literal order a learner sees the
 * items in, per `index.html`'s `buildQuiz()`, which renders `QUIZZES[key]`
 * in array order with no shuffling of questions or options). `n` is the
 * largest option count among the items being checked (for a mixed
 * option-count scope, using the largest keeps the cycle/run thresholds
 * conservative rather than tuned to whichever group is smallest).
 *
 * Three deterministic pattern classes, each independently checked and
 * independently reported (docs/ASSESSMENT_VALIDITY.md section 4.10 lists
 * why these three and not, e.g., a fully enumerative small-sample
 * likelihood-rank method, which would require exactly the kind of
 * "statistical randomness from one short sequence" claim this function
 * deliberately avoids):
 *
 *   1. repeating-cycle: the sequence exactly repeats some period
 *      `1 <= p <= min(n, floor(N/2))` (so the repeat is confirmed at
 *      least twice) for its ENTIRE length -- covers the literal
 *      "A,B,C,D,A,B,C,D" example, and its `p=2` case covers a pure
 *      alternating key like "A,B,A,B,A,B".
 *   2. mirrored: the sequence is an exact palindrome across all N items
 *      (only checked for N >= 4, where a palindrome is a non-trivial
 *      structural coincidence rather than an unavoidable feature of very
 *      short sequences) -- covers "A,B,C,D,D,C,B,A".
 *   3. excessive-run: any single answer position repeats
 *      `runLength >= n` times consecutively -- at least as many times in
 *      a row as there are distinct positions to choose from, which is
 *      already a conspicuous clustering no well-mixed key should exhibit
 *      -- covers "A,A,A,B,C,D,B,C,D"-style clustering (a run of length 3
 *      when n=3).
 *
 * A well-authored key that is balanced but NOT mechanically patterned
 * (the actual bar this function sets) triggers none of the three and is
 * reported `pass` -- this function does not, and must not, demand a
 * mechanically rotating key to satisfy it; a rotating key is exactly
 * what pattern (1) flags.
 */
export function detectAnswerSequencePatterns(positions, n) {
  const N = positions.length;
  const findings = [];

  const maxPeriod = Math.min(n, Math.floor(N / 2));
  for (let p = 1; p <= maxPeriod; p += 1) {
    let isCycle = true;
    for (let i = 0; i < N; i += 1) {
      if (positions[i] !== positions[i % p]) { isCycle = false; break; }
    }
    if (isCycle) {
      findings.push({
        type: "repeating-cycle",
        period: p,
        detail: `the answer-position sequence exactly repeats its first ${p} item(s) for the entire ${N}-item sequence -- a learner who notices the first ${p} answers can predict every remaining one`,
      });
      break; // the smallest period found is the most conspicuous; larger multiples of it are implied, not additional information
    }
  }

  if (N >= 4) {
    let isPalindrome = true;
    for (let i = 0; i < N; i += 1) {
      if (positions[i] !== positions[N - 1 - i]) { isPalindrome = false; break; }
    }
    if (isPalindrome) {
      findings.push({
        type: "mirrored",
        detail: `the answer-position sequence is an exact palindrome across all ${N} items (reads identically forwards and backwards) -- a learner who reaches the midpoint can predict every remaining answer from the ones already seen`,
      });
    }
  }

  let runStart = 0;
  for (let i = 1; i <= N; i += 1) {
    if (i === N || positions[i] !== positions[runStart]) {
      const runLength = i - runStart;
      if (runLength >= n) {
        findings.push({
          type: "excessive-run",
          position: positions[runStart],
          runLength,
          startIndex: runStart,
          detail: `answer position ${positions[runStart]} repeats ${runLength} times consecutively (items ${runStart + 1}-${i}), at least as many times in a row as there are answer positions in play (${n})`,
        });
      }
      runStart = i;
    }
  }

  return findings;
}

/**
 * Evaluates answer-key sequence predictability for a computeCueMetrics()
 * `items` array, which preserves the scope's original encounter order
 * (docs/ASSESSMENT_VALIDITY.md section 4.10). Kept as a SEPARATE result
 * from position balance (`evaluateGateA().position`) and length
 * association (`.length`) rather than merged into either -- aggregate
 * balance and sequence predictability are different properties, and a
 * form can have one without the other (a perfectly balanced key can still
 * be a repeating cycle; a non-repeating key can still be imbalanced).
 */
export function evaluateAnswerSequence(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { status: "inconclusive", findings: [], reasons: ["no items in scope"], detail: null };
  }
  const N = items.length;
  const n = Math.max(...items.map((it) => it.n));
  if (N < n) {
    return {
      status: "inconclusive",
      findings: [],
      reasons: [`only ${N} item(s) in scope for up to ${n} answer positions in play -- too few to assess sequence structure`],
      detail: { N, n },
    };
  }
  const positions = items.map((it) => it.answerPosition);
  const findings = detectAnswerSequencePatterns(positions, n);
  const reasons = findings.map((f) => f.detail);
  const status = findings.length > 0 ? "fail" : "pass";
  return { status, findings, reasons, detail: { N, n, positions } };
}

/**
 * Full Gate A evaluation for a computeCueMetrics() result. Position
 * balance is evaluated per option-count group (genuinely needs
 * option-count-homogeneous scopes); length association is evaluated
 * ONCE over every item in the scope regardless of option count
 * (corrected -- no longer disabled/inconclusive merely because more than
 * one option-count group is present); answer-key sequence predictability
 * is evaluated once over every item in the scope's original encounter
 * order, reported separately from both.
 *
 * `sequenceApplicable` (corrected -- docs/ASSESSMENT_VALIDITY.md section
 * 4.10a, "whole-bank vs. learner-facing sequence scope"; default `true`):
 * the sequence check's premise is that the scope passed in is ONE
 * continuous learner-facing encounter order -- true for a single form
 * (one `<details class="quiz">`, `index.html`'s `buildQuiz()`) and, if
 * ever assembled, a pilot quiz, but NOT true for an artificial
 * concatenation such as "every question across all 17 forms back to
 * back," which no learner ever actually encounters as one sequence. Pass
 * `sequenceApplicable: false` for such scopes (`buildDeterministicReport()`
 * does this for the whole-bank aggregate): sequence findings are still
 * computed and returned for transparency, but reported with
 * `status: "not-applicable"` and `applicable: false`, and EXCLUDED from
 * the `overall` roll-up -- an artificial cross-module concatenation must
 * not be able to create OR clear a release gate via a "sequence" property
 * that was never meaningful for it in the first place. Position balance
 * and length association remain fully authoritative at any scope,
 * including the whole bank, since both are genuinely meaningful in
 * aggregate regardless of learner traversal order.
 *
 * Gate A is a purely STRUCTURAL/STATISTICAL judgment about answer
 * position and length distribution (and, where applicable, sequence
 * predictability). It never inspects, and can never establish, scientific
 * correctness, item plausibility, or any other Gate B property -- see
 * docs/ASSESSMENT_VALIDITY.md.
 */
export function evaluateGateA(metrics, { sequenceApplicable = true } = {}) {
  const positionByOptionCount = metrics.byOptionCount.map((group) => ({
    optionCount: group.optionCount,
    total: group.total,
    position: evaluatePositionBalance(group),
  }));

  const length = evaluateLengthAssociation(metrics.items);
  const rawSequence = evaluateAnswerSequence(metrics.items);
  const sequence = sequenceApplicable
    ? { ...rawSequence, applicable: true }
    : {
        ...rawSequence,
        applicable: false,
        status: "not-applicable",
        reasons: [
          "sequence findings are informational only for this scope -- it is not a single learner-facing encounter order (docs/ASSESSMENT_VALIDITY.md section 4.10a)",
          ...rawSequence.reasons,
        ],
      };

  // Diagnostic-only summary, retained per docs/ASSESSMENT_VALIDITY.md's
  // requirement to keep a clearly defined unique-longest figure visible
  // even though it no longer drives the pass/fail decision on its own.
  const uniquelyLongestDiagnostic = {
    count: metrics.uniquelyLongestCorrect,
    total: metrics.total,
    rate: metrics.total > 0 ? metrics.uniquelyLongestCorrect / metrics.total : null,
  };

  const allStatuses = [
    ...positionByOptionCount.map((g) => g.position.status),
    length.status,
    ...(sequenceApplicable ? [sequence.status] : []),
  ];
  const overall = allStatuses.includes("fail") ? "fail" : allStatuses.includes("inconclusive") ? "inconclusive" : "pass";

  // Aggregated, explicit review flag (docs/ASSESSMENT_VALIDITY.md section
  // 4.6a): a scope can PASS while still carrying a statistically
  // significant-but-practically-trivial signal worth a human's attention.
  // This is surfaced here so it is never silently dropped, without ever
  // being conflated with an actual `fail`.
  const reviewFlaggedComponents = [
    ...positionByOptionCount
      .filter((g) => g.position.reviewFlag && g.position.reviewFlag.required)
      .map((g) => ({ component: `position (${g.optionCount}-option items)`, reason: g.position.reviewFlag.reason })),
    ...(length.reviewFlag && length.reviewFlag.required ? [{ component: "length", reason: length.reviewFlag.reason }] : []),
  ];
  const reviewRequired = reviewFlaggedComponents.length > 0;

  return { overall, positionByOptionCount, length, sequence, uniquelyLongestDiagnostic, reviewRequired, reviewFlaggedComponents };
}

// ============================================================================
// E. Deterministic pilot selection (Phase 0 step 3)
//    CORRECTED (docs/ASSESSMENT_VALIDITY.md section 6): the prior
//    implementation selected "the first item encountered" in whatever
//    order its INPUT ARRAY happened to be in, so a caller passing the
//    same questions in a different order (or the live getQuestions()
//    result in a different Object.keys() iteration order) could get a
//    different pilot. Selection now first sorts into a CANONICAL order
//    derived purely from each item's own id (never from array position),
//    so any permutation of identical input produces the identical
//    selection.
// ============================================================================

/**
 * Parses a stable id of the form "mN-qM" or "final-qM" into a
 * (moduleRank, itemNumber) pair for canonical ordering: "final" sorts
 * after every "mN" module; among "mN" modules, N is compared
 * NUMERICALLY (so m2 sorts before m10, unlike a plain lexicographic
 * string comparison, which would put "m10" before "m2"); within a
 * module, the "qM" suffix is also compared numerically. An id not
 * matching this pattern sorts after every id that does (stable,
 * deterministic fallback), ordered lexicographically among themselves.
 */
export function canonicalOrderKey(id) {
  const match = /^(m(\d+)|final)-q(\d+)$/.exec(id);
  if (!match) { return { moduleRank: Number.MAX_SAFE_INTEGER, itemNumber: 0, fallback: id }; }
  const moduleRank = match[1] === "final" ? Number.MAX_SAFE_INTEGER - 1 : Number(match[2]);
  const itemNumber = Number(match[3]);
  return { moduleRank, itemNumber, fallback: id };
}

export function compareCanonicalOrder(idA, idB) {
  const a = canonicalOrderKey(idA);
  const b = canonicalOrderKey(idB);
  if (a.moduleRank !== b.moduleRank) return a.moduleRank - b.moduleRank;
  if (a.itemNumber !== b.itemNumber) return a.itemNumber - b.itemNumber;
  return a.fallback < b.fallback ? -1 : a.fallback > b.fallback ? 1 : 0;
}

/**
 * Deterministically selects a representative pilot batch. The rule is
 * purely mechanical -- no manual judgment enters selection, so the same
 * input always produces the same output (regardless of input array
 * order, corrected) and the process cannot be used to cherry-pick
 * favorable-looking items:
 *
 *   1. Sort all questions into CANONICAL order (compareCanonicalOrder(),
 *      derived only from each id, never from input array position).
 *   2. For each question in that canonical order, compute its stratum
 *      key: `${domain}|${cueClass}`.
 *   3. The FIRST question encountered (in canonical order) for each
 *      distinct stratum key is selected as that stratum's representative.
 *   4. After every distinct domain x cueClass stratum present in the
 *      data has one representative, scan the already-selected set for
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
  const canonicalOrder = [...questions].sort((a, b) => compareCanonicalOrder(a.id, b.id));

  const cueClassOf = (q) => classifyCue(q, lengthFn).cueClass;
  const hasFullDistractorCoverage = (q) => Object.keys(q.w || {}).length === q.o.length - 1;

  const selected = [];
  const selectedIds = new Set();
  const records = [];

  function select(q, stratum, reason) {
    if (selectedIds.has(q.id)) return;
    selectedIds.add(q.id);
    selected.push(q);
    records.push({
      id: q.id, stratum, reason,
      domain: q.d, cueClass: cueClassOf(q), difficulty: q.x, answerPosition: q.a,
      formContext: q.module === "final" ? "final" : "module",
      distractorFeedbackCoverage: hasFullDistractorCoverage(q) ? "full" : "partial",
    });
  }

  const domainCueSeen = new Set();
  canonicalOrder.forEach((q) => {
    const key = `${q.d}|${cueClassOf(q)}`;
    if (!domainCueSeen.has(key)) {
      domainCueSeen.add(key);
      select(q, "domain-x-cueClass", `first item (canonical order) for domain="${q.d}" cueClass="${cueClassOf(q)}"`);
    }
  });

  function ensureCoverage(dimensionName, valueOf, values) {
    values.forEach((value) => {
      const covered = selected.some((q) => valueOf(q) === value);
      if (covered) return;
      const candidate = canonicalOrder.find((q) => valueOf(q) === value && !selectedIds.has(q.id));
      if (candidate) { select(candidate, dimensionName, `first not-yet-selected item (canonical order) with ${dimensionName}="${value}"`); }
    });
  }

  ensureCoverage("difficulty", (q) => q.x, [...new Set(canonicalOrder.map((q) => q.x))].sort());
  ensureCoverage("answerPosition", (q) => q.a, [...new Set(canonicalOrder.map((q) => q.a))].sort());
  ensureCoverage("formContext", (q) => (q.module === "final" ? "final" : "module"), ["final", "module"]);
  ensureCoverage("distractorFeedbackCoverage", (q) => (hasFullDistractorCoverage(q) ? "full" : "partial"), ["full", "partial"]);

  records.sort((a, b) => compareCanonicalOrder(a.id, b.id));
  return {
    ids: records.map((r) => r.id),
    records,
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

// The frozen pilot manifest this correction ships with, for the live bank
// as reproduced at the time of authoring -- see
// docs/ASSESSMENT_VALIDITY.md section 6.2. A future re-run against an
// unchanged bank must reproduce this exact, ordered id list; a test
// enforces that.
export const FROZEN_PILOT_MANIFEST = Object.freeze([
  "m1-q1", "m1-q2", "m1-q3", "m2-q1", "m2-q3", "m4-q1", "m6-q1", "m6-q4",
  "m7-q2", "m12-q6", "m15-q1", "m16-q1", "final-q33",
]);

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
 * tests/e2e/assessment-cue-audit.spec.mjs's real-browser cross-check,
 * including the rendered-text oracle for canonicalLength()).
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
//    CORRECTED (docs/ASSESSMENT_VALIDITY.md section 7): the deterministic
//    payload no longer embeds a wall-clock timestamp. Execution metadata
//    (when this particular run happened) is returned as a SEPARATE,
//    explicitly-named field the deterministic-payload comparison ignores.
// ============================================================================

function buildDeterministicReport(allQuestions) {
  const idManifestCheck = compareToIdManifest(allQuestions.map((q) => q.id));

  const bankMetrics = computeCueMetrics(allQuestions, { lengthFn: canonicalLength });
  const bankHistorical = computeCueMetrics(allQuestions, { lengthFn: historicalLength });
  // sequenceApplicable: false -- the whole bank (all 17 forms concatenated
  // in module order) is not one continuous learner-facing encounter order
  // (each module is its own separate quiz); see evaluateGateA()'s doc
  // comment and docs/ASSESSMENT_VALIDITY.md section 4.10a. Position and
  // length remain fully authoritative for the whole bank.
  const bankGateA = evaluateGateA(bankMetrics, { sequenceApplicable: false });

  const byModule = new Map();
  allQuestions.forEach((q) => {
    if (!byModule.has(q.module)) byModule.set(q.module, []);
    byModule.get(q.module).push(q);
  });
  // Each form IS one genuine learner-facing quiz (index.html's
  // buildQuiz() renders exactly this module's array, in this order, as
  // one continuous <details class="quiz">), so sequence is fully
  // applicable per-form -- evaluateGateA()'s default.
  const forms = [...byModule.keys()].sort().map((moduleKey) => {
    const qs = byModule.get(moduleKey);
    const metrics = computeCueMetrics(qs, { lengthFn: canonicalLength });
    return { module: moduleKey, metrics, gateA: evaluateGateA(metrics) };
  });

  // Per-form AUTHORED ENCOUNTER ORDER, checked as its own, separate
  // contract from idManifestCheck (set identity) below -- see
  // compareToFormOrderManifest()'s doc comment for why these four checks
  // (set identity, per-form order, mechanical metric drift via
  // baselineComparison below, and current Gate A status via bank/forms
  // above) are kept genuinely independent rather than conflated.
  const formOrderCheck = compareToFormOrderManifest(Object.fromEntries(byModule));

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
    totalAuthoredQuestions: allQuestions.length,
    uniqueIdCount: new Set(allQuestions.map((q) => q.id)).size,
    noDuplicateIds: new Set(allQuestions.map((q) => q.id)).size === allQuestions.length,
    idManifestCheck,
    formOrderCheck,
    baselineComparison,
    bank: { metrics: bankMetrics, gateA: bankGateA },
    forms,
    domains,
    difficulties,
    topics,
    pilot,
    pilotMatchesFrozenManifest: JSON.stringify(pilot.ids) === JSON.stringify(FROZEN_PILOT_MANIFEST),
  };
}

function printHumanReadable(report, executionMeta) {
  const lines = [];
  lines.push("Assessment-cue audit -- authored question bank (Phase 0 step 1, QL-033)");
  lines.push("=".repeat(76));
  if (executionMeta && executionMeta.generatedAt) { lines.push(`Generated: ${executionMeta.generatedAt} (execution metadata only -- excluded from the deterministic payload)`); }
  lines.push(`Total authored questions: ${report.totalAuthoredQuestions} (unique ids: ${report.uniqueIdCount}, no duplicate ids: ${report.noDuplicateIds})`);
  lines.push(`Frozen exact-id-SET manifest match: ${report.idManifestCheck.matches} (removed: ${JSON.stringify(report.idManifestCheck.removed)}, added: ${JSON.stringify(report.idManifestCheck.added)}) -- set identity only, order-independent`);
  lines.push(`Frozen per-form ENCOUNTER-ORDER manifest match: ${report.formOrderCheck.matches} -- order-sensitive, separate contract from the id-set check above`);
  Object.keys(report.formOrderCheck.perForm).forEach((moduleKey) => {
    const f = report.formOrderCheck.perForm[moduleKey];
    if (!f.matches) { lines.push(`    - ${moduleKey}: order drift detected (live digest ${f.liveDigest.slice(0, 12)}... != frozen ${f.frozenDigest ? f.frozenDigest.slice(0, 12) + "..." : "none"})`); }
  });
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
    lines.push(`  position balance (${g.optionCount}-option items, n=${g.total}, regime=${g.position.regime}): ${g.position.status.toUpperCase()}`);
    g.position.reasons.forEach((r) => lines.push(`    - ${r}`));
  });
  lines.push(`  length association (tie-aware, exact Poisson-binomial): ${report.bank.gateA.length.status.toUpperCase()}`);
  report.bank.gateA.length.reasons.forEach((r) => lines.push(`    - ${r}`));
  lines.push(`  answer-key sequence (${report.bank.gateA.sequence.applicable ? "applicable" : "NOT APPLICABLE -- whole bank is not one learner-facing encounter order"}): ${report.bank.gateA.sequence.status.toUpperCase()}`);
  lines.push(`  uniquely-longest diagnostic (informational only): ${JSON.stringify(report.bank.gateA.uniquelyLongestDiagnostic)}`);
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
  lines.push(`-- Pilot batch: ${report.pilot.size} of ${report.pilot.totalBankSize} questions (matches frozen manifest: ${report.pilotMatchesFrozenManifest}) --`);
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
  const report = buildDeterministicReport(allQuestions);

  const wantsJson = process.argv.includes("--json");
  if (wantsJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(printHumanReadable(report, { generatedAt: new Date().toISOString() }));
    console.log("");
    console.log("(Re-run with --json for the deterministic machine-readable payload -- no timestamp included.)");
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCli().catch((error) => {
    console.error("assessment-cue-audit failed:", error);
    process.exitCode = 1;
  });
}

export { buildDeterministicReport, printHumanReadable };
