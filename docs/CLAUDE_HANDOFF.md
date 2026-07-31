# Claude Handoff — Cytogenetics CG(ASCP) Study Course

Use this document as the durable handoff for the next Claude session.

## Repository

- Repository: `jaustinanderson/cytogenetics-cg-course`
- URL: <https://github.com/jaustinanderson/cytogenetics-cg-course>
- Live course: <https://jaustinanderson.github.io/cytogenetics-cg-course/>
- Default branch: `main`
- Product status: beta; static client-only educational study aid
- Canonical product artifact: `index.html`
- Course API version: `1.1.1`
- Progress schema: v2

## What this project is

This is an independent, browser-based CG(ASCP)/CG(ASCPi) cytogenetics study
course built by Austin, a CG(ASCP)-credentialed cytogenetic technologist. It is
also a portfolio artifact demonstrating the translation of clinical laboratory
expertise into a privacy-conscious, structured, testable educational
application.

The runtime deliberately remains one portable HTML file with custom CSS,
vanilla JavaScript, `localStorage`, and no backend. Node.js exists only for
repository validation.

Current content baseline:

- 17 modules
- 153 tagged questions
- 5 unscored orientation questions
- 148 blueprint-scored questions
- 6 exercise sets / 30 exercise items
- 7 flashcard decks / 61 flashcards
- 8 capstone cases plus 5 module-level cases
- 19 image-manifest records: 2 embedded and 17 needed

## What changed after the original Claude handoff

ChatGPT audited the supplied HTML and roadmap, formally logged the failures, and
created the repository baseline. The following corrections are already
implemented:

1. Removed the unused `cdn.tailwindcss.com` script that caused the production
   console warning. Do not add a Tailwind build; the course uses custom CSS.
2. Corrected the hero from five to six interactive exercise sets.
3. Made UI and API Reset clear the legacy v1 key so migrated progress cannot
   reappear after reset.
4. Added explicit `type="button"` attributes and removed avoidable static inline
   styles.
5. Strengthened `addQuestions()`:
   - validates `id/d/t/x/q/o/a/why`
   - recognizes only known domains and difficulty 1–3
   - checks option count and answer bounds
   - enforces globally unique IDs
   - rejects duplicate IDs within an incoming batch
   - rejects the whole batch atomically
   - rejects unknown quiz keys
6. Added module-ID validation to `markModule()`.
7. Clarified that progress and answers stay local while fonts and two images
   still produce ordinary external web requests.
8. Added independent-project, non-endorsement, and no-recalled-exam-question
   language.
9. Added a committed structural/content-contract validator and GitHub Actions
   workflow.
10. Replaced the narrative roadmap with a milestone plan, definitions of done,
    governance gates, and explicit scope boundaries.
11. Preserved the original roadmap at
    `docs/archive/claude-roadmap-v1.md`.
12. Added a formal quality log, content governance, architecture, validation,
    licensing, attribution, contribution, and changelog documentation.

The local baseline validation passed:

```text
✓ index.html has the expected document shell
✓ the development-only Tailwind CDN is absent
✓ static buttons declare their type
✓ static DOM ids are unique
✓ external page resources use HTTPS
✓ the course has one syntactically valid inline script
✓ the public course API exposes the stabilized version
✓ all 153 questions satisfy the content contract
✓ question distribution matches the documented v1.1 baseline
✓ exercise, flashcard, and image manifests match the baseline
✓ quiz and exercise mounts map to declared data keys
✓ question injection rejects malformed and globally duplicate ids atomically

Course validation passed.
```

`html-validate` 10.4.0 also completed with zero findings after the hardening
changes.

A dependency-free DOM behavior suite was added after the baseline:

- `tests/dom-behavior.mjs` runs 36 behavior checks against the real inline
  course script
- `tests/dom-harness.mjs` provides only the browser surface the course uses
- `npm test` runs both the structural validator and the behavior suite
- migration, legacy Reset cleanup, answer recording, and import-version checks
  were mutation-tested and each detected its injected regression

This suite is deliberately described as DOM-level validation, not browser
validation. It does not establish layout, color contrast, real focus behavior,
touch input, networking, or screen-reader output.

The live GitHub Pages deployment was subsequently verified on 2026-07-30:

- correct title, hero, and custom-CSS layout
- 17 rendered quizzes
- 6 rendered exercise sets
- correct-answer feedback worked
- module completion survived reload
- no page-origin console warning or error

The cloud test browser did not complete the two third-party image requests, so
remote image delivery still requires confirmation in another environment or
asset localization.

A real-browser Playwright/Chromium smoke suite was added on 2026-07-30
(branch `claude/issue-1-playwright-smoke`, Issue #1):

- `tests/e2e/` runs 18 checks per project (desktop 1280×900, narrow/mobile
  390×844 with `hasTouch`), 35 total runs passing, against `index.html`
  served by `python3 -m http.server` — the same local-serving approach the
  README already documented
- Covers page initialization, navigation and mobile-sidebar behavior
  (including real `IntersectionObserver`-driven active-nav highlighting,
  which the DOM harness only stubs), correct/incorrect quiz interaction,
  exercise interaction, module-completion persistence across a real reload,
  v1-to-v2 migration, Reset clearing both storage keys (accept and decline),
  import/export, the public API and its events, print invocation, and
  page-origin console cleanliness
- `@playwright/test` is a devDependency only; `index.html` gained no runtime
  dependency and no build step. `npm test` (structural + DOM behavior) still
  installs nothing; `npm run test:e2e` requires `npm ci` plus one Chromium
  download (`npm run test:e2e:install`)
- CI (`.github/workflows/ci.yml`) now runs `npm ci`, `npm test`, installs
  Chromium, and runs `npm run test:e2e`, uploading the HTML report on failure
- No product defect was found or fixed. Three test-authoring bugs were found
  and corrected in the suite itself before they could produce false claims —
  see `docs/QUALITY_LOG.md` QL-008 (an `addInitScript` reseeding trap on
  Reset's internal reload, and two narrow-viewport click-target overlaps)
- This closes the "Add real-browser automation" item below; WCAG/screen-reader
  automation, deployed-Pages-URL testing, true touch hardware, and the
  third-party image-delivery confirmation remain open

## Read these files first

1. `README.md`
2. `docs/ROADMAP.md`
3. `docs/ARCHITECTURE.md`
4. `docs/CONTENT_GOVERNANCE.md`
5. `docs/VALIDATION.md`
6. `docs/QUALITY_LOG.md`
7. `docs/LICENSING.md`
8. `THIRD_PARTY_NOTICES.md`
9. `CLAUDE.md`

The repository documentation now supersedes claims in the archived original
roadmap.

## Start-of-session procedure

1. Inspect the current branch, status, recent commits, and relevant GitHub
   issues or pull requests.
2. Run `npm test` before editing.
3. Confirm the current CI result.
4. Work on one bounded roadmap milestone or issue.
5. Preserve unrelated existing work.

## Immediate next objective

Complete the remaining **Milestone 0 repository-foundation work** before adding
questions or images:

1. ~~Add real-browser automation for navigation, quizzes/exercises, v1-to-v2
   migration, persistence after reload, Reset, import/export, print, and
   public API behavior/events.~~ Done 2026-07-30 via the Playwright suite
   described above (`tests/e2e/`). Confirm the CI run on the draft PR is
   green before closing Issue #1, since only local runs are verified so far.
2. Add automated WCAG checks and representative keyboard/screen-reader review.
3. Run narrow-screen, touch, and mobile-navigation tests against the live page.
4. Capture a clean screenshot of the course itself for the README.
5. Record a documented scientific-review status rather than treating structural
   validation as content validation.

Do not begin the 46-question expansion or image embedding while the data
contract and review gates remain incomplete.

## Known open implementation risks

### Progress import

`importJSON()` currently validates the top-level version but still trusts
malformed nested maps and outcome records. It should:

- impose a reasonable input-size limit
- validate and normalize all nested values
- deep-clone caller-supplied objects
- define how stale content IDs are handled
- have hostile/malformed fixtures and round-trip tests

### Exercise identity

Exercise outcomes still use position-derived IDs such as `ex7-1`. Inserting or
reordering an item can attach saved progress to a different exercise. Give each
item an explicit stable ID and add a migration strategy.

### Exercise rendering after API writes

API import and Reset rebuild quiz widgets but do not fully rebuild exercise
closures. Tests and a centralized render/reset path are needed.

### Storage failure

The application silently tolerates `localStorage` write failure while the UI may
still imply that progress was saved. Detect storage availability and clearly
indicate session-only mode.

### Analytics semantics

Headline analytics represent last-attempt mastery. They do not represent
total-attempt accuracy. Do not change this silently; define and test any new
metric.

### Runtime question persistence

`addQuestions()` injection is session-only. Reload loses injected questions,
and `exportJSON()` exports progress/statistics rather than a content pack.
Choose either:

- a build-time, reviewed question-pack workflow committed to source, or
- a versioned content-pack import/export format with persistence and governance

Do not describe adaptation as automatic until that exists.

### Accessibility

The course has a skip link, visible focus styling, reduced-motion support,
semantic landmarks, and keyboard-operable flashcards. Remaining work includes:

- Escape/focus/inert behavior for the mobile sidebar
- live result/status announcements
- accessible names for instructional SVGs
- flashcard front/back screen-reader state
- current-state semantics such as `aria-current` and `aria-pressed`
- contrast remediation for faint/accent small text

### Image evidence

The original roadmap cited two Gemini catalogs, a reconciliation file, and a
Grok guide that were not included with the supplied project. Add those source
documents or independently reconstruct claims from primary source pages.

Do not embed the Mendeley `nn4353y2xx` images until redistribution rights are
confirmed. Training permission and redistribution permission are different.

## Question-bank expansion target

After Milestone 1:

| Domain | Add |
| --- | ---: |
| Specimen preparation/culture/harvest | 10 |
| Molecular cytogenetic testing | 23 |
| Laboratory operations | 13 |
| Chromosome analysis/imaging | 0 |
| Total | 46 |

Every item must be original, sourced, structurally valid, nonduplicative,
difficulty-reviewed, and approved by Austin. Target roughly 30% recall, 40%
application, and 30% judgment among the new items.

## Non-negotiable constraints

- Keep the application static and client-only.
- Preserve single-file runtime delivery unless Austin approves a justified
  restructuring proposal.
- Do not add Tailwind, React, a backend, authentication, analytics, or cloud
  state merely for modernization.
- Do not add PHI, accession numbers, employer-confidential material,
  proprietary SOPs, recalled exam questions, or images with unresolved
  redistribution rights.
- Do not treat AI-generated scientific content as reviewed.
- Do not imply ASCP affiliation or endorsement.
- Do not silently alter progress, analytics, or public API semantics.
- Do not call scientific content “validated” because code tests pass.

## Required completion report

At the end of any task, report:

1. Files changed
2. User-visible behavior changed
3. Validation commands and exact results
4. Scientific or licensing review performed
5. Remaining risks or blockers
6. Recommended next issue

A task is not complete because the page appears to work. Implementation,
documentation, tests, and applicable scientific/licensing review must agree.
