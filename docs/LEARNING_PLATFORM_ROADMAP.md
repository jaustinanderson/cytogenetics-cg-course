# Learning Platform Roadmap

**Status: planning document. Nothing in this file is implemented.** It
describes a long-term direction, not a committed schedule, and it does not by
itself authorize building any of the capabilities it describes. See
`docs/ROADMAP.md` for the concise summary and the actual, currently
committed work items; this document is the durable detail behind that
summary. Tracked by
[Issue #24](https://github.com/jaustinanderson/cytogenetics-cg-course/issues/24).

## How to read this document

Every capability described below is a **future proposal**, not current
behavior. Where this document describes something the application already
does, it says so explicitly and cites the file that proves it
(`docs/ARCHITECTURE.md`, `docs/VALIDATION.md`, or `index.html` itself).
Everywhere else, treat the verb tense as aspirational: "the engine would
report an uncertainty band" describes a future design, not a shipped
feature. If a sentence in this document ever contradicts the current
`README.md`/`docs/ARCHITECTURE.md`, the current documentation is correct and
this file is stale and needs correction.

This document does not authorize:

- accounts, authentication, or cloud learner-data storage
- telemetry or analytics collection beyond what already exists locally
- payments, subscriptions, or any pricing decision
- selection of a specific adaptive/mastery/knowledge-tracing algorithm
- a framework migration or splitting the single-file architecture
- a persistent, versioned content-pack system
- an AI tutor or automatically generated scientific content entering
  production

Each of those requires its own separately scoped, separately reviewed
proposal, gated on the prerequisites this document identifies, when its turn
comes. See section O for the explicit list of decisions this document
intentionally leaves open.

## Current baseline (what already exists, as of this writing)

This section exists so the rest of the document can describe *changes*
relative to a shared, accurate starting point, rather than re-deriving it in
every section. It is a summary; `docs/ARCHITECTURE.md` is authoritative.

- **Delivery.** A single static `index.html` — semantic HTML, custom CSS,
  vanilla JavaScript, `localStorage`, no framework, no backend, no account
  system, no telemetry (`docs/ARCHITECTURE.md` "Product boundary").
- **Content.** 17 modules, 153 tagged practice questions (`QUIZZES`), 30
  exercise items across 6 sets (`EXERCISES`), 61 flashcards across 7 decks
  (`FLASHCARDS`), 8 capstone cases plus 5 module-level cases, a 19-entry
  image manifest (`IMAGES`). One subject only: cytogenetics.
- **Question schema.** Each question carries `id`, `d` (domain), `t`
  (topic), `x` (difficulty 1–3), `q` (prompt), `o` (options), `a`
  (zero-based correct index), `why` (rationale), optional `w`
  (distractor-specific feedback). No concept graph, no prerequisite
  relationships, no item-variant model, no attempt-history model.
- **Progress.** `SCHEMA_V = 2`. Per question/exercise, the stored outcome is
  `{c: boolean, n: attemptCount, ts: lastAttemptTimestamp}` — **latest
  correctness and a total attempt count only, no per-attempt history**. Two
  genuinely different attempt sequences (2-of-3 correct vs. 1-of-3, both
  ending correct) produce a byte-identical stored record. This is the single
  most important existing limitation section D below has to design around.
- **Analytics.** `getStats()` implements and explicitly names
  `analyticsModel: "last-attempt-mastery-v1"` — mastery means "correct on
  the most recent attempt," not accuracy across all attempts, not retention,
  not confidence-adjusted knowledge. `questionsCorrect`/`overallPct` are
  kept as compatibility aliases with identical values
  (`docs/ARCHITECTURE.md` "Analytics semantics: last-attempt mastery").
- **Question governance.** `QUESTION_GOVERNANCE`, a registry separate from
  content and progress, records per-question lifecycle
  (`draft`/`source-checked`/`sme-reviewed`/`release-qualified`) with
  load-time-enforced evidence prerequisites. **All 153 questions are
  currently `draft`.** `getQuestionGovernance()` is read-only
  (`docs/ARCHITECTURE.md` "Question provenance and scientific-review
  governance"; Issue #3).
- **Known, confirmed, unresolved bank-level defect.** QL-033
  (`docs/QUALITY_LOG.md`): the correct answer is index 1/B in 139/153
  questions (90.8%), never index 3/D, the uniquely longest option in
  114/153 (74.5%), longest-or-tied in 133/153 (86.9%). This is a real,
  exploitable cueing pattern, not a hypothetical risk — see section B.
- **Runtime-injected content.** `addQuestions()` supports session-only
  question definitions with durable answer outcomes
  (`getRuntimeContentPolicy()`); there is no persistent, versioned
  content-pack import/export format (`contentPacksSupported: false`).
- **Public API and events.** `window.CytoCourse` exposes read methods
  (`getModules`, `getQuestions`, `getExercises`, `getFlashcards`,
  `getImages`, `getQuestionGovernance`, `getProgress`, `getStats`,
  `getWeakAreas`, `getUnmastered`, `exportJSON`, `getPersistenceStatus`,
  `getRuntimeContentPolicy`), write methods (`importJSON`, `addQuestions`,
  `markModule`, `reset`), and an event bus (`on`/`off` for `progress`,
  `answer`, `exercise`, `content`, `persistence`, and a catch-all `*`). Read
  methods deep-clone their results; nothing here currently reasons about
  concepts, prerequisites, retention, or recommendations.
- **Governance/gates already in force** (`CLAUDE.md`, `docs/ROADMAP.md`
  "Quality gates"): static/client-only, no PHI/accession numbers/
  employer-confidential content/recalled exam questions, no AI-generated
  content represented as reviewed, no ASCP affiliation implied, no silent
  change to progress/analytics/public-API semantics.

## Purpose

Design the long-term path from this single-subject cytogenetics course to a
reusable learning system that can, over time and only as evidence and review
allow:

1. determine what a learner knows, does not know, and has insufficient
   evidence to judge;
2. identify strengths, weaknesses, misconceptions, and fragile knowledge;
3. recommend what to study next and explain why;
4. support retrieval practice, spacing, interleaving, and adaptive
   reassessment;
5. connect related concepts through prerequisites and concept relationships;
6. measure delayed retention rather than only immediate correctness;
7. work first for cytogenetics and later for molecular biology and other
   subjects;
8. support a responsible public and commercially sustainable product;
9. remain scientifically honest, accessible, privacy-conscious, auditable,
   and testable throughout.

---

## A. Guiding principles and non-negotiable safeguards

These are constraints on every later section, not aspirations to revisit.
Any future proposal that violates one of these needs its own explicit,
separately reviewed exception — it cannot be waived by silently shipping
around it.

1. **Learning evidence is not activity.** A page view, a click, time spent,
   or a login is not evidence of learning. Only a recorded, attributable
   attempt at a defined item or task — with a knowable correctness or
   quality signal — counts as evidence toward any mastery, weakness, or
   retention claim.
2. **"Insufficient evidence" is a first-class result, not an edge case.**
   Every diagnostic, dashboard, or recommendation surface must be able to
   say "not enough evidence yet" as a distinct, equally legitimate outcome
   alongside "weak" and "mastered." A concept a learner has seen twice is
   not "weak" merely because both attempts were wrong, if the minimum
   evidence threshold (section D) has not been met — it is "insufficient
   evidence," full stop, and must be labeled that way to the learner.
3. **A mastery estimate is a claim with a basis, not a bare number.** Every
   surfaced mastery/strength/weakness value must be presented together with
   (a) how many and which attempts support it, (b) how recent that evidence
   is, and (c) an explicit uncertainty indicator. A lone percentage with no
   basis is a design defect under this plan, not an acceptable simplification.
4. **No certification, diagnostic, or readiness claim, ever.** No feature
   under this roadmap may state or imply that the learner is certified,
   clinically competent, diagnosed with a knowledge gap in a clinical sense,
   or guaranteed to pass a real examination. Language must stay in the
   register of "supported by the available practice evidence," matching the
   existing beta-status and non-affiliation disclosures
   (`README.md` "Disclaimer").
5. **Adaptive behavior must be inspectable and explainable.** A learner (and
   an auditor) must always be able to ask "why was I shown this?" and
   "why does it say I'm weak/strong/uncertain here?" and get a real,
   specific answer traceable to recorded evidence — never "the algorithm
   decided." This rules out shipping any model whose recommendation cannot
   be attributed to specific evidence, regardless of how well it performs
   in aggregate (see section F's explicit rejection of opaque-by-default
   model families before validation).
6. **Scientific correctness, accessibility, privacy, and security are
   release gates, not optional polish** — consistent with the existing
   `docs/ROADMAP.md` "Quality gates" and `CLAUDE.md`'s non-negotiable
   constraints. A feature that is technically functional but scientifically
   unreviewed, inaccessible, or privacy-hostile is not release-qualified
   under this plan, the same way an unreviewed question is not
   release-qualified today.
7. **The current static, private, offline-capable course keeps working.**
   Every phase in section N must be evaluable, and disablable, without
   breaking the existing zero-account, zero-telemetry, open-`index.html`
   experience. A learner who never opts into anything new must see no
   regression.
8. **No fabricated evidence, ever — in the product or in this plan.** This
   document does not, and no phase under it may, invent product-market
   evidence, psychometric validity, scientific review outcomes, reviewer
   identities or credentials, market demand, pricing, or revenue
   projections. Every claim of validity, calibration, or accuracy must be
   backed by an actual, cited, reproducible measurement — the same
   evidentiary discipline already enforced for question provenance
   (`QUESTION_GOVERNANCE`) and for the assessment-cueing finding (QL-033)
   applies to every learning-model claim this platform will ever make.

---

## B. Assessment validity gates

**Trustworthy adaptive diagnosis depends on a trustworthy assessment bank.**
No amount of modeling sophistication in sections E–F can compensate for
diagnosing a learner against compromised or unreviewed items. This section
is a hard prerequisite gate, referenced by name from section N's Phase 0.

### B.1 The confirmed QL-033 cueing defect (must be corrected or quarantined)

Recorded in `docs/QUALITY_LOG.md` QL-033, independently reproduced against
the live 153-question bank via `window.CytoCourse.getQuestions()`:

- Answer-index distribution: index 0/A = 11, index 1/B = **139**, index
  2/C = 3, index 3/D = **0**.
- The correct choice is the **uniquely longest** option in 114 of 153
  questions (74.5%).
- The correct choice is the longest **or tied-longest** option in 133 of
  153 questions (86.9%).

A learner (or an automated key-extractor) exploiting "pick B" or "pick the
longest option" alone would score well above true cytogenetics knowledge.
**Any question exhibiting this cueing pattern is not a valid diagnostic
instrument for the concept it claims to test** — a correct answer on such a
question is not distinguishable evidence of mastery versus cue-exploitation
without external correction. This is independent of, and does not
substitute for, per-question scientific review (`QUESTION_GOVERNANCE`).

**Remedy constraints (already decided, recorded here for continuity):**

- Not mechanical shuffling of answer positions alone — this would fix the
  position cue but leave the length cue intact.
- Not naive answer-length padding — this risks introducing scientific
  inaccuracies into distractors written to "match length" rather than to
  be plausible.
- Not unsupervised/automated rewriting — distractor quality requires the
  same human/scientific judgment already required for question authoring
  (`docs/CONTENT_GOVERNANCE.md`).
- The actual correction (rewriting distractors credibly, rebalancing
  answer-index distribution toward a roughly uniform split) remains its own
  separately scoped task (`docs/ROADMAP.md`, `docs/QUALITY_LOG.md` QL-033
  "Correct action"), not performed by this planning document and not
  performed by opening Issue #24.

### B.2 Hard prerequisites before a question can contribute to diagnostic/mastery decisions

A question item is **diagnostically eligible** only when all of the
following hold. This is a new, stricter bar than `release-qualified`
(`QUESTION_GOVERNANCE`) — release-qualification is necessary but not
sufficient for diagnostic use:

1. It does not currently exhibit the QL-033 cueing pattern for its own
   position/length profile (corrected, or explicitly re-verified as an
   acceptable exception after human review — never assumed acceptable by
   default).
2. It has a stable ID, a stable concept/objective mapping (section C — does
   not exist yet), and adequate, reviewed distractors.
3. It has a complete evidence record and appropriate scientific review
   under the existing `QUESTION_GOVERNANCE` model (source-checked at
   minimum; `sme-reviewed` or better strongly preferred for any item used
   in a weakness/mastery claim, not merely a practice quiz).
4. It is not `draft`, stale (superseded by a corrected duplicate), or
   flagged with any open governance blocker relevant to accuracy (e.g. a
   pending source check).

Items failing any of these must be **excludable** from high-stakes
analytics — present in ordinary practice quizzes, but never counted toward
a mastery/weakness/readiness claim. This requires new, explicit
`diagnosticEligible` metadata (see section C's item metadata list) distinct
from `QUESTION_GOVERNANCE.lifecycle`; the two answer different questions
("has this been reviewed" vs. "can this validly discriminate mastery")
and must not be conflated into one flag.

### B.3 Reporting eligibility, not just a score

Any future diagnostic surface (section E) must report, alongside its
result: which items and concepts were eligible, which were excluded and
why, and which concepts could not be assessed at all because every mapped
item was ineligible ("inconclusive," a specific, distinct outcome from
"insufficient evidence" — inconclusive means *the bank cannot currently
answer this*, not merely *the learner hasn't attempted enough yet*).

### B.4 Relationship to existing, separately scoped work

- `docs/ROADMAP.md`'s open item "Add browser contract tests for every
  public API claim" is unrelated infrastructure work and stays its own
  roadmap responsibility — not redefined or absorbed by this plan.
- `docs/ROADMAP.md`'s open item "Normalize the image-manifest schema" is
  unrelated to assessment validity and stays its own responsibility.
- Provenance and image-rights work under Issue #3 remains that issue's
  responsibility; this plan depends on its outputs (a trustworthy,
  reviewed bank) without duplicating or reassigning that work.

---

## C. Subject-independent learning model

### C.1 Conceptual entities

A future reusable engine needs to reason about the following entities, kept
conceptually distinct even before any of them exist as a persisted schema:

| Entity | What it represents | Exists today? |
| --- | --- | --- |
| Learner | A person using the course, locally identified only (no account by default) | Implicit only — no explicit learner record exists; progress is un-attributed browser-local state |
| Subject pack | A versioned bundle of one subject's content (cytogenetics today) | No — content is inlined directly into the engine (`QUIZZES`, `MODULES`, etc. live in `index.html` itself) |
| Concept | An atomic unit of knowledge (e.g. "reciprocal translocation nomenclature") | No — closest analog is `t` (topic), a display-grouping string, not a stable, reviewable, prerequisite-aware entity |
| Learning objective | A statement of what a learner should be able to do regarding one or more concepts | No |
| Prerequisite relationship | "Concept A should be understood before concept B" | No |
| Misconception | A specific, named, wrong belief learners predictably hold, distinct from "doesn't know yet" | No |
| Instructional resource | Module text, a figure, a flashcard — teaching material mapped to concepts | Partial — modules/flashcards exist but are not concept-mapped |
| Assessment item | A question, exercise item, or case-study prompt | Yes — `QUIZZES`/`EXERCISES`/cases |
| Item variant | A different surface form of the same underlying concept-and-difficulty target, to reduce wording memorization | No |
| Attempt | One learner interaction with one item | Partial — outcome is recorded, but not as a discrete, replayable attempt event (see section D) |
| Outcome | Correct/incorrect/partial result of an attempt | Yes, but only latest-attempt (`{c, n, ts}`) |
| Confidence | Learner's self-reported certainty in an answer | No |
| Response time | How long an attempt took | No — not collected |
| Hints/feedback exposure | Whether the learner saw a hint or rationale before/after answering | Partial — rationale (`why`) is always shown after answering today; no hint system exists |
| Evidence window | The bounded set of attempts a mastery/weakness claim is computed from | No |
| Mastery estimate | A concept-level judgment of current understanding | No — `getStats()`'s "mastery" is item-level, last-attempt only, no concept aggregation |
| Retention estimate | A judgment of durable, delayed recall (not just recent correctness) | No |
| Recommendation | A specific next study action, with a reason | No |
| Review schedule | When a concept/item is next due for spaced review | No |
| Provenance and review state | Source, reviewer, lifecycle | Yes, for items only (`QUESTION_GOVERNANCE`) — does not yet exist for concepts, objectives, or resources |

### C.2 Identity rules

- **Concept identity must be stable and independent of display order or
  wording.** A concept ID (e.g. `cyto.nomenclature.reciprocal-translocation`)
  must never be derived from array position, module number, or display
  text — the same lesson already learned the hard way for exercise items
  (`docs/QUALITY_LOG.md` QL-005, "stop deriving progress identity from
  array position") applies identically to concepts.
- **A concept ID must survive content revision.** Rewording a question's
  prompt, reordering modules, or renumbering a module must never change
  which concept an item maps to, or evidence silently migrates to the wrong
  bucket — this is the same integrity property `QUESTION_GOVERNANCE`
  already enforces for question ids, generalized to a new entity.
- **Subject-pack identity must be versioned and separate from the engine.**
  "cytogenetics-cg-ascp-v1" (already used as `GOVERNANCE_SUBJECT_PACK` for
  reviewer-approval scoping) is the natural first pack identity; a future
  molecular-biology pack gets its own, unrelated identity space.

### C.3 The cytogenetics-modules-as-one-pack transition

The cytogenetics modules (`MODULES`, `QUIZZES`, `EXERCISES`, `FLASHCARDS`,
cases, `IMAGES`) should eventually become **one subject pack** consumed by a
generic engine, rather than being inlined into and inseparable from the
runtime the way they are today. This is a real architectural change (see
section I) — not performed by this document, gated behind Phase 7, and
explicitly **not** the same thing as adding a second static HTML file per
subject; it is a data/loader boundary decision to be made once the
prerequisites in section I are met.

### C.4 Boundaries

| Boundary | Reusable engine | Cytogenetics pack | Future subject pack(s) | Local learner data | Optional hosted services | Authoring/review tools |
| --- | --- | --- | --- | --- | --- | --- |
| Owns | Concept/mastery/scheduling logic, UI shell, event bus, public API | Cytogenetics concepts, items, resources, images | Same shape as cytogenetics pack, subject-specific content | Attempts, evidence, mastery cache, review queue, learner preferences | Sync, backup, cross-device profile, aggregate (opt-in) analytics | Content-governance workflow, item-writing aids, concept-graph editor |
| Does not own | Subject content, subject-specific terminology | Mastery-model logic, scheduling algorithm | Same | Subject content, the engine itself | Learner's local-only data unless the learner explicitly opts in | Runtime mastery computation |
| Trust boundary | Trusted, this repository | Trusted, first-party, same governance as today | Untrusted until reviewed and signed (section I) | Local to the learner's device by default | Requires explicit informed consent (section K) before any data leaves the device | Offline tooling; output must still pass the same validity/review gates before shipping |

### C.5 Explicitly not defining a final schema now

This document identifies the *decisions* a persistent schema would need to
make, not the schema itself, for the same reason `docs/ARCHITECTURE.md`
already avoids locking in a premature format for content packs
(`getRuntimeContentPolicy().contentPacksSupported === false`, by design).
Decisions that would require a **new schema version** whenever they are
made (i.e., must never be silently retrofitted onto `SCHEMA_V = 2`):

- Introducing an attempt-history record distinct from the current
  latest-outcome-only record (section D) — additive, but the *shape* of
  what "evidence" means changes, so it needs a version bump and an explicit
  migration decision, not a silent reinterpretation of existing data.
- Introducing concept IDs on existing questions — additive metadata, does
  not itself require a version bump if it lives in content/pack data rather
  than progress data, but any progress-schema change to *reference* a
  concept ID does.
- Introducing confidence, response-time, or hint-exposure fields on attempt
  records — new fields with real semantic weight; must be optional and
  clearly distinguished from their absence in older records (never
  backfilled or assumed).
- Introducing a persisted mastery/retention estimate (a computed
  cache) — must be clearly marked as **derived, recomputable, and
  invalidatable**, never treated as a second source of truth alongside the
  raw evidence it was computed from.
- Introducing pack-scoped progress (once multiple subject packs exist) —
  changes what "the" progress record even means (per-pack vs. global) and
  needs its own explicit migration design before it ships.

---

## D. Evidence and learner-state model

### D.1 What evidence can and cannot support, honestly

| Evidence type | What it can support | What it cannot support (yet, or ever, without more) |
| --- | --- | --- |
| Exposure/coverage | "The learner has seen this concept at least once" | Whether they understood it |
| Immediate correctness | "This specific attempt was correct" | Durable understanding; a lucky guess and genuine recall are indistinguishable from a single attempt |
| Last-attempt mastery (current model) | "The most recent attempt on this item was correct" | Retention over time, confidence, whether earlier failures were resolved or just not retried |
| Misconception evidence | A *specific*, wrong, repeated pattern (e.g. consistently confusing two nomenclature terms) — requires distractor-level tagging, which does not exist yet | A single wrong answer alone; one wrong answer is evidence of a gap, not evidence of *which* misconception, unless the distractor chosen is itself tagged to a known misconception |
| Durable retention | Only a **delayed** re-test (meaningfully after the original exposure, not the next click) | An immediate-retry correct answer — that measures short-term memory of the specific attempt, not retention |
| Fluency | Speed/ease alongside correctness, and only if response time is collected (see D.3 — not currently collected, and only lawfully/cautiously if ever added) | Correctness alone; a slow, effortful correct answer and a fast, confident one are different evidence even when both are "correct" |
| Confidence calibration | Comparing a learner's stated confidence against actual correctness, and only if confidence is collected (not currently) | Cannot be inferred from correctness alone — requires an explicit, optional confidence prompt |
| Transfer | A correct answer on a *meaningfully different* item testing the same concept (an item variant, section C.1) | A correct answer on the *same* item reattempted — that is retrieval of the specific item, not evidence of transfer |

### D.2 The honest current limitation

**Existing `SCHEMA_V = 2` question outcome records store only latest
correctness and a total attempt count (`{c, n, ts}`) — they cannot
reconstruct per-attempt correctness history.** Two learners with genuinely
different attempt sequences (2-of-3 correct ending correct, vs. 1-of-3
ending correct) produce byte-identical stored records today
(`docs/ARCHITECTURE.md` "Analytics semantics: last-attempt mastery"). **No
phase under this roadmap will retroactively fabricate a per-attempt history
for existing data.** Any future evidence-rich analysis (misconception
tracking, retention curves, confidence calibration) applies **prospectively
only**, starting from whenever a new attempt-history model actually ships —
existing learners' historical evidence stays exactly what it honestly is:
a last-attempt-mastery record, nothing more.

### D.3 A prospective attempt-history model (design target, not implemented)

A future attempt record would need, per attempt, at minimum:

- a stable attempt ID and the learner-local timestamp of the attempt
  (recency);
- the item ID and its content/concept-mapping *version* at the time of the
  attempt (so a later content correction doesn't retroactively reinterpret
  old evidence against a different question);
- the concept version(s) the item was mapped to at that time (concept
  definitions can themselves evolve; evidence must record what it was
  actually evidence *for*, historically);
- whether this was the learner's first exposure to this item/concept or a
  repeat, and if a repeat, how many prior attempts and how long since the
  last one;
- whether a hint or the rationale/feedback was visible **before** the
  answer was submitted (contaminates the evidence — an answer given after
  seeing the rationale is not independent evidence of prior knowledge) vs.
  only **after** (the current, only behavior — rationale is always
  post-answer today);
- source modality — was this attempt part of an ordinary practice quiz, a
  diagnostic assessment, a spaced-review prompt, or a runtime-injected
  question (section C, `getRuntimeContentPolicy`)? Different modalities
  carry different evidentiary weight (a diagnostic-mode attempt is a
  stronger, more deliberately elicited signal than an idle practice
  click);
- an **optional** confidence response, explicitly opt-in and never
  required to use the course (see K.3 minimization);
- whether the learner *changed* their answer before submitting (a response
  change can indicate deliberation or reconsideration — its evidentiary
  meaning is genuinely ambiguous and must never be silently collapsed into
  either "confident" or "unsure");
- correctness of that specific attempt (not overwritten by later attempts —
  additive, append-only per learner-concept evidence stream).

**Privacy minimization, and retention/deletion rules** (see section K for
full treatment): an attempt-history model that is genuinely richer than
today's is also genuinely more sensitive learner data. It must ship with,
not after, explicit local retention limits, an explicit deletion/export
control (extending the existing `exportJSON()`/Reset pattern rather than
replacing it), and — if ever synced off-device — the informed-consent gate
in section K before any such sync exists at all.

### D.4 Rules for uncertainty, staleness, and conflict

- **Minimum evidence.** No concept may be labeled "weak" or "mastered" below
  an explicit, documented minimum number of *diagnostically eligible*
  (section B.2) attempts. The exact number is an open decision (section O)
  requiring simulated-trajectory validation (section L) before being fixed —
  this document does not invent a threshold, matching the same discipline
  QL-033 already applied ("no psychometric pass threshold is invented in
  this entry").
- **Uncertainty must be visible, not just internally tracked.** Any surfaced
  mastery estimate needs an explicit confidence/uncertainty representation
  (e.g. a range or a qualitative band), not a bare point percentage — see
  Guiding Principle A.3.
- **Staleness.** Evidence has a shelf life. A concept "mastered" eight
  months ago with no review since is not equivalent to one demonstrated
  correct yesterday — see section D.5, "decay," and section H's spaced-review
  design, which exists specifically to keep evidence fresh rather than
  merely to flag it as stale after the fact.
- **Conflicting evidence.** A learner correct on early attempts and wrong
  on recent ones (or vice versa) must never be silently averaged into one
  number that hides the trend. The evidence window (recency-weighted, not a
  simple lifetime average) and the trend itself (improving/declining) are
  both first-class outputs, not internal-only signals.
- **Concept mastery decay.** A model family choice (section F) determines
  the actual decay function; this document requires only that decay be
  *modeled explicitly* (mastery estimates must be time-aware) rather than
  silently absent — an unreviewed concept from a year ago must not read
  identically to one reviewed yesterday.

---

## E. Strength, weakness, and diagnostic experiences

Each experience below is a distinct product surface with its own purpose —
they are not variations of one generic "quiz mode." None of these exist
today; the current product has only undifferentiated practice quizzes per
module.

### E.1 Common definition template

For every experience, this document requires answering:

- **Purpose** — the one question this experience answers for the learner.
- **Eligible item pool** — which items may be drawn from, per section B.2.
- **Minimum evidence** — how much is needed before a result can be reported
  at all (section D.4); below this, the experience must report
  "insufficient evidence," not a forced result.
- **Stopping conditions** — when the experience ends (fixed length, evidence
  threshold reached, learner-initiated stop, or time budget) — and it must
  always be learner-interruptible; no experience may trap a learner into
  finishing.
- **Learner-facing output** — exactly what is shown, in what register
  (never certifying, always evidence-qualified per Guiding Principle A.4).
- **Uncertainty wording** — the literal category labels used ("not yet
  assessed," "insufficient evidence," "fragile," "learning," "mastered" —
  see E.4) and how confidence bands are phrased.
- **Recommended next action** — the specific, explainable next step this
  experience hands off to (often into section H's study plan).
- **Safeguards** — specific protections against memorization and
  overexposure for *this* experience (general protections are in F.5; each
  experience needs its own application of them).

### E.2 The seven experiences

**1. Initial diagnostic assessment**
- Purpose: establish a first, low-confidence baseline across the whole
  subject pack for a learner with no prior evidence.
- Eligible pool: diagnostically eligible items (B.2) spanning every concept
  at a broad sampling rate, prioritizing coverage over depth.
- Minimum evidence: none required to *start* (that's the point); output is
  explicitly labeled provisional/low-confidence throughout.
- Stopping: fixed, learner-communicated length (e.g. "about 20 questions,
  ~15 minutes"), or early learner-initiated stop with an honest "partial
  baseline, coverage was X%" result rather than a silently truncated one.
- Output: a first-pass map of "some initial signal," "insufficient
  evidence," explicitly per concept — never a single overall score framed
  as definitive.
- Safeguards: broad item sampling (not the same handful of "canonical"
  items every learner sees first) to avoid the very first cohort's answers
  leaking as a de facto answer key.

**2. Category or domain assessment**
- Purpose: deeper evidence within one existing blueprint domain (e.g.
  "Molecular cytogenetic testing").
- Eligible pool: diagnostically eligible items in that domain only.
- Minimum evidence: per-concept threshold from D.4, domain-scoped.
- Stopping: evidence-threshold-driven per concept in the domain, capped at
  a communicated maximum length.
- Output: per-concept-in-domain status, plus an honest domain-level roll-up
  that states its own coverage percentage.
- Safeguards: item-pool balancing within the domain (F.5) so a learner
  retaking this assessment doesn't see the identical item set every time.

**3. Focused concept check**
- Purpose: answer "do I currently have evidence for *this one* concept?" —
  the finest-grained, most explainable experience.
- Eligible pool: items mapped to that single concept (plus its immediate
  prerequisites, optionally, to distinguish "doesn't know the prerequisite"
  from "doesn't know this concept specifically").
- Minimum evidence: the same per-concept minimum as everywhere else — a
  focused check does not get to claim a lower bar just because it's
  targeted.
- Stopping: reach the concept's evidence threshold, or a small fixed cap
  (this is meant to be quick).
- Output: single-concept status with full evidence basis shown.
- Safeguards: item-variant rotation (C.1) so repeated concept checks don't
  become "memorize this one question."

**4. Cumulative mixed review**
- Purpose: interleaved retrieval across everything the learner has
  previously engaged with, to fight forgetting and build durable retention
  (feeds section H).
- Eligible pool: everything the learner has prior evidence for, weighted by
  section H's spacing schedule (due/overdue items prioritized).
- Minimum evidence: N/A — this experience *generates* evidence, it doesn't
  gate on it.
- Stopping: learner-chosen session length/time budget (section H).
- Output: session summary (attempted/correct/still due), feeding back into
  every concept's evidence window, not a standalone score.
- Safeguards: interleaving itself (F.2) is the core memorization defense
  here — never block-present all items from one concept together.

**5. Delayed-retention check**
- Purpose: specifically measure retention after a deliberate delay from
  original exposure — the one experience that can honestly speak to
  "durable" understanding (D.1).
- Eligible pool: concepts with prior evidence old enough to constitute a
  genuine delay (not "the next screen") — the exact delay threshold is an
  open decision (section O) pending real usage data.
- Minimum evidence: requires prior evidence to exist at all; otherwise this
  experience doesn't apply to that concept yet ("not enough history for a
  retention check").
- Stopping: reach evidence threshold per re-tested concept or a fixed
  session cap.
- Output: retention status *per concept*, explicitly distinguished from
  the original mastery estimate ("you scored well here originally; on
  delayed retest, evidence is now X" — never silently merged into one
  number).
- Safeguards: uses item variants (C.1), not the original item verbatim,
  wherever a variant exists — otherwise this measures item memorization,
  not concept retention.

**6. Misconception-focused remediation**
- Purpose: directly target a *specific*, previously identified misconception
  (D.1) rather than the concept broadly.
- Eligible pool: items whose distractors are tagged to the specific
  misconception in question (requires distractor-level misconception
  tagging — new authoring metadata, does not exist today).
- Minimum evidence: requires the misconception to have been flagged at all
  (repeated selection of the same tagged distractor) — this experience is
  offered, never forced.
- Stopping: evidence that the specific wrong pattern has stopped
  recurring, or a fixed cap with an honest "still recurring" result.
- Output: explicitly names the misconception in learner-facing language and
  the evidence that it's resolving or persisting — never just "wrong
  answer, try again."
- Safeguards: must not just repeat the same triggering item — needs at
  least one item variant to distinguish "learned the concept" from
  "memorized this item's correct answer."

**7. Readiness review with explicit limitations**
- Purpose: the closest this platform ever gets to "how ready do you look,"
  bounded by an unavoidable, always-visible limitations statement.
- Eligible pool: the full diagnostically eligible pool, at whatever
  coverage the learner has actually built up — never a forced full
  re-assessment just to produce this view.
- Minimum evidence: reported per-domain and overall; domains below minimum
  evidence are explicitly called out as "not enough evidence to include,"
  never silently omitted or silently treated as zero.
- Stopping: this is a *report*, not a new testing session by default (it
  may recommend running one of the other six experiences to fill gaps).
- Output: **must** include, every time, in the learner's own words: this is
  not a certification prediction, not a guarantee of exam readiness, and is
  bounded by exactly which items/concepts had sufficient reviewed,
  diagnostically eligible evidence (Guiding Principle A.4, section B.3).
- Safeguards: this experience is the highest-stakes-sounding one and
  therefore the most conservative — if section B's prerequisites are not
  met bank-wide, this experience should refuse to produce an overall
  number at all, offering only the per-domain, evidence-qualified detail
  instead.

### E.3 The learner dashboard

A future dashboard (not the diagnostic experiences themselves, but their
persistent summary view) should explain, every time it's opened:

- strongest supported concepts (with evidence basis);
- weakest supported concepts (with evidence basis — never conflated with
  "insufficient evidence" concepts, see E.4);
- concepts with insufficient evidence (a distinct, visible list, not a
  silent absence);
- recent improvement or decline (trend, not just current state — D.4);
- knowledge that may be decaying (staleness-flagged, feeding section H);
- likely misconceptions (only where distractor-level evidence actually
  supports one — never inferred from a single wrong answer);
- a recommended study sequence (feeding section H, with reasons — F.5's
  explainability requirement applies here directly);
- for every recommendation: why it was made, in terms of the specific
  evidence behind it;
- what evidence could change the conclusion — an explicit statement of
  what a learner could do next to move a concept from "insufficient
  evidence" to a real result, or from "fragile" toward "mastered."

### E.4 Status vocabulary

Exactly these categories, kept meaningfully distinct — a future
implementation must never collapse any two of these into the same label or
color:

| Status | Meaning | Must never be confused with |
| --- | --- | --- |
| Not assessed | No attempts recorded at all for this concept | "Weak" — a concept never attempted is not evidence of weakness |
| Insufficient evidence | Below the minimum-evidence threshold (D.4), regardless of whether those few attempts were right or wrong | "Weak" or "mastered" — too little evidence to say either |
| Learning | Above minimum evidence, mixed/improving results, not yet at a mastery bar | "Fragile" — learning-in-progress is expected and not itself a red flag |
| Fragile | Was previously at "mastered" or "learning" with good results, but recent/decayed evidence casts doubt | "Weak" — fragile implies prior demonstrated capability that needs refreshing, a different recommendation (spaced review) than weak (needs re-teaching) |
| Weak | Sufficient evidence, and it consistently shows low performance | "Insufficient evidence" — weak is an affirmative, evidence-backed finding |
| Mastered | Sufficient, recent, consistent evidence of strong performance | A guarantee of anything on a real examination (Guiding Principle A.4) |

Unanswered concepts default to **"not assessed," never automatically to
"weak."** This is a specific, named anti-pattern this document forbids: a
dashboard that silently treats "the learner hasn't gotten here yet" as
"the learner is bad at this" would be actively misleading and is explicitly
out of bounds.

---

## F. Adaptive sequencing

An explicit, incremental progression — this document does not propose
jumping to an advanced adaptive model on day one, and each phase below is
independently valuable and shippable even if later phases never happen.

### F.1 Phase 1 — deterministic, explainable evidence thresholds

- Fixed, documented, human-set thresholds (e.g. "N correct diagnostically
  eligible attempts, at least M of them within the last D days, decide
  status per the E.4 table").
- Concept-tagged diagnostics (requires section C's concept metadata to
  exist first).
- Every recommendation is learner-controlled — the system suggests, the
  learner chooses what to do next. No automatic re-routing yet.
- Fully deterministic and fully explainable by construction: this phase
  has no black box to audit.

### F.2 Phase 2 — spaced retrieval and interleaving

- A concrete spacing algorithm (e.g. a simple, documented expanding-interval
  scheme) determines review due-dates, feeding section H's queue.
- Interleaving: review sessions deliberately mix concepts rather than
  blocking by topic, specifically to fight the illusion of mastery that
  blocked practice produces.
- Prerequisite-aware next-step recommendations: if a concept is weak and
  has an unmastered prerequisite, recommend the prerequisite first
  (requires section G's concept graph).
- Exposure controls and item-pool balancing: track how many times each
  item (not just each concept) has been shown to a given learner, and
  actively rotate to avoid memorization (feeds F.5).

### F.3 Phase 3 — calibrated mastery and forgetting estimates

- Only attempted once **sufficient real learner evidence** exists (not
  synthetic, not assumed) — this phase is explicitly gated on having
  enough prospective attempt-history data (section D.3) to calibrate
  against.
- Requires simulation against historical/synthetic trajectories **and**
  retrospective validation against real (anonymized, consented — section K)
  learner data **before** any calibrated estimate is shown to a real
  learner, not after.
- The forgetting-curve/decay model itself is an open decision (section O),
  not fixed by this document.

### F.4 Phase 4 — carefully evaluated adaptive item selection

- Only after Phase 3's calibration is validated. Adaptive selection (what
  item to show next, dynamically, based on the learner's estimated state)
  is the most powerful and most risk-bearing capability in this document —
  it is also the last one to build, deliberately.
- Must ship with, not after, the explainability guarantee from Guiding
  Principle A.5: every adaptively selected item must be traceable to
  "why this item, why now" in terms a learner can read.

### F.5 Model-family comparison (informational — no selection made here)

| Family | What it needs | What it's good for | What it requires before use here |
| --- | --- | --- | --- |
| Rule-based mastery thresholds (Phase 1) | Nothing but the evidence itself | Full explainability, immediate deployability, easy audit | Nothing further — this is the safe default and the only model family this document actually schedules for near-term use |
| Bayesian Knowledge Tracing (BKT) | A reasonably large set of real per-attempt sequences per concept to fit parameters; assumes a single latent "known/unknown" state per concept | Well-studied, moderately explainable (parameters have real meanings: guess rate, slip rate, learn rate), works with modest data | Real attempt-history data (D.3) at meaningful volume; parameter-fitting validation; an explicit, reviewed decision that its binary known/unknown assumption is an acceptable simplification for this subject |
| Item Response Theory (IRT) / Rasch models | A larger, more diverse real-response dataset; assumes stable item difficulty parameters | Rigorous psychometric grounding, well-suited to calibrating item difficulty itself (directly useful for fixing QL-033's distractor-quality problem, independent of adaptive sequencing) | Real response data at real volume; and, notably, valid items to begin with (section B) — IRT calibration on cueing-compromised items would calibrate the cue, not the concept |
| Deep-learning knowledge tracing (e.g. DKT-style) | Large volumes of real sequential data; typically far less explainable | Potentially higher predictive accuracy at scale | Explicitly the *least* compatible with Guiding Principle A.5 (explainability) as commonly implemented; would require a dedicated explainability layer or interpretable surrogate before consideration, and is not scheduled by this document |

**This document does not select a model family.** Phase 1 ships a
deterministic rule-based approach because it is the only family that needs
no additional data collection and is fully explainable from day one.
Anything past Phase 1 is explicitly gated on real evidence volume and
validation, not chosen for sophistication's own sake (Guiding Principle
A.5's explainability requirement rules out defaulting to the most complex
available model).

### F.6 Protections (apply across all phases)

- **Feedback loops that repeatedly serve the same material** — enforced by
  item-exposure tracking (F.2) and mandatory rotation once an exposure cap
  is hit.
- **Overfitting to one question** — item variants (C.1) required before any
  concept can be marked "mastered" from single-item evidence alone, past
  Phase 1's initial deployment.
- **Answer-position and answer-length cues** — section B's diagnostic
  eligibility gate excludes cueing-compromised items outright; this is a
  content fix, not a modeling workaround.
- **Memorizing item wording** — item variants, plus delayed-retention
  checks using a *different* variant than the original exposure (E.2 #5).
- **Underexposure of difficult topics** — pool-balancing (F.2) must
  actively boost, not just randomly sample, low-coverage concepts.
- **Excessive difficulty jumps** — Phase 4's adaptive selection must
  respect a maximum single-step difficulty delta, not just "pick the
  optimal next item" by raw estimated ability.
- **Opaque or discriminatory recommendations** — every recommendation must
  cite its evidence (E.3); a subgroup-fairness audit is required before any
  Phase 3+ calibrated model reaches real learners (section L).
- **Presenting uncertainty as certainty** — enforced structurally by
  Guiding Principle A.3 and the E.4 status vocabulary; no UI may render a
  bare percentage without its evidence basis and recency.

---

## G. Concept graph and connection-building

### G.1 Relationship types

A subject-independent concept graph, authored and reviewed (never
auto-generated into production, per G.3), supporting:

- **Prerequisites** — "understand A before B" (drives F.2's prerequisite-
  aware recommendations and E.2's focused concept check).
- **Part-of** — "B is a specific case/component of A" (e.g. a specific
  translocation nomenclature rule is part of the broader nomenclature
  system).
- **Comparisons/contrasts** — pairs of concepts commonly confused with each
  other (directly useful for E.2 #6's misconception remediation and for
  building deliberately discriminating cumulative-review items).
- **Mechanisms and consequences** — "A causes/explains B" (supports
  reasoning-style questions and rationale-writing, not just recall).
- **Common confusions** — explicit, authored links between a concept and
  the misconception(s) learners predictably form about it (feeds D.1's
  misconception-evidence category and the distractor-tagging metadata
  section E.2 #6 depends on).
- **Evidence-to-conclusion reasoning** — links representing "this finding,
  combined with that finding, supports this conclusion" (relevant to
  judgment-level items, which `docs/ROADMAP.md`'s Milestone 2A blueprint
  already targets at ~30% of new content).
- **Near-transfer and far-transfer links** — near: a slightly different
  surface form of essentially the same task; far: a genuinely different
  context requiring the same underlying principle. Distinguishing these
  matters directly for D.1's "transfer" evidence category and for how
  aggressively a mastery estimate can generalize from one item to another.

### G.2 How the engine would use the graph

- **Prerequisite review recommendation**: when a concept is weak/fragile
  and has an unmastered prerequisite, recommend the prerequisite, with the
  specific relationship shown as the reason (satisfies F.1's
  explainability requirement directly).
- **Contrasting commonly confused concepts**: when misconception evidence
  (D.1) implicates a specific comparison-link concept pair, surface both
  concepts together in a remediation session (E.2 #6) rather than the
  triggering concept alone.
- **Building mixed questions connecting multiple concepts**: cumulative
  review (E.2 #4) and judgment-level item authoring can deliberately draw
  from graph-adjacent concepts, rather than random sampling, to test
  genuine integration — this is an authoring aid, not an automatic
  question-generation system (see G.3).

### G.3 The graph stays authored and reviewable

**No automatically generated scientific relationship enters production
without human review.** This mirrors the existing rule that AI-generated
content must never be represented as reviewed (`CLAUDE.md`). A future
authoring tool may *suggest* candidate graph edges (e.g. via co-occurrence
in existing module text), but every edge that ships must carry the same
kind of reviewer/date provenance `QUESTION_GOVERNANCE` already requires for
questions — this is a natural extension of that existing model to a new
entity type, not a new governance philosophy.

---

## H. Retention and study planning

### H.1 Components

- **Spaced review queues** — per-concept due dates driven by F.2's spacing
  algorithm; overdue items surface first.
- **Interleaved review** — queue construction deliberately mixes concepts
  (F.2); never a single-concept drill by default.
- **Cumulative retrieval** — E.2 #4's experience is the primary consumer of
  this queue.
- **Learner-chosen goals and available study time** — the learner sets a
  target (e.g. "review for 15 minutes today," or "focus on Molecular
  cytogenetic testing before a target date") and the queue is built to fit,
  never silently overridden by the system's own priorities.
- **Overdue and upcoming reviews** — both surfaced explicitly, distinct
  categories (not merged into one generic "to do" count).
- **Difficulty and cognitive-load controls** — a learner-facing option to
  request an easier session (e.g. after a stressful day) without that
  choice corrupting the underlying evidence record's interpretation (the
  session-difficulty preference is metadata about the session, not a
  reason to discount the attempt's evidentiary value).
- **Recovery after missed study periods** — a lapse in study must not
  produce a punishing pile-up ("47 items overdue!") that discourages
  return; the queue re-balances gracefully, prioritizing the most
  decayed/important concepts within a realistic session size rather than
  demanding the learner clear the entire backlog at once.
- **Notification boundaries** — if notifications exist at all (a genuinely
  open question, section O), they must be opt-in, learner-controlled in
  frequency, and never framed to induce anxiety or guilt over a missed
  streak (directly enforced by H.2 below).
- **Local-only operation versus optional account synchronization** — the
  entire study-plan system must work fully local-only, exactly like today's
  progress tracking; synchronization is an explicitly optional,
  explicitly consented addition (section K), never a requirement to use
  spaced review at all.

### H.2 No coercive design

Recommendations must remain useful without manipulative engagement
mechanics. Specifically **out of bounds** for any phase under this roadmap:

- streak counters designed to induce loss-aversion rather than to inform;
- artificial scarcity or time-pressure not grounded in genuine spacing
  science;
- notification copy engineered for guilt or FOMO rather than genuine
  informational value;
- rewarding raw session count or time-on-task as if it were a learning
  outcome (see section M's explicit separation of engagement from
  learning metrics).

---

## I. Portability and content packs

### I.1 Prerequisites for extracting a reusable engine

Before any subject pack extraction (Phase 7) can begin:

- **Versioned pack identity** — a pack has a name and a semantic version;
  the engine records which pack version produced any given evidence
  (already anticipated by C.5's "concept version at time of attempt").
- **Stable concept, objective, resource, and item IDs** — per C.2, IDs that
  survive content revision and are never derived from array position or
  display order.
- **Content and media manifests** — extending the existing `IMAGES`
  manifest pattern (already versioned-by-status: embedded vs. candidate,
  with rights metadata) to cover all pack content, not just images.
- **Provenance and rights records** — extending `QUESTION_GOVERNANCE`'s
  model to every content type in a pack (concepts, objectives, resources,
  images), not just questions.
- **Review lifecycles** — the same `draft`/`source-checked`/`sme-reviewed`/
  `release-qualified` progression (`docs/CONTENT_GOVERNANCE.md`), applied
  pack-wide, with a pack-level rollup status (a pack cannot claim
  "release-qualified" while any of its still-shipping content is `draft`).
- **Locale and edition sensitivity** — the existing `editionSensitive` field
  on `QUESTION_GOVERNANCE` records is the direct precedent; a pack needs an
  explicit policy for what happens when its underlying standard (e.g. an
  ISCN edition, or an ASCP BOC content guideline revision) changes after
  the pack ships.
- **Collision, replacement, removal, and migration policies** — what
  happens when a pack update renames, merges, splits, or removes a
  concept/item a learner already has evidence against (direct extension of
  the existing stale-ID policy, QL-024, generalized from progress records
  to pack content).
- **Validation and compatibility contracts** — a pack must declare which
  engine version(s) it's compatible with, and the engine must refuse to
  load an incompatible pack rather than degrade silently.
- **Trusted versus untrusted pack boundaries** — a first-party pack (this
  repository's own cytogenetics content) is trusted by construction;
  any future third-party or community pack is untrusted by default and
  requires explicit signing/verification (open decision, section O) before
  the engine treats its content as anything more than "candidate,
  unverified" — directly mirroring the existing rule that a
  runtime-injected question can never self-certify a governance status
  (`getQuestionGovernance()`'s treatment of unknown ids).
- **Pack-level release gates** — a superset of section B's item-level
  diagnostic-eligibility gate: a pack cannot be diagnostically enabled
  until enough of its content clears both scientific review and
  assessment-validity screening.
- **Deterministic import/export behavior** — a pack import/export must be
  round-trip safe and byte-for-byte reproducible for identical input,
  extending the same discipline already required of `importJSON()`
  (`docs/VALIDATION.md` "Progress-import validation and cloning").

### I.2 Reference pack and pilot

- **Cytogenetics is the first reference pack.** Its extraction (Phase 7)
  is the proving ground for every prerequisite above — if the extraction
  process cannot cleanly express the *existing* 153 questions, 17 modules,
  30 exercise items, and 61 flashcards without loss or reinterpretation, it
  is not ready.
- **Molecular biology is the first portability pilot** (Phase 8), chosen
  specifically to prove the engine generalizes beyond cytogenetics-specific
  assumptions (nomenclature-heavy content, ISCN-style structured answers)
  before claiming the engine is genuinely subject-independent.
- **Neither extraction is performed by this document or by opening
  Issue #24.** Both remain scoped to their own phases, gated on the
  prerequisites above actually being met.

---

## J. Public product and commercial strategy

This section identifies defensible product paths and their **technical and
operational requirements**. It makes no pricing decision, cites no market
research, and asserts no revenue projection — per Guiding Principle A.8,
none of that evidence exists yet, and inventing it here would violate this
document's own standard.

### J.1 Candidate paths

| Path | Description | Primary technical/operational needs |
| --- | --- | --- |
| Free/open demonstration course | Today's product, or close to it — no account, static, free | What already exists; lowest operational burden |
| Individual paid learning product | A paid tier with additional features (e.g. adaptive study plan, cross-device sync) | Authentication + account recovery; payments/entitlement handling; data export/deletion; privacy policy/terms; customer support |
| Institutional/cohort licensing | Sold to programs/schools for their students | Everything above, plus instructor/institution data boundaries (a program admin must never see individual learner answer-level data without explicit learner consent), cohort-level (not individual) reporting design, procurement-friendly terms |
| Licensed subject packs | Selling/licensing a pack (e.g. molecular biology) separately from the engine | Pack signing/verification (I.1), content licensing terms distinct from software licensing, versioned entitlement to specific packs |
| Authoring/review tools | Tools supporting `QUESTION_GOVERNANCE`-style workflows, concept-graph editing, item-variant authoring | Could be free (benefits content quality generally) or a separate product; either way, output must still clear the same validity gates as hand-authored content |
| Optional hosted sync/analytics | Cross-device profile, backup, optional aggregate research analytics | Explicit informed consent (section K) before any data leaves the device; encryption in transit and at rest; data minimization |
| Enterprise administration | SSO, advanced admin controls, compliance reporting | Only justified once institutional licensing (above) has real, non-fabricated demand evidence — explicitly not assumed needed by this document |

### J.2 Cross-cutting operational requirements

For any path beyond the current free/static baseline:

- **Authentication and account recovery** — password/passkey/OAuth choice,
  recovery flow, and the security posture of each, all undecided here.
- **Payments and entitlement handling** — PCI-scope-avoidance via a
  third-party processor is the conventional default; no vendor is selected
  by this document.
- **Data export and deletion** — extends the existing `exportJSON()`/Reset
  pattern to any hosted data; must be genuinely complete, not partial.
- **Privacy policy and terms** — required before any account exists;
  content depends on which path(s) are pursued and must be drafted with
  actual legal review, not authored as boilerplate by this planning
  process.
- **Age and jurisdiction considerations** — e.g. COPPA/GDPR/state-level
  student-privacy law applicability depends on actual target markets and
  age ranges, not decided here; flagged as a required legal review before
  any hosted, accounts-based path ships.
- **Content and image licensing** — see J.3; current repository image
  rights (per-image, non-commercial-agnostic evidence recorded in
  `THIRD_PARTY_NOTICES.md`) are not automatically sufficient for a
  commercial product without re-verification against each source's actual
  license terms for commercial use.
- **Accessibility support** — the existing automated WCAG scanning and
  keyboard-testing baseline (`docs/VALIDATION.md`) is a floor, not a
  ceiling, for any paid product; a genuine assistive-technology review
  (already an open item today, `docs/ROADMAP.md` Milestone 0) becomes
  higher-stakes once money is involved.
- **Customer support** — channel, staffing, and SLA are undecided; scales
  with which path(s) are pursued.
- **Incident response** — a documented plan is required before any account
  system exists, not added after a first incident (see K.4).
- **Uptime and backup expectations** — only relevant once hosted services
  exist; the current static product has no uptime dependency beyond GitHub
  Pages' own.
- **Abuse prevention** — rate limiting, account-sharing detection, and
  content-pack-parsing hardening (I.1, K's hostile-import testing) scale
  with which paths are pursued.
- **Instructor and institution data boundaries** — see J.1's institutional
  row; this needs its own explicit design, not an assumption that
  "institutional" automatically means "instructor sees everything."
- **Vendor and hosting costs** — real costs depend on real vendor
  selection, not estimated here.
- **Versioned releases and end-of-life policy** — needed once any paid
  commitment exists (a customer paying for a pack/tier needs to know its
  support lifetime).

### J.3 Current licensing vs. future commercial rights (explicitly not a legal conclusion)

`docs/LICENSING.md` currently states no repository-wide license has been
selected; original content, diagrams, and third-party media have separate,
individually-tracked status (`THIRD_PARTY_NOTICES.md`). **This document
draws a clear line, without making any legal determination:**

- Rights sufficient for a free, non-commercial, static educational
  artifact (today's product) are not automatically sufficient for a paid
  commercial product, a redistributable content pack, or a
  third-party-contributed pack.
- Any future commercialization path must re-verify every third-party
  asset's license against *commercial* use terms specifically (several
  currently-used licenses, e.g. certain CC variants, distinguish
  commercial from non-commercial use), not assume the existing
  redistribution-for-education clearance extends automatically.
- This re-verification, and any actual licensing decision, requires real
  legal review before a commercial path launches — not performed, and not
  simulated, by this planning document.

---

## K. Privacy, security, and ethical boundaries

### K.1 Data minimization and local-first default

- Every capability in this document must work local-only by default,
  exactly like today's `localStorage`-based progress — this is restated
  from Guiding Principle A.7 because it specifically bounds this section:
  no phase may require cloud storage to function at its baseline level.
- Collect only what a specific, identified feature actually needs (D.3's
  attempt-history fields are the maximal future set contemplated, and even
  those are individually justified per field — response time and
  confidence in particular are marked optional and collected "only if
  lawfully and interpreted cautiously," per the original brief).

### K.2 Consent before anything leaves the device

- **No cloud synchronization or research analytics without explicit,
  informed, opt-in consent** — never a pre-checked box, never bundled with
  an unrelated action (e.g. never "consent to sync" implied by merely
  creating an account for an unrelated paid feature).
- Consent must be specific to what's being shared (learner-evidence data
  is more sensitive than, say, anonymous crash-diagnostic pings, and each
  needs its own, separately worded consent if both ever exist).

### K.3 Separation of identifiable data from learning-event data

- If accounts ever exist (Phase 9+), identity data (email, payment
  info) and learning-evidence data (attempts, mastery estimates) should be
  architecturally separable — so that, for example, a data-export or
  deletion request can be fulfilled precisely, and a security incident
  affecting one does not automatically expose the other.

### K.4 Security and operational controls (only relevant once hosting exists)

- Encryption in transit and at rest for any hosted data.
- Access controls scoped to the minimum necessary (an institutional admin
  seeing cohort-level, not individual, data by default — J.2).
- Retention and deletion rules, decided and published before data
  collection begins, not backfilled.
- Audit logs for any administrative access to learner data.
- Account deletion and full data export as standing, self-service
  capabilities, not a support-ticket-only process.
- A documented incident-response plan, before any account system ships.
- Threat modeling for any new attack surface a hosted service introduces
  (this repository currently has an unusually small attack surface — a
  static site with no backend — and any hosted addition should be
  evaluated against how much that surface grows).
- Dependency and supply-chain review for any new runtime dependency —
  extending the existing discipline of having zero production JavaScript
  dependencies today (`README.md` "Architecture") to whatever a hosted
  service eventually requires, deliberately, not by accretion.
- **Safe import/content-pack parsing** — a future pack-import path is a
  new, real attack surface (parsing untrusted third-party data) and must
  be built with the same adversarial rigor already applied to
  `importJSON()`'s progress-import hardening (deep-cloning, rejecting
  dangerous keys like `__proto__`/`constructor`/`prototype`, rejecting
  accessor properties and symbol keys, size/entry-count limits) — see
  `docs/VALIDATION.md` "Progress-import validation and cloning" as the
  existing template this must extend, and L's "hostile import/content-pack
  testing" as its required test category.
- **Avoidance of sensitive inferences not needed for learning** — the
  engine must not infer or store anything beyond what a specific learning
  feature actually needs (e.g. no inferring demographic or health
  information from response patterns, even if technically possible).

### K.5 The explicit gate

**No accounts, telemetry, or cloud learner tracking should be implemented
before the decisions in this section, and their corresponding user-facing
disclosures, actually exist** — not as an aspiration, but as a literal
sequencing requirement reflected in section N (Phase 9 cannot begin before
this section's open decisions, tracked in section O, are resolved).

---

## L. Quality, audit, and evaluation program

A test/audit matrix, distinguishing what can be automated now, what
requires qualified human review, and what **cannot be truthfully claimed
complete yet** — this last category matters as much as the other two,
matching this document's evidentiary discipline (Guiding Principle A.8).

| Category | Automated today or plannable now? | Requires qualified human review? | Cannot be truthfully completed yet (and why) |
| --- | --- | --- | --- |
| Unit tests | Yes — same dependency-free-test discipline as today's `tests/dom-behavior.mjs`/`tests/question-governance.mjs` | No | — |
| Schema and contract tests | Yes — same discipline as `tests/validate-course.mjs` | No | — |
| Property-based and mutation tests | Yes — same discipline as this repository's established mutation-testing practice (`docs/VALIDATION.md`) | No | — |
| Migration and backward-compatibility tests | Yes, once a new schema version exists to migrate from/to | No (review of the migration *design*, yes) | Cannot exist before section C.5's schema decisions are made |
| Real-browser tests | Yes — Playwright, same as today | No | — |
| Accessibility automation | Yes — axe-core, same as today | Genuine assistive-technology review still required (already an open item today, unrelated to this roadmap) | — |
| Genuine assistive-technology review | No | Yes — a real screen-reader user/expert, not automation | Not performed today either; stays open regardless of this roadmap |
| Responsive and physical-touch review | Partially automatable (touch *emulation*, already done today) | Yes for real hardware (already an open item today) | Real physical-device testing not performed today either |
| Security and privacy testing | Partially (dependency scanning, static analysis) | Yes — a real security review before any hosted service ships | Cannot be meaningfully performed before a hosted service exists to test |
| Hostile import/content-pack testing | Yes, plannable now using the existing `importJSON()` hardening as a template (K.4) | Recommended for the initial design | Cannot be *executed* before a pack-import feature exists |
| Scientific-content review | No, must be human | Yes — the existing `QUESTION_GOVERNANCE`/SME process, extended to concepts/objectives/graph edges | — |
| Provenance and rights audits | Partially (structural checks) | Yes — human judgment on source sufficiency, same as today | — |
| Item-writing and assessment-cue audits | Partially automatable (the QL-033 count itself was a mechanical computation) | Yes — the *correction* requires human distractor-writing judgment | QL-033 itself is exactly this: confirmed, not yet corrected |
| Simulated learner trajectories | Yes, plannable now, entirely synthetic | Design review of the simulation's realism | Cannot validate a real calibrated model (F.3) without also having real data — simulation alone is necessary but not sufficient |
| Psychometric analysis with adequate human data | No | Yes | **Cannot be truthfully claimed complete until real, sufficient-volume, consented learner data exists** — explicitly not simulable |
| Model calibration and subgroup analysis | Partially (the statistical computation) | Yes — interpreting subgroup results and deciding remediation | Same data dependency as above |
| Recommendation safety and explainability | Partially (can test that every recommendation carries a citable reason, structurally) | Yes — human judgment on whether the reason is actually a *good* reason | — |
| Delayed-retention validation | No | Yes, and requires real elapsed time | **Cannot be accelerated or simulated honestly** — a retention claim requires learners to actually come back later; this is a hard, unavoidable timeline dependency |
| Disaster recovery and account deletion (if hosted) | Yes, once hosting exists | Yes — a real recovery drill | Cannot exist before Phase 9 |
| Payment/entitlement testing (if commercialized) | Yes, once commercialized | Yes | Cannot exist before Phase 10 |

---

## M. Metrics and decision criteria

### M.1 Candidate success metrics

- **Pre/post learning gain** — evidence-qualified (section D), never a bare
  score delta without its basis.
- **Delayed retention** (E.2 #5) — the single most direct measure of
  whether this platform achieves its actual purpose, and the one most
  gated by real elapsed time (L).
- **Misconception resolution rate** — requires distractor-level tagging
  (E.2 #6) to exist first.
- **Calibration between confidence and correctness** — requires the
  optional confidence field (D.3) to exist and be adopted by enough
  learners to measure.
- **Concept coverage** — how much of the graph (G) has *any* evidence,
  distinct from how well-mastered that evidence shows.
- **Recommendation acceptance and usefulness** — did the learner follow a
  recommendation, and did doing so correlate with improved evidence
  afterward.
- **Time to reach a defined learning goal** — learner-set (H.1), not a
  system-imposed pace.
- **Learner understanding of the dashboard** — a genuinely qualitative/UX
  metric (can a learner correctly explain what a "fragile" status means
  after seeing it) — not inferable from clicks alone.
- **Accessibility task success** — real-user task completion, not just
  automated-scan pass rate.
- **Import/export and persistence reliability** — extends today's existing
  validation discipline (`docs/VALIDATION.md`) to whatever new data model
  ships.

### M.2 Guardrails

- No misleading mastery claim (enforced structurally by Guiding Principle
  A.3–A.4 and section E.4's vocabulary).
- No use of compromised questions in any diagnostic/mastery computation
  (section B).
- No unexplained recommendation (Guiding Principle A.5, section F.5).
- No material subgroup degradation in any calibrated model, checked before
  it reaches real learners (section L).
- No privacy or accessibility regression versus the current baseline —
  every phase in section N must pass the existing accessibility/privacy
  gates at minimum, not merely "not make things worse eventually."
- No engagement optimization at the expense of learning (section H.2) —
  a design that increases time-on-site or session count without a
  corresponding, independently measured learning-outcome improvement is a
  guardrail violation, not a success, under this plan.

### M.3 Learning outcomes vs. engagement metrics — explicit separation

**Time-on-site, streaks, and raw question counts must never be treated as
proof of learning.** They may be tracked as operational/product health
signals (useful for, e.g., noticing a confusing UI), but they must never
appear alongside, or be substitutable for, the learning-outcome metrics in
M.1 in any report, dashboard, or decision about whether a feature "worked."
This separation is a direct consequence of Guiding Principle A.1
("learning evidence must be distinguished from mere activity").

---

## N. Phased roadmap and acceptance gates

Ordered, small, independently reviewable deliverables. Every phase defines
prerequisites, scope, explicit exclusions, deliverables, automated tests,
human audits, measurable exit criteria, known risks, and a rollback/
disablement strategy — no phase is "big bang," and every phase can stop
after shipping without blocking the ones before it.

### Phase 0 — Assessment and scientific-validity prerequisites

- **Prerequisites:** none (this is the starting gate).
- **Scope:** correct or quarantine the QL-033 cueing defect (B.1); advance
  question governance beyond Draft for at least the items any early
  diagnostic surface would use (B.2).
- **Explicit exclusions:** no diagnostic/adaptive feature ships in this
  phase; this phase is entirely about the assessment bank itself.
- **Deliverables:** a corrected or explicitly quarantined answer-choice
  distribution; documented `diagnosticEligible` criteria and metadata
  design (not necessarily full re-authoring of all 153 items — quarantine
  is an acceptable interim state per B.1).
- **Automated tests:** a committed check for the answer-index/length
  distribution going forward (preventing QL-033 from silently recurring in
  future authoring), extending the existing structural-validation suite.
- **Human audits:** Austin's item-writing review of every corrected
  distractor (B.1's remedy constraints — no mechanical fix).
- **Exit criteria:** zero diagnostically-eligible items exhibit the
  uncorrected QL-033 pattern; `docs/QUALITY_LOG.md` QL-033 marked
  corrected (not merely "recorded"), with reproduced before/after counts.
- **Known risks:** distractor rewriting could introduce new scientific
  inaccuracies if rushed — mitigated by requiring the same
  `QUESTION_GOVERNANCE` review discipline already in force.
- **Rollback:** none needed — this phase only improves existing content;
  no new runtime capability to disable.

### Phase 1 — Complete current Milestone 1 foundations

- **Prerequisites:** none; can run in parallel with Phase 0.
- **Scope:** the two remaining open `docs/ROADMAP.md` Milestone 1 items —
  image-manifest schema normalization, and public-API browser contract
  tests for every existing API claim.
- **Explicit exclusions:** no new API surface; this phase tests and
  normalizes what already exists.
- **Deliverables:** normalized `IMAGES` candidate-record schema; a
  Playwright/contract-test suite covering every documented `CytoCourse.*`
  method and event.
- **Automated tests:** the deliverable itself.
- **Human audits:** none beyond ordinary code review.
- **Exit criteria:** both `docs/ROADMAP.md` items checked off with
  committed evidence, same as every other completed roadmap item's
  pattern.
- **Known risks:** low; this is well-understood, already-scoped work.
- **Rollback:** N/A — test/schema hardening only.

### Phase 2 — Subject-independent concept/objective and item metadata design

- **Prerequisites:** Phase 0 substantially underway (concept mapping is far
  more valuable once the items being mapped are trustworthy).
- **Scope:** design (not necessarily fully populate) the concept,
  objective, and item-metadata model from section C; assign concept IDs to
  cytogenetics content as a first population pass.
- **Explicit exclusions:** no mastery computation, no UI changes yet — this
  is a data-modeling phase.
- **Deliverables:** a documented concept/objective schema; concept IDs on
  existing cytogenetics questions; a design doc for prerequisite/graph
  edges (not yet the full graph — that's Phase 6).
- **Automated tests:** schema/contract tests for the new metadata, ID
  stability tests (concept IDs independent of module reordering).
- **Human audits:** Austin's review of the initial concept taxonomy for
  cytogenetics correctness.
- **Exit criteria:** every diagnostically-eligible question (Phase 0's
  output) has a valid concept mapping.
- **Known risks:** a poorly designed taxonomy is expensive to fix later —
  mitigated by treating this as its own reviewed deliverable, not a rushed
  side effect of a later phase.
- **Rollback:** additive metadata; can be reverted without affecting
  existing progress/content.

### Phase 3 — Prospective attempt-history and learner-evidence design

- **Prerequisites:** Phase 2 (needs concept IDs to attach evidence to).
- **Scope:** design and implement the prospective attempt-history model
  (D.3), starting fresh — never retrofitted onto existing `SCHEMA_V = 2`
  records (D.2).
- **Explicit exclusions:** no mastery/dashboard UI yet (Phase 4); no
  confidence/response-time collection unless independently justified and
  reviewed per K.1's minimization principle.
- **Deliverables:** a new, versioned evidence-record schema; migration
  policy (additive, new schema version per C.5); local storage/retention
  design (K.4).
- **Automated tests:** schema/contract/migration tests; privacy-boundary
  tests (no more data collected than declared).
- **Human audits:** a privacy review of the new data model before it ships
  (K).
- **Exit criteria:** new attempts are recorded in the new model
  prospectively; old records remain untouched and honestly labeled as
  last-attempt-only (D.2); export/deletion cover the new data.
- **Known risks:** scope creep toward collecting "everything we might want
  someday" — mitigated by K.1's per-field justification requirement.
- **Rollback:** the new evidence stream can be disabled without affecting
  the existing last-attempt-mastery analytics, which keep working
  unchanged.

### Phase 4 — Explainable local diagnostic and strength/weakness dashboard MVP

- **Prerequisites:** Phases 0–3.
- **Scope:** ship F.1 (deterministic thresholds) and a first version of the
  E.3 dashboard and E.2's initial-diagnostic/concept-check experiences,
  fully local, fully explainable.
- **Explicit exclusions:** no spacing/interleaving yet (Phase 5), no
  concept graph yet (Phase 6, though prerequisite links can be stubbed
  out), no calibrated/adaptive model (Phase 11).
- **Deliverables:** the dashboard UI; E.4's status vocabulary implemented
  and tested; B.3's eligibility reporting.
- **Automated tests:** unit/contract tests for threshold logic; UI tests
  for every status category rendering correctly and distinctly.
- **Human audits:** UX review of the uncertainty/evidence-basis wording
  (Guiding Principle A.3–A.4) — this is the first learner-facing surface
  making mastery-adjacent claims, so its language needs particular
  scrutiny.
- **Exit criteria:** a learner can see, for real recorded evidence,
  per-concept status (E.4) with basis, and never sees an unqualified bare
  percentage.
- **Known risks:** the single biggest risk in this entire roadmap is
  *tone* — even a fully honest, evidence-qualified dashboard can still
  read as more authoritative than intended if worded carelessly; mitigated
  by the mandatory UX/wording review above.
- **Rollback:** the dashboard is an additive view; disabling it does not
  affect underlying progress data.

### Phase 5 — Spaced retrieval, interleaving, and study-plan MVP

- **Prerequisites:** Phase 4.
- **Scope:** F.2 and section H's spaced-review queue and cumulative-mixed-
  review experience (E.2 #4).
- **Explicit exclusions:** no calibrated forgetting model yet (F.3) — use a
  fixed, documented spacing scheme.
- **Deliverables:** the review queue; H.1's learner-controlled goal/time-
  budget settings; H.2's anti-coercion guardrails implemented and tested.
- **Automated tests:** queue-construction logic; interleaving-distribution
  tests; a specific test that no streak/guilt-framing copy exists
  (H.2 as a literal, checkable constraint).
- **Human audits:** UX review against H.2.
- **Exit criteria:** a learner can run a spaced cumulative review session
  end to end, entirely local, with graceful recovery after a lapse (H.1).
- **Known risks:** an overly aggressive spacing scheme could overwhelm a
  returning learner — mitigated by H.1's explicit graceful-recovery
  requirement and a session-size cap.
- **Rollback:** disabling the queue reverts to Phase 4's undirected
  practice, not a broken state.

### Phase 6 — Prerequisite and misconception concept graph

- **Prerequisites:** Phase 2 (concept IDs), and enough real usage from
  Phases 4–5 to know which misconceptions are actually worth tagging
  (though initial prerequisite edges can be authored from subject-matter
  expertise alone, independent of usage data).
- **Scope:** section G's graph, authored and reviewed; G.2's engine
  integrations (prerequisite recommendation, contrast presentation).
- **Explicit exclusions:** no auto-generated edges reaching production
  (G.3) — even if authoring tooling suggests candidates.
- **Deliverables:** the graph data model; Austin's authored/reviewed
  prerequisite and common-confusion edges for cytogenetics; the E.2 #6
  misconception-remediation experience, now fully functional.
- **Automated tests:** graph structural integrity (no cycles in
  prerequisite edges, no dangling references); integration tests for
  prerequisite-aware recommendations.
- **Human audits:** Austin's scientific review of every edge, matching
  `QUESTION_GOVERNANCE`'s existing evidentiary bar.
- **Exit criteria:** at least the highest-value prerequisite chains
  (subject-matter-expert-identified) are graphed and driving real
  recommendations.
- **Known risks:** graph authoring is genuinely labor-intensive at scale —
  mitigated by prioritizing high-value edges first rather than attempting
  exhaustive coverage in one pass.
- **Rollback:** an empty/partial graph degrades gracefully to Phase 5's
  behavior (no prerequisite recommendation shown, not a broken one).

### Phase 7 — Cytogenetics content-pack extraction

- **Prerequisites:** section I.1's full prerequisite list; Phases 2–6
  substantially complete (extraction is far easier once the content is
  already concept-mapped, evidence-modeled, and graphed).
- **Scope:** separate the cytogenetics content from the engine per C.3/I.1,
  preserving the single-portable-artifact product value (`docs/
  ARCHITECTURE.md` "Why a single file") for the shipped product even if the
  *source* becomes modular — matching the existing "Restructuring trigger"
  doctrine that a build may modularize authoring while still emitting one
  portable `index.html`.
- **Explicit exclusions:** no second subject pack yet (Phase 8); no
  third-party/untrusted pack support yet (that's implied by, but not
  required for, extracting the first, fully trusted, first-party pack).
- **Deliverables:** the cytogenetics pack in its final versioned format;
  a working, byte-for-byte-equivalent (in learner-visible behavior) engine
  consuming it.
- **Automated tests:** the full existing test suite, unchanged in
  observable behavior, now running against the extracted architecture —
  this phase's core acceptance test is "nothing observable changed for the
  learner."
- **Human audits:** an architecture review confirming the
  `docs/ARCHITECTURE.md` "Restructuring trigger" bar (a measured
  maintenance problem, not modernization for its own sake) was actually
  met before this phase began.
- **Exit criteria:** the shipped product is unchanged from a learner's
  perspective; the pack/engine boundary is real and documented.
- **Known risks:** the single biggest risk in this roadmap's technical
  arc — a botched extraction could silently change content, progress
  semantics, or the public API. Mitigated by the "byte-for-byte
  observable-behavior-equivalent" acceptance bar above and the existing
  "must never silently change progress, analytics, or public API
  semantics" constraint (`CLAUDE.md`).
- **Rollback:** keep the pre-extraction `index.html` as a tagged,
  releasable fallback until the extracted version has run clean in
  production for a defined burn-in period.

### Phase 8 — Molecular-biology portability pilot

- **Prerequisites:** Phase 7 complete and stable.
- **Scope:** build a second, genuinely different subject pack to test
  whether the engine's assumptions (concept model, evidence model, graph
  model) actually generalize, per I.2.
- **Explicit exclusions:** this is a *pilot* — not a commitment to ship
  molecular biology as a full, blueprint-complete course; scope can be a
  deliberately small proof-of-concept slice.
- **Deliverables:** a working molecular-biology pack exercising the engine;
  a report on which engine assumptions held and which needed generalizing.
- **Automated tests:** the same engine-level test suite, now run against
  two packs, proving no cytogenetics-specific assumption leaked into the
  "generic" engine.
- **Human audits:** subject-matter review of the molecular-biology content
  by someone qualified in that domain — explicitly not Austin's
  cytogenetics credential by default; a new reviewer identity requires the
  same approved-reviewer-registry treatment `QUESTION_GOVERNANCE` already
  uses, scoped to the new subject pack.
- **Exit criteria:** the pilot pack loads, functions, and is diagnostically
  gated (section B, generalized) exactly like the cytogenetics pack, with
  no engine code containing cytogenetics-specific logic.
- **Known risks:** discovering the engine isn't actually subject-
  independent yet — this is the explicit *purpose* of running a pilot
  before a real commitment, not a failure if it happens.
- **Rollback:** the pilot pack can simply not ship; it does not affect the
  cytogenetics pack's availability.

### Phase 9 — Optional accounts, synchronization, and privacy architecture

- **Prerequisites:** section K's decisions resolved (section O), plus a
  drafted privacy policy/terms (J.2).
- **Scope:** the minimum viable account/sync system meeting K's
  requirements — identity/evidence data separation (K.3), consent flow
  (K.2), export/deletion (K.4).
- **Explicit exclusions:** no payments/entitlement yet (Phase 10); the
  local-only experience remains fully functional and the default.
- **Deliverables:** account creation/recovery; explicit sync-consent UI;
  data export/deletion self-service; incident-response plan (K.4).
- **Automated tests:** security/privacy test suite (L); consent-flow tests
  (cannot sync without explicit opt-in, structurally enforced).
- **Human audits:** a real security review before launch (L); legal review
  of the privacy policy/terms.
- **Exit criteria:** an opted-in learner can sync across devices with a
  fully auditable, minimal data footprint; an opted-out learner sees zero
  behavior change from today.
- **Known risks:** this phase introduces the platform's first real
  security attack surface — mitigated by the threat-modeling and
  dependency-review requirements in K.4, performed *before* launch.
- **Rollback:** the sync feature can be disabled/decommissioned without
  affecting local-only operation, which remains the architectural default
  throughout (Guiding Principle A.7).

### Phase 10 — Commercial-product readiness and operational controls

- **Prerequisites:** Phase 9; a real (not fabricated) licensing
  determination for any content intended to be sold (J.3).
- **Scope:** whichever path(s) from J.1 are actually pursued, with their
  full J.2 operational-requirement checklist satisfied.
- **Explicit exclusions:** no pricing or packaging decision is made by
  this document (Guiding Principle A.8); this phase *implements* a
  decision made elsewhere, separately, with real evidence.
- **Deliverables:** depends entirely on the path(s) chosen; at minimum,
  payments/entitlement, support channel, and versioned release/EOL policy.
- **Automated tests:** payment/entitlement test suite (L).
- **Human audits:** legal review of terms/licensing (J.3); a real
  security review scoped to the payment surface specifically.
- **Exit criteria:** depends on path; the invariant across all paths is
  that every J.2 requirement relevant to the chosen path is satisfied
  before launch, not retrofitted after the first customer.
- **Known risks:** commercializing before Phase 0–9's trust
  infrastructure is solid would sell a product this document explicitly
  says isn't ready yet — mitigated by the strict phase ordering itself.
- **Rollback:** a commercial path can be paused/sunset using the
  versioned-release/EOL policy this phase itself requires shipping.

### Phase 11 — Evidence-based adaptive calibration using adequate real-world data

- **Prerequisites:** Phases 3–6 running in production long enough to
  generate real evidence at meaningful volume; Phase 0's assessment
  validity holding throughout (re-verified, not assumed still true).
- **Scope:** F.3–F.4 — calibrated mastery/forgetting models and, only after
  validation, adaptive item selection.
- **Explicit exclusions:** no model family is pre-selected (F.5); no
  calibrated model reaches a real learner before simulation +
  retrospective validation + subgroup analysis (L) all pass.
- **Deliverables:** a validated calibrated model; adaptive selection,
  shipped incrementally and remaining fully explainable (Guiding Principle
  A.5) and disablable per-learner.
- **Automated tests:** calibration/regression tests against held-out real
  data.
- **Human audits:** the full L-table's human-required rows for this
  category — psychometric analysis, subgroup analysis, recommendation-
  safety review — all performed by qualified reviewers before launch.
- **Exit criteria:** a calibrated model demonstrably outperforms Phase
  1's deterministic thresholds on real, held-out evidence, with no
  material subgroup degradation (M.2), and every recommendation remains
  individually explainable.
- **Known risks:** the temptation to ship a more "sophisticated" but less
  explainable model — explicitly foreclosed by Guiding Principle A.5 and
  F.5's model-family framing, which do not permit trading away
  explainability for predictive accuracy without a dedicated, reviewed
  exception.
- **Rollback:** Phase 1's deterministic model remains available as a
  fallback indefinitely — Phase 11 is additive, not a replacement that
  removes the explainable baseline.

### Recommended next implementation task after this roadmap PR

Based on repository evidence — `docs/ROADMAP.md`'s own stated sequencing
("this work begins only after Milestone 1 establishes stable identity,
provenance, and review requirements"), the fact that Milestone 1's
provenance item just merged (PR #23) while two Milestone 1 items remain
explicitly open, and this document's own Phase 0/Phase 1 ordering — the
recommended next implementation task is **Phase 0's QL-033 correction**
(`docs/ROADMAP.md`'s open item "Correct the confirmed assessment-bank
answer-choice cueing defect"), because it is the single hard prerequisite
every later diagnostic/adaptive capability in this document depends on, and
it is already fully scoped with exact reproduced counts and explicit remedy
constraints (B.1) — no further design work is needed to start it, only the
human/scientific item-writing judgment the task itself requires. This task
is **not begun** by this roadmap PR.

---

## O. Decision log and unresolved questions

Each entry: the open question, what evidence is needed to close it, and the
**latest phase by which it must be decided** (not necessarily when it will
be decided — some may resolve much earlier).

| # | Open decision | Evidence needed | Must decide by |
| --- | --- | --- | --- |
| 1 | Local-only vs. hosted learner profiles, and exactly which capabilities require which | Real usage data on whether learners want cross-device continuity badly enough to justify K's consent/security burden | Before Phase 9 |
| 2 | Exact prospective attempt schema (D.3's full field list is a maximal candidate set, not a ratified schema) | Design review + a first real implementation attempt surfacing practical gaps | Before Phase 3 ships |
| 3 | Mastery model (which of F.5's families, if any beyond Phase 1's rule-based default) | Real attempt-history volume; simulation results; retrospective validation | Before Phase 11 |
| 4 | Exact evidence thresholds (minimum-attempt counts, recency windows) for each E.4 status category | Simulated-trajectory analysis (L) and, later, real usage calibration | Before Phase 4 ships (an initial value is needed then; it may be revised later) |
| 5 | Decay/forgetting model shape | Real retention-check data (E.2 #5) — inherently requires elapsed real time | Before Phase 11 |
| 6 | Whether/how to collect confidence responses | UX testing on whether learners engage honestly with an optional confidence prompt without it feeling burdensome | Before Phase 3 finalizes its schema (can ship without it and add later, since it's additive) |
| 7 | Adaptive stopping rules for each E.2 experience (exact thresholds, not just the framework) | Simulation + real usage per experience | Before Phase 4 (initial), refined through Phase 11 |
| 8 | Content-pack trust and signing mechanism (I.1) | Security review of realistic pack-distribution scenarios; whether third-party packs are ever actually pursued | Before any pack beyond the first-party cytogenetics/molecular-biology ones is contemplated — not required for Phases 7–8 |
| 9 | Framework or repository extraction mechanics (does "engine" mean a separate repo, a separate build target, or a runtime-loaded module within one repo?) | An actual attempted extraction (Phase 7) surfacing which approach preserves the single-portable-artifact value | Before Phase 7 ships |
| 10 | Open-source vs. proprietary boundary (engine open, packs proprietary? everything open? something else?) | A real commercialization decision (J), which itself needs real evidence this document does not have | Before Phase 10 |
| 11 | Product packaging (which of J.1's paths, in what combination) | Real, non-fabricated market/demand evidence | Before Phase 10 |
| 12 | Pricing | Real market evidence; explicitly out of this document's scope entirely (Guiding Principle A.8) | Before Phase 10 |
| 13 | Institutional features' exact shape (J.1's institutional row) | Real institutional-customer conversations, if that path is pursued at all | Before Phase 10, only if that path is chosen |
| 14 | Research/consent model for any future aggregate or research use of learner data | Legal review; a specific research question that would justify it (none currently exists) | Before any research use is contemplated — not required for any phase through 11 as scoped here |

---

*This document is maintained alongside, and must stay consistent with,
`docs/ROADMAP.md`'s concise summary, `docs/ARCHITECTURE.md`'s description of
current behavior, and `docs/CLAUDE_HANDOFF.md`'s session-continuity record.
If any of those documents change in a way that contradicts a factual claim
in the "Current baseline" section above, that section is stale and needs a
follow-up correction — the same discipline already applied to every prior
correction round in `docs/QUALITY_LOG.md`.*
