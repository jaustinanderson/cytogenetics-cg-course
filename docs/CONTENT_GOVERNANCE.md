# Content Governance

## Purpose

This course concerns certification preparation and clinical laboratory science.
Scientific accuracy, source traceability, privacy, and rights review therefore
require explicit gates beyond code review.

## Content states

Use these states for substantive educational content:

1. **Draft** — authored or generated but not reviewed
2. **Source-checked** — supported by an identified authoritative source
3. **SME-reviewed** — reviewed by Austin for scientific accuracy and teaching
   suitability
4. **Release-qualified** — source, SME review, an independent second-person
   scientific review, schema, and automated gates all passed

AI-generated text is Draft until reviewed. Fluency, model agreement, or passing
CI does not change that state.

**Corrected 2026-08-04** (a second independent-review pass on Issue #3):
for a public, potentially commercial scientific learning product, Release-
qualified now explicitly requires a documented **independent second-person
review** — Austin's own SME review satisfies SME-reviewed, but is not, by
itself, sufficient for Release-qualified. The independent reviewer must
have a stable identity, a recorded date, a defined scope/checklist, and
must be a different person from both the question's drafter and the
Austin SME reviewer. See `docs/SCIENTIFIC_REVIEW.md` for the distinction
between SME-reviewed and independent second-person review, and
`docs/ARCHITECTURE.md` for how this is machine-enforced. No current
question has this review; all 153 remain Draft.

**Corrected 2026-08-05**: independent review found the mechanism above
did not actually enforce this paragraph — an arbitrary, unqualified name
(with only an identity and a date, no approval, scope, checklist, or
conflict declaration) satisfied Release-qualified. The registry's
independent-review evidence now requires, separately from the SME
review: an identity checked against an explicit approved-independent-
reviewer list (empty for this course until a real second reviewer is
documented — no reviewer is invented here), its own recorded scope, its
own complete structured checklist, and an explicit declaration that the
reviewer had no authorship stake or other conflict in that specific
question. See `docs/QUALITY_LOG.md` QL-034 for the full record.

**Corrected again 2026-08-05** (a further independent-review pass, same
day): the prior correction still let "documented" mean partial evidence
— a record could set the flag `true` with a reviewer name and a date but
leave scope, checklist, and conflict-declaration unset, and it would
still load. That is now rejected outright: recording an independent
review as documented requires the complete record (identity, date,
scope, full checklist, and an actual true/false conflict declaration) in
the same step, or the record fails to load. A complete record can still
correctly fail Release-qualified for two honest reasons — an unapproved
reviewer, or a reviewer who declared an actual conflict — and those are
now reported distinctly from "nothing documented." See
`docs/QUALITY_LOG.md` QL-035 for the full record.

## Source hierarchy

Prefer:

1. current primary standards and official examination guidelines
2. current professional or regulatory guidance
3. peer-reviewed primary literature
4. established specialist references and textbooks

Record the exact edition, revision date, or publication date. General
organization names without an exact source are not sufficient for a disputed
claim.

## Question review

Each release-qualified question should eventually record:

- stable ID
- domain and topic
- intended cognitive level
- source reference(s)
- author/drafter
- scientific reviewer
- review date
- review status
- notes for edition-sensitive or SOP-sensitive content

Review must verify:

- exactly one defensible best answer
- rationale accuracy
- distractor quality
- correct domain and difficulty
- original wording
- absence of recalled exam content
- absence of PHI or employer-confidential material

### Machine-enforced governance registry (Issue #3, Milestone 1)

The fields above are no longer only a checklist: every one of these fields
(plus source-check identity/date and whether independent review is
documented) is now recorded per authored question in a dedicated
`QUESTION_GOVERNANCE` registry in `index.html`, separate from both the
question content and learner progress. A question's lifecycle label
(Draft/Source-checked/SME-reviewed/Release-qualified) cannot be set without
the evidence this section requires — the app validates that at load time
and rejects a contradictory record (a label with missing prerequisites)
outright. This does not change what review actually requires; it prevents
the record from claiming a review happened without the evidence to back
it. See `docs/ARCHITECTURE.md` "Question provenance and scientific-review
governance" for the exact schema, and
`window.CytoCourse.getQuestionGovernance()` for the read-only public API
that exposes each question's current status and exactly what is missing
toward release-qualification. All 153 current questions are Draft — see
`docs/SCIENTIFIC_REVIEW.md`.

**Corrected 2026-08-04** after independent review found the mechanism did
not yet fully implement this policy: "SME-reviewed" now checks the
reviewer's identity against an approved-reviewer registry (matching "by
Austin" exactly, not any non-empty string); "Review must verify" (the
seven items above) is now a closed, machine-checked `reviewChecks` set,
not a free-text scope description; and a source citation must carry an
exact edition/revision/publication date and a specific locator, not a
bare organization name. See `docs/ARCHITECTURE.md` for the full
correction record and `docs/QUALITY_LOG.md` QL-031.

**Corrected again 2026-08-04** (a second independent-review pass, same
day) after further review found remaining gaps: the load-time integrity
gate could not detect two *authored questions* sharing the same id (only
duplicate *governance registry* entries, fixed above); a source's
citation-length heuristic was replaced with an exact structural
requirement — an identifiable, non-placeholder title (`citation`) AND a
separate, non-placeholder responsible publisher/organization
(`publisher`), plus an edition-or-date and a locator-or-url; the
approved-SME-reviewer identity is now recorded under an explicit,
versioned "subject pack" key for future extensibility to other authored
content; the structured review-checklist enum is now explicitly
versioned (`GOVERNANCE_REVIEW_CHECKS_V1`); and, as stated above,
Release-qualified now requires a documented independent second-person
review. See `docs/QUALITY_LOG.md` QL-032 for the full record.

## Corrections

Scientific corrections should be traceable through an issue, pull request, or
quality-log entry. Record:

- what was wrong or ambiguous
- why it happened
- affected content IDs
- authoritative evidence
- the correction
- tests or review used
- prevention measure

## Privacy boundaries

Never add:

- patient names, dates of birth, medical record numbers, or accession numbers
- real case combinations that could identify a patient
- employer-confidential procedures, thresholds, screenshots, or documents
- credentials, secrets, internal URLs, or private account information

Use hypothetical or synthetic cases. Public-domain images with patient-derived
material still require a source and redistribution review.

## Examination integrity

The repository must contain original practice material. Do not add remembered,
reconstructed, purchased, copied, or confidential ASCP examination questions.
Exam designations may be used to describe alignment, never to imply endorsement.

## Rights boundary

Scientific usefulness does not establish permission to republish. Dataset use,
model-training permission, and redistribution rights are separate decisions.
Candidate media remains excluded until the image register and third-party
notice contain the required evidence.
