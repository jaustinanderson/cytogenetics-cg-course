# Roadmap

**Project status:** Beta baseline imported and hardened; not yet
release-qualified.

A feature is complete only when its implementation, documentation, and
reproducible validation are committed in this repository and the applicable
quality gates pass. A code test never substitutes for scientific or rights
review.

The original Claude roadmap is retained for provenance at
[`archive/claude-roadmap-v1.md`](./archive/claude-roadmap-v1.md). This roadmap
keeps its strongest ideas—the image-license gate, measurable blueprint
rebalancing, deeper ISCN practice, and ambiguity-heavy cases—while adding the
repository, data-contract, governance, and validation work they depend on.

## Scope

The v1.x product remains:

- a static, client-only application
- a portable single-file course artifact
- free of accounts, telemetry, cloud progress, and clinical decision support
- free of PHI, accession numbers, employer SOPs, proprietary cases, and recalled
  examination questions
- outside the scope of bulk dataset ingestion and ML model training

Framework migration, a backend, authentication, and automatic AI-generated
content are not roadmap defaults.

## Milestone 0 — Repository foundation and v1.1.1 stabilization

**Purpose:** Establish a trustworthy, reproducible baseline before expanding
the course.

### Completed

- [x] Move the distributable course to root-level `index.html`
- [x] Remove the unused Tailwind browser-CDN dependency and its warning
- [x] Correct the displayed exercise count from five to six
- [x] Make Reset clear both v2 state and the legacy v1 migration source
- [x] Add explicit types to static buttons
- [x] Remove avoidable static inline styles
- [x] Make `addQuestions()` enforce the documented core schema
- [x] Reject invalid or globally duplicate question IDs atomically
- [x] Reject unknown IDs in `markModule()`
- [x] Clarify the local-progress privacy statement
- [x] Add independent-project and no-recalled-exam-questions disclaimers
- [x] Commit a structural/content-contract validator
- [x] Add GitHub Actions validation
- [x] Add README, changelog, architecture, governance, licensing, validation,
  quality-log, and collaboration documentation
- [x] Add a dependency-free DOM behavior suite for navigation, quizzes,
  exercises, migration, persistence, Reset, import/export, print, and the
  public API
- [x] Add DOM checks for landmarks, the skip link, typed controls,
  `aria-expanded`, keyboard-operable flashcards, focus-visible CSS, and reduced
  motion

### Remaining

- [x] Confirm the GitHub Actions run passes on the published commit — GitHub
  Actions run
  [`30646173289`](https://github.com/jaustinanderson/cytogenetics-cg-course/actions/runs/30646173289)
  passed on `main`'s commit `033f8c5` (the accessibility/keyboard-testing
  baseline, PR #6), confirmed directly against the repository rather than
  inferred from a run ID recorded earlier (see `docs/QUALITY_LOG.md` QL-009
  on why a run ID can only ever be a fixed historical checkpoint, not a
  standing "current" claim — check the Actions tab for the live result)
- [x] Enable GitHub Pages and run an initial deployed desktop smoke test
- [x] Add real-browser smoke tests for navigation, quizzes, exercises,
  migration, persistence, import/export, Reset, print, and the public API at
  desktop and narrow/mobile viewports (Playwright/Chromium,
  `tests/e2e/`, `npm run test:e2e`); the committed DOM behavior suite remains
  the dependency-free prerequisite, and this satisfies it as a real browser
- [ ] Add automated WCAG checks and representative keyboard/screen-reader
  review in a real browser — automated axe-core WCAG scanning and a
  representative keyboard-only interaction suite are committed
  (`tests/e2e/accessibility.spec.mjs`, `tests/e2e/keyboard-navigation.spec.mjs`,
  Issue #1); six confirmed defects found by the scan were fixed (see
  `docs/QUALITY_LOG.md` QL-010). A genuine screen-reader review has **not**
  been performed, so this item stays open until one is
- [x] Run *deployed* (GitHub Pages, not local-server) narrow-screen, touch,
  and mobile-navigation tests — `tests/e2e-deployed/` (`npm run
  test:deployed`, Issue #1) runs against the real HTTPS Pages URL and covers
  the automated/emulated portion: narrow-viewport overflow, the mobile menu
  opening/closing via Playwright's touch-emulated `.tap()` with
  `aria-expanded` checked against the sidebar's real bounding-box position, a
  touch-emulated quiz interaction, and reload persistence in an isolated
  context. This is touch *emulation*, not physical touch hardware — true
  touch-gesture testing on real hardware stays an explicit, separate open
  item (see `docs/VALIDATION.md` "Gates still open")
- [x] Capture a clean course-only screenshot for the README —
  `docs/assets/course-overview.png` (1440×1500, reproducible via
  `npm run capture:readme-screenshot`, `scripts/capture-readme-screenshot.mjs`),
  added near the top of `README.md`
- [ ] Decide whether to localize remote fonts and the two approved images
- [ ] Record a question-by-question scientific review status before removing
  the beta warning

### Exit criteria

- CI is green
- Pages loads on desktop and narrow-screen viewports
- No unexpected console error or avoidable warning appears
- Core course behavior has repeatable browser tests
- README and validation records describe the implementation exactly
- Scientific and licensing limitations remain explicit

## Milestone 1 — Data contract, progress stability, and governance

**Purpose:** Make content identity, import/export, progress semantics, and
review status stable before adding 46 questions.

### Work

- [ ] Add explicit stable IDs to every exercise item; stop deriving progress
  identity from array position
- [ ] Define and validate a versioned progress-import schema
- [ ] Deep-clone imported state and reject malformed nested values
- [ ] Decide how stale question/exercise IDs are handled during import
- [ ] Ensure API Reset and import re-render both quizzes and exercises
- [ ] Validate and communicate `localStorage` availability instead of silently
  claiming progress was saved
- [ ] Define analytics semantics:
  - current behavior: last-attempt mastery
  - candidate addition: total-attempt accuracy
- [ ] Decide whether injected questions are intentionally session-only or
  represented by a versioned content-pack format
- [ ] Add provenance and review fields for releasable questions
- [ ] Normalize the image-manifest schema so candidate records use explicit
  unknown values
- [ ] Add browser contract tests for every public API claim

### Exit criteria

- Reordering exercises cannot attach history to a different item
- Malformed imports cannot corrupt live state
- Unknown module IDs, invalid questions, duplicate IDs, and invalid answer
  indexes are rejected
- Persistence and metric semantics are documented and tested
- New content cannot be release-qualified without provenance and review status

## Milestone 2A — Blueprint-balanced question bank

This work begins only after Milestone 1 establishes stable identity,
provenance, and review requirements.

| Domain | Current scored | Add | Target scored |
| --- | ---: | ---: | ---: |
| Specimen preparation, culture, and harvest | 33 | 10 | 43 |
| Chromosome analysis and imaging | 91 | 0 | 91 |
| Molecular cytogenetic testing | 14 | 23 | 37 |
| Laboratory operations | 10 | 13 | 23 |
| Blueprint-scored subtotal | 148 | 46 | 194 |
| Orientation, unscored | 5 | 0 | 5 |
| Total course questions | 153 | 46 | 199 |

### Acceptance criteria for every new question

- Original wording; no recalled or copied certification-exam content
- Complete valid metadata and source references
- Exactly one defensible best answer
- Correct-answer rationale and meaningful distractor feedback where appropriate
- No exact or semantic duplicate
- Difficulty reviewed rather than merely generated
- Reviewed by Austin as the cytogenetics subject-matter expert
- Final automated distribution remains within all four blueprint ranges
- The new set collectively targets approximately:
  - 30% recall
  - 40% application
  - 30% judgment

## Milestone 2B — Evidence and image-license reconciliation

This can run in parallel with Milestone 2A after governance exists. Embedding
remains blocked until primary-source rights evidence is recorded.

The archived roadmap cites two Gemini catalogs, a reconciliation document, and
a Grok guide that were not supplied with this repository. Those claims must be
added with their source documents or independently reconstructed from primary
source pages.

### Required asset record

- stable asset ID and local filename
- subject and intended teaching purpose
- source page, creator, and required credit
- exact license/version or public-domain basis
- evidence URL and verification date
- modification/derivative status
- specimen origin when known
- redistribution decision and reviewer
- target figure, module, and exercise
- checksum when stored locally

ML-training permission and redistribution permission remain separate. ML
training is outside this repository's scope. An unfilled placeholder is better
than an asset with uncertain rights.

### Teaching-image priority

1. Four metaphase-quality states for real quality judgment
2. Normal 46,XX comparison image
3. Band-resolution series
4. Carefully selected abnormality karyograms

Schematics remain where their clarity teaches landmarks better than a
photograph.

### Exit criteria

- Every embedded image is approved in the register
- In-course credit and third-party notices agree
- No candidate or unverified asset ships
- Real images and schematics have explicit, distinct teaching purposes

## Milestone 3 — Deeper interactivity

### ISCN construction

- token-based construction
- modal number → sex chromosomes → abnormality ordering → breakpoint syntax →
  clone brackets
- find-the-error mode
- rewrite-correctly mode
- accepted alternatives and edition-sensitive behavior documented

### Ambiguity-heavy cases

Add four to six cases that require discrimination among:

- technical artifact and true finding
- benign heteromorphism and pathogenic finding
- pseudomosaicism and true mosaicism
- apparently negative and technically uninformative results

### Exit criteria

- The builder evaluates constructed responses, not just recognition
- Valid, invalid, and accepted-alternative paths have automated tests
- Every case has an evidence-backed rationale and recorded SME approval

## Milestone 4 — Release quality and future adaptation

- complete keyboard and screen-reader review
- WCAG-oriented automated accessibility checks
- narrow-screen and touch testing
- contrast remediation
- performance and external-dependency review
- release checklist, version tag, and updated changelog

The API provides prerequisites for an adaptive workflow, but adaptation is not
automatic. Generated content remains external or session-only until it passes
the same provenance, scientific-review, and release gates as authored content.

## Quality gates

Every release candidate must satisfy the applicable gates:

1. **Automated structure:** HTML/script syntax, unique DOM and content IDs,
   complete schemas, valid answers, mounted keys, expected counts, and
   blueprint distribution.
2. **Browser behavior:** no unexpected console output; navigation, progress,
   migration, Reset, import/export, quizzes, exercises, print, and API tests.
3. **Accessibility:** keyboard flow, focus behavior, labels, status
   announcements, contrast, automated scan, and representative screen-reader
   review.
4. **Scientific review:** authoritative sources plus Austin's review. CI never
   implies scientific correctness.
5. **Rights review:** no media leaves candidate status without documented
   redistribution evidence.
6. **Privacy:** no PHI, accession numbers, employer-confidential material,
   proprietary SOPs, or recalled exam content.
7. **Release:** clean CI, deployed smoke test, changelog, validation record, and
   known limitations.
