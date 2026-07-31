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
- GitHub Actions confirmed this on PR #5, not only local runs: workflow run
  `30600962632` passed (`npm ci` → `npm test` → Chromium install →
  `npm run test:e2e`) in 1m16s on the pushed branch, at commit `14d22e1`
- An independent review pass before merge found that the export/import
  round-trip test opened its destination page via `context.newPage()`,
  which shares `localStorage` with the source page in the same
  `BrowserContext` — the test could pass without import doing anything. It
  now uses `browser.newContext()` (a genuinely separate storage partition)
  and asserts zero progress on that context before calling `importJSON()`.
  The local static server also now binds explicitly to `127.0.0.1` rather
  than all interfaces. See the QL-008 addendum for detail.
- Commit `2eb20f2` is the post-correction implementation checkpoint — the
  one that applied the isolated-`BrowserContext` import test and the
  loopback-bound server described above. GitHub Actions workflow run
  `30602095883` (passed, 1m3s) verified that checkpoint specifically.
  `30600962632` above verified the earlier, pre-correction commit
  `14d22e1`. Neither run ID is the branch's live CI status by the time
  anyone reads this — the branch moves on with every push. Check the PR
  (#5) or GitHub Actions directly for the current result; don't infer it
  from a run ID recorded here.
- This closes the "Add real-browser automation" item below; WCAG/screen-reader
  automation, deployed-Pages-URL testing, true touch hardware, and the
  third-party image-delivery confirmation remain open

Automated WCAG scanning and representative keyboard testing were added on
2026-07-31 (branch `claude/issue-1-accessibility-baseline`, Issue #1):

- `tests/e2e/accessibility.spec.mjs` runs a full-document
  `@axe-core/playwright` scan against the real course at both viewports in
  five states (fresh load, mobile nav open, quiz answered, exercise
  answered, module complete + flashcard flipped). `@axe-core/playwright` is
  a devDependency; `index.html` gained no runtime dependency.
- `tests/e2e/keyboard-navigation.spec.mjs` adds representative keyboard
  coverage of the skip link, the desktop sidebar nav, the mobile hamburger
  menu, a quiz item, an exercise item, module completion, Print, and Reset.
  Every control claimed as Tab-reachable is proven so by a shared, bounded
  `tabUntilFocused()` helper that drives real `Tab` key presses to the exact
  target element — never `locator.focus()`, which would pass even on a
  `tabindex="-1"` element a real keyboard user could never reach. Each
  control's computed accessible name is asserted with `toHaveAccessibleName()`
  against real expected content, a shared `assertVisibleFocus()` helper then
  confirms a genuinely visible `:focus-visible` outline (non-`none` style,
  non-zero width, non-transparent color) before the control is activated
  with `Enter`/`Space`, plus (for the mobile menu) an
  absence-of-keyboard-trap check.
- The initial scan found six confirmed, independently verified defects —
  insufficient contrast on three CSS color variables, 22 heading-order
  violations, two unlabeled table corner cells, unlabeled instructional
  SVGs, non-focusable scrollable tables, and a skip link that did not move
  keyboard focus. All six were fixed with narrowly scoped changes (color
  values, heading levels with a same-size CSS override, an `.sr-only` label,
  an SVG accessible-name parameter, and two `tabindex` additions) that do
  not touch any scientific content. See `docs/QUALITY_LOG.md` QL-010.
- Two mistakes in the tests themselves were caught and corrected during
  authoring, not shipped (QL-011). A third, more consequential one was
  caught in independent review of the draft PR: every original
  "keyboard-reachable" test used `locator.focus()` instead of real `Tab`
  input, so it could not have caught a `tabindex="-1"` regression on any of
  those controls despite the test names and this document's earlier wording
  claiming Tab-reachability. Rewritten to use `tabUntilFocused()` throughout
  and mutation-verified (a deliberately added `tabindex="-1"` now fails the
  test with a clear message). See the first QL-011 addendum.
- A second independent review found the documentation itself had then
  overclaimed: it described every control's accessible name and visible
  focus as asserted, but the skip link had no accessible-name assertion and
  four controls (the exercise option, exercise Next, Print, and Reset)
  never received a visible-focus check. Added the missing skip-link
  assertion and a shared `assertVisibleFocus()` helper applied to all nine
  controls uniformly; mutation-verified with a second, independent mutation
  (`#printBtn:focus-visible{outline:none}` now fails the Print test). See
  the second QL-011 addendum.
- All 62 scheduled Playwright test runs (58 passed, 4 intentionally skipped
  per-viewport, 0 failed) and all 48 dependency-free checks (`npm test`:
  12 structural + 36 DOM behavior) passed locally after these changes.
- This item stays **unchecked** in Issue #1 and in `docs/ROADMAP.md`: a
  genuine representative screen-reader review has not been performed, and
  passing an automated scanner plus keyboard-only testing does not establish
  one. Deployed-Pages-URL testing, true touch hardware, and the third-party
  image-delivery confirmation also remain open.

A dedicated deployed-site Playwright smoke suite was added on 2026-07-31
(branch `claude/issue-1-deployed-pages-smoke`, Issue #1):

- `tests/e2e-deployed/` (`npm run test:deployed`,
  `playwright.deployed.config.mjs`, its own small `fixtures.mjs`) runs 22
  scheduled test runs against the real deployed HTTPS URL
  (`https://jaustinanderson.github.io/cytogenetics-cg-course/`, configurable
  via `DEPLOYED_BASE_URL`) at the same 1280x900 and 390x844 viewports as
  `tests/e2e/`. It is a fully separate suite/config/directory with no
  `webServer`, never invoked by `npm test` or `npm run test:e2e`, so ordinary
  local and PR validation still requires no outbound network access.
- Covers: a successful HTTPS response with the expected title/heading; the
  17 quiz mounts / 17 modules / 6 exercise sets; page-origin console
  cleanliness on load and after interaction; absence of horizontal overflow
  at the narrow viewport; the mobile menu opening via Playwright's
  touch-emulated `.tap()` with `aria-expanded` checked against the sidebar's
  actual bounding-box position (not just its class name) in both states;
  tapping a module link reaching that module and closing the menu; tapping
  the backdrop closing the menu; a touch-emulated quiz interaction; and
  module-completion persistence across a real reload in a dedicated
  `browser.newContext({ baseURL })`, with an explicit assertion that
  navigation reached the expected deployed origin/path. No smaller viewport
  was added — `index.html`'s only breakpoints are 980px and 560px, both
  already crossed at 390px.
- `scripts/verify-deployed-revision.mjs` (`npm run
  verify:deployed-revision`) requires **both** a matching GitHub deployments
  API record (commit SHA + `state: success`) **and** a cache-busted SHA-256
  hash match between the live `index.html` and the checked-out one — see the
  2026-07-31 (later) entry below for why the API check alone was
  strengthened.
- `.github/workflows/deployed-smoke.yml` is a separate GitHub Actions
  workflow (`workflow_dispatch` for manual runs, `workflow_run` after
  GitHub's own `pages-build-deployment` completes on `main` for
  post-deployment verification) that runs the revision check then the
  deployed suite. `ci.yml` is unchanged.
- Two test-authoring mistakes were self-caught on the first real run against
  the live page, before either was committed: a `page.goto("/")` relative-URL
  bug that dropped the repository path against a `baseURL` with an existing
  path (every test 404'd; a raw `curl` and a minimal standalone Playwright
  script both confirmed the real deployment itself was fine), and a
  backwards bounding-box comparison in the mobile-nav test. See
  `docs/QUALITY_LOG.md` QL-012 for the full diagnosis, a mutation-test
  demonstration for the horizontal-overflow assertion (injecting an
  artificially wide element into the live page's loaded DOM in an ephemeral
  tab), and the exact remote-image result.
- Remote-image result from this environment's network: both approved images
  completed loading with nonzero natural dimensions — Wikimedia 1280x1003,
  CDC PHIL 700x563. This is one observation from one network, not a
  guarantee for GitHub Actions runners or any other network; see
  `docs/VALIDATION.md`.
- No product defect was found in `index.html`; nothing there was changed.
- All 22 deployed-suite runs (16 applicable, 6 intentionally skipped
  per-viewport/per-project), all 62 local Playwright runs, and all 48
  dependency-free checks (`npm test`) passed locally. See the completion
  report on the branch's pull request for exact commands and results.
- This closes the "run deployed narrow-screen/touch/mobile-navigation tests"
  item in `docs/ROADMAP.md` and Issue #1 for its automated/emulated scope.
  Screen-reader review and physical touch-hardware testing remain separate,
  unperformed, unchecked gates — this work does not and cannot establish
  either.

An independent review of that work, on the same PR (#7) and branch, found
and prompted correcting four issues, applied 2026-07-31:

- `scripts/verify-deployed-revision.mjs` overclaimed what the GitHub
  deployments API alone establishes (a registered build record for a SHA,
  not proof of what bytes the live URL returns right now). It now requires
  both that API record **and** a cache-busted SHA-256 comparison of the live
  `index.html` against the checked-out one, with comments and log output
  stating precisely what each check does and does not prove — including the
  specific case where `index.html` is byte-identical across commits (true
  here), where a hash match alone cannot identify which commit is live.
- The workflow now requests `deployments: read` alongside `contents: read`,
  and all three network calls in the verifier's poll loop (deployment list,
  deployment status, live-hash fetch) share one bounded-retry path instead of
  the deployment-status call being unguarded.
- `DEPLOYED_BASE_URL` is now bound once at job level so the revision check
  and the Playwright suite cannot silently target different URLs; the
  verifier also warns if `DEPLOYED_BASE_URL` doesn't match the canonical
  Pages URL derived from `GITHUB_REPOSITORY`.
- The isolated persistence test in `quiz-and-persistence.spec.mjs` now passes
  `{ baseURL }` explicitly to `browser.newContext()` and asserts the reached
  origin/path. Investigating the review's stated cause first (per the
  standing QL-007/QL-008/QL-011 discipline) found the general claim
  ("manually created contexts don't inherit baseURL") is true for raw
  Playwright but *not* for `@playwright/test`, which instruments every
  `newContext()` call in a running test — confirmed by tracing
  `@playwright/test`'s source and by a minimal reproduction. The recommended
  fix was applied anyway: it removes reliance on that instrumentation being
  understood or remaining unchanged, and the added origin assertion is a
  real, independent hardening regardless of the original premise's accuracy.
  See `docs/QUALITY_LOG.md` QL-013 for the full account, including why an
  overclaim can go in either direction — the code's or the review's — and
  both need the same verify-before-trusting discipline.
- `tests/verify-deployed-revision.mjs` (part of `npm test`, loopback-only)
  adds focused hash-match/mismatch checks for the new verifier logic,
  mutation-verified (removing the cache-busting parameter made the
  corresponding test fail, then was reverted).
- No product change; `index.html` remains untouched.

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
   described above (`tests/e2e/`) on PR #5, confirmed on GitHub Actions, not
   only local runs. Commit `2eb20f2` is the post-correction implementation
   checkpoint (isolated `BrowserContext` import test, loopback-bound local
   server); GitHub Actions run `30602095883` verified it. For the branch's
   actual current CI status, check the PR or GitHub Actions — do not infer
   it from a run ID recorded here. Issue #1 stays open for the remaining
   Milestone 0 items below.
2. ~~Add automated WCAG checks and representative keyboard/screen-reader
   review.~~ Automated WCAG scanning (axe-core) and representative
   keyboard-only interaction testing are done as of 2026-07-31 (see above,
   `docs/QUALITY_LOG.md` QL-010/QL-011). A genuine screen-reader review has
   **not** been performed and stays open; do not check this item in Issue #1
   or `docs/ROADMAP.md` until one is.
3. ~~Run narrow-screen, touch, and mobile-navigation tests against the live
   page.~~ Done 2026-07-31 via `tests/e2e-deployed/` (`npm run
   test:deployed`, branch `claude/issue-1-deployed-pages-smoke`, Issue #1)
   for its automated/touch-emulated scope (see above,
   `docs/QUALITY_LOG.md` QL-012). True touch-hardware testing and the
   screen-reader review remain separate, unperformed gates; do not check
   those in Issue #1 or `docs/ROADMAP.md`.
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

The course has a skip link that now moves keyboard focus into `#main`
(fixed 2026-07-31, QL-010), visible focus styling, reduced-motion support,
semantic landmarks, keyboard-operable flashcards, WCAG-AA text contrast, a
correct heading order, labeled table headers, and accessible names on
instructional/quiz/exercise SVGs (also fixed 2026-07-31, QL-010). Remaining
work includes:

- Escape/focus/inert behavior for the mobile sidebar
- live result/status announcements
- flashcard front/back screen-reader state
- current-state semantics such as `aria-current` and `aria-pressed`
- a representative screen-reader review (automated scanning and
  keyboard-only testing do not establish this — see `docs/VALIDATION.md`)

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
