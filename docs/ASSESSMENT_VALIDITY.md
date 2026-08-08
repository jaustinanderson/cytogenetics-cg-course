# Assessment Validity: QL-033 Baseline, Gate A, Gate B, and Pilot Record

**Status: Phase 0 steps 1–3 (foundation only), proposed in a draft PR, not yet
merged.** This document is the single authoritative source for the
assessment-cue measurement methodology, the Gate A statistical rules, the
Gate B item-review rubric, and the Phase 0 pilot batch. Other documents
(`docs/ROADMAP.md`, `docs/LEARNING_PLATFORM_ROADMAP.md`,
`docs/QUALITY_LOG.md`, `docs/VALIDATION.md`) link here rather than
duplicating this content.

**What this document does NOT do:**

- It does not change, rewrite, reorder, or re-tag any question, option,
  answer index, rationale, distractor feedback, domain, topic, difficulty,
  or stable ID. `index.html` is unchanged by this work.
- It does not populate `QUESTION_GOVERNANCE` with any source, drafter,
  SME reviewer, independent reviewer, credential, approval, or conflict
  declaration. All 153 authored questions remain `draft`.
- It does not mark QL-033 corrected. QL-033 remains a confirmed,
  **unresolved** bank/form-level defect.
- It does not mark any question Gate B–passing, release-qualified,
  diagnostically eligible, or psychometrically validated. A rubric now
  existing is not evidence that any item has been reviewed against it.
- It does not implement answer-option randomization or any diagnostic,
  mastery, weakness, adaptive, retention, or readiness feature.
- Selecting the pilot batch (section 5) is not authorization to rewrite
  it. That rewriting is separately scoped, later work (Phase 0 steps
  4–9, `docs/LEARNING_PLATFORM_ROADMAP.md` Phase 0), gated on independent
  review and merge of this foundation first.

See `docs/LEARNING_PLATFORM_ROADMAP.md` section B and Phase 0 for how this
fits into the larger plan, and `docs/QUALITY_LOG.md` QL-033 for the
original finding this document reproduces and formalizes.

---

## 1. Tooling

All measurement, classification, Gate A evaluation, and pilot-selection
logic lives in exactly one implementation, `scripts/assessment-cue-audit.mjs`,
imported (never re-implemented) by:

- `tests/assessment-cue-audit.mjs` — dependency-free unit and boundary
  tests (`npm run test:assessment-cues`, part of `npm test`).
- `tests/e2e/assessment-cue-audit.spec.mjs` — a real-browser Playwright
  cross-check proving `window.CytoCourse.getQuestions()` and this module
  agree.
- The module's own CLI mode: `npm run audit:assessment-cues` (human-readable)
  or `npm run audit:assessment-cues -- --json` (deterministic
  machine-readable report).

The CLI boots the real inline `<script>` from `index.html` in an isolated
Node `vm` sandbox (the same dependency-free technique already used by
`tests/question-governance.mjs` and `tests/dom-behavior.mjs`) and calls the
real, live `window.CytoCourse.getQuestions()` — it measures the same data
a browser sees, not a separately maintained copy.

---

## 2. Frozen historical baseline

QL-033 (`docs/QUALITY_LOG.md`) recorded these counts, independently
reproduced again for this document directly against current `main`
(`git rev-parse HEAD` at the time of this writing: see the PR this
document ships in) via `scripts/assessment-cue-audit.mjs --json`:

| Measure | Value |
| --- | --- |
| Total authored questions | 153 |
| Unique stable IDs | 153 (no omission, no duplicate) |
| Answer position A / index 0 | 11 |
| Answer position B / index 1 | 139 |
| Answer position C / index 2 | 3 |
| Answer position D / index 3 | 0 |
| Correct answer uniquely longest option | 114 / 153 (74.5%) |
| Correct answer longest-or-tied option | 133 / 153 (86.9%) |

**This table is frozen** as `ORIGINAL_BASELINE` in
`scripts/assessment-cue-audit.mjs` and is never edited by later Phase 0
work — later, improved batches compare their own reproduced metrics
against it (Phase 0 step 9,
`docs/LEARNING_PLATFORM_ROADMAP.md`) without ever overwriting this record.
The audit tool reproduces this table exactly on every run against the
current bank (`baselineComparison.matchesOriginalBaselineExactly: true`,
confirmed by a dedicated test in `tests/assessment-cue-audit.mjs`) — the
defect is unresolved, not merely historical.

### Inventory coverage

Every authored question is counted exactly once: the audit flattens
`window.CytoCourse.getQuestions()`'s per-module map, and a dedicated test
confirms the resulting id set has the same cardinality as the flattened
array (no duplicate id silently collapsing two questions into one count,
and no question dropped). All 17 forms are covered: 16 module quizzes
(`m1`–`m16`) plus the `final` set, totaling 5+6+6+6+6+7+7+6+8+8+7+8+7+9+8+7+42
= 153.

### Per-domain and per-difficulty breakdown (canonical length metric; see section 3)

| Domain | n | Uniquely longest | Longest-or-tied |
| --- | ---: | ---: | ---: |
| analysis | 91 | 62 (68.1%) | 76 (83.5%) |
| molecular | 14 | 13 (92.9%) | 14 (100%) |
| operations | 10 | 10 (100%) | 10 (100%) |
| orientation | 5 | 3 (60.0%) | 4 (80.0%) |
| specimen | 33 | 26 (78.8%) | 29 (87.9%) |

| Difficulty | n | Uniquely longest | Longest-or-tied |
| --- | ---: | ---: | ---: |
| x=1 (recall) | 93 | 68 (73.1%) | 78 (83.9%) |
| x=2 (application) | 42 | 31 (73.8%) | 38 (90.5%) |
| x=3 (judgment) | 18 | 15 (83.3%) | 17 (94.4%) |

Two domain-level findings worth stating explicitly, both independently
reproducible via `npm run audit:assessment-cues -- --json`:

- **`operations`: the correct answer is the uniquely longest option in
  every one of its 10 questions (100%).** This is the single most
  extreme domain-level length-cueing concentration in the bank.
- **`molecular` has no `not-longest` items at all** — every one of its 14
  questions has the correct answer as either uniquely longest (13) or
  tied-longest (1); none has the correct answer shorter than the longest
  distractor.

Full per-topic (19 distinct topics) and per-form (17 forms) breakdowns are
in the tool's `--json` output (`topics` and `forms` arrays) and are not
reproduced in full here to avoid a second, driftable copy of the same
data — see section 1.

---

## 3. Length measurement

### 3.1 How QL-033 historically measured length

Independently reproduced (not assumed) by testing candidate metrics
against the live bank until one exactly reproduced QL-033's recorded
114/153 and 133/153 counts: **QL-033's length metric is plain JavaScript
string `.length` — a raw count of UTF-16 code units, with no trimming,
whitespace collapsing, markup handling, entity decoding, or Unicode
normalization of any kind.** This is implemented, unchanged, as
`historicalLength()` in `scripts/assessment-cue-audit.mjs`, and exists
solely to reproduce the frozen baseline exactly — new measurement should
use `canonicalLength()` (below) instead.

Candidate metrics tested and their result against the live bank, for
elimination transparency:

| Candidate metric | Uniquely longest | Longest-or-tied | Matches QL-033? |
| --- | ---: | ---: | --- |
| Raw `.length` (UTF-16 code units) | 114 | 133 | **Yes** |
| Trimmed `.length` | 114 | 133 | Yes (no option has leading/trailing whitespace) |
| Code-point array length (`[...s].length`) | 114 | 133 | Yes (no option contains astral characters) |
| Collapsed-whitespace `.length` | 114 | 133 | Yes (no option has internal multi-space runs) |
| Word count (`split(/\s+/)`) | 89 | 138 | **No** — confirms QL-033 did not use word count |

### 3.2 Canonical learner-visible length metric

`canonicalLength()` in `scripts/assessment-cue-audit.mjs` is the metric
new Phase 0 work should use going forward. It is more robust than the
historical metric for content that may (now or later) contain markup,
HTML entities, irregular whitespace, or characters outside the Unicode
Basic Multilingual Plane — none of which the current 153-question bank
actually contains, but a future authored or imported item could. In
order:

1. **Strip HTML tags first** — defensive; no current option contains
   markup, but a future one embedding e.g. `<em>` should be measured by
   its rendered text, not its source markup. Done **before** entity
   decoding, deliberately: an earlier version of this metric decoded
   entities first, which turned an escaped tag typed as literal source
   text (e.g. `&lt;tag&gt;`, meant to be visible to a learner as the
   literal characters `<tag>`) into something that then looked exactly
   like a real tag and got wrongly stripped, undercounting genuinely
   visible text as zero characters — caught by a dedicated regression
   test in `tests/assessment-cue-audit.mjs` before this document shipped.
   Stripping first only ever removes syntax that was already literal
   markup in the source; a lone comparison operator in real current
   content (e.g. `"Countable > analyzable > karyotypable"`, module 9) is
   correctly left untouched, since it never forms a `<...>` pair.
2. **Decode HTML entities** — named (`&amp;` `&lt;` `&gt;` `&quot;`
   `&apos;` `&nbsp;`) and numeric (`&#NNN;` / `&#xHH;`) forms, so a
   learner-visible `&` counts once rather than as the five characters of
   its escaped source form.
3. **Unicode NFC-normalize** — so a precomposed character (e.g. `é` as
   one code point) and its decomposed form (`e` + combining acute
   accent, two code points) measure identically, since a learner sees no
   difference between them.
4. **Collapse internal whitespace** runs to a single space and trim
   leading/trailing whitespace — defends against inflating length with
   extra spaces, which a learner would not perceive as "longer" text.
5. **Strip one trailing sentence-ending mark** (`.`/`!`/`?`) if present —
   defends against the cheapest form of purely decorative length
   padding (a trailing period added to nothing else). Internal
   punctuation (commas, parentheses, semicolons) is left untouched,
   since it can carry real content and there is no reliable automated
   way to distinguish "meaningful" from "padding" internal punctuation —
   see the residual-risk note below.
6. **Count grapheme clusters**, not UTF-16 code units or raw code points
   (`Intl.Segmenter('en', {granularity:'grapheme'})`), so a single
   visible character built from multiple code points (e.g. an emoji with
   a modifier) counts once, matching what a learner actually perceives
   rather than an internal text-encoding artifact. (`historicalLength()`
   would count such a character as 2 or more "characters"; verified with
   a synthetic fixture in `tests/assessment-cue-audit.mjs`.)

**Result against the current bank: `canonicalLength()` and
`historicalLength()` agree on every one of the 153 questions' options.**
The canonical metric therefore currently reproduces the exact same
114/153 and 133/153 counts as the historical one — confirmed by the audit
tool's `baselineComparison.canonicalMethodDiffersFromHistorical: false`
and a dedicated test. **The historical QL-033 numbers in section 2 above
are preserved unchanged regardless** — this document does not, and no
future Phase 0 batch may, silently rewrite QL-033's history even in the
case (not the current one) where a future canonical measurement diverges
from it. If a future batch's canonical-metric numbers ever do diverge
from the frozen baseline (e.g. once a question containing an HTML entity
or unusual whitespace is authored), that divergence must be reported
separately, with an explicit explanation of which specific items and
which specific normalization step caused the difference — never silently
merged into or presented as a revision of the original QL-033 record.

**Residual gaming risk, stated honestly:** no automated text metric,
including this one, can fully distinguish a legitimately longer, more
complete correct answer from one padded with a short, plausible-sounding
extra clause or word — collapsing whitespace and stripping a trailing
mark closes the *cheapest* gaming vectors (spaces, markup, decorative
punctuation) but not a determined attempt to pad with real-looking
content. This is a structural limitation of any per-item automated
metric, not a defect specific to this implementation. It is why Gate A
(section 4) evaluates aggregate, bank/form-level statistical patterns
rather than a fixed per-item length cutoff — a single padded item does
not, by itself, fail Gate A — and why Gate B (section 5) requires a human
reviewer to judge whether a specific item's added length reflects genuine
content or padding, which no metric can adjudicate on its own.

---

## 4. Gate A — bank/form-level statistical guardrails

### 4.1 Sources consulted

Two authoritative, primary sources were directly inspected (not assumed,
not invented) for this design:

1. **University of Illinois Urbana-Champaign, Center for Innovation in
   Teaching & Learning (CITL), "Improving Your Test Questions,"**
   section "Multiple-Choice Test Items" → "Suggestions For Writing
   Multiple-Choice Test Items" → "Item Alternatives."
   URL: <https://citl.illinois.edu/citl-101/measurement-evaluation/exam-scoring/improving-your-test-questions>.
   Retrieved and directly inspected 2026-08-08.
   - Item #14 (verbatim): *"Randomly distribute the correct response
     among the alternative positions throughout the test having
     approximately the same proportion of alternatives a, b, c, d and e
     as the correct response."*
   - Item #11 (verbatim): *"Make alternatives approximately equal in
     length."*
   - The page's own "References for Further Reading" section cites
     Ebel (1965, 1972), Gronlund (1976), and other standard educational
     measurement texts as its own sources for these items.
2. **NBME (National Board of Medical Examiners), "Item-Writing Guide:
   Constructing Written Test Questions for the Health Sciences,"**
   November 2020 edition, Chapter 3 "Technical Item Flaws," subsection
   "Correct Option Stands Out" (page 21). Verbatim (as rendered by a
   third-party HTML mirror of the official PDF, `readkong.com`, since the
   original PDF's text was not machine-extractable with the tooling
   available for this work — noted here for honesty about retrieval
   method, not presented as if the original PDF were directly read):
   *"This results when item writers likely create the correct answer
   first and then write the incorrect distractors...item writers are
   often teachers and they will construct long correct answers that
   include additional instructional material, parenthetical information,
   caveats, and so on. This flaw can be avoided by reviewing the entire
   option set for length, ensuring the level of detail is consistent
   across options, and removing language that is purely for instructional
   purposes only."*
   Retrieved and inspected 2026-08-08 via
   <https://www.readkong.com/page/nbme-item-writing-guide-constructing-written-test-5281377>
   (mirror); original PDF at
   <https://www.nbme.org/sites/default/files/2021-02/NBME_Item%20Writing%20Guide_R_6.pdf>
   (redirects to `info.nbme.org`) was located but not machine-readable
   with available tooling, so its exact page numbering was not
   independently re-confirmed against the mirror's claim.

Both sources give **qualitative** guidance ("randomly distribute,"
"approximately equal," "approximately the same proportion") — neither
specifies exact numeric thresholds or a statistical test. The specific
numeric thresholds and statistical procedure below are this document's
own operationalization of that qualitative guidance, chosen and justified
here (as `docs/LEARNING_PLATFORM_ROADMAP.md` Phase 0 step 2 requires),
not asserted to come from either source.

### 4.2 Candidate approaches considered

| Approach | Considered | Adopted? |
| --- | --- | --- |
| Exact 1/n uniformity requirement (e.g. exactly 25/25/25/25 for 4 options) | Yes | **No** — unrealistic and unnecessary for authored content of this size; the sources above say "approximately," not "exactly," and the task explicitly warns against assuming exact uniformity is required |
| Whole-bank-only balance, no per-form check | Yes | **No** — a bank could be balanced in aggregate while any single exam form drawn from it is badly skewed by sampling; both scopes are evaluated |
| p-value (statistical significance) alone | Yes | **No** — explicitly rejected; a large bank can be statistically "significant" over a practically trivial deviation, and a small form can fail to reach significance while still being grossly imbalanced in practical terms. Practical/effect-size threshold is the primary, authoritative check; the statistical test only corroborates it when the sample is large enough to compute reliably |
| Effect-size/practical threshold only, no statistical test | Yes | **No** — a purely practical threshold has no principled way to express "this observed deviation is essentially expected sampling noise, not a real pattern," which the statistical test at adequate sample sizes provides |
| A fixed absolute item-count threshold (e.g. "no more than 60 items may be keyed to any position") | Yes | **No** — does not scale correctly with bank size, form size, or option count; a proportion-based threshold does |
| Uniform minimum-sample floor before any judgment, with explicit "inconclusive" state below it | Yes | **Yes** — required given the module quizzes are as small as 5 items; see 4.3 |

### 4.3 Adopted rules

Every threshold below is applied **per option-count group** (currently
only 4-option items exist in the bank; the rules and the code are written
generically in terms of `n`, the option count for that group, so a future
2- or 3-option item is evaluated against its own correctly-scaled
expectation, not against the 4-option numbers) and separately to **(a)
the whole bank** and **(b) every individual form** (each module quiz and
the `final` set) — never only the aggregate, since a form drawn from an
otherwise-balanced bank can itself be skewed by which items it happens to
contain.

**Position balance** (`evaluatePositionBalance()`):

- Expected proportion at each of `n` positions under a no-cue null model:
  `1/n`.
- **Practical/effect-size threshold (primary, authoritative):** FAIL if
  any single position's observed share exceeds `1/n + 0.15` (the
  `PRACTICAL_MARGIN` constant). At `n=4` this allows up to 40% — clearly
  above the 25% chance rate to tolerate ordinary authoring variation, but
  far below the bank's actual observed 90.8% (position B) — so the
  QL-033 pattern is always caught while a merely slightly uneven form is
  not over-flagged. The margin is additive (not multiplicative) so it
  scales sensibly across option counts: 40% at n=4, ~48.3% at n=3, 65% at
  n=2.
- **Zero-floor check (also practical, also authoritative):** FAIL if any
  position is used zero times **and** the scope has at least
  `3 × n` items (`ZERO_FLOOR_MIN_ITEMS_PER_POSITION`) — i.e., enough
  items that every position had a real chance to appear at least once
  under any reasonable allocation. This exists specifically because
  "never correct" (the current D/index-3 pattern) is a real, severe cue
  even if the *proportion* threshold above were somehow not triggered.
- **Statistical corroboration:** a chi-square goodness-of-fit test
  against the uniform distribution is computed **only when every
  expected cell count is ≥ 5** (`N/n ≥ 5`, the standard textbook validity
  rule for chi-square), at `α = 0.01` (deliberately stricter than the
  conventional 0.05, since the practical threshold is already the
  authoritative check and a stricter α further reduces the chance of the
  statistical test alone flagging a small, legitimately balanced form).
  When the test is not computable (most module-quiz forms, at 5–9 items
  for n=4), it is reported as `"not-computed"` — never silently treated
  as "passed."
- **Status:** `fail` if the practical threshold or a computable
  statistical test rejects uniformity; else `inconclusive` if `N < 5n`
  (too few items for a confident judgment, even though no gross
  imbalance was observed); else `pass`.

**Length balance** (`evaluateLengthBalance()`): the same structure,
applied to the *rate* at which the correct answer is the uniquely-longest
option, against the same `1/n` no-cue expectation and the same
`PRACTICAL_MARGIN`, with a normal-approximation two-proportion z-test
(valid when `N·p·(1-p) ≥ 5`) in place of chi-square, at the same `α =
0.01` (two-tailed critical value 2.576). The z-test flags a rate
significantly **below** the expected baseline exactly as it flags one
significantly above — "correct answer is almost never the longest" is
just as much a usable cue as "almost always," and the test does not
privilege one direction (verified with a synthetic fixture in
`tests/assessment-cue-audit.mjs`).

### 4.4 Current result: the bank fails Gate A

**Whole-bank overall: FAIL.** Both position balance (90.8% at position B,
far above the 40% threshold; position D never used; chi-square 355.52
against a critical value of 11.345) and length balance (74.5% uniquely
longest, far above the 40% threshold; z=14.14 against a critical value of
2.576) fail. **Every one of the 17 individual forms also reports FAIL**
on at least one check (reproduced by `npm run audit:assessment-cues`;
exact per-form detail in its `--json` output). This is expected and
correct — Gate A is designed to fail on exactly this pattern, and this
document does not, and must not, weaken any threshold to make the
present bank pass. Passing Gate A remains later, separately scoped and
independently reviewed work (Phase 0 steps 4+).

### 4.5 What Gate A is not

- Gate A is a **statistical authoring safeguard**, not psychometric
  validation. Passing it says the bank/form's answer-position and
  answer-length distributions are not statistically distinguishable from
  chance at the stated threshold and significance level — it says
  nothing about whether any item's content is scientifically accurate,
  well-targeted, or discriminates the intended concept. That is Gate B
  (section 5) and, separately, `QUESTION_GOVERNANCE` scientific review.
- A balanced Gate A result **never** implies scientific correctness.
- Gate A **never** requires changing a scientifically correct answer
  merely to satisfy a position or length quota — see
  `docs/LEARNING_PLATFORM_ROADMAP.md` B.1: "No individual item should be
  rewritten, penalized, or quarantined merely to 'avoid another B' ... if
  the content is otherwise sound."

### 4.6 False-positive / false-negative risk

- **False positive (Gate A fails a scope that is not actually
  problematic):** possible at small `N` from ordinary sampling
  variation, which is exactly why the `inconclusive` state exists for
  scopes below the reliable-inference floor, and why the practical
  threshold (not a bare p-value) is authoritative — a single small form
  with, say, 3-of-6 at one position is flagged as a real practical
  concern worth a reviewer's attention even though it might be
  statistically unremarkable at that sample size, which is a deliberate,
  documented choice to err toward reviewer attention rather than silence
  at low N.
- **False negative (Gate A passes a scope that is actually
  problematic):** possible if a scope's imbalance is real but stays
  under the `PRACTICAL_MARGIN` and is too small (`N < 5n`) for the
  statistical test to detect it — reported as `inconclusive`, not
  `pass`, specifically so this case is never silently certified as fine.
  A determined, sophisticated cueing pattern spread thinly enough across
  many small forms to individually clear each form's threshold, while
  still being visible in the whole-bank aggregate, is caught by the
  separate whole-bank evaluation, which is always run alongside every
  per-form one.

---

## 5. Gate B — item-level cue and writing rubric

Gate B is a **human reviewer's rubric**, not an automated pass/fail
computation — deciding whether an individual item's options are
plausible, parallel, targeted, and free of avoidable cues requires
subject-matter and item-writing judgment that this document does not
attempt to automate. A reviewer works through this checklist for each
item:

1. **Exactly one defensible best answer.** Confirm no distractor could
   reasonably be defended as equally correct given the stated stem and
   current authoritative sources.
2. **Scientific correctness is a separate question.** Confirm this
   checklist is being used for *item-writing quality*, not as a
   substitute for the scientific-accuracy review `QUESTION_GOVERNANCE`
   already requires (`reviewChecks`, `docs/CONTENT_GOVERNANCE.md`) — a
   well-constructed item can still be scientifically wrong, and a
   scientifically correct item can still be badly constructed; both
   checks are required, neither substitutes for the other.
3. **Distractor plausibility.** Each distractor should be plausible to a
   learner at the item's intended difficulty/level — not simply wrong,
   but wrong in a way a learner with a genuine, specific gap could
   actually believe.
4. **Parallel construction.** Options should match in grammar, syntax,
   abstraction level, and category (e.g., not three mechanisms and one
   outcome; not three short phrases and one full sentence).
5. **Mutual distinguishability.** Options should be clearly different
   from each other in meaning — not near-duplicates that force a
   guess between two options that say almost the same thing.
6. **Grammar/stem-completion clues.** For a fill-in-the-blank-style stem,
   confirm every option grammatically completes the stem equally well (a
   distractor that doesn't grammatically fit is a free cue).
7. **Repeated stem wording or keyword clues.** Confirm the correct
   answer doesn't repeat a distinctive word or phrase from the stem that
   the distractors lack (a common, easy-to-miss cue).
8. **Conspicuously longer, more specific, or more qualified correct
   answers.** Beyond the aggregate Gate A statistic, judge this
   *specific* item on its own: does its correct answer stand out by
   being noticeably more detailed, hedged, or qualified than its
   distractors, independent of where the bank/form-level numbers land?
9. **Absolute words and other unintended cues.** Distractors containing
   "always," "never," "all," or "none" are frequently — and often
   correctly — perceived by test-takers as more likely false; confirm
   such wording isn't inadvertently marking the distractor rather than
   reflecting genuine content.
10. **Paired/opposite-option patterns.** Confirm the option set doesn't
    contain an obvious opposite pair that telegraphs "the answer is one
    of these two."
11. **"All/none of the above" and negative-stem risks.** Confirm any use
    of "all of the above"/"none of the above" is deliberate and doesn't
    trivially inflate or deflate difficulty; confirm a negatively-phrased
    stem ("which is NOT...") is clearly and unmistakably marked as such.
12. **Implausible padding added solely to equalize length.** Confirm
    that if a distractor was lengthened in response to Gate A, the
    addition is genuine, plausible content — not meaningless filler
    added only to pad character count (see section 3.2's residual-risk
    note; this is exactly the check that residual risk depends on a
    human catching).
13. **Rationale and wrong-answer-feedback alignment.** Confirm `why`
    (the correct-answer rationale) and every `w` entry (distractor
    feedback) actually match the current option text and order — a
    rewritten option whose feedback was not correspondingly updated is a
    structural regression (checked automatically by the test suite,
    section 6, but also worth a reviewer's direct read).
14. **Preservation of assessed intent and stable-ID meaning.** Confirm
    the edit did not change *what concept/objective the item actually
    tests* while keeping the same stable ID — per
    `docs/LEARNING_PLATFORM_ROADMAP.md` Phase 0 step 4, an edit that
    changes intent requires a new/superseded ID, not a silent rewrite
    under the old one.
15. **When to version/supersede vs. edit in place.** If steps 1–14 can
    all be satisfied by adjusting wording/distractors while the item
    still tests the same concept at the same level, edit in place
    (same ID). If satisfying them would require changing what the item
    actually assesses, supersede it: author a new ID, and mark the old
    id's `QUESTION_GOVERNANCE` record superseded rather than deleting or
    silently repurposing it.
16. **Quarantine when a safe rewrite isn't yet supportable.** If neither
    an in-place fix nor a confident supersession is achievable within
    the current review (e.g. the only fix available would require
    scientific judgment beyond the current reviewer's scope), the item
    is quarantined from Gate A/B-passing status rather than shipped with
    an uncertain fix — quarantine is a legitimate, recorded outcome, not
    a failure of the process.
17. **Required evidence before release-qualification.** None of the
    above, even fully satisfied, makes an item `release-qualified`.
    That still separately requires the existing `QUESTION_GOVERNANCE`
    chain in full: source checking, SME review, and a documented,
    approved, conflict-free independent second-person review
    (`docs/ARCHITECTURE.md` "Question provenance and scientific-review
    governance"). Gate B assessment-quality review is a **prerequisite
    alongside**, not a replacement for, that chain
    (`docs/LEARNING_PLATFORM_ROADMAP.md` B.2).

Gate B is deliberately kept distinct from: scientific correctness (item
2 above), `QUESTION_GOVERNANCE` lifecycle (item 17), Gate A bank/form
statistics (section 4 — a bank-level pattern, not a per-item judgment),
`diagnosticEligible` status (which additionally requires all of the
above plus concept mapping and Gate A currently passing for the item's
bank/form,`docs/LEARNING_PLATFORM_ROADMAP.md` B.2), and future
psychometric validation (Phase 11, which requires real learner response
data none of this generates).

**No question in this repository has been reviewed against this rubric
as of this document's introduction.** Its existence is not evidence that
any item has passed it.

---

## 6. Pilot batch (selected, not rewritten)

### 6.1 Selection method

Defined and fixed **before** any ID was selected, so the process cannot
be used to cherry-pick favorable-looking items after the fact
(`selectPilotBatch()` in `scripts/assessment-cue-audit.mjs`):

1. Iterate all 153 questions in their canonical file order (`m1`…`m16`,
   then `final`; within each, array order).
2. Compute each question's stratum key: `${domain}|${cueClass}`, where
   `cueClass` is `uniquely-longest`, `tied-longest`, or `not-longest`
   (section 3).
3. The **first** question encountered for each distinct stratum key is
   selected as that stratum's representative.
4. After every distinct domain × cueClass combination actually present
   in the data has one representative, scan the selected set for
   remaining gaps in four further dimensions and, for each gap,
   deterministically add the first not-yet-selected question (in
   canonical order) that supplies it: every difficulty level present
   (1, 2, 3); every answer position actually used (A, B, C — **D is
   never used anywhere in the current bank, so no pilot item can
   represent it; this absence is itself part of the confirmed
   imbalance, not an oversight in selection**); both form contexts
   (`final` vs. an ordinary module quiz); and both observed
   distractor-feedback structures (151 of 153 questions have feedback
   on exactly their non-correct options; 2 — `m12-q6` and `final-q38` —
   have feedback keyed on all 4 indices, including the correct one).

This is a purely mechanical rule with no manual judgment in the
selection step itself — re-running `selectPilotBatch()` against the
unchanged bank always produces the same 13 IDs (verified by a
determinism test in `tests/assessment-cue-audit.mjs`).

### 6.2 Selected pilot batch (13 of 153 questions)

| ID | Selection stratum | Reason |
| --- | --- | --- |
| `final-q33` | domain × cueClass | first `molecular` / `tied-longest` item |
| `m1-q1` | domain × cueClass | first `orientation` / `not-longest` item |
| `m1-q2` | domain × cueClass | first `orientation` / `uniquely-longest` item |
| `m1-q3` | domain × cueClass | first `orientation` / `tied-longest` item |
| `m12-q6` | distractorFeedbackCoverage | first item with feedback keyed on all 4 options (partial-coverage gap) |
| `m15-q1` | domain × cueClass | first `molecular` / `uniquely-longest` item |
| `m16-q1` | domain × cueClass | first `operations` / `uniquely-longest` item |
| `m2-q1` | domain × cueClass | first `specimen` / `uniquely-longest` item |
| `m2-q3` | domain × cueClass | first `specimen` / `not-longest` item |
| `m4-q1` | domain × cueClass | first `specimen` / `tied-longest` item |
| `m6-q1` | domain × cueClass | first `analysis` / `uniquely-longest` item |
| `m6-q4` | domain × cueClass | first `analysis` / `not-longest` item |
| `m7-q2` | domain × cueClass | first `analysis` / `tied-longest` item |

The domain × cueClass pass alone already happened to cover all three
difficulty levels, all three used answer positions (A/B/C), and both
form contexts — so the four supplemental coverage checks in step 4 added
only one further item (`m12-q6`, for the distractor-feedback-structure
gap). This is a property of where those values happen to fall in
canonical order for this bank, not a hand-tuned outcome — a differently
ordered or differently composed bank could require the supplemental
checks to add more items, and the algorithm handles that generically.

Represented strata, confirmed directly from the selected set: **5 of 5
domains**, **3 of 3 difficulty levels present in the bank**, **3 of 3
answer positions actually used**, **both form contexts** (module quiz
and `final`), **both observed distractor-feedback structures**, and
**9 of 19 distinct topics** (`orientation`, `specimen-collection`,
`harvest`, `structural-2`, `imaging`, `metaphase-selection`, `fish`,
`fish-array`, `lab-ops`) — a genuinely diverse, not forced-exhaustive,
topic spread, chosen not to inflate pilot size chasing full topic
coverage while still remaining "small enough to review thoroughly, large
enough to expose real problems with the rubric and process" per Phase 0
step 3's own stated goal.

### 6.3 Per-item record (mechanical measurement only — no content evaluation)

For every selected ID, only mechanical, already-existing facts are
recorded — no item's scientific content was evaluated or judged as part
of this selection, and none of the following implies the item is
defective, scientifically correct, or eligible for anything:

- its selection stratum and reason (table above);
- its current mechanical cue measurement (answer position, cue class,
  option lengths) — reproducible in full via
  `npm run audit:assessment-cues -- --json` (the `pilot.records` and
  each item's entry under the relevant `forms`/`domains` breakdown);
- its current `QUESTION_GOVERNANCE` state: **`draft`, with every
  evidence field null/empty/false** — identical to all other 152
  questions; the pilot has no elevated or different governance status;
- what future reviews it would require before any status could change:
  the full Gate B rubric (section 5) plus the existing
  `QUESTION_GOVERNANCE` source-check/SME-review/independent-review chain,
  performed and independently reviewed as its own separately scoped,
  later Phase 0 step (steps 4–6,
  `docs/LEARNING_PLATFORM_ROADMAP.md` Phase 0), not this one.

**Selection is not authorization to modify.** No pilot item's question
text, options, answer index, rationale, or feedback has been changed by
this document or by the PR it ships in.
