# Validation

## Current status

The v1.1.1 repository baseline has passed local structural, content-contract,
DOM-level behavior, and real-browser (Playwright/Chromium) smoke validation,
including automated WCAG scanning (axe-core) and representative
keyboard-only interaction testing. This is a reproducible software result,
not a claim that every scientific statement is correct or that a full
accessibility review — which still requires a representative screen-reader
pass — or a rights review has passed.

## Run all committed tests

Requirements: Node.js 20 or newer.

```bash
npm test
```

`npm test` runs the structural validator followed by the DOM behavior suite.
Each can also be run independently:

```bash
npm run validate
npm run test:behavior
```

The real-browser Playwright suite is separate because it requires installing
a Chromium binary; it is not part of `npm test` and is not required to
install anything to run the dependency-free suites above.

```bash
npm ci
npm run test:e2e:install   # one-time Chromium download (devDependency only)
npm run test:e2e
```

### Structural and content-contract validator

The structural validator checks:

- document shell and required landmarks
- embedded JavaScript syntax
- absence of the Tailwind browser CDN
- explicit static button types
- unique static DOM IDs
- HTTPS external page resources
- public API version and module count
- all 153 question schemas
- globally unique question IDs
- answer-index bounds
- exact domain and difficulty distributions
- 6 exercise sets / 30 exercise items
- 7 flashcard decks / 61 cards
- 19 image records / 2 embedded / 17 needed
- embedded-image license and redistribution metadata
- quiz and exercise mount resolution
- atomic rejection of malformed and globally duplicate injected questions

### DOM behavior suite

`tests/dom-behavior.mjs` boots the real inline course script inside the minimal,
dependency-free fixture in `tests/dom-harness.mjs`. Its 36 checks cover:

- rendering of all declared quiz, exercise, flashcard, and schematic mounts
- generated sidebar/dashboard navigation and mobile open/close state
- correct and incorrect quiz behavior, item locking, feedback, and stable IDs
- exercise answering, scoring, advancing, and completion
- module completion, v1-to-v2 migration, storage, and simulated reload
- UI Reset from v1-only, migrated, and v2-only states
- API Reset, import/export, print hooks, public API methods, events, and
  analytics
- runtime question injection and safe handling of markup characters as text
- implemented accessibility affordances: landmarks, skip link, focus-visible
  and reduced-motion CSS, `aria-expanded`, typed controls, and keyboard-
  operable flashcards

The suite was independently mutation-checked. Deliberately breaking migration,
legacy Reset cleanup, answer recording, or import-version validation caused the
expected checks to fail.

The harness is not a browser. It cannot establish rendering, layout, color
contrast, real focus behavior, touch input, networking, or screen-reader
output. CI runs `npm test` on pushes to `main` and pull requests.

### Real-browser smoke suite (Playwright)

`tests/e2e/` runs 31 checks per project against `index.html` in a real
Chromium instance, served locally over HTTP (`python3 -m http.server`, the
same approach the README documents for manual local development), across a
1280×900 desktop viewport and a 390×844 narrow/mobile viewport
(`isMobile`/`hasTouch` enabled). Of 62 total scheduled test runs, 58
currently pass and 4 are intentionally skipped where a check only applies to
one viewport (the mobile-only sidebar/hamburger tests skip on desktop, where
the hamburger control is CSS-hidden; the desktop-only sidebar-link keyboard
test skips on the narrow viewport, where the sidebar is off-canvas until
opened). Coverage:

- page initialization: title, all declared quiz/exercise/flashcard mounts,
  hero stat counts, and the public API's reported version/schema/module count
- sidebar navigation generation and target resolution; scroll-driven active
  nav-link highlighting through the real `IntersectionObserver` (the DOM
  harness only stubs this and requires a manual trigger)
- the mobile navigation toggle's open/close state, backdrop dismissal, and
  close-on-link-activation, at the narrow viewport where the hamburger is
  actually rendered
- correct and incorrect quiz answers: scoring, item locking, and feedback
- exercise answering, scoring, advancing, and full completion
- module completion and its persistence across a real `page.reload()`
- legacy v1-to-v2 progress migration on first real-browser load
- Reset clearing both storage keys and reloading to a clean course, and the
  declined-confirmation path leaving progress untouched
- `exportJSON`/`importJSON` round-tripping progress between two independent
  browser contexts (separate storage partitions, proven empty before import)
- the public API's documented method surface, read-copy isolation, and
  `answer`/`exercise`/`progress`/`content` events firing from real UI actions
- the print control invoking `window.print`, and `beforeprint`/`afterprint`
  toggling `body.printmode`
- page-origin console errors/warnings staying empty through load and through
  a representative navigation/quiz/exercise interaction pass

Playwright (`@playwright/test`) is a devDependency used only for this suite;
it adds no production runtime dependency and `index.html` requires no build
step. `npm test` (structural + DOM behavior) still runs with zero installed
dependencies; `npm run test:e2e` requires `npm ci` and one Chromium download
via `npm run test:e2e:install`. CI runs both.

This suite establishes real rendering, real layout-dependent scrolling, a
real `IntersectionObserver`, real `localStorage` across navigations, and
real `window.print`/dialog behavior — the specific gaps the DOM harness
above documents that it cannot cover. On its own it does not perform an
accessibility scan or screen-reader review, does not exercise true
touch-gesture testing (only viewport/`hasTouch` emulation), and does not
confirm delivery of the two third-party images (the sandboxed CI runner's
network reachability to Google Fonts, Wikimedia, and the CDC image host is
not asserted by these tests). Automated accessibility scanning and keyboard
testing are added by the two suites documented next.

### Automated WCAG scanning (axe-core) — added 2026-07-31

`tests/e2e/accessibility.spec.mjs` runs a full-document
[`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm) scan
against the real, fully rendered course, at the same desktop and
narrow/mobile Playwright projects as the rest of the suite, in five states:
immediately after load, with the mobile navigation open (narrow viewport
only), after answering a quiz item, after answering an exercise item, and
after marking a module complete and flipping a flashcard. Each test asserts
the axe-core violation list is empty; no rule is disabled and no violation is
filtered to force a pass. `@axe-core/playwright` is a devDependency used only
by this suite and adds no runtime dependency to `index.html`.

A full-document scan against this single-file, ~4,000-line course takes
roughly 20–30 seconds per run; these five tests call `test.slow()` (3×
Playwright's default per-test timeout) so that is comfortable headroom rather
than a near-miss under normal CI load.

Six confirmed defects were found by this scan, independently verified against
the real page and product source before any change, and corrected with
narrowly scoped fixes that touch styling, markup, and accessible-name
plumbing only — no scientific content changed. See `docs/QUALITY_LOG.md`
QL-010 for the full diagnosis/correction/prevention record. All five states
above now scan clean on both projects.

Scope and an explicit non-claim: axe-core detects a documented subset of
mechanically checkable WCAG 2.x success criteria (missing accessible names,
contrast ratios, heading order, landmark structure, and similar). It cannot
judge whether an experience actually makes sense to someone using a screen
reader. **A green axe-core scan is not a screen-reader review.** No
representative screen-reader review has been performed; that item stays open
in Issue #1 and below.

### Keyboard-navigation interaction — added 2026-07-31

`tests/e2e/keyboard-navigation.spec.mjs` drives the same real Chromium
instance with `page.keyboard` input only, covering the controls named in
Issue #1: the skip link, the desktop sidebar nav, the mobile hamburger menu,
a quiz item, an exercise item plus its Next control, a module-completion
button, Print, and Reset. For each it checks keyboard reachability, a
non-empty accessible name, correct behavior on `Enter`/`Space` activation,
and a visible `:focus-visible` outline. The mobile-menu test also confirms
repeated `Tab` presses keep moving focus forward and reach the sidebar's own
links once it is open, rather than stalling — the absence-of-keyboard-trap
check for that control.

This suite confirmed one real defect (the skip link did not move keyboard
focus; see QL-010) and, in the course of authoring it, one false claim in the
test itself (an incorrect assumption about mobile-menu tab order, corrected
before merge — see QL-011), following the same confirm-before-trusting
discipline as QL-007/QL-008.

This is representative, not exhaustive, coverage: it does not tab through
every one of the 153 questions or 30 exercise items, and it does not
implement or test Escape-to-close, focus trapping, or inert background
content for the mobile sidebar, because the product does not implement those
either — see "Gates still open" below.

## Deployed smoke test — 2026-07-30

This was a one-off manual check of the live deployment, not a repeatable
instrument. The committed Playwright suite above now provides repeatable
equivalents for its navigation, quiz, module-completion, and console-cleanliness
observations, run locally and in CI against the same `index.html`; it does not
itself verify the deployed GitHub Pages URL.

Verified URL:
<https://jaustinanderson.github.io/cytogenetics-cg-course/>

Observed:

- page title and course hero rendered correctly
- custom CSS rendered without Tailwind
- all 17 quiz mounts rendered
- all 6 exercise sets rendered
- the hero correctly displayed 6 interactive exercises
- a correct quiz answer produced the expected feedback
- marking Module 1 complete updated the UI
- Module 1 completion survived a full page reload
- no page-origin console warning or error was recorded

The cloud test browser did not complete either third-party image request, so
successful delivery of the Wikimedia and CDC images was not established by this
test. The page itself emitted no image error, and source links/fallback content
remain present. Asset localization is still an open roadmap decision.

## Independently run HTML validation

The initial repository hardening was also checked with:

```bash
npm exec --yes --package=html-validate@10.4.0 -- html-validate index.html
```

That tool is intentionally not a runtime or committed package dependency.

## Gates still open

### Browser behavior

The DOM suite and the Playwright real-browser suite together cover the core
logic paths, real scrolling/highlighting, real reload/storage behavior,
print invocation, and console cleanliness described above. Still required:

- running the same repeatable browser assertions against the deployed
  GitHub Pages URL, not only a local static server
- pixel/visual print-rendering review (the suite verifies the print hook and
  class toggling, not print layout)
- true touch-gesture testing (the suite emulates a narrow viewport with
  `hasTouch`, not real touch hardware)
- confirmation, in an environment with normal network access, that the two
  third-party images load or fall back as expected

### Accessibility

The DOM suite checks the implemented static and keyboard affordances listed
above. `tests/e2e/accessibility.spec.mjs` adds an automated axe-core WCAG
scan (five real-browser states, both viewports, zero violations, six
confirmed-and-fixed defects — see QL-010) and
`tests/e2e/keyboard-navigation.spec.mjs` adds representative keyboard-only
interaction coverage with focus-visibility and keyboard-trap checks (see
above).

Still required:

- Escape and focus behavior for the mobile sidebar
- hidden/inert navigation state
- live announcements for results and completion
- flashcard front/back screen-reader state
- a representative screen-reader review — **not established by an automated
  scanner or by keyboard-only testing, no matter how thorough**; this remains
  a distinct, unperformed gate

### Scientific review

Required before release qualification:

- exact source record
- authoritative-source check
- Austin's subject-matter review
- review date and status
- edition/SOP sensitivity where applicable

### Rights review

Required per image or other third-party asset:

- source and creator
- exact license or public-domain basis
- verification date
- attribution
- modification status
- redistribution decision

## Release language

Use:

> Structurally validated beta; full scientific and accessibility review is in
> progress.

Do not use:

> Validated CG(ASCP) course

unless the validation scope is immediately and unambiguously qualified.
