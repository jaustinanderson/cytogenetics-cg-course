# Cytogenetics CG(ASCP) Study Course

[![Validate course](https://github.com/jaustinanderson/cytogenetics-cg-course/actions/workflows/ci.yml/badge.svg)](https://github.com/jaustinanderson/cytogenetics-cg-course/actions/workflows/ci.yml)

An unofficial, browser-based cytogenetics study course built by a
CG(ASCP)-credentialed cytogenetic technologist. The project translates bench
experience into a portable educational application with structured content,
local progress tracking, performance analytics, and automated validation.

> **Status: beta baseline.** The application is functional and structurally
> validated. The full question bank has not yet completed a documented,
> question-by-question scientific review for public release.

## Highlights

- 17 instructional modules
- 153 tagged practice questions
- 6 interactive exercise sets containing 30 items
- 61 flashcards across 7 decks
- 8 capstone cases plus 5 module-level cases
- Browser-local progress with v1-to-v2 migration
- Analytics by domain, topic, and difficulty
- Print-friendly course output
- A documented `window.CytoCourse` integration API
- A 19-entry image manifest with separate license and redistribution fields
- Automated structural and content-contract validation

## Run the course

Open [`index.html`](./index.html) in a modern browser. No installation, account,
or backend is required.

For local development, serve the repository over HTTP:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

GitHub Pages deployment is planned as part of the repository-foundation
milestone. Until it is enabled, `index.html` is the canonical course artifact.

## Course coverage

Five orientation questions are excluded from blueprint calculations. The
remaining 148 questions currently compare with the September 25, 2025 ASCP BOC
content guideline as follows:

| Domain | Questions | Current share | Guideline range | Status |
| --- | ---: | ---: | ---: | --- |
| Specimen preparation, culture, and harvest | 33 | 22.3% | 20–25% | Within range |
| Chromosome analysis and imaging | 91 | 61.5% | 45–50% | Overrepresented |
| Molecular cytogenetic testing | 14 | 9.5% | 15–25% | Underrepresented |
| Laboratory operations | 10 | 6.8% | 10–15% | Underrepresented |

The planned rebalancing adds 46 reviewed questions: 10 specimen, 23 molecular,
and 13 laboratory-operations questions. Expansion is intentionally gated behind
the content-governance and data-contract work in the
[roadmap](./docs/ROADMAP.md).

Official reference:
[ASCP BOC CG(ASCP) and CG(ASCPi) Examination Content Guideline](https://www.ascp.org/boc/docs/default-source/explore-credentials/content-guidelines/ascp_ascpi_cg_content_guideline.pdf)
(revised September 25, 2025).

## How progress works

The application is client-only:

- `cyto_cg_progress_v2` stores module completion and the last recorded outcome
  for each question and exercise.
- Existing `cyto_cg_progress_v1` module-completion data migrates on first load.
- Reset clears both current and legacy progress so migrated data cannot
  reappear.
- Export and import are exposed through the public API.
- There is no course account, telemetry system, or progress server.

Progress and answer history are not transmitted. The current page does request
Google Fonts and two public-domain images from external hosts, so those hosts
receive ordinary web-request metadata such as an IP address and user agent.
Localizing those assets is an open roadmap decision.

## Integration API

The page exposes `window.CytoCourse` for inspection and controlled integration:

```js
CytoCourse.getModules();
CytoCourse.getQuestions();
CytoCourse.getStats();
CytoCourse.getWeakAreas(3);
CytoCourse.getUnmastered();
CytoCourse.exportJSON();
```

Validated runtime injection is available for an existing quiz:

```js
CytoCourse.addQuestions("m15", [
  {
    id: "m15-example-1",
    d: "molecular",
    t: "fish",
    x: 2,
    q: "Question prompt",
    o: ["Option A", "Option B"],
    a: 0,
    why: "Answer rationale"
  }
]);
```

Incoming batches are atomic: malformed questions, invalid answer indexes,
unknown domains, or globally duplicate IDs reject the entire batch. Runtime
injection is session-only unless external tooling exports and preserves the
result.

Current analytics describe **last-attempt mastery**, not total-attempt accuracy.
That distinction is intentional documentation of the present implementation,
not a claim that it is the final metric design.

## Architecture

The shipped product is intentionally a single, portable HTML document:

- semantic HTML
- custom CSS
- vanilla JavaScript
- browser `localStorage`
- no framework
- no production JavaScript package dependency
- no backend

Repository tooling is separate from the runtime application. Node.js is used
only to validate the course in development and CI. See
[Architecture](./docs/ARCHITECTURE.md) for the design rationale and
reconsideration triggers.

## Validation

Run:

```bash
npm test
```

The committed validator checks:

- document and embedded-script structure
- absence of the development-only Tailwind CDN
- unique static DOM IDs
- explicit button types
- HTTPS external resources
- module and content counts
- complete question schemas and globally unique IDs
- answer-index bounds
- blueprint and difficulty distributions
- exercise, flashcard, and image-manifest counts
- embedded-image license and redistribution metadata
- atomic rejection of malformed or duplicate injected questions

Passing these tests does **not** establish scientific correctness. Scientific
review, rights review, browser behavior, accessibility, and release readiness
are separate gates documented in [Validation](./docs/VALIDATION.md).

## Repository map

```text
.
├── index.html                    # Canonical distributable course
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── THIRD_PARTY_NOTICES.md
├── CLAUDE.md                     # Collaboration guardrails
├── package.json
├── tests/
│   └── validate-course.mjs
├── docs/
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── CONTENT_GOVERNANCE.md
│   ├── VALIDATION.md
│   ├── QUALITY_LOG.md
│   ├── LICENSING.md
│   ├── CLAUDE_HANDOFF.md
│   └── archive/
│       └── claude-roadmap-v1.md
└── .github/
    └── workflows/
        └── ci.yml
```

## Contributing

Factual corrections are especially welcome, but they require an authoritative
source and a clear explanation. See [CONTRIBUTING.md](./CONTRIBUTING.md) and
[Content governance](./docs/CONTENT_GOVERNANCE.md).

## Content and privacy boundaries

This repository must not contain:

- protected health information or accession numbers
- employer-confidential material or proprietary SOPs
- recalled certification-examination questions
- unlicensed or redistribution-uncertain media
- AI-generated scientific content represented as expert-reviewed

## Disclaimer

This is an independent educational study aid. It is not clinical guidance and
is not affiliated with, endorsed by, or sponsored by ASCP or the ASCP Board of
Certification. ASCP and credential designations are referenced only to describe
exam alignment. Use the current ISCN edition, current authoritative guidance,
and locally validated procedures for real laboratory work.

## Licensing

No repository-wide license has been selected yet. Software, original
educational content, original diagrams, and third-party media require separate
licensing decisions. See [Licensing](./docs/LICENSING.md) and
[third-party notices](./THIRD_PARTY_NOTICES.md).

## Author

[Jerad Austin Anderson](https://github.com/jaustinanderson), CG(ASCP) — a
cytogenetic technologist building evidence-first clinical laboratory,
informatics, and AI-engineering projects.
