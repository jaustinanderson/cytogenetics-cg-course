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

As of 2026-08-02 (Issue #2, `docs/QUALITY_LOG.md` QL-006 and its
addendum), `CytoCourse.importJSON()` validates the complete import — the
top-level envelope's own shape, every nested `modules`/`answers`/
`exercises` entry, and a documented size limit — before anything
observable changes, and only commits to live state after persistence has
actually succeeded.

**Accepted forms.** Exactly two are accepted, decided by
`hasOwnProperty.call(o, 'state')`:

- **Bare state** — the top-level object's OWN properties must match this
  exact schema, no more and no fewer:

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

- **Export wrapper** — the top-level object's OWN properties must be
  *exactly* `exported`, `state`, and `stats` (what `exportJSON()` actually
  produces); `state` must pass the bare-state schema above; `exported`
  must be a string and `stats` a plain object with no dangerous own keys —
  neither is persisted or otherwise used, so nothing deeper than that is
  checked.

Every required field above — including `c`/`n`/`ts` inside an outcome
record — must be an **own** property, not merely accessible via the
prototype chain: property access (`candidate.v`, `rec.c`) follows
inheritance, but the "no unrecognized top-level field" check only
enumerates own keys, so an object built via `Object.create()` with the
right values entirely on its prototype (zero own keys) would otherwise
satisfy every value check while owning none of the required data. The
same reasoning applies to a wrapper's `state`: if `state` is only
inherited, `hasOwnProperty.call(o, 'state')` is `false`, so validation
falls through to the bare-state branch, which correctly rejects `o`
(it won't own `v`/`modules`/etc. either) instead of silently unwrapping an
inherited value.

Every outcome record (`answers`/`exercises` entries) must OWN exactly
`{c: <boolean>, n: <integer, 1..1000000>, ts: <finite, >=0 number>}` — no
missing, extra, or merely-inherited fields. Map keys (including a
wrapper's own keys) may be any non-empty string except `__proto__`,
`constructor`, or `prototype`, rejected outright wherever they appear (see
QL-006 and QL-023 for two self-caught bugs in earlier versions of this
defense). This does **not** check whether an id is a *currently known*
module/question/exercise — that remains the separate, still-open
"stale ID policy" item in `docs/ROADMAP.md` Milestone 1.

**Record-object requirement.** Every object this validator inspects — the
state, the wrapper, the `modules`/`answers`/`exercises` containers, and
every individual outcome record — must be a genuine RECORD OBJECT, not
merely any non-array `typeof x === 'object'` value. `isPlainObject()` is
`isRecordObject(x) && hasOnlyOwnDataProperties(x)`:

- `isRecordObject(x)` rejects exotic built-ins (`Date`, `Map`, `Set`,
  `RegExp`, …), which satisfy the weaker `typeof`/`Array.isArray` check
  while carrying no data reachable through ordinary own-property
  enumeration — `{modules: new Date(0)}` previously imported as a silently
  empty `modules` map, confirmed as a real bug by direct execution before
  this defense was added. It checks prototype-chain SHAPE (the object's
  own prototype must be `null`, or that prototype's own prototype must be
  `null`), not identity or `Object.prototype.toString`, so it is correct
  for cross-realm input (this course's own dependency-free test harness
  runs the app in a separate `vm` realm) and cannot be defeated by an
  object spoofing `Symbol.toStringTag` to read as `"[object Object]"`.
  **A null-prototype object (`Object.create(null)`) is deliberately
  accepted** as a valid record at every level: every check here reads own
  properties via explicit `hasOwnProperty`/bracket access, never through
  the object's own inherited methods, so a null-prototype object behaves
  identically to an ordinary plain object for every purpose this validator
  cares about, and a direct (non-JSON-string) caller may reasonably build
  one to avoid prototype-pollution surface entirely.
- `hasOnlyOwnDataProperties(x)` rejects any own **symbol** key (invisible
  to every `Object.keys()`-based check here, but silently accepting one
  would contradict the exact-own-property-shape claims above); any
  **non-enumerable** own property (also invisible to `Object.keys()` — an
  object with a hidden fourth key alongside a valid `{c,n,ts}` previously
  passed the "exactly three own keys" check outright); and any
  **accessor** (getter/setter) property (its value is computed fresh on
  every read, and a validated value is read again later when the accepted
  output is rebuilt — a getter could legally return something different,
  or invalid, the second time).

Both checks are necessary together: an exotic built-in with zero own
enumerable-or-not properties (`new Date(0)`, `new Map()`, `new Set()`)
would vacuously satisfy `hasOnlyOwnDataProperties()` alone, and neither
check subsumes the other. 9 new tests cover both halves independently —
exotic containers at every position (`modules`/`answers`/`exercises`/
wrapper `stats`), the `Symbol.toStringTag`-spoofing case, a non-enumerable
extra property, an accessor property, a symbol key, the deliberate
null-prototype-acceptance decision, and a companion test confirming a
deeper (non-record-shaped) prototype chain is rejected before an existing
ownership check further down is ever reached. **Mutation-tested:** weakening
`isRecordObject()` to accept any non-array object failed exactly the four
exotic-built-in tests; weakening `hasOnlyOwnDataProperties()` to always
return `true` failed exactly the three own-property-shape tests — neither
mutation affected the other's tests or any pre-existing test.

A raw string import is also checked against a documented length limit
(262,144 characters — a JavaScript string-length/code-unit limit, not a
byte or KiB limit) **before** `JSON.parse` is ever called, and the parsed
entry count against a documented cap (2000) before the more expensive
per-entry pass — both grounded in a real measured full-course export
(~8.7 KB, 200 entries; see QL-006).

**Transaction order.** Validation builds an entirely new, deep-cloned
object graph and never touches the live `state`, `localStorage`, or the
DOM — so a caller's own object can never alias, and later mutate, course
progress. `importJSON()` runs, in order: validate the full envelope into a
fresh candidate → run `migrateExerciseIds()` against that candidate (not
global `state`) → `JSON.stringify()` it → `localStorage.setItem()` it.
Only once that write has actually succeeded does it assign `state =
candidate`, emit the `progress` event, and refresh the rendered UI; a
thrown error at any step — validation, serialization, or the storage write
itself — returns `{ok:false, error}` having touched none of those four
observable surfaces. This means a rejected *or unsaved* import leaves
existing progress completely untouched, atomic by construction and not by
a separate rollback step — deliberately including the case where
validation fully succeeds but the storage write itself fails (a full
quota, private browsing, a locked-down profile), which the initial
hardening pass did not cover: it committed to live state before calling
`saveProgress()`, whose swallow-and-emit behavior is correct for its other
callers (`recordAnswer()`/`recordExercise()`/`markModule()`, which should
keep in-memory progress advancing even when persistence is temporarily
unavailable) but would have let a fully validated, storage-failed import
report success anyway. `saveProgress()` itself is unchanged; `importJSON()`
does not call it.

This did **not** require a `SCHEMA_V` bump: the accepted record shape is
unchanged from before, only what was previously silently trusted (or
checked by access rather than ownership) is now checked. Full record, test
coverage, and the schema-version reasoning: `docs/QUALITY_LOG.md` QL-006
and its addendum, and `docs/VALIDATION.md`.

### Stale question/exercise/module ID policy

As of 2026-08-02 (Issue #2, `docs/QUALITY_LOG.md` QL-024), this defines
what happens when a `modules`/`answers`/`exercises` key no longer
corresponds to anything in the current `MODULES`/`QUIZZES`/`EXERCISES`
data — a question renumbered or removed in a later release, an exercise
item dropped, a module deleted, or a runtime-injected question
(`addQuestions()`) whose session ended before it was answered again.

**Policy: preserve the record, filter at read.** A stale key is never
deleted, moved, quarantined, or rejected by `loadProgress()`,
`migrateExerciseIds()`, or `importJSON()` — it continues to sit in the
ordinary `modules`/`answers`/`exercises` map under its original id,
structurally indistinguishable from a current record. Instead, "is this id
current" is decided fresh, every time, at *read* time, by every
current-facing consumer checking membership in the live `MODULES`/
`QUIZZES`/`EXERCISES` data before counting, displaying, or otherwise
acting on a record — never by iterating a stored map's own keys and
trusting all of them. `doneCount()`, `tally()` (`byDomain`/`byTopic`/
`byDifficulty`), `getUnmastered()`, `getWeakAreas()`, and every quiz/
exercise render already worked this way; `getStats()`'s top-level
`questionsAnswered`/`questionsCorrect`/`overallPct` did not — they counted
every key in `state.answers` regardless of whether the course still
recognized it, so a state holding only a stale answer record reported a
fabricated 100% overall accuracy. Confirmed as a real, working bug by
direct execution before the fix (`Object.keys(state.answers).forEach` now
skips any `qid` absent from `questionIndex()`, mirroring `tally()`'s
existing `if(!q){ return; }` check exactly).

A stale record therefore cannot: count toward completion, mastery,
accuracy, or attempt figures; render as a current question or exercise
(rendering only ever looks up a *currently rendered* item's own id, never
iterates a stored map's keys); attach itself to a different item after
reordering (identity is always the id string an item itself carries, never
its array position — true for questions from the start, true for
exercises since QL-005); or fire a misleading `answer`/`exercise` event
(loading or importing a stale record never calls `recordAnswer()`/
`recordExercise()`, only possibly `saveProgress()`'s ordinary `progress`
event when something genuinely persisted).

**Reintroduction revives history.** Because staleness is a computed
property of an id, not a stored flag, and a record is never moved
anywhere, an id that becomes current again (the exact same string
reappears in `MODULES`/`QUIZZES`/`EXERCISES`) has its preserved record
picked up automatically by every consumer above, with zero migration
code. This mirrors the id-stability convention this course's content
already depends on: a stable id is a permanent identifier for one specific
item, and reusing an id for a materially different item is an authoring
error this policy does not defend against — exactly as already true for
`EXERCISES.*.items[].id` and `QUIZZES[key][].id` before this policy
existed.

**Runtime-injected-question boundary.** This policy also governs what
happens to a runtime-injected question's recorded answer once its
session ends without re-injection (`addQuestions()` content is
session-only; whether/how it should persist is the separate, still-open
"content-pack" roadmap item — this policy does not decide that). The
injected id simply becomes unknown to the next session's
`questionIndex()`, so its already-recorded answer is preserved but
excluded from `getStats()`, and is picked back up automatically if the
same id is ever reintroduced (by a future content pack, or by calling
`addQuestions()` again with the same id) — the general reintroduction
behavior above, not a special case for injected content.

**Alternatives considered and rejected:**

- *Reject the entire imported/loaded state on any stale id* — would make
  ordinary content maintenance (renumbering or removing one question)
  destroy every existing learner's entire progress on their very next
  load. Rejected outright as the opposite of protecting valid progress.
- *Strip stale records on load/import* — loses history permanently even
  when an id is later restored, with no compensating safety benefit over
  preserving it; preserve-and-filter-at-read achieves the identical
  "cannot contaminate current progress" guarantee at zero extra loss.
  Rejected in favor of the loss-minimizing option.
- *Quarantine stale records in a separate state field* — would require new
  migration code to move a record out when it goes stale and back in when
  it revives (an id can flip between known and unknown across releases), a
  `SCHEMA_V`-relevant shape addition, and corresponding
  `validateImportedState()` changes, for no isolation benefit beyond what
  read-time filtering already provides once every consumer is proven to
  filter correctly. Rejected as unnecessary complexity.

`markModule()` rejecting an unknown module id outright (Milestone 0) is a
*different*, unrelated guarantee: a write-time guard against ever
*creating* a new record for an id that was never valid. This policy
governs an *existing* record for an id that *used to be* valid — the two
are not in tension, and the completion report/tests keep them distinct.

**`SCHEMA_V` is not bumped.** No stored field's shape or meaning changes,
no new top-level state field is introduced, and nothing previously
accepted becomes rejected — only which records *count* toward
current-facing figures changes, and that was already silently wrong
(the `getStats()` bug above) rather than newly restricted. 13 new tests
in `tests/dom-behavior.mjs` cover mixed current/stale states for
questions and exercises, a state containing only stale records, an
orphaned (non-migratable) legacy exercise key surviving migration inert
alongside a real migration, reordering `QUIZZES`/`EXERCISES` with a stale
record present, reload idempotency after stale-state normalization, the
export/import round trip, event-firing correctness, import atomicity and
storage-failure behavior with stale ids present, the public-API/
`markModule()` distinction above, and the runtime-injected-question
boundary. **Mutation-tested:** (1) reverting `getStats()` to the original
`Object.keys(state.answers).length`-based computation failed exactly the
five tests that depend on the fix; (2) introducing an accidental
"strip unrecognized exercise keys" pass into `migrateExerciseIds()` (the
rejected "strip stale records" alternative, reintroduced by mistake)
failed exactly the six tests that depend on preservation — both reverted
and confirmed byte-identical via `diff`. Full record:
`docs/QUALITY_LOG.md` QL-024.

Known design debt:

- runtime-injected questions are session-only
- storage failure is silently tolerated for `recordAnswer()`/
  `recordExercise()`/`markModule()` (via `saveProgress()`), by design —
  in-memory progress should keep advancing even when persistence is
  temporarily unavailable. `importJSON()` is the deliberate exception: its
  all-or-nothing contract requires observing a storage failure rather than
  swallowing it, per the transaction order above.

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
