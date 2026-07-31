# Changelog

All notable repository changes are recorded here.

## [Unreleased]

### Added

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
