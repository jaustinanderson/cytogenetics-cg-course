# Changelog

All notable repository changes are recorded here.

## [1.1.1] - 2026-07-30

### Added

- Professional repository documentation and collaboration guidance
- Structural and content-contract validator
- GitHub Actions validation workflow
- Content, licensing, validation, architecture, and quality-governance records

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
