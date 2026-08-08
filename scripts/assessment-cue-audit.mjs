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
import { ORIGINAL_ID_MANIFEST_IDS } from "./assessment-cue-audit-id-manifest.mjs";

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
 * even if the total count and every aggregate metric is unchanged),
 * duplication, and reordering where order is part of the contract (the
 * sorted-id digest is order-independent by construction -- the frozen
 * manifest is a SET identity check, not a sequence check, which is the
 * correct contract for "which questions exist", as opposed to pilot
 * selection's separate canonical-order contract, section 6 below).
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

// Standard chi-square critical values at alpha=0.01, indexed by degrees
// of freedom (df = optionCount - 1). Covers option counts 2 through 8.
const CHI_SQUARE_CRITICAL_ALPHA_01 = { 1: 6.635, 2: 9.210, 3: 11.345, 4: 13.277, 5: 15.086, 6: 16.812, 7: 18.475 };

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
  const maxCount = Math.max(...positionCounts);
  const maxProportion = maxCount / N;
  const maxAllowedShare = Math.min(1, expectedProportion + PRACTICAL_MARGIN);
  const reasons = [];
  let practicalFail = false;
  if (maxProportion > maxAllowedShare) {
    practicalFail = true;
    reasons.push(`a position accounts for ${(maxProportion * 100).toFixed(1)}% of ${N} items (allowed max ${(maxAllowedShare * 100).toFixed(1)}%, expected ${(expectedProportion * 100).toFixed(1)}% under uniform chance)`);
  }

  // Chi-square is always computable in this branch, by construction
  // (N >= REGIME_THRESHOLD(n) === CHI_SQUARE_MIN_EXPECTED_PER_CELL * n
  // guarantees every expected cell count N/n >= CHI_SQUARE_MIN_EXPECTED_PER_CELL).
  const chiSquare = positionCounts.reduce((sum, observed) => {
    const expected = N / n;
    return sum + (observed - expected) ** 2 / expected;
  }, 0);
  const df = n - 1;
  const critical = CHI_SQUARE_CRITICAL_ALPHA_01[df];
  let statisticalResult = "not-computed";
  let statisticallySignificant = false;
  if (critical !== undefined) {
    statisticalResult = chiSquare > critical ? "rejects-uniform" : "fails-to-reject-uniform";
    statisticallySignificant = statisticalResult === "rejects-uniform";
  } else {
    reasons.push(`degrees of freedom ${df} exceeds this module's chi-square critical-value table -- statistical corroboration not available for this option count, practical threshold remains authoritative`);
  }

  // DECISION POLICY (corrected -- docs/ASSESSMENT_VALIDITY.md section 4.6a,
  // "practical vs. statistical significance"). The practical/effect-size
  // margin is the SOLE, AUTHORITATIVE driver of pass/fail in this regime:
  // exceeding it fails regardless of statistical significance or power (a
  // predeclared, educationally meaningful effect can fail even under a
  // small sample's low statistical power). Statistical significance
  // ALONE, without exceeding the practical margin, NEVER fails the gate
  // by itself -- with enough items, an educationally trivial deviation
  // becomes statistically detectable purely because N is large, and
  // detectability is not the same as a substantive cueing defect. It
  // still surfaces, explicitly, as a separate review flag, so a real
  // statistical signal is never silently discarded either.
  let reviewRequired = false;
  let reviewReason = null;
  if (statisticallySignificant && !practicalFail) {
    reviewRequired = true;
    reviewReason = `chi-square goodness-of-fit statistic ${chiSquare.toFixed(2)} exceeds the critical value ${critical} (df=${df}, alpha=${SIGNIFICANCE_ALPHA}) -- statistically distinguishable from uniform -- even though the observed share (${(maxProportion * 100).toFixed(2)}%) stays within the practical margin (allowed max ${(maxAllowedShare * 100).toFixed(1)}%); flagged for human review, not failed, since statistical significance alone does not establish an educationally meaningful cueing defect`;
    reasons.push(reviewReason);
  } else if (statisticallySignificant) {
    reasons.push(`chi-square goodness-of-fit statistic ${chiSquare.toFixed(2)} exceeds the critical value ${critical} (df=${df}, alpha=${SIGNIFICANCE_ALPHA}) -- position distribution is statistically distinguishable from uniform, corroborating the practical-margin failure above`);
  }

  const status = practicalFail ? "fail" : "pass";
  return {
    status, regime: "statistical", reasons,
    reviewFlag: { required: reviewRequired, reason: reviewReason },
    detail: { n, N, positionCounts, maxProportion, expectedProportion, maxAllowedShare, practicalFail, chiSquare, statisticalResult, statisticallySignificant },
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
  const statisticalResult = pValue < SIGNIFICANCE_ALPHA ? "rejects-null" : "fails-to-reject-null";
  const statisticallySignificant = statisticalResult === "rejects-null";

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
 * (new) is evaluated once over every item in the scope's original
 * encounter order, reported separately from both.
 *
 * Gate A is a purely STRUCTURAL/STATISTICAL judgment about answer
 * position and length distribution (and, now, sequence predictability).
 * It never inspects, and can never establish, scientific correctness,
 * item plausibility, or any other Gate B property -- see
 * docs/ASSESSMENT_VALIDITY.md.
 */
export function evaluateGateA(metrics) {
  const positionByOptionCount = metrics.byOptionCount.map((group) => ({
    optionCount: group.optionCount,
    total: group.total,
    position: evaluatePositionBalance(group),
  }));

  const length = evaluateLengthAssociation(metrics.items);
  const sequence = evaluateAnswerSequence(metrics.items);

  // Diagnostic-only summary, retained per docs/ASSESSMENT_VALIDITY.md's
  // requirement to keep a clearly defined unique-longest figure visible
  // even though it no longer drives the pass/fail decision on its own.
  const uniquelyLongestDiagnostic = {
    count: metrics.uniquelyLongestCorrect,
    total: metrics.total,
    rate: metrics.total > 0 ? metrics.uniquelyLongestCorrect / metrics.total : null,
  };

  const allStatuses = [...positionByOptionCount.map((g) => g.position.status), length.status, sequence.status];
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
    totalAuthoredQuestions: allQuestions.length,
    uniqueIdCount: new Set(allQuestions.map((q) => q.id)).size,
    noDuplicateIds: new Set(allQuestions.map((q) => q.id)).size === allQuestions.length,
    idManifestCheck,
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
  lines.push(`Frozen exact-id manifest match: ${report.idManifestCheck.matches} (removed: ${JSON.stringify(report.idManifestCheck.removed)}, added: ${JSON.stringify(report.idManifestCheck.added)})`);
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
