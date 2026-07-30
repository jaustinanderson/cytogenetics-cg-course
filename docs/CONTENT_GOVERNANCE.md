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
4. **Release-qualified** — source, review, schema, and automated gates passed

AI-generated text is Draft until reviewed. Fluency, model agreement, or passing
CI does not change that state.

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
