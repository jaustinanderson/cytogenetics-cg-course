# Validation

## Current status

The v1.1.1 repository baseline has passed local structural, content-contract,
DOM-level behavior, and real-browser (Playwright/Chromium) smoke validation.
This is a reproducible software result, not a claim that every scientific
statement is correct or that a full accessibility or rights review has
passed.

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

`tests/e2e/` runs 18 checks per project against `index.html` in a real
Chromium instance, served locally over HTTP (`python3 -m http.server`, the
same approach the README documents for manual local development), across a
1280×900 desktop viewport and a 390×844 narrow/mobile viewport
(`isMobile`/`hasTouch` enabled). 35 total test runs currently pass (one
mobile-only sidebar test is intentionally skipped on desktop, where the
hamburger control is CSS-hidden). Coverage:

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
above documents that it cannot cover. It does not perform an accessibility
scan, screen-reader review, true touch-gesture testing (only viewport/
`hasTouch` emulation), or confirm delivery of the two third-party images
(the sandboxed CI runner's network reachability to Google Fonts, Wikimedia,
and the CDC image host is not asserted by these tests).

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

The DOM suite checks only the implemented static and keyboard affordances
listed above; the Playwright suite does not add automated accessibility
coverage.

Still required:

- Escape and focus behavior for the mobile sidebar
- hidden/inert navigation state
- live announcements for results and completion
- accessible names for instructional SVGs
- flashcard front/back screen-reader state
- contrast remediation for faint/accent text
- automated scan and representative screen-reader review

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
