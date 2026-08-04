# Scientific Review Status

This document records the current, factual state of scientific/content review
for the Cytogenetics CG(ASCP) Study Course. It exists to answer one question
honestly: **has this course's educational content been independently reviewed
for scientific accuracy, and by whom?** As of this record, the answer is
**no, not yet, beyond what is stated below.**

This is a status record, not a review. Creating this document does not
perform, complete, or substitute for the review it describes. See
[`docs/CONTENT_GOVERNANCE.md`](./CONTENT_GOVERNANCE.md) for the review
process and content-state definitions this record uses, and
[`docs/ROADMAP.md`](./ROADMAP.md) for where this fits in the release plan.

## The one non-negotiable distinction this document exists to enforce

**Passing automated tests establishes structural and behavioral consistency.
It does not establish scientific correctness.** The structural validator
(`tests/validate-course.mjs`), the DOM behavior suite
(`tests/dom-behavior.mjs`), the real-browser Playwright suites
(`tests/e2e/`, `tests/e2e-deployed/`), the axe-core accessibility scan, and
the deployed-site smoke checks all confirm that the course is built
correctly, renders correctly, behaves correctly, and stays internally
consistent (unique IDs, well-formed schemas, correct counts, working
navigation, no console errors, and so on — see
[`docs/VALIDATION.md`](./VALIDATION.md) for the complete, current list). None
of them read a question, evaluate whether its stated correct answer is
actually correct, check whether its rationale is accurate, or judge whether
its difficulty/domain tagging reflects real clinical or exam practice. A
green CI run is evidence the software works. It is not evidence the medicine
is right.

## Five separate review types — do not conflate them

| Review type | What it checks | Current status | Where the evidence lives |
| --- | --- | --- | --- |
| **Scientific/content review** | Are the stated facts, rationale, and correct answers actually correct? Is the content clinically and exam-accurately framed? | **Not yet independently reviewed** (see below) | This document |
| **Software validation** | Does the code work as built — structure, schemas, behavior, no crashes? | Passing, reproducible, and current | [`docs/VALIDATION.md`](./VALIDATION.md) |
| **Accessibility testing** | Automated WCAG scanning and keyboard-only interaction; a representative screen-reader pass is a separate, still-open gate | Automated scan and keyboard suite passing; **screen-reader review not performed** | [`docs/VALIDATION.md`](./VALIDATION.md) "Gates still open" |
| **Source/provenance review** | Is each question/module traceable to an identified authoritative source, with edition/date recorded? | **Not established per-item**; only the exam blueprint's domain names and target ranges are Source-checked, not the current question distribution against them (see below) | This document |
| **Image/licensing (rights) review** | Is each embedded image's redistribution right documented and approved, independent of whether its scientific labeling is correct? | Both embedded images are rights-reviewed and approved; this says nothing about scientific/content review of the same images | [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) |

These are independent axes. An image can be rights-approved for
redistribution while its caption has never been scientifically reviewed. A
question can be well-formed and pass every structural test while its
rationale is wrong. **This document establishes the Scientific/content
review and Source/provenance review rows.** Software validation,
Accessibility testing, and Image/licensing (rights) review are documented
elsewhere (`docs/VALIDATION.md` and `THIRD_PARTY_NOTICES.md`) and only
referenced here — this document does not restate their status as if it had
established it.

## Content states used in this record

This record uses the four content states already defined in
[`docs/CONTENT_GOVERNANCE.md`](./CONTENT_GOVERNANCE.md#content-states),
**unchanged and reproduced verbatim** — this document does not redefine
project governance policy:

1. **Draft** — authored or generated but not reviewed
2. **Source-checked** — supported by an identified authoritative source
3. **SME-reviewed** — reviewed by Austin for scientific accuracy and
   teaching suitability
4. **Release-qualified** — source, review, schema, and automated gates
   passed

`docs/CONTENT_GOVERNANCE.md` defines **SME-reviewed** specifically as
review **by Austin** — the CG(ASCP)-credentialed author and domain expert
— not review by an arbitrary or unspecified subject-matter expert. This
record preserves that definition exactly and adds one distinction the four
states alone do not spell out, because it matters for how "reviewed" reads
to anyone outside this repository:

- **Authored content** (state: Draft) — written, by a human or with AI
  assistance, and not yet reviewed by anyone, including Austin.
- **Austin's documented SME review** — satisfies the repository's current
  **SME-reviewed** state as defined above, once actually performed, dated,
  and scoped (see the log format below). As of this record, Austin has not
  yet performed and recorded this review for any current question,
  exercise, flashcard, or case.
- **Independent second-person scientific review** — review by someone
  other than Austin, with no authorship stake in the specific content
  being checked. This is a distinct, *stronger* claim than SME-reviewed as
  currently defined: the current policy's SME-reviewed state does not
  require a second, independent set of eyes, because it is satisfied by
  the credentialed author reviewing content they themselves authored.
  **Austin's future documented review can satisfy the repository's
  current SME-reviewed state, but it does not by itself constitute
  independent second-person review** — this record treats those as two
  different claims and will state plainly which one applies whenever
  either occurs.
- **Source-checked** — an identified, dated authoritative source exists
  and is cited, independent of whether anyone has yet reviewed the content
  against that source.
- **Release-qualified** — source, review, schema, and automated gates all
  passed together, not any one alone.

This record uses **"Not yet independently reviewed"** as its plain-language
synonym for **Draft**, deliberately, to flag that even a future Austin
SME-review would not itself be an *independent* review in the
second-person sense above. That distinction is worth stating explicitly
rather than letting the single word "reviewed" quietly stand in for both
meanings.

### This record is now backed by a machine-enforced registry (Issue #3, Milestone 1)

As of this addition, every claim in this document about an individual
question's state is enforced, not just recorded in prose: `index.html`
carries a `QUESTION_GOVERNANCE` registry with one record per authored
question id, and `window.CytoCourse.getQuestionGovernance()` exposes it
read-only. A question's record cannot claim Source-checked, SME-reviewed,
or Release-qualified without the evidence (source, source-checker,
reviewer, review date, review scope, and — for Release-qualified — drafter
and an explicit edition-sensitivity assessment) that state requires; the
app rejects a contradictory record at load time. This document's "all 153
questions are Draft" claim below is the same fact the registry itself
enforces — see `docs/ARCHITECTURE.md` "Question provenance and
scientific-review governance" for the exact schema and lifecycle
prerequisites, and `docs/CONTENT_GOVERNANCE.md` for the policy this
implements.

## Current status: what is and is not established

### Course authorship (established, and distinct from independent review)

The course's original author is documented in `README.md`: Jerad Austin
Anderson, CG(ASCP) — a credentialed cytogenetic technologist. That
credential is a real, documented fact about authorship and domain
background. **It is not the same claim as an independent, dated,
scope-recorded scientific review of specific questions or modules**, and
this record does not treat authorship credentials as equivalent to review.
Per `docs/CONTENT_GOVERNANCE.md`, authored content is Draft until reviewed,
regardless of the author's credentials — the same standard this record
holds itself to.

### Exam blueprint domain names and target ranges — Source-checked (precise scope)

The course's four blueprint domain names (Specimen Preparation/Culture/
Harvest, Chromosome Analysis & Imaging, Molecular Cytogenetics, Laboratory
Operations) and their published target percentage ranges are checked
against a named, dated, linked primary source: the *ASCP BOC CG(ASCP) and
CG(ASCPi) Examination Content Guideline*, revised September 25, 2025
(linked in `README.md`, "Course coverage"). That guideline being
identified, current, and cited with its exact revision date is what makes
the domain names and ranges themselves **Source-checked**.

**This is a narrower claim than it can sound like: Source-checked means the
guideline is identified and dated. It does not mean the course's current
question distribution matches, satisfies, or is validated by that
guideline.** The current distribution (148 blueprint-scored questions: 33
specimen, 91 analysis, 14 molecular, 10 operations, plus 5 unscored
orientation questions — see `tests/validate-course.mjs`) is mechanically
measured and compared against the guideline's published ranges in
`README.md`'s "Course coverage" table. That comparison currently shows:

| Domain | Current share | Guideline range | Status |
| --- | ---: | ---: | --- |
| Specimen preparation, culture, and harvest | 22.3% | 20–25% | **Within range** |
| Chromosome analysis and imaging | 61.5% | 45–50% | **Overrepresented** |
| Molecular cytogenetic testing | 9.5% | 15–25% | **Underrepresented** |
| Laboratory operations | 6.8% | 10–15% | **Underrepresented** |

**Only the specimen domain is currently within its published range.**
Chromosome analysis and imaging is overrepresented; molecular cytogenetic
testing and laboratory operations are both underrepresented. This is a
structural/distribution fact, mechanically measured — it is not a
scientific-content judgment and says nothing about whether any individual
question is accurate. The planned 46-question rebalancing
(`docs/ROADMAP.md`, Milestone 2A: 10 specimen, 23 molecular, 13 laboratory
operations) is intended to close this gap; it has not happened yet.

### Individual question, exercise, flashcard, and case content — Draft (Not yet independently reviewed)

No question, exercise item, flashcard, or case in this course currently
carries a recorded source citation, reviewer name, review date, or review
scope in the repository. Confirmed directly against the data: no question
object in `index.html`'s `QUIZZES` structure has a `source` field or
equivalent, and no review-log entries exist prior to this document. Per
`docs/CONTENT_GOVERNANCE.md`, this places **all current question, exercise,
flashcard, and case content at Draft** — authored, structurally valid, and
passing every automated check, but not yet independently reviewed for
scientific accuracy by anyone, credentialed author or otherwise.

This is not a defect to silently fix; it is the accurate current state,
and the reason the beta-status warning in `README.md` (*"the full question
bank has not yet completed a documented, question-by-question scientific
review for public release"*) exists and stays in place.

### Image content — two axes, tracked separately

- **Rights/redistribution**: both embedded images (`img-46xy`, a normal
  46,XY karyogram from NHGRI via Wikimedia Commons; `img-t21`, a trisomy 21
  karyogram from the CDC Public Health Image Library) are rights-reviewed,
  source-documented, dated, and approved for redistribution — see
  [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md). This is a rights
  determination, not a scientific-content review of the image or its
  caption.
- **Scientific/content accuracy of the image and its caption**: **Draft** —
  not independently reviewed, same as question content.
- **The 17 remaining "needed" (candidate) image records** in `index.html`'s
  `IMAGES` manifest are unembedded. Most carry only an unverified `lead`
  (a possible source to investigate); several are explicitly marked
  `license unconfirmed` in the source comments (the four planned metaphase
  images with a Mendeley dataset lead). None are embedded, and none require
  a content-review status yet because none are in the shipped course.

## Content inventory and per-module status

**153 total questions: 111 assigned across the 17 modules, plus the
separate 42-question final cumulative pool** (111 + 42 = 153; this is not
153 module questions with another 42 on top of that). Of the 111
module-assigned questions, 5 are the unscored orientation questions in
module 1; the remaining 106 module-assigned questions plus all 42
final-pool questions make up the 148 blueprint-scored questions referenced
above. Per-module and pool counts below were read directly from the
committed course data via `window.CytoCourse.getQuestions(id)` in a
sandboxed `vm` context (the same technique `tests/validate-course.mjs`
uses), not estimated, and are verified to stay in sync with the live data
by a committed structural test (see `docs/VALIDATION.md`).

The "Title" column below is deliberately the exact string
`window.CytoCourse.getModules()` reports for each module (its sidebar/
dashboard label, `module.short`) rather than the fuller `<h2>` heading text
each module section also displays — using the same string the public API
returns is what lets the committed structural check (below) verify this
table against the live data by exact string comparison, not fuzzy or
manual matching.

| Module | Title | Blueprint domain | Quiz questions | Scientific review status |
| --- | --- | --- | --- | --- |
| m1 | How to use this course | Orientation (unscored) | 5 | Draft |
| m2 | Specimen collection & triage | Specimen · Culture · Harvest | 6 | Draft |
| m3 | Culture systems & failure | Specimen · Culture · Harvest | 6 | Draft |
| m4 | Harvest, hypotonic & fixation | Specimen · Culture · Harvest | 6 | Draft |
| m5 | Banding & staining (G-banding) | Specimen · Culture · Harvest | 6 | Draft |
| m6 | Microscopy & imaging | Chromosome Analysis & Imaging | 7 | Draft |
| m7 | Metaphase selection | Chromosome Analysis & Imaging | 7 | Draft |
| m8 | Karyogram construction | Chromosome Analysis & Imaging | 6 | Draft |
| m9 | Chromosome identification | Chromosome Analysis & Imaging | 8 | Draft |
| m10 | Numerical abnormalities | Chromosome Analysis & Imaging | 8 | Draft |
| m11 | Structural I: del/dup/iso | Chromosome Analysis & Imaging | 7 | Draft |
| m12 | Structural II: t/inv/cancer | Chromosome Analysis & Imaging | 8 | Draft |
| m13 | Mosaicism vs artifact | Chromosome Analysis & Imaging | 7 | Draft |
| m14 | ISCN master module | Chromosome Analysis & Imaging | 9 | Draft |
| m15 | FISH & microarray | Molecular Cytogenetics (FISH/array) | 8 | Draft |
| m16 | Lab operations & ethics | Laboratory Operations | 7 | Draft |
| m17 | Integrated cases | Integration & Capstone | 0 (uses capstone cases, not quiz questions) | Draft |
| *(pool)* | Final cumulative exam | Spans specimen/analysis/molecular/operations | 42 | Draft |

Also Draft, not yet independently reviewed: all 30 exercise items (6 sets),
all 61 flashcards (7 decks), and all 13 cases (8 capstone + 5 module-level).

## Practical review checklist

For each question, exercise item, flashcard, or case reviewed, confirm all
of the following (adapted directly from
`docs/CONTENT_GOVERNANCE.md`'s question-review requirements — this is the
same checklist, made actionable per-item):

- [ ] Exactly one defensible best answer
- [ ] Correct-answer rationale is accurate and complete
- [ ] Distractors are plausible and their feedback (where present) is
      accurate, not just present
- [ ] Domain and difficulty tagging are correct
- [ ] Wording is original — not recalled, reconstructed, or copied
      certification-exam content
- [ ] No PHI, accession numbers, or employer-confidential material
- [ ] Source reference identified (edition/revision/publication date, not
      just an organization name) for any disputed or non-obvious claim
- [ ] Edition- or SOP-sensitive content is flagged as such
- [ ] For images: caption accuracy independently confirmed, separate from
      the image's already-recorded rights status

A module or content group only moves from Draft to SME-reviewed when every
applicable box above is checked **and** a log entry (below) is recorded.

## Reusable review-log format

Use one row per reviewed unit (a single question, a module's full set, an
exercise, a flashcard deck, or a case). Append rows here as reviews happen;
do not overwrite or delete prior rows — this log is the audit trail.
Copy this table verbatim to start a new review pass:

| Content ID(s) | Type | Domain | Reviewer | Review date | Scope | Source(s) cited | Status after review | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _(e.g. m9-q1..m9-q8)_ | Quiz questions | Chromosome Analysis & Imaging | _(full name/credential)_ | _(YYYY-MM-DD)_ | _(e.g. "all 8 module-9 questions: rationale, distractors, domain/difficulty tagging")_ | _(exact edition/date, not just an org name)_ | _(Source-checked / SME-reviewed / Release-qualified)_ | _(anything edition-sensitive, corrected, or still uncertain)_ |

Rules for using this log, carried over from `docs/CONTENT_GOVERNANCE.md`:

- A reviewer entry requires a real name (or a clearly identified role) and
  a real date — never a placeholder, and never inferred from unrelated
  work.
- "Scope" must state exactly what was checked (e.g., "rationale and
  distractor accuracy only, not domain/difficulty tagging") rather than an
  unqualified "reviewed."
- If a review finds a problem, record it the same way
  `docs/QUALITY_LOG.md` records other corrections: what was wrong, why,
  affected content IDs, the authoritative evidence, the correction, and a
  prevention note.
- This log is the source of truth for status. A module's row in the table
  above should be updated to match the most recent, most specific log
  entry for that module — do not mark a whole module reviewed from a
  partial review of some of its items.
- Recording **SME-reviewed** as the status after review requires the
  Reviewer field to be Austin, per `docs/CONTENT_GOVERNANCE.md`'s current
  definition of that state. If a different named reviewer performs a
  review, record their name and note in "Notes" that this is an
  **independent second-person review** — a real, meaningful review this
  log should still capture, but distinct from, and not automatically
  equivalent to, the repository's formal SME-reviewed state as currently
  defined.

## What remains unknown or unreviewed (explicit)

- Whether any individual question's stated correct answer, rationale, or
  distractor feedback is scientifically accurate — **unknown**, pending
  review
- Whether question wording is free of unintentional overlap with any
  copyrighted or recalled examination material beyond the author's own
  representation — **not independently audited**
- Whether image captions (for the two embedded, rights-approved images)
  are scientifically precise — **not independently reviewed**
- Whether the 17 candidate ("needed") images have resolvable, confirmed
  redistribution rights — **mostly unverified**; several explicitly
  license-unconfirmed
- A specific planned reviewer, review date, or review timeline for the
  question bank — **not yet scheduled**; nothing in this repository commits
  to one
- Whether prior domain experts other than the credentialed author have
  looked at any content — **no such review is documented anywhere in this
  repository**

## Relationship to the beta-status warning

`README.md` currently states: *"Status: beta baseline. The application is
functional and structurally validated. The full question bank has not yet
completed a documented, question-by-question scientific review for public
release."* This record confirms that statement remains accurate and should
not be softened or removed until a real, logged review (per the format
above) changes the underlying facts — not because this document exists,
since this document only records the current status, it does not change
it. Separately, `docs/VALIDATION.md`'s "Release language" section
documents the recommended wording for a future release
(*"Structurally validated beta; full scientific and accessibility review is
in progress"*) and what not to claim (*"Validated CG(ASCP) course"*) without
qualification; that guidance is unaffected by this record and remains the
standard to follow when release language is next updated.

As of Issue #3 (Milestone 1), the deployed course also carries a persistent,
in-course disclosure (`#reviewDisclosure`, near the hero) stating
substantially the same fact in the reader's first screen, not only in this
repository's documentation — a learner opening the live course now sees
the structural-vs-scientific-review distinction directly, without needing
to find this file first. The `README.md` beta warning is unchanged and
remains in place alongside it.
