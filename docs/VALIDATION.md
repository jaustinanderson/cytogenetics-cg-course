# Validation

## Current status

The v1.1.1 repository baseline has passed local structural and content-contract
validation. This is a reproducible software/content-structure result, not a
claim that every scientific statement is correct.

## Run the committed validator

Requirements: Node.js 20 or newer.

```bash
npm test
```

The validator checks:

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

CI runs the same command on pushes to `main` and pull requests.

## Deployed smoke test — 2026-07-30

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

## Gates not yet automated

### Browser behavior

Still required:

- no unexpected console or page errors
- navigation and active-state behavior
- quiz and exercise interaction
- progress persistence and v1 migration
- Reset from v1-only, migrated, and v2-only states
- import/export round trip and malformed-import rejection
- print behavior
- public API events
- narrow-screen navigation

### Accessibility

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
