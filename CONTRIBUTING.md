# Contributing

Contributions should preserve the course's portability, scientific integrity,
privacy boundaries, and clear distinction between code validation and content
review.

## Before changing the project

1. Read `README.md`, `docs/ROADMAP.md`, `docs/CONTENT_GOVERNANCE.md`, and
   `docs/VALIDATION.md`.
2. Run `npm test`.
3. Work on one bounded issue or roadmap milestone.
4. Do not mix factual-content changes with unrelated refactors.

## Factual corrections

A correction should include:

- the affected module, question ID, exercise ID, or section
- the current statement
- the proposed correction
- an authoritative source and applicable publication/edition date
- whether the issue affects an answer, rationale, distractor, diagram, or
  surrounding prose
- subject-matter review status

Code passing CI does not approve scientific content.

## New questions

Every new question must:

- use original wording and avoid recalled exam content
- satisfy the current question schema
- have a globally unique stable ID
- have exactly one defensible best answer
- include a rationale and meaningful distractor feedback when appropriate
- identify its domain, topic, and reviewed difficulty
- carry the provenance and review metadata required by the active roadmap
- be reviewed by Austin before release

## Images

Do not commit an image until its source, creator, exact license or public-domain
basis, attribution, modification status, verification date, and redistribution
decision are recorded. Training permission and redistribution permission are
different questions.

## Validation

Run:

```bash
npm test
```

Report the exact command and result with each contribution. Browser,
accessibility, scientific, and rights checks must also be reported when they
apply.
