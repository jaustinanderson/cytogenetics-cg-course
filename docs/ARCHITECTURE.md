# Architecture

## Product boundary

The course is a static browser application. Its canonical distributable is
`index.html`, which contains:

- semantic course markup
- custom responsive and print CSS
- structured JavaScript data
- quiz, exercise, flashcard, navigation, and figure-rendering engines
- local progress state and analytics
- the `window.CytoCourse` integration API

There is no application server, database, account system, telemetry, or cloud
progress service.

## Why a single file

Single-file delivery currently provides meaningful product value:

- download-and-open portability
- easy sharing and archiving
- no runtime build step
- low deployment complexity
- clear privacy boundary

Repository tooling must not be confused with runtime dependencies. Node.js is
used for validation and CI; the course itself does not require Node.js.

## Data model

The application currently uses four in-memory content collections:

- `MODULES`
- `QUIZZES`
- `EXERCISES`
- `FLASHCARDS`

`IMAGES` is a manifest containing embedded and candidate imagery. Embedded
records carry rights metadata; candidate records remain blocked until evidence
is resolved.

### Question schema

Every question requires:

| Field | Meaning |
| --- | --- |
| `id` | Globally unique stable identifier |
| `d` | Domain |
| `t` | Topic |
| `x` | Difficulty: 1, 2, or 3 |
| `q` | Prompt |
| `o` | Answer options |
| `a` | Zero-based correct-answer index |
| `why` | Correct-answer rationale |
| `w` | Optional distractor-specific feedback |

Future release-qualified content also needs provenance and scientific-review
metadata.

## Progress

Schema v2 stores:

```js
{
  v: 2,
  modules: { m1: true },
  answers: { "m1-q1": { c: true, n: 1, ts: 0 } },
  exercises: { "ex7-1": { c: false, n: 1, ts: 0 } },
  started: 0
}
```

`c` is the last recorded correctness state, `n` is attempt count, and `ts` is
the latest timestamp. Current headline analytics use last-attempt mastery,
not total-attempt accuracy.

Known design debt:

- exercise outcome IDs are still position-derived
- imported nested state is not yet fully schema-validated
- runtime-injected questions are session-only
- storage failure is silently tolerated

These are Milestone 1 work, not hidden behavior.

## Public API

`window.CytoCourse` provides read, analysis, write, and event methods. Read
methods deep-clone results. Question injection now validates the complete core
schema, globally deduplicates IDs, and rejects invalid batches atomically.

API behavior must remain synchronized with tests and documentation. A comment
or roadmap statement is not a contract unless a committed test proves it.

## External resources

As of 2026-07-31, the production page requests **no third-party font or
image host at runtime**. It previously requested IBM Plex Sans/Mono from
Google Fonts and the two approved images (NHGRI, CDC PHIL) from their
respective hosts; both are now committed to this repository:

- `assets/fonts/ibm-plex-sans/` and `assets/fonts/ibm-plex-mono/` — the exact
  IBM Plex Sans (400/500/600/700) and IBM Plex Mono (400/500/600) weights the
  course actually uses, as WOFF2 files sourced from the official
  [IBM/plex](https://github.com/IBM/plex) GitHub release assets, under the
  bundled SIL Open Font License 1.1
- `assets/images/` — the same two approved public-domain images the course
  already displayed (NHGRI 46,XY karyotype; CDC PHIL trisomy-21 karyotype),
  fetched from the exact URLs previously used at runtime

See [Third-party notices](../THIRD_PARTY_NOTICES.md) for exact upstream
source URLs, retrieval dates, licenses, and file hashes for every localized
asset. Only the figures' source-page/credit links remain external,
click-through references — they send no request until a visitor follows
them.

No external JavaScript is executed. The former Tailwind browser-CDN script was
unused and removed in v1.1.1.

The course runs without the two images because each has an explanatory
fallback (now guarding against a local file-delivery failure rather than a
third-party network failure).

## Restructuring trigger

Do not split the runtime into a framework merely for modernization. Reconsider
source modularization only when a measured maintenance problem emerges—for
example, after the planned question expansion and image set materially increase
edit risk.

If modular authoring is adopted, the build should continue to emit one portable
`index.html` unless Austin approves a product-boundary change.
