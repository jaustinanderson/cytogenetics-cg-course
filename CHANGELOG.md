# Changelog

All notable repository changes are recorded here.

## [Unreleased]

### Added

- Automated WCAG scanning via `@axe-core/playwright`
  (`tests/e2e/accessibility.spec.mjs`), run against the real course at
  desktop and narrow/mobile viewports in five states (fresh load, mobile
  nav open, quiz answered, exercise answered, module complete + flashcard
  flipped); zero violations after fixes
- A representative real-browser keyboard interaction suite
  (`tests/e2e/keyboard-navigation.spec.mjs`) covering the skip link, visible
  sidebar nav, mobile menu, quizzes, exercises, module completion, Print,
  and Reset. Every claimed-reachable control is proven so via real `Tab`
  key presses to the exact target element (never programmatic `.focus()`,
  which would pass on an unreachable `tabindex="-1"` element), with
  `toHaveAccessibleName()` checks, focus-visibility checks, and a
  keyboard-trap check for the mobile menu
- `@axe-core/playwright` as a development-only dependency
- A dependency-free DOM behavior suite covering navigation, quizzes,
  exercises, migration, persistence, Reset, import/export, print, the public
  API, API events, analytics, and implemented keyboard/accessibility affordances
- A minimal DOM harness so behavior checks run on stock Node without adding a
  dependency or CI install step
- Mutation checks proving that regressions in migration, legacy Reset cleanup,
  answer recording, and import-version validation are detected
- A real-browser Playwright/Chromium smoke suite (`tests/e2e/`, `npm run
  test:e2e`) covering page initialization, navigation and mobile-sidebar
  behavior, scroll-driven active-nav highlighting, correct/incorrect quiz
  interaction, exercise interaction, module-completion persistence across a
  real reload, v1-to-v2 migration, Reset clearing both storage keys (accept
  and decline paths), import/export, the public API and its events, print
  invocation, and page-origin console cleanliness, at desktop and
  narrow/mobile viewports
- `@playwright/test` as a development-only dependency, plus a `package-lock.json`
- `playwright.config.mjs` and a local static-server (`python3 -m http.server`)
  arrangement Playwright and GitHub Actions both use to serve the course

### Changed

- `npm test` now runs structural validation followed by 36 DOM behavior checks
- Validation documentation now distinguishes the DOM harness from the
  real-browser Playwright suite, and both from the accessibility, screen-reader,
  and rights-review gates that remain open
- CI now installs dependencies and a Chromium binary and runs the Playwright
  suite after `npm test`, uploading the HTML report as a build artifact on
  failure
- Darkened the `--ink-faint`, `--accent`, and `--ok-ink` CSS color variables to
  meet WCAG AA 4.5:1 text contrast (no other visual change)
- Corrected 22 heading-order violations (17 "Learning objectives" headings
  plus 5 others) to the correct heading level, with a matching CSS override
  so their visible size and weight are unchanged
- Added an accessible name (or `aria-hidden`, where the image is purely
  redundant with adjacent quiz/exercise text) to instructional/quiz/exercise
  SVGs via a new optional parameter on the shared `svgWrap()` helper
- Added a visually hidden label to the two comparison-table corner cells
  that previously had no accessible header text
- Made the 18 scrollable data-table containers keyboard-focusable

### Fixed

- The skip link's target (`#main`) is now focusable, so keyboard-activating
  "Skip to content" moves focus into the content instead of silently
  returning it to `<body>`

## [1.1.1] - 2026-07-30

### Added

- Professional repository documentation and collaboration guidance
- Structural and content-contract validator
- GitHub Actions validation workflow
- Content, licensing, validation, architecture, and quality-governance records
- Live GitHub Pages deployment and deployed-course validation record

### Changed

- Renamed the distributable course artifact to `index.html`
- Removed the unused Tailwind browser-CDN dependency
- Corrected the exercise-set count from five to six
- Added explicit button types and removed avoidable static inline styles
- Strengthened `addQuestions()` with full schema checks, global duplicate-ID
  detection, answer-bound validation, and atomic batch rejection
- Added module-ID validation to `markModule()`
- Clarified the local-progress privacy statement
- Added an independent-project and no-recalled-exam-questions disclaimer

### Fixed

- Reset now clears both v2 state and the legacy v1 migration source

## [1.1] - 2026-07-30

- Imported Claude's Phase 0 course baseline with 153 tagged questions,
  progress-schema v2, analytics, a public integration API, and the image
  manifest.
