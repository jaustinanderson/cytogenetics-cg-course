# Assessment Validity: QL-033 Baseline, Gate A, Gate B, and Pilot Record

**Status: Phase 0 steps 1–3 (foundation only), proposed in a draft PR, not yet
merged.** This document is the single authoritative source for the
assessment-cue measurement methodology, the Gate A statistical rules, the
Gate B item-review rubric, and the Phase 0 pilot batch. Other documents
(`docs/ROADMAP.md`, `docs/LEARNING_PLATFORM_ROADMAP.md`,
`docs/QUALITY_LOG.md`, `docs/VALIDATION.md`) link here rather than
duplicating this content.

**Correction history:** this document's Gate A design, length metric, pilot
selection, and citation handling were substantially corrected after
independent review found the original draft version made real course forms
and the pilot batch structurally unable to ever pass Gate A, measured a
different string than the one actually rendered to learners, and made
several other reproducibility and provenance errors (`docs/QUALITY_LOG.md`
QL-037). A **second** independent review, before merge, found that no test
or documented claim had actually exercised the COMBINED Gate A (only
position balance in isolation), that aggregate position balance alone does
not catch a mechanically predictable answer-key sequence, that a
statistically significant but practically trivial large-N deviation could
fail the gate by itself, and that the exact two-sided p-value convention
was unnamed and not the only defensible one (`docs/QUALITY_LOG.md`
QL-038). A **third** independent review, still before merge, found that
the large-N practical decision examined only the single largest answer
position and so missed material underrepresentation (a position with zero
or few correct answers could still pass), that position balance never
reported an actual chi-square p-value, that a comment wrongly claimed the
frozen id manifest detected reordering it structurally cannot detect,
and that the NBME source-provenance wording described the two official
NBME URLs less precisely than directly re-inspecting them supports
(`docs/QUALITY_LOG.md` QL-039). A **fourth** independent review, still
before merge, found that the Cohen's-w rationale itself rested on a
mathematically impossible example (a claimed probability distribution
summing to 1.15), that a distribution-wide practical failure could be
reported with no explanation of which position(s) or direction(s) drove
it, that the aggregate helpers trusted malformed caller-supplied input
without validation, that the round-4 p-value "independent" verification
reused the same recurrence as the implementation under test, and that the
regime-transition claim overstated what the retained evidence proves
(`docs/QUALITY_LOG.md` QL-040). Every counterexample that prompted a
correction, from any of the four reviews, is recorded in the relevant
section below, along with the fix and why it is now correct.

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
- Selecting the pilot batch (section 6) is not authorization to rewrite
  it. That rewriting is separately scoped, later work (Phase 0 steps
  4–9, `docs/LEARNING_PLATFORM_ROADMAP.md` Phase 0), gated on independent
  review and merge of this foundation first.

See `docs/LEARNING_PLATFORM_ROADMAP.md` section B and Phase 0 for how this
fits into the larger plan, and `docs/QUALITY_LOG.md` QL-033 for the
original finding this document reproduces and formalizes.

---

## 1. Tooling

All measurement, classification, Gate A evaluation, and pilot-selection
logic lives in exactly one implementation, `scripts/assessment-cue-audit.mjs`
(plus the frozen, literal `scripts/assessment-cue-audit-id-manifest.mjs`,
section 2.1), imported (never re-implemented) by:

- `tests/assessment-cue-audit.mjs` — dependency-free unit and boundary
  tests (`npm run test:assessment-cues`, part of `npm test`).
- `tests/e2e/assessment-cue-audit.spec.mjs` — a real-browser Playwright
  cross-check, including the rendered-text oracle (section 3.2).
- The module's own CLI mode: `npm run audit:assessment-cues` (human-readable)
  or `npm run audit:assessment-cues -- --json` (deterministic
  machine-readable report — section 7 documents exactly what "deterministic"
  means here).

The CLI boots the real inline `<script>` from `index.html` in an isolated
Node `vm` sandbox (the same dependency-free technique already used by
`tests/question-governance.mjs` and `tests/dom-behavior.mjs`) and calls the
real, live `window.CytoCourse.getQuestions()` — it measures the same data
a browser sees, not a separately maintained copy.

---

## 2. Frozen historical baseline

QL-033 (`docs/QUALITY_LOG.md`) recorded these counts, independently
reproduced again for this document directly against current `main`
via `scripts/assessment-cue-audit.mjs --json`:

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

**This aggregate table is frozen** as `ORIGINAL_BASELINE` in
`scripts/assessment-cue-audit.mjs` and is never edited by later Phase 0
work.

### 2.1 Frozen exact-identity manifest (corrected — aggregate counts alone are not enough)

**Counterexample reproduced:** `ORIGINAL_BASELINE` above records only
*counts*. A hypothetical later change that removed one id and added an
unrelated replacement id — while keeping the total at 153 and, by
coincidence or deliberate construction, every position/length count
identical — would pass every aggregate check above undetected. Confirmed
by direct construction: `compareToIdManifest()` correctly flags this exact
scenario (one id swapped, total count unchanged) as a mismatch, while an
aggregate-only check would not.

**Correction:** `scripts/assessment-cue-audit-id-manifest.mjs` freezes the
literal, exact list of all 153 stable ids QL-033's counts were computed
against, captured once at the time this correction was authored — **not**
derived from the live bank at import time, which would make it structurally
incapable of detecting a later identity change. `ORIGINAL_ID_MANIFEST`
(in `scripts/assessment-cue-audit.mjs`) wraps this list with a sorted copy
and a SHA-256 digest (`sha256Hex(JSON.stringify(sortedIds))`) for a fast,
tamper-evident single-value comparison, alongside the full human-readable
list for direct audit. `compareToIdManifest(liveIds)` compares a live id
set against this frozen record and reports:

- `matches` — the live sorted-id digest equals the frozen digest, and no
  duplicate exists in the live set;
- `removed` — ids present in the frozen manifest but absent from the live
  set;
- `added` — ids present in the live set but absent from the frozen
  manifest;
- `hasDuplicates` — the live id count differs from the live unique-id count.

This detects removal, addition, replacement (a removal and an addition
together, even if counts are otherwise unchanged), and duplication. The
digest is intentionally a comparison over the **sorted** id set, not the
original sequence — this is a set-identity check ("which 153 questions
exist"), a different and independent contract from pilot selection's
separate canonical-*order* contract (section 6.1), which does care about
sequence for a different reason (deterministic tie-breaking, not identity).

**`noDuplicateOrOmittedIds` renamed.** The prior field name claimed to
check omission as well as duplication, but its implementation
(`idSet.size === allQuestions.length`) checked only uniqueness — a
removed-and-replaced id pair would leave that equality holding. The CLI's
deterministic report now exposes `noDuplicateIds` (accurately named, same
implementation) as a separate, narrower field, with `idManifestCheck`
(the `compareToIdManifest()` result above) as the actual
omission/addition/replacement detector.

### 2.2 Per-form encounter-order manifest (added — a second independent review found order is now a genuine contract, and a misleading comment)

**Issue identified, in two parts:**

1. `compareToIdManifest()`'s own comment claimed it detected "reordering
   where order is part of the contract" — self-contradictory with the very
   next clause explaining the digest is computed over the **sorted** id
   list and is therefore order-**independent** by construction. Confirmed
   directly: reversing all 153 frozen ids before calling
   `compareToIdManifest()` still reports `matches: true`. This is CORRECT
   behavior for a set-identity check (which is precisely what "which 153
   questions exist" requires), but the comment's claim about order was
   simply wrong and has been removed.
2. Separately, that comment's inaccuracy became more consequential once
   the answer-key sequence check (section 4.10) started examining each
   form's actual rendered order: `index.html`'s `buildQuiz()` renders
   `QUIZZES[key]` in exact array order, with no shuffling of questions or
   options, so each learner-facing form's **authored encounter order** is
   now a genuine, independently trackable behavioral contract — one this
   file had no dedicated frozen record for at all.

**Correction:** `compareToIdManifest()`'s comment is corrected to state
plainly that it answers exactly one question — does the same SET of ids
exist — and cannot, by design, answer whether they are in the same order.
A new, genuinely separate, ORDER-SENSITIVE contract is added:
`scripts/assessment-cue-audit-id-manifest.mjs` freezes
`ORIGINAL_FORM_ORDER_IDS`, the exact per-form authored order for all 17
forms, captured the same point-in-time-snapshot way as the id-set
manifest (never derived from the live bank at import time).
`ORIGINAL_FORM_ORDER_MANIFEST` wraps each form's frozen ordered list with
an order-sensitive SHA-256 digest (computed over the ordered array
directly, deliberately **not** sorted first, unlike the id-set digest).
`compareToFormOrderManifest(liveQuestionsByModule)` compares each form's
live order against its frozen digest and reports `{matches, perForm}`.

**Four genuinely separate questions, kept genuinely separate** (not
conflated, and each independently reported in
`buildDeterministicReport()`):

| Question | Answered by | Order-sensitive? |
| --- | --- | --- |
| Does the same SET of 153 questions exist? | `idManifestCheck` (`compareToIdManifest()`) | No — by design |
| Is each form's authored ENCOUNTER ORDER unchanged? | `formOrderCheck` (`compareToFormOrderManifest()`, new) | Yes — by design |
| Have the frozen AGGREGATE measurements drifted from QL-033? | `baselineComparison` | N/A — mechanical count comparison |
| Does the live bank pass Gate A RIGHT NOW? | `bank.gateA` / `forms[].gateA` | Independent of either manifest — a fresh evaluation of whatever exists today |

Verified directly (`tests/assessment-cue-audit.mjs`): reversing or
permuting questions **within** one form triggers order drift for that
form specifically (`formOrderCheck.perForm.<module>.matches: false`)
while `idManifestCheck.matches` stays `true` (the SET is unchanged); an id
**replacement** triggers `idManifestCheck.matches: false` and, as a
legitimate consequence (that position in the form now genuinely holds a
different id), the corresponding form's order digest also changes;
unchanged input matches both frozen contracts simultaneously; and pilot
selection (section 6.1) remains fully input-order-independent despite
per-form order now being separately tracked — reversing a form's internal
array before calling `selectPilotBatch()` does not change which ids are
selected, since that selection's own canonical-order contract is, and
remains, independent of this one.

### Inventory coverage

Every authored question is counted exactly once: the audit flattens
`window.CytoCourse.getQuestions()`'s per-module map, and a dedicated test
confirms the resulting id set has the same cardinality as the flattened
array. All 17 forms are covered: 16 module quizzes (`m1`–`m16`) plus the
`final` set, totaling 5+6+6+6+6+7+7+6+8+8+7+8+7+9+8+7+42 = 153.

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
  every one of its 10 questions (100%).**
- **`molecular` has no `not-longest` items at all** — every one of its 14
  questions has the correct answer as either uniquely longest (13) or
  tied-longest (1).

Full per-topic (19 distinct topics) and per-form (17 forms) breakdowns are
in the tool's `--json` output and are not reproduced in full here to avoid
a second, driftable copy of the same data.

---

## 3. Length measurement

### 3.1 How QL-033 historically measured length (corrected — reconstruction, not recovered provenance)

**Counterexample reproduced:** an earlier version of this document claimed
that reproducing QL-033's exact aggregate counts with a candidate metric
*was* evidence of what the original one-off audit script did. That
overstates what aggregate agreement can prove: multiple different
implementations could, in principle, produce the same aggregate output on
this specific 153-question bank without being the same method. No original
script for QL-033's one-off computation survives in this repository —
checked directly; none exists.

**Corrected claim, stated at exactly the strength the evidence supports:**

- Plain JavaScript string `.length` (raw UTF-16 code units, no trimming,
  whitespace collapsing, or normalization) **independently reproduces**
  QL-033's recorded 114/153 and 133/153 counts, tested directly against
  the live bank.
- A tested alternative, word count (`split(/\s+/)`), does **not** reproduce
  them (89/153, 138/153 instead) — ruling out a word-based metric as the
  original method.
- **The specific original one-off method cannot be proven from retained
  evidence.** `historicalLength()` in `scripts/assessment-cue-audit.mjs`
  is a *reconstruction* that matches the recorded aggregate output, kept
  only to reproduce the frozen baseline exactly — it is not presented, and
  must not be read, as a recovered original artifact.

| Candidate metric | Uniquely longest | Longest-or-tied | Reproduces QL-033's counts? |
| --- | ---: | ---: | --- |
| Raw `.length` (UTF-16 code units) | 114 | 133 | **Yes** |
| Trimmed `.length` | 114 | 133 | Yes (no option has leading/trailing whitespace) |
| Code-point array length (`[...s].length`) | 114 | 133 | Yes (no option contains astral characters) |
| Collapsed-whitespace `.length` | 114 | 133 | Yes (no option has internal multi-space runs) |
| Word count (`split(/\s+/)`) | 89 | 138 | **No** |

### 3.2 Canonical learner-visible length metric (corrected — must match the actual renderer, not an assumption about markup)

**Counterexample reproduced.** `index.html`'s actual rendering code:

```js
function esc(t){ var d=document.createElement('div');
  d.textContent = (t==null?'':String(t)); return d.innerHTML; }
...
'<span>'+esc(opt)+'</span>'
```

`esc()` assigns the raw option string to a detached `<div>`'s
`textContent` — which never interprets its input as markup or entities —
and reads back `.innerHTML`, which HTML-escapes it for safe insertion. The
browser then parses that escaped HTML back into the exact original literal
characters when rendering. This round trip is lossless: a raw option string
containing the literal characters `<b>Bold</b>` or `&amp;` is displayed to
the learner as **those literal characters**, never as bold text or a
decoded ampersand. Directly confirmed, not assumed, by the rendered-text
oracle test below.

An earlier version of `canonicalLength()` stripped tag-shaped substrings,
decoded HTML entities, and stripped a trailing decorative punctuation
mark before counting. All three were **wrong**, because none of them is
what the application actually renders — they measured a different string
than the one a learner actually sees, confirmed by the oracle test failing
against the corrected implementation's predecessor before this correction.

**Corrected definition** (`canonicalLength()` in
`scripts/assessment-cue-audit.mjs`), in order:

1. **Unicode NFC-normalize.** Not itself a rendering effect, but a
   precomposed and a decomposed representation of the same visible
   character (e.g. one code point for "é" vs. "e" plus a combining
   accent) render as the identical glyph — this keeps the metric a
   perceptually consistent proxy across both source encodings of visually
   identical input.
2. **Collapse internal whitespace runs to a single space, trim
   leading/trailing whitespace.** This IS a genuine rendering effect:
   `.qopt` and its option `<span>` carry no `white-space: pre*` override
   anywhere in `index.html`'s stylesheet (directly checked), so normal
   CSS inline-content whitespace collapsing applies to what a learner
   visually sees.
3. **Count grapheme clusters** (`Intl.Segmenter`, `'grapheme'`
   granularity), not UTF-16 code units or raw code points, so one visible
   character built from multiple code points (e.g. an emoji with a
   modifier) counts once.

**No entity decoding. No tag stripping. No trailing-punctuation
stripping** — removed from the prior version. A literal `<b>` or `&amp;`
is visible text in this application, not an instruction to interpret;
decoding or stripping it would measure a string the learner never
actually sees. Trailing-punctuation stripping is removed because it is
likewise not what is rendered — defending against trivial decorative
padding is Gate B's job (item-level human review, section 5), not this
metric's.

**Honest characterization of what this metric is and is not:** it is a
**text-length proxy** — an approximate count of visible character units —
**not** a measure of rendered visual width or perceptual salience. A wide
character and a narrow one each count as 1 grapheme regardless of the
pixels they occupy. Gate B human review remains the required check for a
cueing pattern this metric cannot measure, such as an option that looks
wider without having a longer grapheme count, or genuine padding content
this metric cannot distinguish from legitimate detail (same residual-risk
reasoning as before this correction, restated accurately for the corrected
metric).

**The rendered-text oracle** (`tests/e2e/assessment-cue-audit.spec.mjs`):
a synthetic, session-only runtime question (`window.CytoCourse.addQuestions()`,
never answered, never durable — the existing, separately validated
split-lifecycle policy, `docs/ARCHITECTURE.md` "Runtime-injected content
lifecycle") is injected with option text covering literal angle-bracket
text, entity-like text, NFC-vs-NFD Unicode composition, collapsible
whitespace, an emoji built from a surrogate pair, and trailing punctuation.
For every option: the real rendered `.qopt` text span's raw `textContent`
is asserted to equal the source string **verbatim** (proving the
round-trip claim above directly, not by inference), and
`canonicalLength()` computed on the source string is asserted to equal
`canonicalLength()` computed on the browser's own rendered `innerText`
(which independently reflects real CSS whitespace collapse) — the actual
oracle comparison this correction requires.

**Result against the current bank: `canonicalLength()` and
`historicalLength()` agree on every one of the 153 questions' options** —
no current option contains markup, entities, irregular whitespace, or
non-BMP characters, and (after this correction) no current option's
trailing punctuation changes the count either. Confirmed by
`baselineComparison.canonicalMethodDiffersFromHistorical: false`. The
frozen historical numbers in section 2 are preserved unchanged regardless
of any future divergence — this document does not, and no future Phase 0
batch may, silently rewrite QL-033's history.

---

## 4. Gate A — bank/form-level statistical guardrails

### 4.1 Sources consulted (corrected — provenance stated at the strength actually verified)

**Counterexample reproduced:** the original version of this section
described both a University of Illinois source and an NBME source as
"directly inspected primary sources." Only the first claim was actually
true. The NBME guide's wording was extracted via a third-party HTML mirror
(`readkong.com`) because the original PDF was not machine-readable with
the tooling available at the time. The original guide was therefore
**not** independently verified against its official source, and calling
it a "directly inspected primary source" was inaccurate.

**Corrected, precisely (round 4 — a second independent review found the
prior correction's own description of the two official NBME URLs was
imprecise, though its overall conclusion was right):** the two official
URLs are DIFFERENT pages with different roles, each independently fetched
and directly inspected for this correction:

- `https://www.nbme.org/institutions/nbme-item-writing-guide/` is the
  official REQUEST page. Its own visible text states: *"Request your copy
  of the NBME Item-Writing Guide today... Complete the form to receive
  your PDF download today."* It contains the actual lead-capture form.
- `https://www.nbme.org/file/nbme_item-writing-guide_r_6-pdf/` is a
  DIFFERENT URL (an attachment/media-file page, titled
  "NBME_Item Writing Guide_R_6.pdf - NBME" in its own `<title>`) that
  currently serves an HTML page shell — site navigation and generic
  content, `content-type: text/html`, not `application/pdf`
  (`poppler-utils` `pdftotext` against the fetched response reports "May
  not be a PDF file" and cannot parse it as one) — rather than the PDF its
  URL and title suggest. It does **not** itself expose the request form:
  directly inspected, its only `<form>` elements are generic site-search
  forms (`role="search"`), not a lead-capture form for this guide. Neither
  page was submitted or bypassed to obtain the PDF (no attempt was made to
  circumvent the request-form gate at the institutions page).
- The ReadKong copy remains a third-party mirror, unverified against the
  official sixth-edition PDF (which was never obtained for this
  correction, by design — see above).

**Corrected sourcing:**

1. **Primary, directly verified source: University of Illinois
   Urbana-Champaign, Center for Innovation in Teaching & Learning (CITL),
   "Improving Your Test Questions,"** section "Multiple-Choice Test Items"
   → "Suggestions For Writing Multiple-Choice Test Items" → "Item
   Alternatives." URLs (both confirmed reachable and serving the same
   content): <https://citl.illinois.edu/citl-101/measurement-evaluation/exam-scoring/improving-your-test-questions>
   and <https://citl.illinois.edu/improving-your-test-questions>.
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
   This single source directly supports both required guidance points
   (position balance and length balance) and is the basis this Gate A
   design actually relies on.
2. **Secondary, NOT independently verified: NBME (National Board of
   Medical Examiners), "Item-Writing Guide: Constructing Written Test
   Questions for the Health Sciences,"** reportedly November 2020 edition,
   Chapter 3 "Technical Item Flaws," subsection "Correct Option Stands
   Out" (reportedly page 21). The wording below is quoted from a
   third-party mirror, **not the official PDF**, and is labeled here
   exactly that way rather than as a primary source:
   *"This results when item writers likely create the correct answer
   first and then write the incorrect distractors...item writers are
   often teachers and they will construct long correct answers that
   include additional instructional material, parenthetical information,
   caveats, and so on. This flaw can be avoided by reviewing the entire
   option set for length, ensuring the level of detail is consistent
   across options, and removing language that is purely for instructional
   purposes only."* (via
   <https://www.readkong.com/page/nbme-item-writing-guide-constructing-written-test-5281377>,
   a third-party mirror that self-identifies as reproducing this guide;
   retrieved 2026-08-08, unverified against the official sixth-edition
   PDF). **Precisely, per round 4's independent re-check of both official
   URLs (see the counterexample above):** the official guide is available
   only by completing a request form at
   <https://www.nbme.org/institutions/nbme-item-writing-guide/>, which
   this correction did not submit (no attempt was made to bypass or
   circumvent that gate); the direct-download-shaped URL
   <https://www.nbme.org/file/nbme_item-writing-guide_r_6-pdf/> does not
   itself serve the PDF or expose the request form, only a generic HTML
   page shell. **This citation is retained only as unverified
   corroborating color consistent with the CITL guidance above, not as a
   basis for any threshold or rule in this document** — every numeric rule
   below is justified from CITL's guidance and this document's own
   derivation, not from the NBME text.

**CITL supplies no numerical thresholds.** Both the CITL and NBME
guidance are **qualitative** ("approximately equal," "randomly
distribute") — neither specifies exact numeric thresholds or a statistical
test. Every numeric threshold and statistical procedure in this document
(`PRACTICAL_MARGIN`, `COHENS_W_MEDIUM_EFFECT`, `SIGNIFICANCE_ALPHA`, the
exact pigeonhole rule, the sequence-pattern rules) is this document's own
**project-defined operationalization** of CITL's qualitative guidance, not
a number CITL itself supplies — justified individually in sections 4.3,
4.3b, and 4.10.

### 4.2 Candidate approaches considered

| Approach | Considered | Adopted? |
| --- | --- | --- |
| Exact 1/n uniformity requirement | Yes | **No** — unrealistic for authored content; both sources say "approximately," not "exactly" |
| Whole-bank-only balance, no per-form check | Yes | **No** — a bank could be balanced in aggregate while a specific form is skewed |
| A single statistical/asymptotic method (chi-square) at every sample size | Yes | **No — corrected.** Chi-square requires a minimum expected cell count to be valid; applying it (or any margin tuned around its assumptions) below that floor made every small course form and the 13-item pilot structurally unable to pass, contradicting Phase 0's own exit criteria. See 4.3's two-regime correction |
| p-value (statistical significance) alone | Yes | **No** — a practical/effect-size threshold remains primary; a statistical result only corroborates it |
| A fixed absolute item-count threshold | Yes | **No** — does not scale with bank size, form size, or option count |
| A flat 1/n null rate for length cueing, ignoring tie structure | Yes | **No — corrected.** A bank could key the correct answer to a tied-maximum-length option without ever being "uniquely longest," evading a check that only looks at the uniquely-longest rate. See 4.4's tie-aware correction |
| An exact, always-valid small-sample test for length cueing (Poisson-binomial) | Yes | **Yes** — valid at any N, requires no separate small/large-N split, and is exactly correct for item-specific tie probabilities (4.4) |
| A deterministic, mathematically-derived structural rule for small-N position balance | Yes | **Yes** — the "exact pigeonhole" rule, 4.3, with no free parameter to tune |
| Statistical significance alone fails the large-N regime (either practical margin OR p-value) | Yes | **No — corrected.** With enough items a trivial deviation becomes statistically detectable without being educationally meaningful; the practical margin is now the sole authoritative fail driver, with significance-alone raising a review flag instead. See 4.6a |
| A likelihood-rank/exact-enumeration statistical test over the space of balanced answer-key sequences | Yes | **No** — at N=5–13 this would claim statistical meaning from one short, static, non-repeated sample, the same problem 4.6a rejects in a different context. See 4.10 |
| Human-review-only flag for answer-key sequence patterns (no automated detection) | Yes | **No** — the target patterns (exact repeating cycles, palindromes, excessive runs) are unambiguous, mechanically checkable facts with nothing for a reviewer to adjudicate. See 4.10 |
| Deterministic structural detection (cycle/palindrome/run) for answer-key sequence patterns | Yes | **Yes** — no statistical claim made, exact at any N, and does not demand a mechanically rotating key (a rotating key is itself flagged). See 4.10 |
| Doubled-minimum-tail convention for the exact two-sided Poisson-binomial p-value | Yes | **No — corrected.** Not self-defining for an asymmetric distribution and requires post-hoc clipping to stay <= 1. See 4.4a |
| Probability-ordering convention for the exact two-sided Poisson-binomial p-value | Yes | **Yes** — well-defined for any distribution shape, the same convention underlying other asymmetric exact tests (e.g. Fisher's), precisely named as one defensible choice among several. See 4.4a |
| Single-largest-position-share as the large-N practical/effect-size measure | Yes | **No — corrected.** Examines only one cell of the distribution, so it cannot detect material underrepresentation of a different position unless it incidentally also inflates another position's share past the threshold. See 4.3b |
| Total-variation distance as the large-N distribution-wide practical measure | Yes | **No** — a reasonable alternative, but Cohen's w has an independently-sourced conventional threshold and a direct algebraic relationship to the chi-square statistic this file already computes, avoiding a second, unrelated distributional measure. See 4.3b |
| Cohen's w as the large-N distribution-wide practical/effect-size measure | Yes | **Yes** — scale-free (unlike chi-square itself), symmetric to over- and under-representation by construction, and uses Cohen's own published "medium effect" convention (0.3), not a number tuned to this bank. See 4.3b |
| A critical-value-table lookup reported in place of an actual chi-square p-value | Yes | **No — corrected.** A Boolean table comparison is not itself a p-value, and was limited to the table's own df range. See 4.6b |
| Exact chi-square p-value via the regularized incomplete gamma function | Yes | **Yes** — closed-form, not an approximation beyond the chi-square test's own well-known validity assumption, and valid at any df, not only the previously tabulated range. See 4.6b |
| Two separately written `pValue < SIGNIFICANCE_ALPHA` comparisons (position balance, length association) | Yes | **No — corrected (round 6).** Identical in effect but two separate expressions that could silently diverge under a future edit to only one. See 4.6c |
| A single shared `isStatisticallySignificant(pValue, alpha)` comparator, strict `<` | Yes | **Yes** — the SINGLE production comparison path both functions call; `pValue === alpha` does not reject, tested directly with explicit p-values, not only statistic-derived fixtures. See 4.6c |
| An unnormalized illustrative distribution to justify the w=0.30 threshold | Yes | **No — corrected.** `[0.40,0.25,0.25,0.25]` sums to 1.15, not a valid distribution; the claimed algebraic equivalence to the prior margin rule was false. See 4.3b |
| Cohen's own directly-quoted m=4 illustrative examples to justify w=0.30 | Yes | **Yes, with the printed values and the computational fixtures kept distinct (round 6).** Cohen's own printed "concentrated" H1 sums to 1.001, not 1 — retained verbatim as `h1Published`, never called "genuinely normalized"; a separately, explicitly rescaled `h1` (sums to exactly 1) is used for computation. Every `h1` independently verified to reproduce Cohen's own stated w. The threshold remains an adopted operational convention, not a uniquely correct or item-validity result, and Cohen's rounded illustration is not claimed to prove it. See 4.3b |
| Reporting an aggregate practical-effect decision with no per-position explanation | Yes | **No — corrected.** A Cohen's-w failure with every cell inside the per-cell diagnostic margin left the report unable to say which position(s) drove it. See 4.3d |
| Full directional/contribution reporting per position, plus majority-contribution "primary contributors" | Yes | **Yes** — explains every aggregate failure by position and direction without inventing an arbitrary "top N," and keeps the per-cell diagnostic flag conceptually separate from the aggregate decision. See 4.3d |
| Trusting caller-supplied aggregate/probability summaries without validation | Yes | **No — corrected.** A malformed positionCounts array or an out-of-range probability could reach formulas that assume valid input, producing silently wrong results. See 4.3c |
| One reusable validation function per input shape, rejecting malformed input with a descriptive error | Yes | **Yes** — the same discipline `assertValidQuestionShape()` already applies to question objects, applied consistently to every aggregate/probability entry point. See 4.3c |
| Sign-only domain checks (`<= 0`/`< 0`) as a complete numeric-input guard | Yes | **No — corrected (round 6).** Silently `false` for `NaN` and does not exclude `Infinity`; `chiSquareUpperTailPValue(NaN, 3)`, `cohensW(1, Infinity)`, and others returned a silently wrong number instead of throwing. See 4.3f |
| A shared `assertFiniteNumber()` guard plus cross-field consistency checks for length-association items | Yes | **Yes** — every numeric argument to `chiSquareUpperTailPValue()`/`cohensW()`/`upperRegularizedIncompleteGamma()` must be finite (`df` additionally an integer), `assertValidObservedIndex()` validates `N` as well as `observed`, and `assertValidLengthAssociationItem()` rejects the two internally-impossible `nullProbabilityCorrectAtMax` cases. See 4.3f |

### 4.3 Adopted rules — position balance (corrected: a two-regime model with one shared threshold)

**Counterexample reproduced (the central defect this correction fixes):**
the original design used `N >= 5n` as the floor for treating a scope as
anything other than `inconclusive` (below it, position balance could only
ever report `fail` or `inconclusive`, never `pass`). Confirmed directly: a
synthetic, perfectly balanced 5-item, 4-option form (`positionCounts:
[2,1,1,1]`) reported `inconclusive`, not `pass`, under the prior design —
and every real course form has 5–9 items, and the 13-item pilot has 13.
**No real course form or the pilot batch could ever pass Gate A under the
prior design, regardless of how well-authored it was.** This directly
contradicted `docs/LEARNING_PLATFORM_ROADMAP.md` Phase 0's own exit
criteria, which require these scopes to be able to pass.

**Corrected model: two regimes, chosen by the identical threshold value
everywhere** (eliminating any possibility of the regime-selection
condition and the statistical-computability condition disagreeing, which
was itself a separate defect — section 4.3's boundary correction below):

```
REGIME_THRESHOLD(n) = CHI_SQUARE_MIN_EXPECTED_PER_CELL * n   (= 5n)
```

**Small-N structural regime, `N < REGIME_THRESHOLD(n)`:** a fully
deterministic, always-achievable rule, computed with **no statistical test
attempted at all** (not "attempted but suppressed" — genuinely not needed):

> **Exact pigeonhole balance.** The most evenly N items can possibly be
> divided across n positions gives every position a count of either
> `floor(N/n)` or `ceil(N/n)` — no allocation can do better. A scope is
> *structurally balanced* exactly when every position's observed count is
> one of those two values.

This has **no free or tunable parameter** — it is fully derived from N
and n, never fit to make any particular bank pass. It is always achievable
by an author who deliberately rotates the correct-answer position across a
small quiz. Directly verified for every size this correction requires —
**this table exercises `evaluatePositionBalance()` in isolation, i.e. the
POSITION-ONLY result; section 4.3a below independently proves the
COMPLETE, COMBINED `evaluateGateA()` (position, length, and sequence
together) also reaches `pass` for a full, realistic question form at
every one of these sizes, which this table alone does not show**:

| N (4-option) | Balanced example (position only) | Result | Imbalanced example | Result |
| ---: | --- | --- | --- | --- |
| 5 | `[2,1,1,1]` | **pass** | `[5,0,0,0]` | **fail** |
| 6 | `[2,2,1,1]` | **pass** | `[6,0,0,0]` | **fail** |
| 7 | `[2,2,2,1]` | **pass** | `[7,0,0,0]` | **fail** |
| 8 | `[2,2,2,2]` | **pass** | `[8,0,0,0]` | **fail** |
| 9 | `[3,2,2,2]` | **pass** | `[9,0,0,0]` | **fail** |
| 13 (pilot size) | `[4,3,3,3]` | **pass** | `[13,0,0,0]` | **fail** |

### 4.3a Complete Gate A achievability, not position balance alone (added — a second independent review found a coverage gap, not an implementation defect)

**Coverage mismatch reproduced and recorded, distinctly from an
implementation defect:** section 4.3's table above, and the corresponding
test-file size loop it was drawn from, called `evaluatePositionBalance()`
directly. Neither ever constructed a full question form and asserted
`evaluateGateA(...).overall === "pass"`, including the tie-aware length
component and (after this same correction round) the new sequence check.
The underlying implementation was independently confirmed, by direct
construction, to already support a full-Gate pass at every required size —
this was a **test- and documentation-coverage gap**, not a bug in
`evaluateGateA()` itself, and is recorded and closed as such rather than
conflated with a design defect.

**Fixture discipline, to rule out a merely coincidental pass:** an initial
naive construction (rotating which physical option slot held the longest
text using the SAME modulus as the position rotation) accidentally
produced a genuine, undetected length cue — the "pass" was a coincidence
of the construction, not evidence of a truly non-cued form. The corrected
fixture (`buildIndependentItem()` /
`tests/assessment-cue-audit.mjs`) gives **independent, decoupled control**
over (a) which slot is correct, for position, and (b) whether that slot is
also the item's own length-max slot, for length — using a
multiplicative-hash selector for (b) so it is not a simple function of (a)
— verified directly to land close to the tie-aware expected rate rather
than assumed. A second, distinct construction issue was found the same
way: the initially-used "balanced" position order was a plain `i % n`
rotation, which is itself an exact repeating cycle — see section 4.10 —
so it would have been flagged as a sequence failure by this same
correction's own new check. The final fixtures use a hand-verified,
balanced, non-cyclic, non-palindromic, run-free order for each required
size instead (`BALANCED_NONCYCLIC_ORDERS`,
`tests/assessment-cue-audit.mjs`).

Directly verified, for every required size, with three independently
constructed forms per size — full detail and the exact orders used are in
`tests/assessment-cue-audit.mjs` section 12:

| N (4-option) | Fully independent, balanced, non-cyclic, non-cued form | Position-only perturbation (length/sequence held fixed) | Length-only perturbation (position/sequence held fixed) |
| ---: | --- | --- | --- |
| 5 | **overall: pass** (position pass, length pass, sequence pass) | **overall: fail** (position fail; length pass; sequence pass) | **overall: fail** (length fail; position pass; sequence pass) |
| 6 | **pass** | **fail** (position) | **fail** (length) |
| 7 | **pass** | **fail** (position) | **fail** (length) |
| 8 | **pass** | **fail** (position) | **fail** (length) |
| 9 | **pass** | **fail** (position) | **fail** (length) |
| 13 (pilot size) | **pass** | **fail** (position) | **fail** (length) |

Each perturbation changes exactly one property while leaving the other two
unaffected (confirmed directly in the perturbed result, not assumed from
the construction alone) — isolating which component drove a given `fail`,
and confirming no component silently reports `inconclusive` in any of
these eighteen forms. A separate mixed 2-/3-/4-option scope, with enough
items in every group to leave the small-N structural regime unambiguous
(`n*2+1` items per group), also reaches a complete `pass` with none of its
three option-count groups, nor the length or sequence check, inconclusive.

Every documentation and PR claim that "Gate A passes" for a given size is
now stated precisely as either the full, combined result (as this section
proves) or explicitly labeled a position-only result (section 4.3's
table) — the two are never used interchangeably.

**Large-N statistical regime, `N >= REGIME_THRESHOLD(n)`:** a
distribution-wide practical effect size (Cohen's w, corrected in round 4
— section 4.3b) as the primary, authoritative check, and chi-square
goodness-of-fit (α=0.01, its p-value corrected in round 4 — section 4.6b)
as corroboration, **always computable in this branch by construction**
(`N >= REGIME_THRESHOLD(n)` guarantees every expected cell count
`N/n >= CHI_SQUARE_MIN_EXPECTED_PER_CELL`).

**Precise, justified meaning of "inconclusive":** now reserved for exactly
one case — `N < n` (fewer items than there are answer positions, too few
to say anything at all). For any `N >= n`, the scope always receives a
definitive `pass` or `fail`, via whichever regime applies. Inconclusive is
no longer the unavoidable result for a small, valid, well-authored
assessment.

### 4.3b Distribution-wide practical effect size (added — a second independent review found the practical decision examined only the largest position)

**Counterexample reproduced:** the large-N practical decision (immediately
above, before this correction) examined only the SINGLE LARGEST position's
share against `1/n + PRACTICAL_MARGIN` — it never evaluated the complete
distribution, so it could not detect material UNDERrepresentation (a
position receiving zero or very few correct answers) unless that same
imbalance happened to also push some OTHER position's share over the
max-share threshold. Confirmed directly, at `N=20`, `n=4` (exactly
`REGIME_THRESHOLD(4)`, the smallest N in this regime): position
distributions `[7,7,6,0]`, `[8,6,6,0]`, and `[8,8,4,0]` — every one
leaving position D with **zero** correct answers — all reported `pass`
under the prior rule, since no individual share exceeded 40%. A complete,
independently constructed full-Gate fixture using `[7,7,6,0]`, genuinely
non-cued option lengths, and a hand-verified non-patterned answer
sequence confirmed the same gap at the whole-gate level: `overall: pass`,
despite position D never being correct.

**Corrected measure: Cohen's w**, the standard multinomial/chi-square
effect size: `w = sqrt(chiSquare / N)`. Compared against the alternatives
before selecting it:

- **Symmetric per-position deviations, reported but not decision-driving:**
  retained as `positionDeviations`/`materialDeviations` in the detail
  object (section 4.3d) — genuinely useful for reporting WHICH positions
  and in WHICH direction, but not, by itself, a single aggregate decision
  measure a fixed threshold can be compared against.
- **Total-variation distance:** considered; rejected in favor of Cohen's w
  because w has an established, independently-sourced (not
  self-invented) conventional threshold (below) and a direct algebraic
  relationship to the chi-square statistic this file already computes for
  corroboration, avoiding introducing a second, unrelated distributional
  measure.
- **Cohen's w (adopted):** unlike the raw chi-square statistic (which
  grows with N and is therefore a SIGNIFICANCE measure, not a practical
  one), w is scale-free — it measures the magnitude of the deviation
  pattern across the WHOLE distribution, independent of sample size, so a
  single fixed threshold is meaningful at every N in this regime. It is
  symmetric to over- AND under-representation by construction, since it
  is derived from the same squared-deviation sum every position
  contributes to.

**Source, directly inspected (round 5 correction — the prior version of
this section made an invalid claim; see the counterexample below):**

> Jacob Cohen, *Statistical Power Analysis for the Behavioral Sciences*,
> 2nd edition, Lawrence Erlbaum Associates, Publishers, 1988. Chapter 7
> "Chi-Square Tests for Goodness of Fit and Contingency Tables," section
> 7.2.3 "'Small,' 'Medium,' and 'Large' w Values," printed pages 224–227.
> Directly inspected via the publicly hosted scan at
> <https://utstat.utoronto.ca/brunner/oldclass/378f16/readings/CohenPower.pdf>,
> verified 2026-08-08 against the title page (confirms 2nd edition, same
> publisher) and section 7.2.3's own printed text. Official publisher
> metadata for the same 2nd edition, confirming title/author/year, is also
> available at
> <https://www.taylorfrancis.com/books/mono/10.4324/9780203771587/statistical-power-analysis-behavioral-sciences-jacob-cohen>.

**Counterexample reproduced (round 5 — the claimed algebraic justification
for w=0.3 was itself mathematically impossible):** an earlier version of
this document, and the corresponding source code comment, justified
adopting `w = 0.3` by claiming it was algebraically equivalent to the
prior single-cell margin rule at its boundary — illustrated with a
four-category distribution `[0.40, 0.25, 0.25, 0.25]`. **That distribution
sums to 1.15, not 1 — it is not a valid probability distribution, and the
claimed equivalence is false.** Confirmed directly:
`0.40 + 0.25 + 0.25 + 0.25 = 1.15` (`tests/assessment-cue-audit.mjs`).

**Corrected justification, using Cohen's own directly-quoted example**
(page 226, verbatim): for `m = 4` (four categories), Cohen gives
`H0 = .250 .250 .250 .250` (equiprobable) and
`H1 = .380 .207 .207 .207`, describing it as *"a w = .30 departure from
equiprobability in which the effect is concentrated in the first
category, the remainder being equiprobable."* Cohen also gives an
equally-spaced `m = 4` medium-effect `H1` on page 225: `.149 .216 .284
.351` (sums to exactly 1.000).

**Counterexample reproduced (round 6 — the "concentrated" example was
itself mislabeled "genuinely normalized"):** `.380 + .207 + .207 + .207 =
1.001`, not 1 — an earlier version of this section, the corresponding
source comment, and a test named to claim an exact proof called this
distribution "IS valid" and "rounds to 1," and the test's own assertion
only checked the sum was within `0.002` of 1 while its name claimed an
exact proof. `1.001` is ordinary 3-decimal publication rounding (Cohen
prints `w` to 2 decimals and each `Hi` to 3) — a real, honest fact about
the source, not a defect in the source, but distinct from a literal
normalization proof, and the two were conflated.

**Correction:** Cohen's printed values are retained **verbatim**, as
`h1Published` in `COHENS_M4_ILLUSTRATIVE_EXAMPLES` — never claimed to sum
to exactly 1. A separate, genuinely normalized `h1` (`h1Published`
rescaled by its own sum, `scripts/assessment-cue-audit.mjs`, transformation
applied in code, not hand-typed) is used wherever this file needs an exact
probability distribution for computation or testing. Both are directly
transcribed/derived as `COHENS_M4_ILLUSTRATIVE_EXAMPLES`, alongside
Cohen's own small (`w=.10`) and large (`w=.50`) `m=4` illustrations (whose
printed values already sum to exactly 1.000 and need no split). A
dedicated test independently verifies every `h1` (the genuinely normalized
fixture, not `h1Published`) sums to exactly 1 within floating-point
tolerance (`1e-9`, not the prior `0.002`) and reproduces Cohen's own
stated `w` value via this file's own formula; a separate test verifies
`h1Published` honestly sums to `1.001`, not 1, and is never claimed
otherwise. This does not make Cohen's rounded illustration "prove" this
project's `w=0.30` threshold uniquely correct — see the ADOPTED, NOT
UNIQUELY CORRECT paragraph below, unaffected by this correction.

**Threshold: `COHENS_W_MEDIUM_EFFECT = 0.3`, ADOPTED, not uniquely
correct.** Cohen's own words (page 224) are explicit that his
small/medium/large conventions are offered *"to serve as conventions for
these qualitative adjectives,"* that their use *"requires particular
caution,"* and that *"the investigator is best advised to use the
conventional definitions as a general frame of reference for ES and not
to take them too literally."* This project **adopts** `w = 0.30` —
Cohen's own conventional "medium effect" reference point — as a
deliberately **conservative, project-defined operational release gate**
for Gate A's large-N regime. This is explicitly **not** a claim that 0.30
is the uniquely correct threshold, **not** an item-validity result, and
**not** mathematically equivalent to the prior single-cell margin rule it
replaced (the counterexample this section fixes is a direct
demonstration that no such equivalence holds).

**Limitations and false-positive/false-negative risk, stated honestly:**
a fixed `w` threshold does not itself indicate WHICH position(s) or in
WHICH direction a distribution deviates — section 4.3d exists to close
exactly that gap. At very large N, a `w` just under 0.30 can still be
statistically significant, an intentional, separately-handled case
(section 4.6a's review-flag policy, unaffected by this correction). Cohen
himself notes `w`'s relationship to other association measures (Cramér's
`C`, `phi`) varies with table size, so a "medium" effect by this
convention is not directly comparable across differently-shaped
contingency tables (page 227).

**Verified for `[7,7,6,0]`, `[8,6,6,0]`, `[8,8,4,0]`:** Cohen's w = 0.583,
0.600, and 0.663 respectively — all a **large** effect by Cohen's own
convention (>= 0.5), now correctly failing. **Verified balanced N=20
distributions still pass comfortably:** `[5,5,5,5]` gives `w=0`;
`[6,5,5,4]` gives `w=0.141`, both well under the 0.3 threshold.
**Verified for 2- and 3-option forms** at their own `REGIME_THRESHOLD(n)`,
not only n=4. (The regime-transition behavior at the N=5n boundary —
including a genuine, accepted, limited discontinuity this correction also
found — is addressed precisely in section 4.3a's amended claim, not
overstated here.)

**Policy preserved:** statistical significance alone still does not
automatically fail an educationally trivial deviation — section 4.6a's
policy (practical effect authoritative, significance-alone raises a
review flag) is unchanged by this correction; only what counts as "the
practical effect," and how that effect is justified as a threshold
choice, was corrected.

### 4.3c Malformed aggregate/probability input rejection (added — a second independent review found the aggregate helpers trusted caller-supplied summaries)

**Counterexamples reproduced:** the exported aggregate helpers previously
trusted caller-supplied summaries without validating them. Confirmed
directly:

- `exactPigeonholeBalance([2,1,1], 4, 5)` — an array with only 3 entries
  for 4 answer positions, summing to 4 rather than `N=5` — reported
  `balanced: true`.
- `poissonBinomialPMF([1.5, 0.5])` — an invalid probability (`1.5 > 1`) —
  produced a **negative** probability mass, `pmf[0] = -0.25`.
- `poissonBinomialTwoSidedPValue([0.5, 0.5], -1)` — an out-of-range
  observed index — silently returned `0` instead of throwing.
- A round-4 test fixture, `[16.8, 8, 7.6, 7.6]`, used fractional
  "counts," even though real authored-question tallies are always
  nonnegative integers.

**Correction:** one reusable validation path per input shape (not
duplicated formulas), the same discipline `assertValidQuestionShape()`
already applies to question objects:

- `assertValidPositionCounts(positionCounts, optionCount, N)` — used by
  both `exactPigeonholeBalance()` and `evaluatePositionBalance()`:
  `optionCount` an integer >= 2, `N` a positive integer, `positionCounts`
  exactly `optionCount` entries, every entry a finite nonnegative integer,
  and the entries summing exactly to `N`.
- `assertValidProbabilities(probabilities)` — used by both
  `poissonBinomialPMF()` and `poissonBinomialTwoSidedPValue()`: a
  nonempty array of finite numbers in `[0,1]`.
- `assertValidObservedIndex(observed, N)` — used by
  `poissonBinomialTwoSidedPValue()`: an integer in `[0, N]`.
- `assertValidLengthAssociationItem(item, index)` — used by
  `evaluateLengthAssociation()`: `correctAtMax` a boolean,
  `nullProbabilityCorrectAtMax` a finite number in `[0,1]` — exactly the
  two fields that function actually reads, so a manually constructed
  (not `classifyCue()`-derived) test item with a malformed field cannot
  silently produce a misleading pass.

Every malformed case above now throws a descriptive `TypeError` instead
of returning a pass, fail, or misleading numeric result. Round 4's
fractional-count fixture is replaced with a valid integer fixture
(`N=20`, `n=4`, `[8,4,4,4]`, `w ≈ 0.346`) that tests the identical policy
(a meaningful effect fails even when statistically underpowered) without
an impossible input. Verified directly: every valid fixture used
elsewhere in this file's own tests (including the full live 153-question
bank) passes validation without throwing — this correction rejects only
genuinely malformed input, and does not change any normal live-bank
result.

### 4.3d Directionally explainable distribution-wide failures (added — a second independent review found aggregate failures could be unexplained)

**Counterexample reproduced:** `N=100`, `n=4`, `positionCounts=[38,24,19,19]`
— `chiSquare = 9.68`, Cohen's `w = sqrt(9.68/100) ≈ 0.3111`, correctly
**failing** the `w >= 0.30` threshold. However, every individual share
(38%, 24%, 19%, 19%) falls inside the separately retained per-cell
diagnostic interval `[10%, 40%]`, so the prior report's
`materialDeviations` was **empty** and every cell was labeled only
`"within-margin"` — the report declared a distribution-wide practical
failure with **no explanation of which position(s) or direction(s) drove
it**. This also risked implying Cohen's `w` itself has a direction; it
does not — it is a nonnegative magnitude.

**Correction:** every position now reports its full diagnostic record in
`evaluatePositionBalance()`'s `positionDeviations`:

| Field | Meaning |
| --- | --- |
| `position` | the answer-position index |
| `observedCount`, `observedProportion` | this position's actual count/share |
| `expectedCount`, `expectedProportion` | the uniform-chance count/share |
| `countDeviation`, `proportionDeviation` | SIGNED deviation (observed − expected) |
| `direction` | `"above"`, `"below"`, or `"equal"` — derived purely from the sign of `proportionDeviation`, never conflated with the separate diagnostic-margin flag |
| `chiSquareContribution` | this position's own `(observed − expected)² / expected` term — its share of the aggregate effect |
| `exceedsDiagnosticMargin` | the renamed former "material deviation" concept — an explicitly **diagnostic-only** per-cell flag (reusing the existing `PRACTICAL_MARGIN`), never the decision rule |

`materialDeviations` is the filtered subset with `exceedsDiagnosticMargin: true`
(kept, accurately re-scoped as a per-cell diagnostic list, not the
aggregate decision). A new `primaryContributors` field identifies the
position(s) responsible for the aggregate effect regardless of whether
any individual cell exceeds the diagnostic margin: positions sorted by
`chiSquareContribution` descending, accumulated until a **strict
majority** (`> 50%`, not `>= 50%`) of the total chi-square is accounted
for — a non-arbitrary criterion ("the position(s) responsible for most of
the effect") that adapts to option count rather than an invented fixed
"top N." `primaryContributorsCumulativeContribution` and
`primaryContributorsCumulativeShare` report the exact accumulated total
and its fraction of `chiSquare` explicitly.

**Counterexample reproduced (round 6 — exactly 50% was called "the
majority"):** an earlier version of this accumulation stopped as soon as
`cumulativeContribution >= chiSquare / 2` — so a position (or set of
positions) accounting for **exactly** half the total chi-square, not a
majority, was reported and described in prose as "the majority of the
effect." Confirmed directly: `N=20`, `n=4`, `positionCounts=[6,3,3,8]` —
position 3 alone contributes `chiSquareContribution=1.8`, exactly half of
`chiSquare=3.6`; the old `>=` stopped there. The same fixture also exposed
a second, independent gap once the threshold was corrected to strict `>`:
positions 1 and 2 are exactly tied at `chiSquareContribution=0.8`, and the
strict threshold is crossed while consuming that tied pair — stopping
after only one of two tied positions is an arbitrary pick among equals
(array sort order, not a principled distinction).

**Correction:** the accumulation now requires `cumulativeContribution >
chiSquare / 2` (strict) to stop, and once that threshold is crossed, every
immediately-following position still tied at the exact same
`chiSquareContribution` as the position that just crossed it is included
too, never silently dropped. For the `[6,3,3,8]` fixture, the final
`primaryContributors` is positions `{3, 1, 2}` — cumulative `3.4`, `94.4%`
of the total, a genuine strict majority — rather than position 3 alone at
exactly `50%`.

**When Cohen's w fails, the human-readable reason names the dominant
contributor(s) and their direction(s)** even when no individual cell
exceeds the diagnostic margin — verified directly for the `[38,24,19,19]`
counterexample: `primaryContributors` identifies position 0 alone
(69.8% of the total chi-square, `direction: "above"`), and the reported
reason text names it explicitly. The aggregate effect decision (Cohen's
w) and the per-cell diagnostic status remain conceptually and
structurally separate — a distribution can fail the aggregate check with
zero per-cell diagnostic violations (the counterexample above), or
exhibit both simultaneously (verified: `N=20`, `[8,8,4,0]`), and the
report distinguishes the two cases explicitly rather than conflating
them. Verified equivalently for 2- and 3-option groups, not only 4-option,
and confirmed byte-identical deterministic JSON output with the full
schema present.

### 4.3e The N=5n regime-transition boundary: a narrowed, accurate claim (corrected — a second independent review found the "no easier to pass" claim was overstated)

**Counterexample reproduced (a genuine, accepted, limited discontinuity,
not a defect):** an earlier version of this document (and its
corresponding test) claimed the regime transition at `N = REGIME_THRESHOLD(n)`
"does not make a conspicuously worse distribution easier to pass,"
verified only against SEVERE, comparable-shape (zero-position) omissions
at `N=19/20/21`. That claim does not generalize to every possible
distribution. Confirmed directly, `n=4`:

- `N=19`, `positionCounts=[6,5,4,4]` — the small-N structural regime's
  exact pigeonhole rule (`floor=4`, `ceil=5`) rejects it: `6 > ceil`,
  **fail**.
- `N=20`, `positionCounts=[7,5,4,4]` — the large-N statistical regime's
  Cohen's-w rule (`w ≈ 0.245`, below the `0.30` threshold) **passes** it —
  despite a **larger** raw maximum count (`7 > 6`) than the N=19 example
  that failed.

**This is an intentional, accepted consequence of using two DIFFERENT
standards by design, not a bug to patch with an arbitrary extra
threshold** (no threshold was added or tuned to force this specific
example to fail — doing so would itself violate this document's own
"no free/tunable parameter fit to a specific case" requirement, section
4.2):

- The **small-N structural regime** demands an EXACT, near-perfect
  authoring allocation (every position within one of `floor(N/n)`/
  `ceil(N/n)`) — appropriate when there are few items and few
  opportunities to demonstrate balance, so the bar is maximally strict
  and mechanically achievable by deliberate rotation.
- The **large-N statistical regime** tolerates a genuinely small,
  practically trivial deviation from perfect uniformity (Cohen's w below
  the adopted medium-effect threshold) — appropriate once there is enough
  data that ordinary authoring variation, not a real cueing pattern,
  can plausibly explain a modest imbalance.

**The regime transition is therefore NOT globally monotonic in raw
count terms** — a distribution that would fail the small-N regime's exact
allocation rule can, at a slightly larger N, pass the large-N regime's
effect-size rule, because the two regimes are answering genuinely
different questions ("is this the best achievable allocation" vs. "is
this deviation practically meaningful"), not applying the same standard
at different sample sizes.

**The verified N=19/20/21 "fails at every one of these sizes" result
(section 4.3b) applies specifically to SEVERE, comparable-shape
(zero-position) omissions** — the maximally extreme case, which fails
under both regimes' own standards independently. It is not, and this
correction no longer claims it to be, evidence of universal monotonicity
across every possible distribution. Both the severe-omission result and
the genuine discontinuity above are independently verified in
`tests/assessment-cue-audit.mjs`, side by side, so neither claim can
silently overwrite the other. Valid integer fixtures at `N=19`, `20`, and
`21` are verified for both severe (all fail) and near-balanced (all pass)
shapes.

**Achievable complete-Gate passes for 5-, 6-, 7-, 8-, 9-, and 13-item
forms (section 4.3a) are unaffected by this correction** — all fall below
`REGIME_THRESHOLD(4)=20` and use the small-N structural regime exclusively.

### 4.3f Complete malformed-input rejection (added — a second independent review found several impossible inputs still reached public helpers)

**Counterexamples reproduced:** section 4.3c's validation (`optionCount`,
`N`, `positionCounts`, probability-array checks) covered aggregate
INPUT-SHAPE malformation, but several individually impossible numeric
inputs and one internally-inconsistent field combination could still
reach public helpers or `evaluateLengthAssociation()` without error.
Confirmed directly, before this correction:

- `chiSquareUpperTailPValue(NaN, 3)`, `chiSquareUpperTailPValue(Infinity, 3)`,
  `chiSquareUpperTailPValue(5, NaN)` — each silently returned `NaN`. The
  prior domain checks (`df <= 0`, `chiSquareStat < 0`) are silently
  `false` for `NaN` (every comparison against `NaN` is `false`) and do not
  exclude `Infinity`.
- `chiSquareUpperTailPValue(5, 2.5)` — a non-integer `df` — silently
  computed `0.12308857115265875` instead of throwing, even though this
  audit's `df` is always `optionCount - 1`, an integer; a fractional `df`
  here can only mean a caller bug.
- `cohensW(NaN, 100)` silently returned `NaN`; `cohensW(1, Infinity)`
  silently returned `0` — a misleadingly finite, plausible-looking result
  for an impossible input (`sqrt(1/Infinity)`).
- `upperRegularizedIncompleteGamma(1, NaN)` and `upperRegularizedIncompleteGamma(NaN, 1)`
  each silently returned `NaN`.
- `assertValidObservedIndex(1, NaN)` silently returned (did not throw):
  it validated only `observed`, never `N` — `observed > N` is `false`
  whenever `N` is `NaN`.
- A length-association item with `nullProbabilityCorrectAtMax: 0` was
  silently accepted — impossible for any real item, since an item's own
  longest option is always tied with itself, so the true null probability
  `tiedAtMax / optionCount` is always `> 0`.
- A length-association item with `nullProbabilityCorrectAtMax: 1` and
  `correctAtMax: false` was silently accepted — an internally impossible
  combination: probability 1 means every option, including the correct
  one, is tied for max length, so `correctAtMax` must be `true`.

**Correction:** a single shared `assertFiniteNumber(value, description)`
guard, used by `upperRegularizedIncompleteGamma()`, `chiSquareUpperTailPValue()`,
and `cohensW()`, replaces the duplicated sign-only checks — every numeric
argument to these three functions must now be a finite number, or a
descriptive `RangeError` is thrown naming the actual parameter (verified
directly: the thrown error names `chiSquareUpperTailPValue`'s own
`chiSquareStat`/`df`, not merely an internal helper's unrelated `a`/`x`,
so a caller sees which of their own arguments was invalid).
`chiSquareUpperTailPValue()` additionally requires `df` to be an integer.
`assertValidObservedIndex()` now validates `N` is itself a finite
nonnegative integer before validating `observed` against it.
`assertValidLengthAssociationItem()` now rejects
`nullProbabilityCorrectAtMax === 0` and the combination
`nullProbabilityCorrectAtMax === 1` with `correctAtMax === false`, while
continuing to accept the valid degenerate all-tied case
(`nullProbabilityCorrectAtMax: 1`, `correctAtMax: true`).

**Verified:** every valid fixture used elsewhere in this file's own tests
(including the full live 153-question bank) continues to pass validation
without throwing — this correction rejects only genuinely impossible
input, and changes no normal live-bank result.

### 4.4 Length association (corrected — tie-aware, not a flat 1/n on the uniquely-longest rate alone)

**Counterexample reproduced (the evasion the prior design missed):**
constructed directly — a 50-item synthetic bank where 20% of items have
the correct answer genuinely and uniquely longest (a normal-looking rate,
close to the prior model's flat 25% expectation) and the remaining 80%
have a 2-way tie for the longest option, with the correct answer *always*
one of the two tied-maximum options. Under the prior design (which
compared only the uniquely-longest count, 20% here, against a flat 25%
expectation ± 15% margin): **this bank incorrectly PASSED** — 20% falls
inside `[10%, 40%]`. But the correct answer was in the maximum-length set
in 100% of items, an obvious, severe length cue the prior check never
examined, because it never looked at `longestOrTiedCorrect` at the
gate-decision level at all.

**Corrected null model, per item.** For item *i* with `n_i` options and
`k_i` options tied for that item's maximum length: under the hypothesis
that which option is correct is independent of option length, each of the
`n_i` options is equally likely to be correct, so
`P(correct falls in the k_i-member maximum-length set) = k_i / n_i` — an
item-specific probability, not a flat `1/n`. (When `k_i = n_i`, i.e. every
option is tied, `P = 1`: with no length variation at all, length carries
no information, correctly assigning that item zero evidentiary weight
either way — verified directly.)

Aggregating a scope of items with **different** per-item probabilities is
a **Poisson-binomial** distribution (the sum of independent Bernoulli
trials with different success probabilities) — not a single binomial,
which would require one shared probability. `poissonBinomialPMF()`
computes the exact probability mass function via dynamic programming
(`O(N^2)`, numerically stable — probability mass is redistributed at each
step, never accumulated as a long product of small numbers), and
`poissonBinomialTwoSidedPValue()` derives an exact two-sided p-value from
it. This method is **exact and valid at any N >= 1** — unlike chi-square,
it requires no large-sample approximation, so **no separate small-N/
large-N regime or "not computed" state is needed for this check.**

**Decision rule** (`evaluateLengthAssociation()`), symmetric, both
directions, and see section 4.6a for exactly how the two parts below
combine (corrected there — the practical margin is now the sole
authoritative fail driver; see 4.6a for why):

- **Practical/effect-size margin (authoritative):** observed rate `X/N`
  (`X` = count of items where the correct answer is in *its own* maximum
  set — this is exactly `longestOrTiedCorrect`) compared against the
  tie-aware expected rate `μ/N` (`μ` = sum of every item's own `k_i/n_i`),
  with the same `PRACTICAL_MARGIN = 0.15`. Fails if the observed rate
  exceeds `expected + margin` **or** falls below `expected - margin`.
- **Exact statistical corroboration:** the two-sided Poisson-binomial
  p-value (section 4.4a for exactly which "two-sided" convention and why),
  significant if `< α = 0.01` — corroborates a practical-margin failure,
  or raises a standalone review flag if significant without one (4.6a).

**Symmetric treatment, and why:** a rate significantly *below* the
tie-aware null (the correct answer disproportionately *avoids* the
maximum-length set) is exactly as usable a cue ("never pick the longest
option") as a rate significantly above it, so both directions are treated
identically. This is a general defense against length-based cueing in
either direction, not solely a defense against the specific QL-033
above-expectation pattern.

**Retained, informational-only diagnostic:** the plain uniquely-longest
count/rate (`uniquelyLongestDiagnostic` in the CLI report) is still
computed and reported, exactly as before, so a reviewer can see it — but
it no longer drives the pass/fail decision by itself; the tie-aware
max-length-set test above does.

**Mixed option-count scopes (corrected — see 4.5): this test needs no
grouping by option count at all**, since each item's null probability is
computed from its own `k_i`/`n_i` regardless of how many options other
items in the same scope have.

**This is a statistical association test only.** It never claims to prove
any item's scientific validity, and it never claims to fix a distractor —
see Gate B (section 5) for the required human review of any specific
flagged item or pattern.

### 4.4a Exact two-sided p-value convention (added — a second independent review found the convention was unnamed and not the only defensible one)

**Issue identified:** `poissonBinomialTwoSidedPValue()` previously (before
this correction) computed `2 * min(P(X<=observed), P(X>=observed))`,
clipped to 1 — the **doubled-minimum-tail** convention. "Exact two-sided
p-value" is not self-defining for an **asymmetric** discrete distribution
(this Poisson-binomial generally is asymmetric, since per-item null
probabilities differ item to item), so more than one convention is
defensible, and the prior text did not name which one was in use or
acknowledge the alternative.

**Corrected convention: probability-ordering** (also called
"minimum-likelihood" or "outcome-ranking"): the sum of `P(k)` over every
possible outcome `k` whose probability is no greater than the observed
outcome's own probability (a small relative epsilon guards only against
excluding the observed outcome itself due to floating-point rounding).
Chosen over the doubled-minimum-tail convention, and named precisely
rather than left implicit, because:

- It directly answers "how surprising is this outcome" by summing every
  outcome at least as surprising as (no more likely than) the one
  observed — well-defined for any distribution shape, with no post-hoc
  clipping needed to stay `<= 1` (the doubled-tail convention needs
  exactly that clipping, itself a sign it does not directly answer the
  same question for a skewed distribution).
- It is the same convention underlying the standard two-sided exact test
  for other asymmetric discrete distributions (e.g. Fisher's exact test),
  not a bespoke choice invented for this file.
- For a symmetric probability vector the two conventions coincide exactly
  at the distribution's mode and are close elsewhere, but diverge
  substantially away from the mode for a genuinely asymmetric one.

**Verified by independent, hand-computed fixtures** (not derived by
calling the implementation under test — `tests/assessment-cue-audit.mjs`
section 12c): for probabilities `[0.9, 0.5, 0.5]`, hand-derived
`pmf = [0.025, 0.275, 0.475, 0.225]`; the probability-ordering p-values
`[0.025, 0.525, 1.0, 0.25]` for observed `= 0, 1, 2, 3` respectively
**differ** from the doubled-minimum-tail values `[0.05, 0.6, 1.0, 0.45]`
at every non-modal outcome, and coincide only at the mode (`observed=2`,
where both give exactly 1). Boundary probabilities (`p=0`, `p=1` for a
single item) and a fully degenerate all-tied case
(`probabilities = [1,1,1,1,1]`) are also independently hand-verified.

**This is a deliberate, precisely-named choice among multiple valid exact
two-sided conventions — it is not claimed to be the only possible one.**
The `method` field in `evaluateLengthAssociation()`'s detail object is
named accordingly: `"exact-poisson-binomial-two-sided-probability-ordering"`.

### 4.5 Mixed option-count evaluation (corrected)

**Counterexample reproduced:** the prior `evaluateGateA()` made the
length result `inconclusive` whenever a scope contained more than one
distinct option-count group — confirmed directly: a synthetic bank mixing
2-, 3-, and 4-option items, none of them cued, reported `inconclusive` for
length purely because of the option-count mix, not because of any real
insufficiency of evidence. This contradicted the feature's own claim of
generic 2/3/4-option support.

**Correction:** position balance still genuinely needs option-count-
homogeneous groups (position 3 means something different for a 4-option
item than for a 2-option one, so grouping by `optionCount` for that check
alone is correct and unchanged). Length association, per section 4.4's
redesign, needs no such grouping — it is evaluated **once**, directly over
every item in the scope, regardless of option count. Verified directly: a
mixed 2/3/4-option, deliberately non-cued bank (60 items, correct answer
rotating through every position and length rank) evaluates to `pass`
(exact p-value ≈ 0.97); the same mix rebuilt to be cued (correct always
the longest option, regardless of the item's own option count) evaluates
to `fail` (exact p-value ≈ 5×10⁻²⁸). Both confirm the mixed-count path is
now genuinely exercised, not silently disabled.

### 4.6 Statistical computability and status agreement (corrected)

**Counterexample reproduced:** the prior position-balance implementation
computed the chi-square statistic only when `N * p * (1-p) >= 5` (using a
single flat `p = 1/n`), while the status/regime logic used a differently
derived `N >= 5n` condition. At `N=20, n=4` these are not obviously
identical in general form and could diverge for other parameterizations,
creating exactly the kind of disagreement the review flagged — a scope
where the regime logic assumed a statistic was available that the
computability check would not actually produce, or vice versa.

**Correction:** `REGIME_THRESHOLD(n) = CHI_SQUARE_MIN_EXPECTED_PER_CELL * n`
is now the **single, named, shared** value used for both "which regime
applies" and "is chi-square computable" for position balance — by
construction, these two questions can never disagree, because they are
now literally the same comparison against the same constant. Verified
directly at the boundary: `N = REGIME_THRESHOLD(4) - 1 = 19` uses the
structural regime with the statistic explicitly `"not-computed-small-n-structural-regime-applies"`;
`N = REGIME_THRESHOLD(4) = 20` and `N = 21` both use the statistical
regime with chi-square genuinely computed. For length association,
section 4.4's exact Poisson-binomial method is valid at any `N >= 1`, so
this class of disagreement cannot occur there at all — there is only one
method, with no threshold to disagree about.

**Naming corrected.** The prior length check was described in code
comments and documentation as a "two-proportion z-test," which is
inaccurate — it compared one sample's observed rate against a single fixed
external proportion (a one-sample test), never two samples against each
other. This is now moot for the corrected method (an exact Poisson-binomial
test, named accurately as such throughout), but is recorded here as a
naming defect this correction also fixes.

**A statistical result is never reported as a pass when it was not
computed.** Both regimes make this explicit: the structural regime's
`statisticalResult` field is a distinct, clearly-labeled string
(`"not-computed-small-n-structural-regime-applies"`), never conflated with
`"fails-to-reject-uniform"` (an actual computed non-significant result).

### 4.6a Practical vs. statistical significance (added — a second independent review found the two could conflict)

**Counterexample reproduced:** the large-N regime (both position balance
and length association) previously failed a scope when EITHER the
practical margin was exceeded OR the statistical test rejected its null —
with enough items, a tiny, educationally meaningless deviation becomes
statistically significant purely because of sample size, even while
remaining deep inside the declared 15-percentage-point practical margin.
Constructed directly: `N=100,000`, `n=4`, position counts
`[25,500, 24,834, 24,834, 24,832]` — a maximum observed share of 25.5%,
nowhere near the 40% practical fail threshold, yet chi-square = 13.33
exceeds the α=0.01 critical value of 11.345. **Under the prior design this
scope FAILED Gate A on statistical significance alone**, despite a
deviation of barely half a percentage point above the 25% null rate. This
conflicted with documentation language that called the statistical test
"corroboration" while sometimes also treating it as an independent fail
trigger.

**Corrected decision policy**, applied identically to both position
balance's large-N regime and length association (`evaluatePositionBalance()`,
`evaluateLengthAssociation()`):

| Practical margin | Statistical result | Gate decision | Review flag |
| --- | --- | --- | --- |
| Exceeded | Significant | **fail** | not raised (a fail is not softened into a review) |
| Exceeded | Not significant | **fail** | not raised (the practical margin is authoritative regardless of power) |
| Within margin | Significant | **pass** | **raised** — statistically distinguishable from the null, but not an educationally meaningful effect by itself |
| Within margin | Not significant | **pass** | not raised |

The **practical/effect-size margin is the sole, authoritative driver of
`fail`.** Statistical significance alone, without exceeding the practical
margin, never fails the gate by itself — it surfaces instead as an
explicit `reviewFlag` (`{required, reason}`) on the relevant component,
and is aggregated onto `evaluateGateA()`'s own `reviewRequired` /
`reviewFlaggedComponents`, so a real statistical signal is never silently
discarded even though it does not, by itself, fail anything.

This achieves every part of the required policy simultaneously:

- **A predeclared, educationally meaningful effect can fail even under low
  statistical power** — exceeding the practical margin fails regardless of
  the statistical result (this was already true for the small-N structural
  regime, which never attempts a statistic at all; it is now equally true
  in the large-N regime).
- **Statistical significance alone does not automatically convert a
  trivial effect into a substantive cueing defect** — the boundary
  counterexample above now returns `pass`.
- **Statistical evidence still triggers a documented review warning** —
  `reviewFlag.reason` states the exact statistic, critical value or
  p-value, and margin comparison that produced it.
- **Neither the thresholds (`PRACTICAL_MARGIN`, `SIGNIFICANCE_ALPHA`) nor
  this policy were tuned to make the current bank pass** — the live bank's
  90.8%-at-one-position and 86.9%-longest-or-tied results grossly exceed
  the practical margin regardless of this policy change, so the bank and
  every one of its 17 forms still fails Gate A (section 4.7) exactly as
  before this correction.

Directly verified: the boundary counterexample above now reports `pass`
with `reviewFlag.required: true`; a corresponding scope that exceeds the
practical margin at a SMALL enough N that chi-square lacks the power to
reject still correctly reports `fail` (practical margin authoritative
regardless of power); a scope that both exceeds the margin AND is
statistically significant reports `fail` with `reviewFlag.required: false`
(a fail is never also flagged for review — review flags exist only for
otherwise-passing scopes).

### 4.6b Chi-square p-value (added — a second independent review found position balance never reported one)

**Counterexample reproduced:** position balance's `detail` object
(before this correction) contained `chiSquare`, a critical-value-table
lookup, and a Boolean `statisticalResult` — but no `pValue` field at all.
A critical-value-table comparison is not itself a p-value: it only
answers "does the statistic exceed the one tabulated value for this exact
alpha," not "how extreme is this result." Length association's exact
Poisson-binomial test already computed and reported a genuine p-value
(section 4.4); position balance's chi-square test did not, despite the
round-3 correction's own stated intent to "report the statistical result
and p-value separately."

**Correction:** `chiSquareUpperTailPValue(chiSquareStat, df)` computes the
upper-tail chi-square p-value, `P(X >= chiSquareStat)`, via the closed-form
relationship between the chi-square survival function and the regularized
upper incomplete gamma function, `Q(df/2, chiSquareStat/2)`. Implemented
as a standard series-and-continued-fraction evaluation of the incomplete
gamma function — `upperRegularizedIncompleteGamma(a, x)`, exported and
independently usable. Not limited to any small, tabulated df range (the
retired critical-value table stopped at df=7, i.e. 8-option items); valid
for any positive df.

**Terminology, corrected precisely (round 5 — two distinct approximation
questions, previously conflated by calling the result "EXACT" without
qualification):**

1. The chi-square survival function itself is mathematically defined,
   exactly, via the regularized upper incomplete gamma function — a
   closed form, not an approximation. This implementation NUMERICALLY
   EVALUATES that closed form using finite-precision floating-point
   arithmetic; the returned floating-point number is a numerical
   evaluation of the exact value, not claimed to carry zero error.
2. Separately, and upstream of this function: the chi-square
   GOODNESS-OF-FIT TEST assumes observed multinomial counts are
   well-approximated by a continuous chi-square distribution, valid only
   when every expected cell count is reasonably large (conventionally
   `>= 5`, `CHI_SQUARE_MIN_EXPECTED_PER_CELL`) — the same condition
   `REGIME_THRESHOLD(n)` already guarantees for every call site. The
   function itself does not enforce this condition; it is the caller's
   (`evaluatePositionBalance()`'s large-N branch) responsibility.

**Algorithm provenance, corrected (round 5):** the series-and-continued-
fraction technique for evaluating the incomplete gamma function is a
standard, widely-documented numerical method, not exclusive to any one
text. An earlier version of this document attributed the specific
implementation to "Numerical Recipes, 3rd ed., section 6.2" without
having directly inspected that section's actual content. Re-checked for
this correction: the official bookreader at
<https://numerical.recipes/book.html> is subscription-gated; only its
table of contents was directly inspected, confirming a corresponding
section ("6.2 Incomplete Gamma Function and Error Function," page 259)
exists in that text — the algorithmic content itself (the specific
coefficient set, series/continued-fraction structure) was **not**
inspected and is **not** attributed to that source.

**Verified instead against two genuinely independent authorities, neither
of which shares this function's own recurrence:**

1. **Analytically reducible special cases**, derived by hand from the
   chi-square distribution's own definition (not this implementation):
   `df=2` gives the closed form `P(X>=x) = exp(-x/2)` (chi-square with 2
   degrees of freedom is Exponential(mean=2)); `df=4` gives
   `P(X>=x) = exp(-x/2)*(1 + x/2)` (chi-square with 4 degrees of freedom
   is Gamma(shape=2, scale=2)). Verified directly at `x=10`:
   `df=2 -> 0.006737946999085467`; `df=4 -> 0.0404276819945128`, both
   matching this implementation to at least 9 decimal places.
2. **An authoritative published table**, directly fetched and
   transcribed: NIST/SEMATECH e-Handbook of Statistical Methods, "1.3.6.7.4.
   Critical Values of the Chi-Square Distribution," National Institute of
   Standards and Technology,
   <https://www.itl.nist.gov/div898/handbook/eda/section3/eda3674.htm>,
   verified 2026-08-08. `chiSquareUpperTailPValue()` evaluated AT each
   published critical value returns ≈0.01000 (α=0.01, df=1-7) and
   ≈0.05000 (α=0.05, df=1-7) — matching to 4-5 significant figures.

**Coverage-gap correction during round-4 mutation testing (retained
history):** an initial boundary test only checked that the reported
p-value's significant/not-significant CLASSIFICATION agreed with a
placeholder computation, which a mutated, non-numeric placeholder value
could still satisfy by construction. Closed with a permanent test
asserting the exact NUMERIC p-value for a known chi-square/df pair
(`chiSquare=120, df=3` → `pValue ≈ 7.71679×10⁻²⁶`) — and round 5 confirmed
this same class of gap: a coarser table-based check alone did not catch a
deliberately introduced small numerical error in the underlying gamma-
function coefficients during round-5 mutation testing, but the tighter
analytic (`df=2`/`df=4`) fixtures above did, demonstrating exactly why an
independent, tight-tolerance oracle is more than a formality.

**One consistent alpha comparison everywhere:** `statisticalResult` is
derived from `pValue < SIGNIFICANCE_ALPHA` for position balance, exactly
the same comparison length association uses. The retired critical-value
table is retained, renamed `CHI_SQUARE_CRITICAL_ALPHA_01_REFERENCE`,
purely as an independently-sourced cross-check for tests and optional
display; it drives no decision.

**Deterministic JSON output preserved:** `chiSquareUpperTailPValue()` and
`cohensW()` are pure functions of their numeric inputs, with no
randomness or wall-clock dependency — verified directly, `--json` output
remains byte-identical across repeated runs with every field present.

### 4.6c Exact alpha-boundary decision policy and corrected p-value provenance (corrected — a second independent review found the boundary evidence imprecise and a prior "independence" claim self-referential)

**Counterexample reproduced (imprecise boundary evidence):** a test named
"position balance reports pValue immediately below, at, and above the
alpha=0.01 boundary" used three `df=3` chi-square statistics
(`11.0592`, `11.3688`, `11.8408`) with actual p-values ≈`0.01141`,
≈`0.00989`, ≈`0.00795` respectively. The middle fixture's p-value is
**below** alpha, not **at** it — no test anywhere in this file exercised
`pValue === SIGNIFICANCE_ALPHA` directly, the one input value where the
decision policy's exact convention (does equality reject, or not) is
actually determined.

**Counterexample reproduced (self-referential "independence" claim):** a
retained `chiSquare=120, df=3` test's comment described its expected
p-value as "independently hand-computed... via the same verified
incomplete-gamma algorithm" — self-contradictory, since a value produced
through the same recurrence as the implementation under test cannot also
be independent of it. Round 5 identified this same problem during its own
mutation-testing pass, but the stale test name/comment itself was never
actually corrected — this correction closes that gap.

**Correction:** a single exported `isStatisticallySignificant(pValue,
alpha)` — `pValue < alpha`, strictly; `pValue === alpha` does **not**
reject — is now the SINGLE production comparison path both
`evaluatePositionBalance()` and `evaluateLengthAssociation()` call to
derive `statisticalResult`, replacing two separately written (if
identical) inline `pValue < SIGNIFICANCE_ALPHA` expressions. A new test
exercises `isStatisticallySignificant()` directly with explicit p-values
`0.009` (rejects), `SIGNIFICANCE_ALPHA` itself (does **not** reject — the
exact boundary no prior fixture could hit), and `0.011` (does not
reject) — independent of any chi-square computation. A separate test
confirms `isStatisticallySignificant()` is a pure generic comparator
(verified with an arbitrary, non-chi-square p-value/alpha pair), and that
`chiSquareUpperTailPValue()`'s own correctness (the analytic `df=2`/`df=4`
and NIST-table tests, section 4.6b) never depends on `SIGNIFICANCE_ALPHA`
or the decision policy — the numeric p-value function and the
boundary-decision policy are separate, independently testable concerns.

The `chiSquare=120, df=3` test is relabeled honestly as an
INTEGRATION/consistency check — it confirms `evaluatePositionBalance()`
reports the exact output of a direct call to `chiSquareUpperTailPValue(chiSquare,
df)`, not a placeholder that only preserves the significant/not-significant
classification — not an independent-oracle proof; the genuinely
independent oracles remain the analytic `df=2`/`df=4` closed forms and the
NIST published table (section 4.6b), unaffected by this correction. The
misleadingly-named "at the boundary" test is retitled and reduced to its
two genuinely below/above fixtures; the exact-equality case is covered
only by the new, explicit-p-value test above, which is what an exact
boundary claim actually requires.

### 4.7 Current result: the bank fails Gate A

**Whole-bank overall: FAIL.** Position balance (statistical regime at
N=153: 90.8% at position B against a 40% threshold; Cohen's w = 1.524, an
enormous effect far past the medium-effect threshold of 0.3, section
4.3b; `primaryContributors` (section 4.3d) identifies position 1 alone as
accounting for 74.6% of the total chi-square, direction `"above"`; chi-square
355.52, p-value ≈ 9.5×10⁻⁷⁷ via `chiSquareUpperTailPValue()`, section
4.6b — this exceeds the practical effect-size threshold outright, so
section 4.6a's policy correction does not change this result:
`reviewFlag.required` is `false` here, exactly as intended, since review
flags exist only for an otherwise-passing scope)
and length association (86.9% longest-or-tied against a tie-aware
expected rate of 32.0% and a 47.0% allowed maximum; exact two-sided
Poisson-binomial p-value ≈ 6.1×10⁻⁵⁰ under the corrected
probability-ordering convention, section 4.4a — the prior doubled-tail
convention's ≈1.2×10⁻⁴⁹ was in the same overwhelming-significance range;
the convention change does not change any pass/fail conclusion for this
bank) both fail. **The whole-bank sequence check (section 4.10) is
reported `not-applicable`** (section 4.10a — the whole bank is not one
learner-facing encounter order, so its sequence findings are
informational only and do not affect `overall`); run informationally, it
does show findings (the longest observed run is 32 consecutive items at
position B) — a direct, expected consequence of the same
90.8%-at-one-position skew already established above, not an independent
third defect. **Every one of the 17 individual forms also currently
fails** (reproduced by `npm run audit:assessment-cues`; exact per-form
detail in its `--json` output) — now via a mix of the small-N structural
rule (position), the always-exact length association test, and (fully
applicable per-form, unlike the whole bank) the sequence check, all three
of which are, unlike before this correction, actually capable of
reporting `pass` for a well-authored small form (section 4.3a). The
frozen per-form encounter-order manifest also currently matches the live
bank exactly (`formOrderCheck.matches: true`, section 2.2) — no form's
authored order has drifted. This is expected and correct —
no threshold was weakened to make the present bank pass; the bank's
failure here reflects the bank, not an unreachable bar.

### 4.8 What Gate A is not

- Gate A is a **statistical/structural authoring safeguard**, not
  psychometric validation. Passing it says the scope's answer-position and
  answer-length distributions are not distinguishable from a defensible
  null model at the stated thresholds — it says nothing about whether any
  item's content is scientifically accurate, well-targeted, or
  discriminates the intended concept. That is Gate B (section 5) and,
  separately, `QUESTION_GOVERNANCE` scientific review.
- A balanced Gate A result **never** implies scientific correctness.
- Gate A **never** requires changing a scientifically correct answer
  merely to satisfy a position or length quota.

### 4.9 False-positive / false-negative risk

- **False positive:** possible from ordinary sampling variation, mitigated
  by the structural regime's exact, always-achievable bound at small N,
  and by the practical-margin/α=0.01 combination at large N — both
  deliberately conservative in the "don't over-flag" direction while
  still catching the bank's actual, severe pattern.
- **False negative:** possible if a real pattern stays within the
  practical margin and (for length) the exact test's power at very small N
  is genuinely low — an exact test remains *valid* at any N, it is just
  less *powerful* with very little data, which is an honest, unavoidable
  property of small-sample inference, not a defect specific to this
  design. The whole-bank evaluation, always run alongside every per-form
  one, catches a pattern spread thinly enough to individually clear each
  small form's bar while still being visible in aggregate.

### 4.10 Answer-key sequence pattern detection (added — a second independent review found aggregate balance alone is not sufficient)

**Counterexample reproduced:** aggregate position BALANCE (section 4.3) is
necessary but not sufficient. A key such as `A,B,C,D,A,B,C,D,A` (N=9, n=4)
satisfies the exact pigeonhole rule perfectly (`positionCounts = [3,2,2,2]`,
which `exactPigeonholeBalance()` reports `balanced: true`) while exposing
an obvious, mechanically learnable cue — confirmed directly: prior to this
correction, nothing in Gate A examined sequence order at all, so this key
passed position balance outright.

**Candidate approaches compared** (docs/ASSESSMENT_VALIDITY.md section
4.2's table extends to this decision): an inferential/statistical test
over the space of balanced sequences (e.g. ranking the observed sequence's
likelihood against all balanced permutations) was considered and rejected
— at N=5–13 the space of balanced sequences is small enough that any such
ranking would amount to claiming statistical meaning from a single short,
static, non-repeated sample, which this document's own design principles
(section 4.6a) already reject for the SAME reason in a different context.
A human-review-only flag was considered and rejected as the SOLE
mechanism, because the patterns this section targets (an exact repeating
cycle, a whole-sequence palindrome, an excessive identical-position run)
are unambiguous, mechanically checkable facts — there is nothing for a
reviewer to adjudicate about whether an exact cycle exists.

**Adopted: deterministic structural detection, not a statistical test.**
`detectAnswerSequencePatterns(positions, n)` checks, over the scope's
actual encounter order (the literal array order `index.html`'s
`buildQuiz()` renders `QUIZZES[key]` in — confirmed directly: no shuffling
of questions or options occurs anywhere in the rendering path):

1. **Repeating cycle** — the sequence exactly repeats some period
   `1 <= p <= min(n, floor(N/2))` (confirmed at least twice) for its
   entire length. Covers the literal counterexample above (`period=4`)
   and a pure alternating key (`period=2`).
2. **Mirrored** — the sequence is an exact palindrome across all N items
   (checked only for `N >= 4`, where it is a non-trivial coincidence
   rather than an unavoidable feature of very short sequences). Covers
   `A,B,C,D,D,C,B,A`.
3. **Excessive run** — any single position repeats `>= n` times
   consecutively — at least as many times in a row as there are distinct
   positions to choose from. Covers `A,A,A,B,C,D,B,C,D`-style clustering.

**Decision, justified precisely:** `evaluateAnswerSequence()` returns
`fail` if ANY finding is present, `pass` if none is, and `inconclusive`
only for `N < n` (mirroring position balance's own precise meaning of
inconclusive, section 4.3). **Not `review-required`:** unlike statistical
significance (section 4.6a), where a real ambiguity exists between
"detectable" and "educationally meaningful," a detected repeating cycle,
palindrome, or excessive run is either present or not, with no
probabilistic middle ground — a deterministic `fail` is the honest
report, not an over-claim. **Not a claim of statistical randomness:** the
result and its `detail` object contain no p-value, no alpha, and no
inference about "how random" a passing sequence is — only the concrete
facts checked and whether any was found.

**Reported separately from aggregate position balance and length
association**, never merged into either — `evaluateGateA()` exposes
`sequence` as its own top-level field, alongside `positionByOptionCount`
and `length`, though a `sequence` failure does contribute to the overall
`fail`/`pass` decision exactly as the other two do (`docs/ASSESSMENT_VALIDITY.md`
requires that Phase 0 cannot treat a form as eligible while an obvious
answer-key pattern remains, so `sequence` cannot be advisory-only).

**Does not demand a mechanically rotating key.** On the contrary: a
rotating `A,B,C,D,A,B,C,D,...` key is exactly what pattern (1) flags. A
balanced key with no detected pattern (verified directly for hand-checked
non-cyclic orders at every required size, `tests/assessment-cue-audit.mjs`
`BALANCED_NONCYCLIC_ORDERS`) passes; there is no requirement that a
passing key look mechanically regular in any way.

**Where this sits relative to Gate B:** this is a purely structural,
mechanically-checkable property of the ANSWER KEY sequence, decidable
without subject-matter judgment — it stays in Gate A. Gate B (section 5,
item 8) separately covers a human reviewer's judgment of whether one
SPECIFIC item's own construction telegraphs its answer, which is a
different, item-level, judgment-requiring question this deterministic
scope-level check does not and cannot answer.

**Deterministic output preserved:** `detectAnswerSequencePatterns()` and
`evaluateAnswerSequence()` are pure functions of the position sequence and
`n` — no randomness, no wall-clock dependency, byte-identical across
repeated calls on identical input (verified by the same
`buildDeterministicReport()` byte-identity test, section 7, which now also
covers the `sequence` field in every scope's Gate A result).

### 4.10a Whole-bank vs. learner-facing sequence scope (added — a second independent review found an artificial concatenation could create or clear a gate)

**Issue identified:** section 4.10's sequence check assumes the scope
passed to it is ONE continuous learner-facing encounter order. That
premise is true for a single form (one `<details class="quiz">`,
`index.html`'s `buildQuiz()`) and, if ever assembled into an actual quiz,
a pilot batch — but it is **not** true for the WHOLE-BANK aggregate scope
`buildDeterministicReport()` also evaluates: the concatenation of all 17
forms' questions, in whatever order `flattenQuestionBank()` iterates
`QUIZZES`'s module keys. No learner ever encounters all 153 questions as
one continuous sequence; each module is its own separate quiz. Before
this correction, `evaluateGateA()` computed and rolled sequence findings
for the whole-bank scope into `overall` exactly as it did for a real
form, meaning an artificial cross-module concatenation could, in
principle, both CREATE a sequence-driven `fail` (if the concatenated order
happened to look patterned) and CLEAR one (if it happened not to) —
neither outcome would say anything true about any actual learner-facing
form.

**Correction:** `evaluateGateA(metrics, { sequenceApplicable })` accepts
an explicit `sequenceApplicable` option, default `true`. When `false`,
sequence findings are still computed and returned — informational,
never silently dropped — but the returned `status` is overwritten to
`"not-applicable"`, `applicable: false` is set, and the result is EXCLUDED
from the `overall` pass/fail roll-up. `buildDeterministicReport()` passes
`sequenceApplicable: false` for the whole-bank scope specifically; every
per-FORM call (each module, genuinely one learner-facing quiz) uses the
default `true`, so sequence remains fully authoritative there. Position
balance and length association are UNCHANGED by this option at any
scope — both are genuinely meaningful in aggregate regardless of learner
traversal order, so the whole bank's position and length evaluation stays
fully intact and authoritative.

**Choice made explicit, per the two options considered:** whole-bank
sequence is **not** retained as authoritative (the alternative — keeping
it authoritative and documenting a "concrete learner-facing encounter
order" for the whole bank — was rejected, because no such order exists in
this application; each module is its own independent quiz with its own
independent encounter order, and there is no mechanism, current or
planned, by which a learner traverses all 17 in one continuous session).
Whole-bank sequence is reported for transparency only.

**Verified directly:** a synthetic scope with an exact repeating-cycle
answer key (which would fail sequence if evaluated as a form) reports
`overall: fail` when evaluated with the default `sequenceApplicable: true`,
and `overall: pass` for the identical position/length data when evaluated
with `sequenceApplicable: false` — proving the flag is what changes the
outcome, not a coincidence of some other component. Position and length
results are asserted byte-identical between the two calls.
`buildDeterministicReport()`'s whole-bank Gate A reports
`sequence.applicable: false` / `status: "not-applicable"`; every one of
its 17 per-form Gate A results reports `sequence.applicable: true`. The
live bank's whole-bank sequence check, run informationally, does show
findings (the longest run is 32 consecutive items at position B) — an
expected, directly explained consequence of the SAME 90.8%-at-one-position
skew already established in section 4.7, not an independent third defect;
it does not, and must not, affect `overall`.

---

## 5. Gate B — item-level cue and writing rubric

Gate B is a **human reviewer's rubric**, not an automated pass/fail
computation — deciding whether an individual item's options are
plausible, parallel, targeted, and free of avoidable cues requires
subject-matter and item-writing judgment this document does not attempt
to automate. A reviewer works through this checklist for each item:

1. **Exactly one defensible best answer.** Confirm no distractor could
   reasonably be defended as equally correct given the stated stem and
   current authoritative sources.
2. **Scientific correctness is a separate question.** This checklist is
   for *item-writing quality*, not a substitute for the scientific-
   accuracy review `QUESTION_GOVERNANCE` already requires
   (`reviewChecks`, `docs/CONTENT_GOVERNANCE.md`) — a well-constructed
   item can still be scientifically wrong, and a scientifically correct
   item can still be badly constructed; both checks are required.
3. **Distractor plausibility.** Each distractor should be plausible to a
   learner at the item's intended level — wrong in a way a learner with a
   genuine, specific gap could actually believe.
4. **Parallel construction.** Options should match in grammar, syntax,
   abstraction level, and category.
5. **Mutual distinguishability.** Options should be clearly different in
   meaning, not near-duplicates.
6. **Grammar/stem-completion clues.** Every option should grammatically
   complete the stem equally well.
7. **Repeated stem wording or keyword clues.** The correct answer should
   not repeat a distinctive stem word/phrase the distractors lack.
8. **Conspicuously longer, more specific, or more qualified correct
   answers, judged per item.** Beyond Gate A's aggregate statistic: does
   *this specific* item's correct answer stand out by being noticeably
   more detailed, hedged, or qualified than its distractors?
9. **Absolute words and other unintended cues** ("always," "never,"
   "all," "none" in a distractor, often correctly perceived as more
   likely false).
10. **Paired/opposite-option patterns** that telegraph "the answer is one
    of these two."
11. **"All/none of the above" and negative-stem risks** — deliberate use
    only, and negatively-phrased stems clearly marked as such.
12. **Implausible padding added solely to equalize length** — genuine
    content, not meaningless filler (this is exactly the check Gate A's
    length metric, section 3.2, cannot itself perform after removing
    automated trailing-punctuation stripping).
13. **Rationale and wrong-answer-feedback alignment.** `why` and every `w`
    entry must match the current option text and order.
14. **Preservation of assessed intent and stable-ID meaning** across an
    edit.
15. **When to version/supersede vs. edit in place.** If the item can be
    fixed while still testing the same concept at the same level, edit in
    place (same ID). If fixing it would change what it assesses,
    supersede it with a new ID; mark the old id's `QUESTION_GOVERNANCE`
    record superseded.
16. **Quarantine when a safe rewrite isn't yet supportable** — a
    legitimate, recorded outcome, not a process failure.
17. **Required evidence before release-qualification.** None of the
    above, even fully satisfied, makes an item `release-qualified` — that
    still separately requires the full existing `QUESTION_GOVERNANCE`
    chain (source checking, SME review, documented approved conflict-free
    independent review, `docs/ARCHITECTURE.md`). Gate B is a
    prerequisite **alongside**, not a replacement for, that chain
    (`docs/LEARNING_PLATFORM_ROADMAP.md` B.2).

Gate B is deliberately kept distinct from: scientific correctness (item
2), `QUESTION_GOVERNANCE` lifecycle (item 17), Gate A's bank/form
statistics (section 4), `diagnosticEligible` status, and future
psychometric validation (Phase 11).

**No question in this repository has been reviewed against this rubric
as of this document's introduction.** Its existence is not evidence that
any item has passed it.

---

## 6. Pilot batch (selected, not rewritten)

### 6.1 Selection method (corrected — canonical order independent of input array order)

**Counterexample reproduced:** the prior `selectPilotBatch()` selected
"the first item encountered" in whatever order its **input array**
happened to be in. Confirmed directly: reversing the input array's order
before selection could select a *different* representative for a stratum
than the forward order would, since "first encountered" depended on array
position, not on any property of the questions themselves. The committed
test claiming to prove input-order determinism did not actually prove it
— its `strataOf()` helper filtered records to `stratum ===
"domain-x-cueClass"` and then mapped to `.stratum`, which (after the
filter) can only ever produce the Set `{"domain-x-cueClass"}` — a constant,
regardless of which actual domains/cueClasses were selected. The test
therefore passed vacuously and could not have caught the order-dependence
bug it was named for.

**Correction:** selection now first sorts every question into a
**canonical order** (`compareCanonicalOrder()`) derived purely from each
question's own `id` — never from array position. IDs of the form
`mN-qM`/`final-qM` are parsed into `(moduleRank, itemNumber)`: `final`
sorts after every numbered module, and module/item numbers are compared
**numerically**, not lexicographically (so `m2` sorts before `m10`, unlike
a naive string sort, which would place `m10` before `m2`). The existing
first-encountered-per-stratum rule now runs against this canonical order,
so any permutation of identical input produces the identical selection —
verified directly against the live bank: reversing the full 153-item
input array, and a deterministic pseudo-shuffle of it, both reproduce
**exactly** the same 13 selected ids as the original file order, with no
loose "same strata" comparison needed — a direct `ids` array equality
check now suffices and is what the test asserts.

**Frozen pilot manifest.** `FROZEN_PILOT_MANIFEST` in
`scripts/assessment-cue-audit.mjs` records the exact, ordered 13-id result
of this corrected, deterministic process against the live bank as
reproduced at the time of this correction. A test asserts a fresh run
against an unchanged bank reproduces this exact list.

Selection still uses these dimensions, checked with real domain/cue-class/
difficulty/answer-position/form-context/distractor-feedback-coverage
values recorded directly on each selection record (not a constant label):

1. Iterate every question in canonical order.
2. The first question encountered for each distinct
   `${domain}|${cueClass}` stratum is selected.
3. After every such stratum has a representative, scan for remaining gaps
   in difficulty, answer position, form context, and distractor-feedback
   structure, adding the first not-yet-selected canonical-order question
   supplying each.

### 6.2 Selected pilot batch (13 of 153 questions)

| ID | Selection stratum | Reason |
| --- | --- | --- |
| `m1-q1` | domain × cueClass | first (canonical order) `orientation` / `not-longest` item |
| `m1-q2` | domain × cueClass | first (canonical order) `orientation` / `uniquely-longest` item |
| `m1-q3` | domain × cueClass | first (canonical order) `orientation` / `tied-longest` item |
| `m2-q1` | domain × cueClass | first (canonical order) `specimen` / `uniquely-longest` item |
| `m2-q3` | domain × cueClass | first (canonical order) `specimen` / `not-longest` item |
| `m4-q1` | domain × cueClass | first (canonical order) `specimen` / `tied-longest` item |
| `m6-q1` | domain × cueClass | first (canonical order) `analysis` / `uniquely-longest` item |
| `m6-q4` | domain × cueClass | first (canonical order) `analysis` / `not-longest` item |
| `m7-q2` | domain × cueClass | first (canonical order) `analysis` / `tied-longest` item |
| `m12-q6` | distractorFeedbackCoverage | first not-yet-selected item (canonical order) with feedback keyed on all 4 options |
| `m15-q1` | domain × cueClass | first (canonical order) `molecular` / `uniquely-longest` item |
| `m16-q1` | domain × cueClass | first (canonical order) `operations` / `uniquely-longest` item |
| `final-q33` | domain × cueClass | first (canonical order) `molecular` / `tied-longest` item |

**The exact 13 ids are unchanged by this correction** — only their
selection *process* (now genuinely order-independent) and their reported
*order* (now natural module order, matching canonical order, rather than
a lexicographic sort that would have placed `final` before `m1` and `m12`
before `m2`) changed. This is expected: the live bank's actual authoring
(file) order and its derived canonical order coincide for this bank, so
correcting the selection process to no longer *depend* on array order
did not, in this instance, change *which* ids it selects — but it is no
longer an accident of input order that it does not.

Represented strata, confirmed directly: **5 of 5 domains**, **3 of 3
difficulty levels present in the bank**, **3 of 3 answer positions
actually used** (D is never used anywhere in the current bank — itself
part of the confirmed imbalance, not an oversight in selection), **both
form contexts**, **both observed distractor-feedback structures**, and
**9 of 19 distinct topics**.

### 6.3 Per-item record (mechanical measurement only — no content evaluation)

For every selected ID, only mechanical, already-existing facts are
recorded — no item's scientific content was evaluated or judged as part
of this selection:

- its selection stratum and reason (table above), plus its real domain,
  cue class, difficulty, answer position, form context, and
  distractor-feedback coverage (all now recorded directly on the
  selection record, not only inferable from a separate lookup);
- its current mechanical cue measurement — reproducible in full via
  `npm run audit:assessment-cues -- --json`;
- its current `QUESTION_GOVERNANCE` state: **`draft`, with every
  evidence field null/empty/false** — identical to all other 152
  questions;
- what future reviews it would require before any status could change:
  the full Gate B rubric (section 5) plus the existing
  `QUESTION_GOVERNANCE` chain, as its own separately scoped, later Phase 0
  step, not this one.

**Selection is not authorization to modify.** No pilot item's question
text, options, answer index, rationale, or feedback has been changed by
this document or by the PR it ships in.

---

## 7. Deterministic machine-readable output (corrected)

**Counterexample reproduced:** the prior `--json` CLI output embedded
`new Date().toISOString()` directly in the returned report object, so two
runs against byte-identical input produced byte-different output —
contradicting the PR's own claim of "deterministic machine-readable
output." Confirmed directly: two successive runs' JSON differed only in
that one field.

**Correction:** the deterministic payload
(`buildDeterministicReport()`) no longer contains any wall-clock value at
all. Execution metadata (when a particular human-readable run happened) is
generated separately (`{generatedAt: new Date().toISOString()}`) and
passed only to `printHumanReadable()`'s console banner — never merged into
the object `--json` serializes. Verified directly: `npm run
audit:assessment-cues -- --json`, run twice in immediate succession, now
produces **byte-identical** output.
