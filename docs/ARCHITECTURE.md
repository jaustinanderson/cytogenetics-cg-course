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
  exercises: { "ex7-i1": { c: false, n: 1, ts: 0 } },
  started: 0
}
```

`c` is the last recorded correctness state, `n` is attempt count, and `ts` is
the latest timestamp. Current headline analytics use last-attempt mastery,
not total-attempt accuracy.

`exercises` keys are each item's own explicit, literal `id` field (see
`EXERCISES.*` in `index.html`), not derived from its position in the item
array — as of 2026-08-02 (Issue #2), stopping array position from ever
determining progress identity. Exercise progress previously used a
position-derived `"<key>-<n>"` string computed fresh on every render, so
inserting or reordering an item could silently reattach a learner's saved
history to a different item; `migrateExerciseIds()` normalizes any
surviving legacy-format keys, deterministically and idempotently, on every
load and after every import. This did **not** require a `SCHEMA_V` bump —
the record shape above is unchanged, only the convention for what strings
populate `exercises`'s keys — see `docs/QUALITY_LOG.md` QL-005 for the full
decision record, conflict-resolution rule, and test evidence.

### Import validation

As of 2026-08-02 (Issue #2, `docs/QUALITY_LOG.md` QL-006),
`CytoCourse.importJSON()` validates the complete import — top-level
envelope, every nested `modules`/`answers`/`exercises` entry, and a
documented size limit — before anything observable changes. The accepted
envelope is either a full `exportJSON()`-shaped object
(`{exported, state, stats}`; `exported`/`stats` are informational only and
never persisted or validated) or a bare state object directly (existing,
documented lenience). The candidate state object itself must match this
exact schema, no more and no fewer top-level fields:

```js
{
  v: 2,                          // must equal SCHEMA_V exactly
  modules:   { <id>: true },     // every value literally `true`
  answers:   { <id>: {c,n,ts} }, // see outcome-record shape below
  exercises: { <id>: {c,n,ts} }, // see outcome-record shape below
  started: <finite, non-negative number>,
  migratedFrom: <positive integer>  // OPTIONAL; only ever written by v1→v2 migration
}
```

Every outcome record (`answers`/`exercises` entries) must have EXACTLY
`{c: <boolean>, n: <integer, 1..1000000>, ts: <finite, >=0 number>}` — no
missing or extra fields. Map keys may be any non-empty string except
`__proto__`, `constructor`, or `prototype`, rejected outright wherever
they appear (see QL-006 for a self-caught bug in the first version of this
defense). This does **not** check whether an id is a *currently known*
module/question/exercise — that remains the separate, still-open
"stale ID policy" item in `docs/ROADMAP.md` Milestone 1.

A raw string import is also checked against a documented length limit
(256 KiB) **before** `JSON.parse` is ever called, and the parsed entry
count against a documented cap (2000) before the more expensive per-entry
pass — both grounded in a real measured full-course export (~8.7 KB,
200 entries; see QL-006). Validation builds an entirely new, deep-cloned
object graph and never touches the live `state`, `localStorage`, or the
DOM until every check has passed, so a caller's own object can never
alias — and later mutate — course progress, and a rejected import leaves
existing progress completely untouched (atomic by construction, not by a
separate rollback step). This did **not** require a `SCHEMA_V` bump: the
accepted record shape is unchanged from before, only what was previously
silently trusted is now checked. Full record, test coverage, and the
schema-version reasoning: `docs/QUALITY_LOG.md` QL-006 and
`docs/VALIDATION.md`.

Known design debt:

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
Google Fonts and its two approved images from their respective hosts; both
are now committed to this repository:

- `assets/fonts/ibm-plex-sans/` and `assets/fonts/ibm-plex-mono/` — the exact
  IBM Plex Sans (400/500/600/700) and IBM Plex Mono (400/500/600) weights the
  course actually uses, as WOFF2 files sourced from the official
  [IBM/plex](https://github.com/IBM/plex) GitHub release assets, under the
  bundled SIL Open Font License 1.1
- `assets/images/` — the two approved images the course displays (NHGRI
  46,XY karyotype; a Wellcome Collection 47,XY,+21 trisomy-21 karyotype,
  CC BY 4.0 — replaced 2026-08-01, see `THIRD_PARTY_NOTICES.md`), fetched
  from each source's own hosting at the time it was localized/updated

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
