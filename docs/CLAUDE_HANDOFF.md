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

PR #7 was reviewed, approved, and squash-merged to `main` as `b83f8a8` on
2026-07-31. Post-merge: `ci.yml` passed on `main`, the GitHub Pages build
succeeded, and `.github/workflows/deployed-smoke.yml` fired automatically
via its `workflow_run` trigger (no manual dispatch needed) and passed,
confirming both the deployment-record match and the live/local `index.html`
hash match for `b83f8a8`, 16/6 deployed Playwright results, and both remote
images' natural dimensions — see the comment on Issue #1. Issue #1's
"narrow-screen, touch, mobile-navigation" item is now checked for its
automated/emulated scope only; screen-reader review and physical
touch-hardware testing stay open.

A README course screenshot was added on 2026-07-31 (branch
`claude/issue-1-readme-screenshot`, Issue #1):

- `docs/assets/course-overview.png` (1440x1500, ~280KB) embedded near the
  top of `README.md`, linked to its full-size version, with descriptive alt
  text. Shows the header (with progress bar and Print/Reset), the sidebar
  module list, the hero section, the exam content-weighting chart, and the
  complete 17-module progress dashboard grid, all in a fresh
  "0 of 17 modules complete" state.
- `scripts/capture-readme-screenshot.mjs` (`npm run
  capture:readme-screenshot`) generates it deterministically: clears both
  progress localStorage keys, uses a 1440x1500 viewport (1440 stays solidly
  in the desktop CSS path; 1500 is the measured height needed to include the
  full dashboard grid without cutting a card mid-row, chosen instead of a
  `fullPage` capture — the real document is over 100,000px tall across all
  17 modules), sets `reducedMotion: "reduce"` so the page's own
  `prefers-reduced-motion` CSS rule disables transitions, waits for
  `document.fonts.ready` plus `networkidle` so the Google Fonts webfonts
  have swapped in, and explicitly scrolls to the top before capturing.
- Deliberately **not** a test: no pixel-comparison assertion was added, since
  a byte-identical screenshot claim can't be made reproducible across
  font-hinting/Chromium-version/OS differences, and a brittle diff test
  would fail for reasons unrelated to any real regression.
- The raw capture (389,650 bytes) was losslessly re-encoded smaller
  (286,140 bytes, ~27% reduction) using `sharp-cli` (fetched via `npx`, not
  a project dependency) at a higher compression effort. A first attempt
  using only `--compressionLevel`/`--effort` looked fine by file size alone
  but was NOT actually lossless — `sharp-cli` defaults to palette
  (color-quantized) PNG output; comparing raw decoded pixel buffers found
  6% of bytes differed by up to 25/255. Adding `--palette=false` and
  re-verifying byte-for-byte pixel identity before committing caught this
  before a subtly degraded asset shipped. See `docs/QUALITY_LOG.md` QL-014.
- Initially: no product change; `index.html` untouched. **This was revised**
  — independent review of this screenshot found a real product defect it
  exposed; see the correction entry immediately below. Scientific content
  was never touched, in either version of this work.
- This closes the "capture a clean course-only README screenshot" item in
  `docs/ROADMAP.md` and Issue #1. Screen-reader review, physical
  touch-hardware testing, and the scientific-review status record remain
  open — this work does not and cannot establish any of them.

Independent review of that screenshot found and prompted correcting three
issues, applied 2026-07-31 on the same branch:

1. **A confirmed product defect, found from the screenshot itself.** Every
   one of the 17 dashboard cards ran its title directly into "Module N" on
   one line, and the status text ("To do"/"Done") had no protection against
   wrapping. Confirmed against `index.html` before changing anything (the
   title/subtitle wrapper `<span>` had no class or layout rules; `.dc-t`/
   `.dc-s` were plain inline spans with nothing to make them stack; `.dc-
   state` lacked `flex:0 0 auto`/`white-space:nowrap`). Fixed with a scoped
   CSS/markup change (`.dc-body` wrapper class with flex/column layout,
   `display:block` on title/subtitle, the missing flex/nowrap on the
   status), verified by real bounding-box measurement at both the desktop
   and narrow/mobile viewports. **`index.html` is no longer unchanged for
   this PR** — this is the one exception, a narrowly scoped, independently
   confirmed layout fix; no scientific content changed. See
   `docs/QUALITY_LOG.md` QL-016 for the full diagnosis, fix, and a
   mutation-test proof (reverting the fix made 4 of 6 new test runs fail
   immediately).
2. **A new regression test** — `tests/e2e/dashboard-layout.spec.mjs` (6
   runs across both Playwright projects) — asserts, via bounding boxes and
   computed line-height (not pixel snapshots), that all 17 cards render
   with title/subtitle on separate non-overlapping lines and non-wrapping
   status text, at both viewports.
3. **The reproducibility evidence was corrected.** The original entry above
   claimed reproducibility from two runs producing the *same file size*,
   which is not proof of identical content. Corrected to compare
   `sha256sum` of the raw capture across two runs (both produced
   `a81201a6...d63261a`) — real cryptographic evidence for this
   environment, explicitly not a claim that the script (or the optional
   `sharp-cli` optimization step) reproduces byte-identical output across
   different OS/Chromium/font environments. See `docs/QUALITY_LOG.md`
   QL-015.
4. **The capture script was hardened**: an OS-assigned ephemeral local-
   server port with conclusive early-exit failure detection (instead of a
   fixed port and a generic timeout), explicit pre-capture assertions of
   the page title/heading/17-dashboard-cards, a font-load check that
   confirms each expected family reached `status: "loaded"` in
   `document.fonts` rather than trusting `document.fonts.ready` alone
   (which also resolves after a *failed* font request — verified by
   deliberately blocking the Google Fonts requests and confirming
   `.ready` still resolved while this stricter check correctly failed),
   and a guaranteed-clean server shutdown in both the success and failure
   paths (verified by checking for a leftover process after each induced
   failure above).
5. **The screenshot was regenerated** after the product fix, and its
   capture height recalculated from a fresh measurement rather than
   assumed unchanged — the fix actually made dashboard rows shorter on
   average, and an intermediate 1500px-tall capture was visually inspected
   and rejected because it cut into module 1's own header. Final:
   `docs/assets/course-overview.png`, 1440x1430, 280,149 bytes, verified
   pixel-identical to the raw capture before committing.

All of `npm test`, `npm run test:e2e` (including the new layout test), and
two capture-script runs (compared by `sha256sum`, not file size) passed
locally after these corrections. Issue #1's screenshot checkbox and the
issue itself remain open, pending independent review of this correction.

A final documentation-only correction was applied 2026-07-31 on the same
branch: the optional pixel-verification command documented in
`scripts/capture-readme-screenshot.mjs`'s header comment invoked
`node -e 'require("sharp")...'` as its own process, but `sharp` (the
library) is not a project dependency and nothing made it resolvable there
— reproduced directly (confirmed no global/local `sharp` was reachable,
then ran the exact documented commands and got the same failure). A second
portability bug was found while fixing the first: the re-encode command
pointed `sharp-cli`'s `-o` flag at a fixed path that the documentation
never created, and `sharp-cli` silently writes a single file at that exact
path instead of a directory when it doesn't already exist. Both fixed by
using `mktemp -d` for both temporary directories and installing `sharp`
into the isolated one with `NODE_PATH` pointed at it — no dependency added
(`git diff --stat package.json package-lock.json` confirmed empty). The
full corrected sequence was executed end-to-end in one shell session from
a clean state and produced `pixel-identical: true`; the resulting
`docs/assets/course-overview.png` hash is unchanged from what was already
committed, so no product, screenshot, or scientific content changed — only
`scripts/capture-readme-screenshot.mjs`'s documentation. See
`docs/QUALITY_LOG.md` QL-017.

A scientific-review status record was added 2026-07-31 (branch
`claude/issue-1-scientific-review-status`, Issue #1):

- `docs/SCIENTIFIC_REVIEW.md` records, honestly and with evidence, that
  **no question, exercise, flashcard, or case content currently has an
  independently recorded scientific review** — all of it is Draft per
  `docs/CONTENT_GOVERNANCE.md`'s content-state definitions. The one
  exception: the exam blueprint's domain names and published target ranges
  (four ASCP BOC domains) are Source-checked against the dated, linked
  ASCP BOC CG content guideline. That is a precise, narrow claim: it means
  the guideline is identified and dated, not that the course's current
  148-question distribution (33/91/14/10) matches or is validated by it.
  The distribution is a separate, mechanically measured fact — only the
  specimen domain currently falls within its published range; analysis is
  overrepresented and molecular/operations are both underrepresented (see
  `README.md` "Course coverage").
- The record explicitly separates five things that are easy to conflate:
  scientific/content review, software validation, accessibility testing,
  source/provenance review, and image/licensing (rights) review — each
  with its own current status and a pointer to where its evidence actually
  lives (this new file, `docs/VALIDATION.md`, or
  `THIRD_PARTY_NOTICES.md`). It states plainly that passing automated
  tests establishes structural/behavioral consistency, not scientific
  correctness.
- Covers all 17 modules and the separate 42-question final-cumulative-exam
  pool in a status table. Per-module and pool question counts were read
  directly from the committed course data via
  `window.CytoCourse.getQuestions(id)` in a sandboxed `vm` context (the
  same technique `tests/validate-course.mjs` uses) — not estimated, and
  reconciled to sum to exactly 153 (111 across modules + 42 in the final
  pool), matching the domain totals `tests/validate-course.mjs` already
  asserts.
- Does **not** claim the credentialed author's review of their own
  authored content is equivalent to independent review — per
  `docs/CONTENT_GOVERNANCE.md`, authored content is Draft until reviewed
  regardless of the author's credentials, and this record holds itself to
  that standard explicitly.
- Includes a practical per-item review checklist (adapted directly from
  `docs/CONTENT_GOVERNANCE.md`'s existing question-review requirements)
  and a reusable review-log table format (content ID, type, domain,
  reviewer, date, scope, source(s) cited, status, notes) for recording
  future reviews as an append-only audit trail.
- A structural check in `tests/validate-course.mjs` parses the status
  table and verifies: the module-ID set exactly matches the live
  `getModules()` set (no missing module, no stale extra row); every
  table title matches `module.short`; every per-module question count
  matches `getQuestions(module.id).length`; exactly one final-pool row
  exists and its count matches `getQuestions("final").length`; and module
  counts plus the final-pool count reconcile to the live total. Reading
  the module list dynamically (not a hardcoded count) means it catches
  drift if a module is ever added, removed, or renamed without updating
  the record.
- One self-caught mistake during drafting, corrected before commit: an
  early draft misattributed a quoted sentence ("Structurally validated
  beta; full scientific and accessibility review is in progress") to
  `README.md`'s current status text; it is actually
  `docs/VALIDATION.md`'s "Release language" guidance for a *future*
  release, not the project's current wording. Caught by re-checking the
  literal source text before committing the quote. See
  `docs/QUALITY_LOG.md` QL-018.
- No question, answer, explanation, exercise, case, image, or scientific
  claim was altered — this is a documentation-only addition. `index.html`
  is untouched.
- This closes "record the current scientific-review status" in
  `docs/ROADMAP.md` and Issue #1, as the status *record*, not as the
  underlying review — the review itself remains undone, and the beta
  warning in `README.md` is unchanged. Do not check Issue #1's item, or
  read this as removing the beta warning's basis, before independent
  review of this record.

Independent review of that record found and prompted correcting several
claim-to-evidence and terminology problems, applied 2026-07-31 on the same
branch:

1. **A row-explanation mismatch.** The document's "Five separate review
   types" section said it "only speaks to the first and third rows" of a
   five-row table, which didn't correspond to any consistent pairing.
   Rewritten to name the review types directly ("Scientific/content review
   and Source/provenance review") so the claim can't drift out of sync
   with the table again.
2. **A silent policy change.** `docs/CONTENT_GOVERNANCE.md` defines
   SME-reviewed as review **by Austin** specifically; the record had
   quietly broadened this to "a named subject-matter expert" and used
   "independently reviewed" throughout without reconciling the two.
   Corrected to reproduce `docs/CONTENT_GOVERNANCE.md`'s definition
   verbatim and add an explicit distinction the four states alone don't
   make: authored content vs. Austin's documented SME review (which
   satisfies the current SME-reviewed state) vs. independent second-person
   review (a stronger claim SME-reviewed as currently defined does not
   require). States plainly that a future Austin review would satisfy
   SME-reviewed but would not itself be independent second-person review.
3. **An overclaimed source-checked scope.** The record had implied the
   course's current 33/91/14/10 question distribution was itself
   "Source-checked" against the ASCP BOC guideline. Narrowed to state that
   only the guideline's domain names and published target ranges are
   Source-checked (the guideline is identified and dated); the current
   distribution against those ranges is a separate, mechanically measured
   comparison, and the record now states plainly — matching
   `README.md`'s own "Course coverage" table — that only the specimen
   domain is currently within its published range, while analysis is
   overrepresented and molecular/operations are both underrepresented.
4. **Ambiguous inventory wording.** "153 questions... across 17 modules,
   plus a 42-question... pool" could read as 153 module questions plus 42
   more (195 total). Reworded to "153 total questions: 111 assigned across
   the 17 modules, plus the separate 42-question final cumulative pool"
   with the arithmetic stated explicitly (111 + 42 = 153).
5. **Structural validation strengthened to match its claims.** The
   previous check only confirmed each module ID appeared somewhere in the
   document text. Replaced with a real table parser that verifies the
   module-ID set exactly equals the live set (no missing or stale rows),
   every title matches `getModules()`, every count matches
   `getQuestions()`, the final-pool row exists with a matching count, and
   module counts plus the final-pool count reconcile to the live total.
   The per-module table's "Title" column was switched from the fuller
   `<h2>` heading text to the exact `module.short` string the public API
   returns, specifically so this comparison is an exact string match, not
   an approximation.
6. **Mutation-tested**: a missing module row, a stale extra module row, an
   incorrect module title, and an incorrect question count were each
   introduced one at a time and confirmed to fail the check for the
   specific, correct reason (shown in the assertion's `actual`/`expected`
   output), then fully reverted before commit. A fifth mutation (wrong
   final-pool count) was also verified as a bonus check on that part of
   the logic.
7. See `docs/QUALITY_LOG.md` for the corresponding entry. No question,
   answer, explanation, exercise, case, image, or scientific claim was
   altered in this correction round either; `index.html` remains
   untouched, and Issue #1 was not modified.

A third, narrower correction followed the same day: a second independent
review of the round-2 structural check found it was still gameable in two
ways. Its `Set`/`Map`-based module-ID comparison silently collapsed
duplicate rows (two rows for the same module ID looked identical to one),
and its final-pool row was identified only by exclusion ("doesn't look
like `m<number>`"), so a renamed or fabricated non-module identifier with
the right count would pass, and the pool row's own title was never
checked. Fixed surgically in `tests/validate-course.mjs`: an assertion
that total rows equal the live module count plus exactly one, an
assertion that the module-row count alone equals the live module count, an
explicit array-length-vs-`Set`-size uniqueness check before building the
lookup `Map`, an exact `*(pool)*` identifier match for the final-pool row
instead of exclusion, and a new assertion that the final-pool title is
exactly `"Final cumulative exam"`. Mutation-verified: a duplicated module
row, a renamed pool identifier, and a changed pool title were each
introduced separately and each failed at a distinct, correctly-located
assertion; all three fully reverted before commit. See the addendum to
`docs/QUALITY_LOG.md` QL-019. No product or scientific content changed.

Asset localization (branch `claude/issue-1-asset-localization`, PR #10,
Issue #1) implements `docs/ROADMAP.md`'s "decide whether to localize remote
fonts and the two approved images" item — one Milestone 0 item among the
several still open (see `docs/ROADMAP.md` for the current full list; this
entry does not claim Milestone 0 or Issue #1 is complete):

- **Decision:** localize both. The two approved images (NHGRI 46,XY; CDC
  PHIL trisomy-21) are committed to `assets/images/`, fetched byte-for-byte
  from the exact URLs the page already displayed remotely (no re-encoding,
  confirmed by SHA-256 and by matching the natural dimensions QL-012 already
  observed: 1280x1003 and 700x563). The exact IBM Plex Sans (400/500/600/700)
  and IBM Plex Mono (400/500/600) weights the course's own CSS requests are
  self-hosted from the official `IBM/plex` GitHub release assets
  (`@ibm/plex-sans@1.1.0`, `@ibm/plex-mono@2.5.0`) under the bundled SIL Open
  Font License 1.1 — self-hosting was judged proportionate (7 WOFF2 files,
  ~360KB total, no build step, no subsetting/unicode-range complexity added)
  rather than falling back to a system-font stack, so the course's existing
  typography is unchanged. External source-page/credit links (Wikimedia
  Commons, `phil.cdc.gov`) are preserved unchanged; only the runtime-fetched
  bytes moved local. Full source/hash/license record: `THIRD_PARTY_NOTICES.md`.
- **Structural guard:** a new `tests/validate-course.mjs` check asserts every
  `@font-face src` and both figures' `<img src>` resolve to a local
  `assets/` path, that no `fonts.googleapis.com`/`fonts.gstatic.com`
  reference remains anywhere in the document, that every referenced local
  asset exists on disk with nonzero size, and that the external
  source-page/credit links are unchanged. Mutation-verified: reverting one
  `<img src>` and separately one `@font-face src` to their old remote URLs
  each made the check fail with a message naming the exact remote URL found;
  both reverted before commit.
- **Test coverage:** `tests/e2e/local-images.spec.mjs` (new) confirms both
  images load with nonzero natural dimensions from the local static server —
  previously impossible to check without outbound network access, now
  possible because the images are local. `tests/e2e-deployed/
  remote-images.spec.mjs` was renamed to `local-images.spec.mjs` and now
  also asserts each image's `currentSrc` resolves to the deployed page's own
  origin, not a third-party host.
- **Local validation:** `npm test` emits 55 checks total (14 structural +
  36 DOM behavior + 5 deployed-revision-verifier hash checks) and all 55
  passed, including the new structural guard above. `npm run test:e2e`
  passed at both viewports after confirming one apparent failure
  (`init.spec.mjs`'s `networkidle` wait timing out) was a resource-contention
  flake from running the full suite fully parallel in this sandbox, not a
  product regression — re-running `tests/e2e/init.spec.mjs` alone passed
  cleanly every time, per the standing QL-007/QL-008 discipline of
  reproducing an unexpected failure in isolation before trusting it.
- No question, answer, explanation, exercise, case, or scientific claim was
  altered. `docs/SCIENTIFIC_REVIEW.md`'s status record is unaffected.
- This closes the asset-localization roadmap item tracked under Issue #1 —
  it does not close Issue #1 itself, which stays open for its other
  Milestone 0 items, most notably a genuine representative screen-reader
  review and true touch-gesture testing on physical hardware, neither of
  which this work performs or is affected by. PR #10 is the implementation
  checkpoint for this work; see the PR for CI results and review status.

A visual-polish pass (branch `claude/issue-11-visual-polish`, Issue #11,
opened as a new, separately-scoped issue rather than under Issue #1) fixed
five confirmed learner-facing visual/responsive defects:

- Removed the five "Image needed" authoring/search placeholder figures from
  Modules 8–12, replacing each with a short explanatory sentence where the
  surrounding lesson did not already stand alone on its own. No new imagery
  was fabricated, generated, downloaded, or embedded; the image manifest and
  its provenance records are unchanged (still 19 records, 2 embedded, 17
  needed) — this is a UI change, not a rights-review decision, which
  `docs/ROADMAP.md` Milestone 2B continues to govern.
- Capped embedded figure images (`max-height:min(52vh,460px)`) so they stay
  proportionate to surrounding content, and raised figcaption/`.src`/`.lic`
  font sizes and `.src`'s color for comfortable reading.
- Added a global `p{max-width:70ch}` reading-measure cap; confirmed tables,
  quizzes, and exercises (which use `div`/`td`, not `p`) are unaffected.
- Fixed a mobile-header flexbox bug (the brand-name wrapper's default
  `min-width:auto` refused to shrink) that caused the course name to
  visually overlap the Print button at 390px/360px; brand text now shrinks
  and ellipsizes, and Print/Reset become icon-only at ≤560px with an
  explicit `aria-label` preserving their accessible name.
- Every defect was independently measured against the real rendered page
  (bounding boxes, computed styles, before/after screenshots) before
  `index.html` changed, per the standing discipline in
  `docs/QUALITY_LOG.md`; see QL-020 for the full diagnosis and fix record.
- `tests/e2e/visual-polish.spec.mjs` adds 40 real-browser test runs across
  1440×900, 1280×900, 768×1024, 390×844, and 360×800 covering: no
  horizontal overflow, no header-control overlap/clipping, keyboard- and
  touch-accessible header controls with preserved accessible names, zero
  "Image needed" text, figures constrained to the viewport, and captions
  that stay attached and readable.
- Deliberately does **not** address the page's dense, fully-expanded
  quiz/exercise disclosure (every quiz/exercise item renders expanded at
  once) — recorded in `docs/ROADMAP.md` as the recommended next isolated UX
  task, not attempted here to keep this change narrowly scoped.
- `npm test` (structural + DOM behavior + deployed-revision-verifier hash
  checks) and the full local Playwright suite (`npm run test:e2e`,
  including the new spec) passed. The deployed suite (`npm run
  test:deployed`) targets the live `main` URL, which this unmerged branch
  does not affect and which this repository has no per-pull-request preview
  environment for (see `docs/VALIDATION.md`), so it was not re-run against
  this branch's changes.

Independent review of that draft PR (#12) found and prompted correcting four
issues, applied 2026-08-01 on the same branch — full diagnosis and evidence
in `docs/QUALITY_LOG.md` QL-020's addendum:

1. **An overclaimed "no scientific text changed" statement.** Three of the
   five placeholder removals (Modules 8–10) had been replaced with newly
   written explanatory sentences, not quotations of pre-existing course
   text — e.g. stating a normal female karyogram is 46,XX, and specific
   band-count figures for band resolution that appear nowhere else in the
   course. All three were removed, leaving pure placeholder deletions in
   all five modules (8–12), identical to how Modules 11–12 were always
   handled. Verified via `git diff` against the pre-visual-polish baseline
   that every remaining added line is CSS/markup/accessibility-attribute
   only, and every removed line is placeholder/authoring-instruction text.
   **This PR's scientific-content claim is now accurate: no course-content
   prose was added or changed.**
2. **The mobile-header accessibility test was vacuous for Print and Reset.**
   The original test proved real Tab-reachability and touch operation only
   for the hamburger; Print and Reset only had a visibility/name check.
   Rewritten into three independent tests, each proving real Tab
   reachability, visible focus, keyboard activation, and touch activation
   for its own control — the Reset test also seeds a disposable
   completed-module state and verifies both a keyboard-driven and a
   touch-driven Reset actually clear it. Mutation-verified: adding
   `tabindex="-1"` to `#printBtn` made the Print test fail immediately with
   a clear "not reached by natural Tab order" message; reverted before
   commit.
3. **The reading-measure rule reached further than intended.** The original
   global `p{max-width:70ch}` narrowed `.source-note`, `.callout p`,
   `.case-body p`, and `.grid-card p` — confirmed as the actual cause of the
   README-screenshot layout shift the original entry above described, not a
   coincidence. Rescoped to `.module p:not(.callout p):not(.case-body p):
   not(.grid-card p):not(.source-note)`, derived from a real-DOM survey of
   every `<p>` in the document (32 are genuine lesson prose; the rest are
   now provably untouched, checked via `getComputedStyle(...).maxWidth`).
   Because this restored the dashboard grid's original layout exactly,
   `docs/assets/course-overview.png` was reverted to the exact
   pre-visual-polish committed file (matching SHA-256) instead of kept as
   an unnecessary regeneration.
4. **Visual evidence was scratchpad-only**, not accessible to an
   independent reviewer. Published a self-contained before/after HTML page
   (real screenshots, no external requests) as a hosted Artifact, linked
   from the PR description.

`tests/e2e/visual-polish.spec.mjs` now runs 46 test-run instances (was 40);
all local validation (`npm test`, full `npm run test:e2e`) passed again
after these corrections. PR #12 merged to `main` as commit
`197eec4b75c4f6dc3c339335c21e7680e8402434` after independent review, and
the full post-merge chain (Validate course, Pages build/deployment,
deployed Pages smoke test, deployment-record + live-hash match, remote
images, console, and responsive checks) was confirmed green.

A quiz/exercise progressive-disclosure redesign (branch
`claude/issue-11-progressive-disclosure`, Issue #11 — a new, separately
scoped isolated task, not a continuation of the merged PR #12) implements
the "next isolated UX task" both PR #12 and Issue #11 explicitly deferred:

- Diagnosed the actual rendered behavior before choosing a design: at
  1440×900, quiz/exercise widgets accounted for 46.6% of the document's
  scroll height (110,209px total) with 636 answer buttons simultaneously
  present and focusable on a single fresh load.
- Every quiz (`buildQuiz`) and exercise (`buildExercise`) widget, plus the
  six static exercise mount points, is now a native `<details>`/
  `<summary>` element, collapsed by default — the same pattern already
  established in this course for case-study reveal cards. The summary
  communicates activity type, title, item count, and a "Not
  started"/"In progress"/"Completed" status word; the pre-existing
  `.qh-score`/`.eh-score` "X / Y" text is unchanged (12+ existing test
  assertions depend on that exact format).
- Measured after the change, same methodology: document height dropped
  45.2% at 1440×900 (110,209px → 60,386px), 42.8% at 768×1024, and 34.2%
  at 390×844; quiz/exercise share of document height dropped to 2.3–2.5%;
  visible answer buttons on a fresh load dropped from 636 to 0 (provably,
  via a `.quiz[open] .qopt`/`.exer[open] .eopt` selector).
- Two real defects were found and fixed before merge, plus one
  test-harness incompatibility caught the same way — full diagnosis in
  `docs/QUALITY_LOG.md` QL-021:
  1. A confirmed WCAG AA contrast failure in the new summary text
     (`--ink-faint` measured 4.31–4.41:1 against the summary backgrounds,
     just under the 4.5:1 threshold), found by the existing axe-core suite
     on the very first run. Fixed by switching to `--ink-soft`
     (6.23–6.39:1).
  2. A confirmed print-exposure defect: the first fix mirrored the
     pre-existing `details.card>.card-body{display:block !important}`
     print rule, but a mutation test passed unexpectedly, prompting direct
     verification with `page.emulateMedia({ media: 'print' })` rather than
     trusting `getComputedStyle().display`. That check found closed
     `<details>` content is suppressed by Chromium via an internal
     rendering behavior — not a plain `display` value — so the CSS
     override never worked, and neither did the pre-existing `.card-body`
     version it was copied from. Fixed by setting the real `open` property
     in the existing `beforeprint`/`afterprint` handlers (force-open every
     `<details>` for print, restore true prior state afterward), which
     also fixes the latent pre-existing case-study gap as a side effect.
  3. The initial fix used `element.dataset`, which
     `tests/dom-harness.mjs`'s minimal `Node` class does not implement;
     switched to `setAttribute`/`getAttribute`/`removeAttribute`, already
     fully supported, no harness changes needed.
- `tests/e2e/progressive-disclosure.spec.mjs` (rewritten by the correction
  pass below) covers default state, click/keyboard/touch expand-collapse,
  status visible while collapsed, no progress/API side effects from
  toggling or loading, status/score correctly derived from persisted
  progress after reload (partial and completed, quiz and exercise),
  correctness-changing reattempts replacing rather than double-counting a
  prior result, Reset behavior, print exposure (including a regression
  check for the pre-existing case-study cards), and no narrow-viewport
  overflow. Existing suites that interact with quiz/exercise content were
  updated to open the relevant disclosure first, via a small
  `openDisclosure()` helper (independent copies in the local and deployed
  suites' `fixtures.mjs`, matching this repository's existing
  suite-independence convention).
- Mutation-tested: removing the `beforeprint` force-open loop made the
  print-exposure test fail immediately with a clear "Expected: visible /
  Received: hidden" message; reverted before commit.
- No scientific text, question, answer, rationale, progress data, analytics
  semantics, storage schema, stable question/exercise ID, or public API
  behavior changed. `npm test` and the full local Playwright suite passed
  (one `init.spec.mjs` mobile failure reproduced as the pre-existing,
  already-documented `networkidle` resource-contention flake — QL-007/008
  — confirmed by passing cleanly in isolation, not a regression).
- Before/after screenshots and the full measurement table are published as
  a hosted Artifact (no images committed to the repository), linked from
  the PR description.

Independent review of that still-open, unmerged draft PR (#13) found a
blocking defect, corrected 2026-08-01 on the same branch — full diagnosis
and mutation-test evidence in `docs/QUALITY_LOG.md` QL-021's addendum:

- **Collapsed summaries disagreed with persisted progress after reload.**
  Reproduced against the exact reported commit
  (`eb5ee8be2ff8d481a18825934f8f4578bd71437e`): a fresh quiz read "Not
  started — 0 / 5," correctly updated to "In progress — 1 / 5" after
  answering, but reset to "Not started — 0 / 5" after a real reload even
  though `getProgress().answers` still held the correct record; the first
  exercise had the same defect. Because these widgets are now collapsed by
  default, the summary is the learner's primary status indicator, so this
  was newly blocking product behavior, not the already-known per-question
  lock-rendering gap. Root cause: `buildQuiz`/`buildExercise` always
  initialized score/answered to zero on every render instead of deriving
  them from `state.answers`/`state.exercises`.
- **Fix:** both functions now seed score/answered from the persisted
  records before rendering (read-only — confirmed to fire zero `progress`
  events), and both answer/choice handlers now capture the prior record
  before `recordAnswer`/`recordExercise` overwrites it, so a reattempt
  (only reachable across a reload, since a locked item cannot be clicked
  twice in one render) replaces the score/count delta rather than counting
  the item as newly answered a second time.
- **Tests:** the quiz and exercise reload tests were rewritten to expect
  the persisted summary and score, not "Not started"; added completed-state
  (not just partial-state) reload coverage for both; added a
  correctness-changing reattempt test for both, asserting exactly one
  distinct recorded item ID and its attempt count (`n`) reaching `2`; added
  a fixed-sentinel load test proving stored records are read but never
  rewritten and that loading plus toggling every disclosure fires zero
  `progress` events. Removed `"singular item counts read naturally"`,
  which asserted against a copy of the pluralization ternary inline in the
  test itself and never touched real product code — no real quiz/exercise
  in this course has exactly one item and the public API cannot construct
  one, so there was no way to replace it with a test that does exercise
  product code.
- **Mutation-tested:** reducing the seeding loop to a no-op (the exact
  pre-fix behavior) failed four distinct tests across both projects (8
  runs) with specific messages, including a revealing `Received: "-1 / 6"`
  from the reattempt test's score-decrement logic firing against a
  wrongly-assumed-absent prior record. Reverted; confirmed a clean diff and
  all tests passing again.
- **The PR's unverified find-in-page claim was softened.** Native
  `<details>` auto-expanding on a find-in-page match is real Chromium
  behavior, but Playwright has no API surface for the browser's native
  find bar, so it was never actually verified here. Reworded in the PR
  body to describe expected native behavior this repository has not
  itself verified, rather than an established fact.
- `npm test`, `npm run test:behavior`, the focused
  `progressive-disclosure.spec.mjs` (all passing), and the complete local
  Playwright suite (154 passed, 4 skipped, 0 failed) were run after this
  correction. PR #13 remains draft, open, and unmerged pending a second
  independent review.

A figure-quality pass (branch `claude/figure-9-10-quality`, Issue #14 — a
new, separately scoped issue; Issue #11 was not reopened) fixed Figure 9.1's
label overlap and replaced Figure 10.1's karyogram, based on direct review
of the live course rather than an automated finding:

- **Figure 9.1 (centromere morphology):** the three labels were embedded
  SVG `<text>` inside one shared `<svg>` whose `viewBox` was computed from
  chromosome-drawing geometry only, never from label width — confirmed
  against the live page before any change. "Metacentric" overlapped
  "Submetacentric," and "Acrocentric + satellite" extended past both the
  viewBox and the figure's own boundary. Fixed by separating labels from
  drawings entirely: `chromoOnlySVG()`/`morphGrid()` (new) render each
  morphology as its own card (`.morph-item`) in a responsive CSS grid
  (`.fig-morph-grid`, `repeat(auto-fit,minmax(150px,1fr))`), with the label
  as ordinary wrapping HTML text below a small, label-free drawing. This
  collapses to a single stacked column at narrow widths without a new
  hard-coded breakpoint. The figure's "(schematic)" identification is
  unchanged.
- **Figure 10.1 (trisomy 21 karyotype):** the embedded CDC PHIL image had
  unacceptable morphology/band detail (heavily thresholded, chromosomes
  grouped not individually numbered) and — confirmed by decoding and
  reading its own printed group label, not assumed — was actually a
  **female** (47,XX,+21) karyotype, which did not match the course's own
  `47,XY,+21` worked ISCN example beneath it. Removed and replaced with a
  Wellcome Collection karyogram (CC BY 4.0, credit "Wessex Reg. Genetics
  Centre"; 1176×1158px, fetched via the IIIF Image API at full native
  resolution), selected only after visually inspecting the decoded image
  directly. That same discipline caught a false lead first: a
  same-collection, similarly titled Wikimedia Commons file (Josef Reischig
  archive, CC BY-SA 3.0, higher pixel count) looked correct by title and an
  automated page-text summary, but turned out on inspection to be a raw,
  unsorted metaphase spread — overlapping unpaired chromosomes plus intact
  interphase nuclei — not an arranged karyogram, and was rejected despite
  its permissive license and higher resolution.
- `tests/e2e/figure-9-1-morphology.spec.mjs` (new) proves the Figure 9.1
  fix with real bounding-box assertions (label containment, no pairwise
  overlap, no text clipping, no horizontal page overflow) at all five
  acceptance-criteria viewports (1440×900, 1280×900, 768×1024, 390×844,
  360×800). Mutation-tested against the pre-fix markup (via a temporary
  `git stash`, which does not touch the new untracked test file): 10 of 12
  runs failed for the correct reason before the fix, all 12 passed after.
- `tests/validate-course.mjs`, `tests/e2e/local-images.spec.mjs`, and
  `tests/e2e-deployed/local-images.spec.mjs` were updated to the new
  filename and source URL; the existing `visual-polish.spec.mjs`
  figure-sizing/caption checks (which iterate figures generically) and the
  full axe-core accessibility scan pass unchanged against the new image.
- Added a detailed teaching-image inventory and priority list to
  `docs/ROADMAP.md` Milestone 2B (well-spread/over-spread/under-spread
  metaphases, overlap artifacts, banding quality, band-resolution series,
  normal 46,XX, structural abnormalities, mosaicism vs. culture artifact,
  FISH signal patterns) and a merged per-asset checklist. Two new priority
  items (mosaicism-vs-artifact, real FISH patterns) have no manifest lead
  yet; adding one is flagged as the first concrete task for whoever picks
  this up, deliberately not attempted as a broad replacement project here.
  Commented on the pre-existing Issue #3 pointing at this addition.
- No question, answer, rationale, scoring, progress, analytics, storage
  schema, stable ID, or public API changed. See `docs/QUALITY_LOG.md`
  QL-022 and `docs/VALIDATION.md` for the full diagnosis, rejected
  candidate, and verification record, and `THIRD_PARTY_NOTICES.md` for the
  complete provenance/license record of the new image.

A stable-exercise-identity pass (branch `claude/issue-2-stable-exercise-ids`,
"Part of #2" — the first isolated Milestone 1 task, not a continuation of
the prior figure-quality work) implements the first bullet of Issue #2's
work list and `docs/QUALITY_LOG.md` QL-005:

- **Root problem:** exercise-outcome storage keys
  (`state.exercises[...]`) were a position-derived `"<key>-<n>"` string
  recomputed from each item's array index on every render. Inserting or
  reordering an item could silently reattach a learner's saved history to
  a different item.
- **Fix:** every one of the 30 items across the 6 exercise sets
  (`EXERCISES.ex7`/`ex9group`/`ex9chrom`/`ex10`/`ex14`/`ex15`) now carries
  an explicit, literal `id` field (`"<key>-i<n>"`, e.g. `"ex7-i1"`) —
  deliberately a different string format from the legacy `"<key>-<n>"`
  form so the two can never collide and migration is genuinely meaningful
  — plus a second literal, frozen `legacyId` field recording the exact
  position-derived key that item held before this change (e.g.
  `"ex7-1"`). `buildExercise()`'s summary-seeding loop and its `choose()`
  handler now read/write `state.exercises[it.id]` directly instead of
  recomputing a position-derived key from the current render index.
- **Migration:** a new `migrateExerciseIds()` renames any surviving
  legacy-format key — read from each item's own frozen `legacyId`, never
  recomputed from its current array index — to its item's real stable id.
  It is deterministic and idempotent (a second run against
  already-migrated state performs zero writes, verified by exact storage
  string equality). Called unconditionally from `loadProgress()` and from
  `importJSON()`.
- **Conflict rule:** when both a legacy key and its item's stable key
  already hold a record, these records carry no attempt-level identifiers
  or provenance, so their histories cannot be assumed disjoint or exactly
  merged. Migration keeps the entire record (`c`, `n`, and `ts` together)
  from whichever key was written more recently — a conservative
  deterministic snapshot, not an arithmetic merge — with ties keeping the
  canonical stable-key record.
- **Schema-version decision:** `SCHEMA_V` stays `2`. The stored record's
  shape is unchanged — only the convention for which strings populate
  `exercises`'s keys — and the migration is cheap and safe enough (at most
  30 items) to simply always run rather than gate behind a version bump.
- **Tests:** 17 checks in `tests/dom-behavior.mjs` plus a structural
  completeness check in `tests/validate-course.mjs` cover explicit unique
  ids and legacy ids with no accidental collision,
  id-travels-with-item-not-position, legacy migration (memory and
  storage), idempotency (including after conflict resolution, via exact
  storage-string equality), the snapshot conflict policy (a newer stable
  record, a newer legacy record, an equal-timestamp tie, and a
  mixed-version-tab overlap example proving `n` stays the true attempt
  count rather than an inflated sum), fresh answers recorded only under
  stable ids, and reload/export/import round-trips including a
  legacy-format export. Two dedicated end-to-end tests run the real
  product script with `EXERCISES.ex7.items.reverse()` injected into a
  copy of the exact inline script text: one answers two items with
  deliberately different correct/incorrect outcomes and confirms each
  stays correctly attributed after the reorder; the other seeds a legacy
  record and reorders the array *before* migration ever runs, confirming
  the record follows its original item, not whichever item now occupies
  that position. **Mutation-tested** across four separate mutations (each
  reverted and confirmed byte-identical via `diff`): disabling the
  migration call; reverting the stable-id lookup to a position-derived
  computation; reverting the legacy-key lookup inside migration back to a
  position-derived computation; and reverting the snapshot conflict
  policy back to summing `n`. Each failed exactly the tests that claim to
  cover it.
- `tests/e2e/progressive-disclosure.spec.mjs`'s existing seeded-record test
  was updated to seed under `"ex7-i1"` (the real stable id) instead of the
  legacy `"ex7-1"`, keeping its original claim (no migration needed, no
  write, no `progress` event for an already-current-format record) intact.
- Strictly scoped to this one Issue #2 work item: no question, answer,
  rationale, scoring, quiz progress, analytics semantics, image, styling,
  layout, or accessibility presentation changed, and none of the other
  Issue #2 items (full import hardening, stale-ID policy, Reset/import
  exercise re-render, storage-failure UI, analytics redesign, content-pack
  format, image-manifest normalization) were touched. See
  `docs/QUALITY_LOG.md` QL-005 and `docs/VALIDATION.md` "Stable
  exercise-item identity" for the complete record.

Independent review of that draft PR (#16) found two blocking correctness
problems, corrected 2026-08-02 on the same branch — full diagnosis,
counterexample, and mutation-test evidence in `docs/QUALITY_LOG.md`
QL-005's addendum:

1. **Legacy IDs were recomputed from current array position, not frozen.**
   `migrateExerciseIds()` originally computed each item's legacy key from
   its position in `EXERCISES[key].items` *at migration time* — the same
   bug QL-005 exists to fix, one level up. A learner who skipped a release
   and first loaded a later one after an item was reordered could have
   had legacy progress migrated onto whichever item currently occupied
   that position. The original reordering test didn't catch this because
   it reordered *after* stable ids already existed, never exercising
   legacy migration against a reordered array. Fixed by giving every item
   a literal, frozen `legacyId` field and reading it directly; two new
   tests reorder the array *before* migration runs and confirm the record
   follows the correct item regardless.
2. **The conflict rule's "disjoint sequences" claim was false.** Summing
   `n` was justified by claiming a legacy and stable record "can only"
   contain disjoint attempts. Counterexample: two browser tabs on
   different app releases — one migrates an early 5-attempt snapshot to
   the stable key, the other (still on the legacy key) later records a
   6th attempt that already includes the first 5. Summing 6 + 5 reports
   11 attempts for an item genuinely attempted 6 times. Replaced with a
   conservative deterministic snapshot policy (keep the entire newer
   record, never reconstruct one by mixing fields) and rewrote the
   conflict tests around this exact counterexample plus four other
   scenarios.

`docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/VALIDATION.md`, and
`CHANGELOG.md` were all updated so none retain the disproven "disjoint
sequences," "sum," or "never double-counts" claims. `npm test` and the
full local Playwright suite passed after this correction. PR #16 remains
draft, open, and unmerged pending a second independent review.

A second independent review of the same draft PR found one remaining
test-coverage blocker, corrected 2026-08-02 on the same branch — full
diagnosis and mutation-test evidence in `docs/QUALITY_LOG.md` QL-005's
second addendum: the structural check added above (every item has a
unique `id` and a unique, non-colliding `legacyId`) proves presence and
uniqueness, but never proves each `legacyId` is paired with the *correct*
item — swapping two items' `legacyId` values with each other would leave
every count/uniqueness/non-collision assertion satisfied while migration
silently attached each item's history to the other one. Confirmed
directly (not assumed): swapping `ex7-i1`/`ex7-i2`'s `legacyId` values
and isolating just the old assertions against the mutated data showed
every one of them still reporting `true`. Fixed by adding
`EXPECTED_STABLE_TO_LEGACY_ID` to `tests/validate-course.mjs` — a
literal table of all 30 stable-id-to-historical-legacy-id pairs,
hard-coded independently of `EXERCISES`/`index.html` (never computed
from an item's current position or from `item.legacyId` itself, since
that couldn't detect a mistake in the very data being checked) — and
asserting the complete live mapping matches it exactly, key set first
then value-for-value. Mutation-tested: the same swap made the new
exact-mapping assertion fail with a diff naming exactly the two swapped
entries, while the pre-existing checks still passed unchanged; reverted
and confirmed `index.html` byte-identical via `diff` before committing.
`npm test` and the full local Playwright suite passed again. PR #16
remains draft, open, and unmerged pending further review.

PR #16 was subsequently reviewed, approved, and squash-merged to `main`
as `0d963a56a5069801d77665172a758564ca85f7fa`. Post-merge, an incident
was caught and corrected within the same session: the PR body's summary
sentence "It does **not** close #2" contained the literal substring
"close #2", which GitHub's keyword auto-linker matched despite the
negation and auto-closed Issue #2 on merge. Caught immediately, Issue #2
was reopened within seconds and the PR body text corrected afterward to
remove the pattern (confirmed via the repository's
`closingIssuesReferences` GraphQL field that no closing link remained).
Full post-merge chain (Validate course, Pages build/deployment, deployed
Pages smoke test, deployment-record + live-hash match, and a direct
isolated-browser check of the deployed migration/stable-id behavior) was
confirmed green; see the comment on Issue #2 for the complete record.
**Lesson for future PR/commit text near any issue number: avoid the
literal substring `close #N`/`closes #N`/`fix #N`/`fixes #N` even inside
a grammatically negated sentence — GitHub's matcher is a plain substring
scan, not a natural-language parser.**

A progress-import hardening pass (branch
`claude/issue-2-import-hardening`, "Part of Issue #2" — the second
isolated Milestone 1 task, not a continuation of the exercise-identity
work) implements the roadmap's "define and validate a versioned
progress-import schema" and "deep-clone imported state and reject
malformed nested values" items, and `docs/QUALITY_LOG.md` QL-006:

- **Root problem:** `importJSON()` checked only the top-level `v` field
  and trusted everything else; passing a plain object (not a JSON string)
  made the caller's own object the live `state` by reference, so later
  mutating that object silently corrupted course progress.
- **Fix:** `validateImportedState()` (pure — never mutates its input,
  never touches live `state`/`localStorage`/the DOM) checks the complete
  envelope and every nested value against an exact schema (see
  `docs/ARCHITECTURE.md` "Import validation"), builds an entirely new
  deep-cloned object graph, and only `importJSON()` commits it to live
  state after full success — atomic by construction, not by a rollback
  step. A raw string is checked against a 262,144-character length limit *before*
  `JSON.parse`; the parsed data against a 2000-entry cap before the more
  expensive per-entry pass. Both limits are grounded in a real measured
  full-course export (~8.7 KB, 200 entries), not a guess.
- **Dangerous keys:** map keys may be any non-empty string except
  `__proto__`/`constructor`/`prototype`, rejected wherever they appear.
- **Schema-version decision:** `SCHEMA_V` stays `2` — the accepted record
  shape is unchanged, only what was previously silently trusted is now
  checked.
- **Tests:** 27 new checks in `tests/dom-behavior.mjs` cover round-trip,
  full detachment from the caller's source object (including after
  mutating it post-import), missing/wrong schema version, size-before-
  parse, the entry-count cap, one dedicated rejection case per nested-type
  category (bad `modules`/`answers` types, non-true modules values,
  invalid `c`/`n`/`ts` in every named way, extra/missing outcome fields,
  unrecognized top-level fields), atomicity for every rejection case via
  one shared helper (`getProgress()`/`localStorage`/rendered
  label/`progress`-event count all unchanged), and no-partial-write
  proof. **Mutation-tested** across three mutations (each reverted and
  confirmed byte-identical via `diff`): weakening the counter validator,
  reverting the dangerous-key defense, and writing to live state before
  validation completes — each failed exactly the tests that claim to
  cover it.
- **A self-caught real bug, found while writing the `__proto__` test:**
  the first version of the dangerous-key blocklist,
  `{'__proto__':true, 'constructor':true, 'prototype':true}`, never
  actually contained `__proto__` as an own key — a bareword/quoted
  `__proto__:` entry in a JS object literal sets the prototype instead of
  creating a property when its value isn't itself an object, and `true`
  isn't one, so the assignment was a silent no-op. The single most
  important entry in a three-entry blocklist was absent the entire time.
  Confirmed directly with a Node one-liner before fixing; replaced with a
  plain array checked via `indexOf()`, which has no such special-casing.
  A related mistake in the test itself (trying to build the hostile
  fixture as a JS object literal, then as a bracket assignment — both
  equally affected by the same or a related special-casing) was also
  caught and fixed by building the fixture from a raw JSON string via
  `JSON.parse` instead. Full account: `docs/QUALITY_LOG.md` QL-023.

A subsequent **correction pass**, same branch/PR, before merge: independent
review found three further blocking correctness gaps in the above, plus a
terminology inaccuracy, all recorded as an addendum to QL-006:

- **Persistence-failure atomicity:** the original version committed
  `state = candidate` and only then called `saveProgress()` (which
  swallows a `localStorage.setItem()` failure and unconditionally emits
  `progress`) — so a fully valid import could report `{ok:true}` and
  update the UI while nothing was actually saved. Fixed by reordering
  `importJSON()`'s transaction: validate → `migrateExerciseIds()` against
  the candidate (not global `state`, which required refactoring that
  function to accept an explicit target state) → serialize →
  `localStorage.setItem()` → only then commit to live state, emit, and
  re-render. `importJSON()` no longer calls `saveProgress()` at all, since
  it needs to observe a storage failure rather than swallow it;
  `saveProgress()`'s swallow-and-emit behavior is unchanged for its other
  callers, where it is correct by design.
- **Own-property vs. inherited-property validation:** the original
  validator checked required fields by property *access*
  (`candidate.v`, `rec.c`), which follows the prototype chain, while
  counting/enumerating only *own* keys — so an object built via
  `Object.create()` with the right values entirely on its prototype (zero
  own keys) passed every check. Both the state-level and outcome-record-
  level versions of this exploit were confirmed as real by direct
  execution against the pre-fix code before being fixed. Fixed with
  explicit `hasOwnProperty` checks for every required field, added as
  `REQUIRED_STATE_KEYS` in `validateImportedState()` and inline in
  `isValidOutcomeRecord()`.
- **Export-wrapper contract:** `var candidate = isPlainObject(o.state) ?
  o.state : o;` selected `o.state` whenever object-valued and silently
  discarded everything else about the wrapper, contradicting this course's
  own documentation that the complete envelope was validated. Fixed with
  `validateImportEnvelope()`, which requires a wrapper's own keys to be
  exactly `exported`/`state`/`stats`, with `state` on the same exact
  schema and `exported`/`stats` checked to the basic types `exportJSON()`
  actually produces.
- **Terminology:** `MAX_IMPORT_JSON_LENGTH` (262144) bounds a JS string's
  `.length` (UTF-16 code units), which the docs previously called
  "256 KiB" — not reliably true once encoded. Every occurrence was
  reworded to "262,144 characters"; the limit's behavior never changed.
- **13 new tests** (`tests/dom-behavior.mjs`, 79 → 92 checks): a
  persistence-failure test (test harness's storage `setItem()`
  monkey-patched to throw mid-import, then restored to prove the failure
  was specifically about persistence); a state built via `Object.create()`
  with required fields only on its prototype; an outcome record with
  inherited `c`/`n`/`ts` plus three unrelated own keys; each of
  `modules`/`answers`/`exercises`/`started` individually missing as an own
  property; and six wrapper-contract tests (unknown field, dangerous own
  key, inherited — not own — `state`, missing `exported`, wrong types for
  `exported`/`stats`, and a valid current-export round trip). **Mutation-
  tested**, four further mutations beyond the original three, each
  reverted and confirmed byte-identical via `diff`: reordering the commit
  before the storage write; removing the outcome-record ownership check;
  removing the state-level required-own-key loop; and reverting the
  wrapper validator to the original permissive logic — each failed exactly
  the tests written to cover it, and no others.
- Full record: `docs/QUALITY_LOG.md` QL-006's first addendum. `SCHEMA_V`
  stays `2` — nothing here changes the accepted record shape.

A second **correction pass**, same branch/PR, before merge: independent
review found one further contract-level gap, recorded as a second
addendum to QL-006:

- **Root problem:** `isPlainObject(x)` was `typeof x === 'object' &&
  !Array.isArray(x)` — true of ANY non-array object, including exotic
  built-ins (`Date`, `Map`, `Set`, `RegExp`) that carry no data reachable
  through ordinary own-property enumeration, so `{modules: new Date(0)}`
  silently imported as an empty `modules` map. Every exact-shape check
  here is built on `Object.keys()`, which lists only own *enumerable
  string* keys — invisible to a symbol-keyed own property, a
  non-enumerable own property, or an accessor (getter/setter) property.
  Four counterexamples were independently reproduced by direct execution
  before any fix was written: `modules: new Date(0)`/`answers: new Map()`
  both silently accepted as empty; an outcome record with a genuine
  non-enumerable fourth own property accepted as if it only had `{c,n,ts}`;
  a state with an own `Symbol` key accepted with the symbol silently
  ignored; a wrapper `stats: new Date(0)` accepted.
- **Fix:** `isPlainObject(x)` is now `isRecordObject(x) &&
  hasOnlyOwnDataProperties(x)`. `isRecordObject()` rejects exotic
  built-ins by checking prototype-chain SHAPE (own prototype is `null`, or
  that prototype's own prototype is `null`) rather than identity or
  `Object.prototype.toString`, so it is correct cross-realm and resists a
  `Symbol.toStringTag`-spoofing exotic object (verified directly: a `Map`
  subclass overriding its tag to read as `"[object Object]"` is still
  correctly rejected, since the check never consults `toString`).
  `hasOnlyOwnDataProperties()` rejects any own symbol key, any
  non-enumerable own property, and any accessor property. A null-prototype
  object (`Object.create(null)`) is a deliberate exception: it IS accepted
  at every level, since every check here reads properties via explicit
  `hasOwnProperty`/bracket access, never an object's own inherited
  methods, so it behaves identically to an ordinary plain object for every
  purpose this validator cares about.
- **9 new tests** (`tests/dom-behavior.mjs`, 92 → 101 checks): the four
  reproduced counterexamples; a `Set` as `exercises` and a `RegExp` as
  `modules` in one test (a `RegExp` owns a non-enumerable `lastIndex`,
  independently caught by the other half of the defense, confirming
  neither check is redundant); the `Symbol.toStringTag`-spoofing case; an
  accessor-property outcome record; and a positive test confirming
  null-prototype objects are accepted at every level. One existing test
  was rebuilt (a plain-object-literal prototype now makes the whole chain
  two levels deep and is rejected by `isRecordObject()` before reaching
  the ownership check it was written to isolate; rebuilt using a
  null-prototype intermediate to keep isolating that specific exploit), and
  a new companion test covers the now-earlier rejection path explicitly.
  **Mutation-tested:** two mutations, each reverted and confirmed
  byte-identical via `diff`: weakening `isRecordObject()` to accept any
  non-array object failed exactly the four exotic-built-in tests; weakening
  `hasOnlyOwnDataProperties()` to always return `true` failed exactly the
  three own-property-shape tests — confirming neither defense is
  redundant with the other.
- Full record: `docs/QUALITY_LOG.md` QL-006's second addendum.
- Strictly scoped: no question, answer, rationale, scoring, quiz
  progress, analytics semantics, image, styling, layout, or accessibility
  presentation changed, and none of the other Issue #2 items (stale-ID
  policy, Reset/import exercise re-render, storage-failure UI, analytics
  redesign, content-pack format, image-manifest normalization) were
  touched.

A third isolated Milestone 1 task (branch
`claude/issue-2-stale-id-policy`, "Part of Issue 2", draft PR): defines
and implements the stale question/exercise/module ID policy, and
`docs/QUALITY_LOG.md` QL-024:

- **Policy: preserve the record, filter at read.** A `modules`/`answers`/
  `exercises` key that no longer corresponds to current `MODULES`/
  `QUIZZES`/`EXERCISES` data is never deleted, moved, or quarantined by
  `loadProgress()`, `migrateExerciseIds()`, or `importJSON()` — it stays
  under its original id. Every current-facing consumer (`doneCount()`,
  `tally()`, `getStats()`, `getUnmastered()`, `getWeakAreas()`, every
  quiz/exercise render) decides "does this id count" by checking
  membership in the live content at read time, never by trusting a stored
  map's own keys.
- **A real, pre-existing bug found and fixed while defining the
  policy:** `getStats()`'s top-level `questionsAnswered`/
  `questionsCorrect`/`overallPct` counted every key in `state.answers`
  with no current-content check — unlike `tally()` a few lines away,
  which already filtered correctly. A state holding only a fabricated
  question id reported a fabricated 100% overall accuracy, confirmed by
  direct execution before the fix. Fixed to mirror `tally()`'s exact
  filtering pattern via the same `questionIndex()` lookup.
- **Reintroduction revives history automatically**, with zero migration
  code: staleness is a computed property of an id, never a stored flag,
  and a record is never moved anywhere, so the moment an id becomes
  current again its preserved record is picked up by every consumer
  above. This mirrors the id-stability convention this course's content
  already depends on.
- **Alternatives rejected:** reject-the-entire-state (destroys every
  learner's progress on ordinary content maintenance); strip-on-load
  (loses history permanently for no safety benefit over preserving it);
  quarantine-in-a-separate-field (needs new move-in/move-out migration
  code and a `SCHEMA_V`-relevant shape addition for no isolation benefit
  read-time filtering doesn't already provide).
- **Runtime-injected-question boundary defined, content-pack decision
  left open:** an `addQuestions()`-injected question's recorded answer
  becomes stale the moment its session ends without re-injection (already
  session-only, pre-existing behavior) — this policy only defines what
  happens to the already-recorded progress (preserved, excluded from
  stats, revived on reintroduction by any mechanism); it does not decide
  whether or how injected content should persist.
- **`markModule()`'s existing unknown-id rejection (Milestone 0) is kept
  explicitly distinct:** a write-time guard against creating a new record
  for an id that was never valid, not the same thing as this read-time
  policy for an existing record whose id used to be valid.
- **`SCHEMA_V` stays `2`:** no stored field's shape or meaning changes,
  only which records count toward current-facing figures does.
- **Reset remains the one deliberate exception**, confirmed by
  independent review (correction, same branch, before merge): an
  explicit, user-confirmed Reset deletes *everything*, current or stale,
  in both storage keys — `#resetBtn`'s click handler and the `reset()`
  API method were already implemented this way (wholesale storage-key
  removal / blank-state replacement, never a selective per-record strip),
  confirmed by direct execution against the real UI click path (seeding
  both current and stale records at every level across both the v2 and
  legacy v1 keys at once) before concluding no product code change was
  needed. Only a regression test and a concise policy-comment addition
  were added.
- **14 new tests** (`tests/dom-behavior.mjs`, 101 → 115 checks): mixed
  current/stale question and exercise records in one state; a state
  containing only stale records; an orphaned (non-migratable) legacy
  exercise key surviving migration inert alongside a real migration;
  reordering `QUIZZES`/`EXERCISES` with a stale record present (same
  script-injection technique as QL-005); reload idempotency after
  stale-state normalization; a full export/import round trip preserving a
  stale record while excluding it from stats; no misleading
  `answer`/`exercise` events on a stale-only load; import atomicity and
  storage-failure behavior unaffected by stale ids; the
  `getProgress()`/`exportJSON()`-preserves vs. `getStats()`-excludes vs.
  `markModule()`-still-guards distinction; the runtime-injected-
  question boundary including its reintroduction half; and an explicit
  confirmed Reset removing current and stale records from both storage
  keys, through the real `#resetBtn` click path, staying cleared after a
  simulated reload. **Mutation-tested:** reverting `getStats()`'s fix
  failed exactly the five dependent tests; introducing an accidental
  "strip unrecognized exercise keys" pass into `migrateExerciseIds()`
  (the rejected quarantine/strip alternative, reintroduced by mistake)
  failed exactly the six preservation-dependent tests; removing either
  storage-key deletion from the `#resetBtn` handler each failed the new
  Reset test plus whichever pre-existing per-scenario Reset test already
  covered that key — each reverted and confirmed byte-identical via
  `diff`.
- **A test-authoring pitfall self-caught while writing this suite:**
  `assert.deepEqual` checks prototype identity; `getStats()`'s nested
  `byDomain`/`byTopic`/`byDifficulty` objects are built via raw
  object-literal syntax inside the app's own `vm` sandbox realm, a
  genuinely different intrinsic `Object.prototype` from the test file's
  (and from a second, separate `boot()`'s realm) — confirmed with a
  minimal `vm` reproduction before concluding this was a test-authoring
  issue, not a product defect, and fixed via `JSON.stringify(...)`
  comparison, this codebase's established pattern for exactly this case.
- Full record: `docs/QUALITY_LOG.md` QL-024 and its addendum.
- Strictly scoped: no question, answer, rationale, scoring, image,
  styling, layout, or accessibility presentation changed, and none of the
  other Issue #2 items (Reset/import exercise re-render, storage-failure
  UI, analytics redesign, content-pack format, image-manifest
  normalization) were touched.

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
4. ~~Capture a clean screenshot of the course itself for the README.~~ Done
   2026-07-31 (branch `claude/issue-1-readme-screenshot`, Issue #1) —
   `docs/assets/course-overview.png`, reproducible via `npm run
   capture:readme-screenshot`. See below.
5. ~~Record a documented scientific-review status rather than treating
   structural validation as content validation.~~ Done 2026-07-31 (branch
   `claude/issue-1-scientific-review-status`, Issue #1) —
   `docs/SCIENTIFIC_REVIEW.md`. The record itself is honest that the
   underlying question-by-question review has **not** happened; do not
   read this item's completion as "content review is done." See below.
6. ~~Decide whether to localize remote fonts and the two approved images.~~
   Done via PR #10 (branch `claude/issue-1-asset-localization`, Issue #1) —
   see the entry above for the decision, evidence, and validation results.
   This closes the asset-localization roadmap item specifically, not
   Milestone 0 or Issue #1 as a whole; the screen-reader review and
   physical touch-hardware testing items below remain open.

Do not begin the 46-question expansion or image embedding while the data
contract and review gates remain incomplete.

## Known open implementation risks

### Progress import — mostly resolved 2026-08-02

~~`importJSON()` currently validates the top-level version but still
trusts malformed nested maps and outcome records.~~ Done via branch
`claude/issue-2-import-hardening` (Issue #2, QL-006):
`validateImportedState()` now imposes a documented input-size limit
(checked before `JSON.parse`), validates and normalizes every nested
value, deep-clones the entire accepted object graph, and the whole import
is atomic (a rejection touches neither live state, `localStorage`, the
DOM, nor public API events). See `docs/ARCHITECTURE.md` "Import
validation" and `docs/VALIDATION.md` "Progress-import validation and
cloning" for the exact schema and test coverage.

**Still open, deliberately not touched by that work:** defining how
*stale* content IDs are handled during import — i.e. whether a
module/question/exercise id that doesn't currently exist in the course
should be accepted, dropped, or flagged. The new validator only checks
that an id is a syntactically safe, non-empty string; it does not check
whether that id is currently known. This is intentionally a separate
roadmap item ("stale ID policy"), not a structural-validity question.

### Exercise identity — resolved 2026-08-02

~~Exercise outcomes still use position-derived IDs such as `ex7-1`.~~ Done
via branch `claude/issue-2-stable-exercise-ids` (Issue #2): every exercise
item now carries an explicit, literal `id` field, and
`migrateExerciseIds()` deterministically and idempotently renames any
surviving legacy-format key on load and on import, with a documented,
tested conflict-resolution rule. See `docs/QUALITY_LOG.md` QL-005 and
`docs/VALIDATION.md` "Stable exercise-item identity" for the full record.
This closes only this specific risk — the item immediately below (exercise
rendering after API writes) is a related but distinct, still-open gap this
work does not touch.

### Exercise rendering after API writes

API import and Reset rebuild quiz widgets but do not fully rebuild exercise
closures. Tests and a centralized render/reset path are needed. (Not
addressed by the exercise-identity work above: that work changed *which
key* an outcome is stored under, not *whether* the exercise DOM re-renders
after `importJSON()`/`reset()` — those still only call
`$all('.quiz-mount').forEach(buildQuiz)`, unchanged.)

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
