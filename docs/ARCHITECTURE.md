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
not total-attempt accuracy — see "Analytics semantics: last-attempt mastery"
below for the full, tested definition and why this schema cannot compute
total-attempt accuracy.

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

**Reset is the one deliberate exception.** "Preserve, filter at read"
governs loading, migration, import, export, and every ordinary read — it
does not apply to an explicit, user-confirmed Reset (the `#resetBtn` UI
handler and the `reset()` API method). Reset's job is to delete
*everything*, current or stale, in both `PKEY` and `PKEY_V1`, because
that is exactly what confirming "this cannot be undone" means. Reset was
already implemented this way — a wholesale storage-key removal /
blank-state replacement, never a selective per-record strip — before this
policy existed; a dedicated regression test (`tests/dom-behavior.mjs`)
now proves it holds for stale records at every level (module, answer,
exercise) across both storage keys, not only for current ones.

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
(the `getStats()` bug above) rather than newly restricted. 14 new tests
in `tests/dom-behavior.mjs` (101 → 115) cover mixed current/stale states
for questions and exercises, a state containing only stale records, an
orphaned (non-migratable) legacy exercise key surviving migration inert
alongside a real migration, reordering `QUIZZES`/`EXERCISES` with a stale
record present, reload idempotency after stale-state normalization, the
export/import round trip, event-firing correctness, import atomicity and
storage-failure behavior with stale ids present, the public-API/
`markModule()` distinction above, the runtime-injected-question boundary,
and — through the real `#resetBtn` UI click path, not by directly
mutating internal state — an explicit confirmed Reset removing current
*and* stale records at every level from both storage keys, confirmed to
stay cleared after a simulated reload. **Mutation-tested:** (1) reverting
`getStats()` to the original `Object.keys(state.answers).length`-based
computation failed exactly the five tests that depend on the fix; (2)
introducing an accidental "strip unrecognized exercise keys" pass into
`migrateExerciseIds()` (the rejected "strip stale records" alternative,
reintroduced by mistake) failed exactly the six tests that depend on
preservation; (3) removing either storage-key deletion from the
`#resetBtn` handler (first `PKEY`, then separately `PKEY_V1`) each failed
the new Reset-exception test, plus the pre-existing per-scenario Reset
tests that already covered that specific key — each mutation reverted and
confirmed byte-identical via `diff`. Full record: `docs/QUALITY_LOG.md`
QL-024 and its addendum.

Known design debt:

- runtime-injected questions are session-only
- storage failure is silently tolerated for `recordAnswer()`/
  `recordExercise()`/`markModule()` (via `saveProgress()`), by design —
  in-memory progress should keep advancing even when persistence is
  temporarily unavailable. `importJSON()` is the deliberate exception: its
  all-or-nothing contract requires observing a storage failure rather than
  swallowing it, per the transaction order above.

These are Milestone 1 work, not hidden behavior.

### Content-widget rebuild after import and Reset

As of 2026-08-03 (Issue #2, `docs/QUALITY_LOG.md` QL-025), `init()`,
`CytoCourse.importJSON()`, and `CytoCourse.reset()` all rebuild every
quiz and exercise widget through one shared `rebuildContentWidgets()`
helper, rather than three separately maintained selector loops.
Previously, `importJSON()` and `reset()` rebuilt only `.quiz-mount`
widgets, never `.exer` ones — a rendered exercise widget's score, status,
and per-item controls silently disagreed with `getProgress()` immediately
after either call, confirmed as a real, currently-shipped defect by
direct execution before it was fixed.

`buildQuiz()`/`buildExercise()` are both full `innerHTML` replacements
seeded fresh from persisted records on every call, so calling either
again is idempotent — the previous subtree, and every listener attached
to it, is discarded, not duplicated. Neither function ever calls
`recordAnswer()`/`recordExercise()` or emits an event; both only read
`state` to seed their initial render, so a rebuild triggered by import or
Reset never manufactures an `answer`/`exercise` event — `importJSON()`
still fires exactly one `progress` event (via its existing logic) and
`reset()` still fires exactly one `progress` event (via its existing
`saveProgress()` call), unchanged from before this fix.

**`buildExercise()` always starts at item 0, deliberately.** A rebuilt
exercise widget always shows item 0 first, with fresh/enabled controls,
regardless of how much progress is already recorded for that or any
other item — this is not an oversight; it is the existing, intentional
design, and this fix does not change it. A resume-to-first-unanswered-
item positioning change was tried while investigating this rendering
gap, then reverted before committing: running the complete local
Playwright suite (not only the tests written for this change) surfaced
that it broke `tests/e2e/progressive-disclosure.spec.mjs`'s
"reattempting an exercise item after reload" test — a pre-existing,
shipped test (predating this work, from Issue #11) that depends on
clicking item 0 again after a reload to correct a previous answer. The
positioning change navigated away from item 0 the moment it had any
persisted record, breaking that contract. `buildExercise()`'s rendering
logic is therefore byte-for-byte unchanged from before this fix; only
`rebuildContentWidgets()` and the three call sites routed through it are
new. This exactly matches `buildQuiz()`'s own established behavior (a
rebuilt quiz mount never disables an already-answered question's options
either, confirmed directly) — re-clicking an item that already has a
persisted record correctly replaces its outcome via `state.exercises[id]`
without double-counting `answeredCount`, exactly like re-answering a quiz
question after a reload already did. Neither widget type has ever
persisted *which* option a learner chose, only whether the outcome was
correct, so nothing could accurately mark a specific wrong option as
"still selected" on a rebuild even if that were otherwise desired. Full
account, including the reverted attempt: `docs/QUALITY_LOG.md` QL-025.

**Disclosure state is unaffected.** A `.quiz-mount` is a plain container
`<div>` whose entire `innerHTML` — including a fresh `<details
class="quiz">` with no `open` attribute — is replaced on every
`buildQuiz()` call, so a quiz widget has always collapsed back to closed
on any rebuild; that pre-existing behavior is unchanged. A `.exer`
element IS the `<details>` itself (see `index.html`'s static markup), and
`buildExercise()` only ever replaces `host.innerHTML` (its children),
never `host`'s own `open` attribute — so an exercise widget's open/closed
state survives a rebuild by construction, with no extra code required to
preserve it.

9 new tests in `tests/dom-behavior.mjs` (115 → 124) and 5 new real-browser
Playwright tests in `tests/e2e/progress-and-reset.spec.mjs` cover the
fix, including reattempt-without-double-counting (through the real UI,
now that a rebuild can surface an already-recorded item to reattempt —
the dependency-free counterpart to the pre-existing Playwright test that
caught the reverted regression above), stable-ID migration/stale-ID
handling remaining intact, the documented event contract, and
disclosure-state preservation. **Mutation-tested:** reverting
`importJSON()`/`reset()`'s calls back to the original quiz-only selector
loop (leaving `init()` and the helper itself untouched) failed exactly
the five tests that depend on either call site rebuilding an exercise
widget. Full record: `docs/QUALITY_LOG.md` QL-025.

### Storage-failure detection and session-only mode

As of 2026-08-03 (Issue #2, `docs/QUALITY_LOG.md` QL-026), the course
distinguishes a browser storage failure from ordinary "no progress yet"
and communicates it honestly, rather than silently swallowing it.
Previously `saveProgress()` caught every `localStorage.setItem()` error
and still fired `progress` as if nothing had happened — quiz/exercise
answers, module completion, and the "Saved — nice work." status text all
kept behaving as if durably saved even when the browser had just
rejected the write; `loadProgress()` treated an inaccessible store
identically to "empty," with no warning; and the UI Reset handler
reloaded unconditionally, which could make a Reset that did not actually
clear storage look successful. All three were reproduced against the
pre-fix code before any fix was written.

**State model.** A module-level `persistState` variable —
`{persistent: boolean, reason: null | 'unavailable' | 'write-failed'}` —
tracks live persistence status. It is deliberately **not** part of the
persisted `state` object: never exported, never imported, no `SCHEMA_V`
involvement, and not itself written to storage.

- `reason: 'write-failed'` — storage was confirmed readable at load; a
  later write failed. **Self-heals**: `saveProgress()` always serializes
  the entire current `state`, never a diff, so the very next successful
  write persists every change accumulated during the failure and clears
  the warning in the same step. It never clears merely because a
  lightweight probe succeeds — only because a real full-state write did.
- `reason: 'unavailable'` — the *read* itself failed during
  `loadProgress()`. **Sticky against ordinary, incremental writes** for
  the rest of the session: `saveProgress()` (used by `recordAnswer()`,
  `recordExercise()`, `markModule()`, and the mark-complete UI) skips
  every write attempt while this reason holds (`localStorage.setItem()`
  is never even called), because a read failure means real prior
  progress could exist unseen, and letting an incremental write
  "succeed" anyway risks silently clobbering it the moment storage
  becomes writable again. A reload (a fresh `loadProgress()` read)
  always clears it. So does a **successful** explicit Reset or
  `importJSON()` call in the same session, with no reload — both are
  deliberate, complete-replacement actions the learner explicitly asked
  for, not incremental accumulation, so a genuinely successful write
  from either is trusted as real recovery. What must never happen — see
  the corrected transition table below — is a **failed** `importJSON()`
  write downgrading this reason to the non-sticky `'write-failed'`,
  which would let the very next ordinary action's write through and
  silently overwrite the unseen prior progress this reason exists to
  protect.
- Corrupt-but-readable stored JSON is explicitly **not** an availability
  failure — `loadProgress()` splits the `getItem()` call (wrapped in its
  own try/catch, setting `'unavailable'` on failure) from `JSON.parse()`
  of the result (a separate try/catch that falls through to a blank
  state on failure, exactly as before this change, with no warning).

**Explicit-action exception, and the corrected transition table.**
`performReset()` (shared by the UI `#resetBtn` handler and the API
`reset()` method) and `importJSON()` always *attempt* their storage
operations regardless of the sticky `'unavailable'` reason. Both are
deliberate, explicit "replace everything" actions — Reset requires
`window.confirm()`, import takes an explicit caller-supplied payload —
fundamentally different in risk profile from incremental, easy-to-overlook
accumulation from ordinary learning actions. What each does to
`persistState` on success vs. failure, corrected 2026-08-03 (`docs/QUALITY_LOG.md`
QL-026's addendum) after independent review reproduced a real data-loss
sequence in the original implementation:

| Prior `persistState.reason` | Action | Outcome | New `persistState` |
|---|---|---|---|
| any | `importJSON()` | write succeeds | `{persistent:true, reason:null}` |
| `null` (persistent) or `'write-failed'` | `importJSON()` | write fails | `{persistent:false, reason:'write-failed'}` (unchanged from before this correction) |
| `'unavailable'` | `importJSON()` | write fails | **stays** `{persistent:false, reason:'unavailable'}` — no transition, no `'persistence'` event, `ok:false` still returned |
| any | Reset, canonical v2 write succeeds | — | `{persistent:true, reason:null}` |
| any | Reset, canonical v2 write fails | — | `{persistent:false, reason:'write-failed'}` |

The original implementation let a *failed* `importJSON()` write always
call `markSessionOnly('write-failed')`, regardless of the prior reason.
Independent review reproduced the resulting defect directly: seed
genuine prior v2 progress → make reads fail at init (`reason:'unavailable'`,
correctly never having seen that seeded record) → attempt an
otherwise-valid import while writes also fail → the reason was
incorrectly downgraded to `'write-failed'` → restore write access while
reads remain broken → an ordinary action (e.g. `markModule()`) then
successfully overwrote the seeded record with the session's
blank/partial in-memory state, because `'write-failed'` (unlike
`'unavailable'`) does not block `saveProgress()`. Fixed by gating the
failure branch: `importJSON()` only calls `markSessionOnly('write-failed')`
when the reason was not already `'unavailable'`; when it was, the status
is left untouched. A *successful* import is unaffected by this
correction and always clears `'unavailable'` as before, since a
deliberate, complete, caller-supplied replacement that a real write
confirms is genuine recovery regardless of what state preceded it.

`performReset()`'s own status logic is similarly path-dependent, also
corrected in the same addendum: the UI path (`usePkeyRemoval:true`)
clears `PKEY` by *removing* it, so on reload `loadProgress()` falls
through to a blank state and then — only because `PKEY` is genuinely
absent — checks `PKEY_V1` and migrates it back in; a failed `PKEY_V1`
removal here genuinely risks resurrecting old progress, so its
persistence status honestly depends on **both** `v1Removed` and
`v2Cleared` succeeding. The API path (`usePkeyRemoval:false`) instead
clears `PKEY` by durably *overwriting* it with the current blank state,
and `loadProgress()` always prefers a valid v2 record over ever reading
`PKEY_V1` at all — so once the canonical v2 write succeeds, a
surviving, unremoved `PKEY_V1` is provably inert and can never be read
back. The original implementation still gated the API path's status on
`v1Removed && v2Cleared`, so a Reset whose only failure was the already-
inert legacy key falsely reported `{persistent:false, reason:'write-failed'}`
and showed `#storageWarning` for a Reset that was, in fact, fully
durable. Fixed: the API path's status now depends on `v2Cleared` alone.
`reset()`'s returned `{ok: v1Removed && v2Cleared}` is unchanged — it
still honestly reports the legacy-key cleanup failure — only the
*persistence status* no longer conflates that separate, inert cleanup
failure with the durability of current live progress.

**User-visible warning.** `#storageWarning`, a non-modal `role="status"`
region (implicit `aria-live="polite"`/`aria-atomic="true"`), corrected
2026-08-03 (QL-026's addendum) to `position:fixed` at the viewport's
bottom edge, after independent review found the original in-flow
placement — directly under `<header>`, at the very top of a page that
can run tens of thousands of pixels tall — left it CSS-visible but far
outside the viewport for a learner scrolled into a later module; the
existing Playwright `toBeVisible()` assertion could not catch this,
since it proves only that the element renders, not that it intersects
the current viewport (the corrected test suite uses `toBeInViewport()`
instead — see `docs/VALIDATION.md`). Anchored to the bottom edge
specifically so it never competes for screen position with the sticky
header (`position:sticky; top:0`) or the sticky/fixed sidebar (both
anchored at `top:var(--header-h)`). `role="status"` was chosen over
`role="alert"` specifically so the warning banner itself never steals
focus while a learner is mid-answer — proven only for the banner itself,
**not** as a claim that the overall quiz-answer interaction preserves
focus generally: a clicked, now-disabled quiz option can independently
return focus to the document on its own, a pre-existing, unrelated
behavior this task does not change or claim to preserve.
`setPersistState()` only touches the DOM and fires the `'persistence'`
event when the status *genuinely changes* — repeated failures update it
once, not once per failed action. Per-module `.mark-status` text
("Saved — nice work.") now also requires `persistState.persistent`, so
it never appears for a module change that was not actually durably
written; it goes blank (not an alternate message) when session-only, to
avoid 17 redundant messages competing with the one global banner.

**Non-obstruction (corrected 2026-08-03, QL-026's second addendum).**
`position:fixed` removes an element from normal flow, so nothing
downstream previously reserved room for the banner — independent review
found it could sit visually on top of the page's own bottom-most course
content and, at narrow widths, on top of the mobile sidebar's own
bottom-most nav links, both still fully hit-testable underneath it
(`position:fixed` does not disable pointer events). `pointer-events:none`
on the banner alone was rejected as a fix: it would let clicks pass
through but the banner would still visually cover whatever is under it.
Instead, a `--storage-warning-h` custom property (declared on `:root`,
default `0px`) is kept in sync with the banner's actual live rendered
height by `setStorageWarningReservedHeight()` — called synchronously
inside `updateStorageWarning()` whenever it shows/hides the banner (an
immediate `getBoundingClientRect()` read right after the DOM mutation,
forcing an on-demand layout rather than waiting a frame), and reactively
by a `ResizeObserver` (`wireStorageWarningReservedSpace()`, wired once
from `init()`) for any later size change with no accompanying
`persistState` transition — text rewrapping at a new width, browser
zoom, a web font finishing load, or a longer localized message. `.content`'s
bottom padding and `.sidebar`'s own `height` (both the desktop sticky
version and the mobile fixed/off-canvas version) each add or subtract
this same variable, so real layout space is reserved for the banner in
every affected scroll region whenever it is shown, and the reservation
collapses back to exactly `0px` the moment it hides, with no separate
class-toggling required — the variable is the single source of truth.
`ResizeObserver` is assumed present (no polyfill), consistent with this
file's existing unguarded `IntersectionObserver` usage.

**Public API.** `CytoCourse.getPersistenceStatus()` returns
`{persistent, reason}` (a plain object, not a DOM-scraping requirement).
No raw browser exception text is ever exposed. A new `'persistence'`
event fires `{persistent, reason}` only on genuine transitions; the
existing `progress`/`answer`/`exercise`/`content` events and their
counts/meaning are unchanged. `reset()` now returns `{ok: false}` (never
unconditionally `{ok: true}`) when a required storage operation fails —
a direct correction, since its previous unconditional `{ok:true}` was a
provable false-durability claim. `markModule()`/`addQuestions()` keep
their existing `{ok:true}` semantics unchanged: that value has always
meant "the requested id was recognized and the in-memory change was
applied," a narrower claim that remains accurate regardless of
persistence.

**Reset failure honesty.** `performReset(usePkeyRemoval)` tracks each
storage operation's own success independently (`v1Removed`, `v2Cleared`)
and `reset()`/the UI handler report `{ok: v1Removed && v2Cleared}` — a
partial failure (one key cleared, the other not) is still a failure,
since the browser gives no transactional guarantee across two separate
calls. This `ok` value is unchanged by the correction above; only the
*persistence status* the API path reports now depends on `v2Cleared`
alone (see the transition table above for why this differs from the UI
path). The blank state is still applied in memory and every widget
still rebuilt either way. The UI `#resetBtn` handler calls
`location.reload()` only when both operations actually succeeded; on a
partial or full failure it leaves the already-applied blank state and
the session-only warning in place instead of reloading into a state
that might silently restore whatever did not actually clear.

**Import boundary — narrow status-only exception.** `importJSON()`'s
existing all-or-nothing guarantee is unchanged: a storage-write failure
during import still returns `{ok:false}`, still leaves live state and
every rendered widget untouched, and still fires no `progress`/`answer`/
`exercise` event. The one deliberate, narrow exception is that the
shared `'persistence'` status **does** reflect a genuinely observed
write failure during that attempt (and clears on a later genuine
success) — this is a status-only side effect, not a weakening of the
atomic guarantee, since it changes no progress data and fires no
progress-bearing event.

24 new tests in `tests/dom-behavior.mjs` (124 → 148) and 15 new
real-browser Playwright tests in
`tests/e2e/storage-failure-warning.spec.mjs` cover: ordinary actions
(quiz answer, exercise answer, module-completion UI, `markModule()`)
under a forced write failure; the read-failure/corrupt-JSON distinction
at initialization, including proof that a read failure never lets a
later action silently overwrite unseen prior storage content; repeated-
failure deduplication; full-state recovery after a write-only failure,
including survival across a real reload; UI and API Reset honesty under
full and partial failure (including the API/UI path-dependent partial-
legacy-key-failure distinction above); `importJSON()`'s narrow
status-only exception without weakening atomicity; the corrected
sticky-`'unavailable'`-survives-a-failed-import sequence, in both a
dependency-free and a real-browser test; the corrected `position:fixed`
warning's viewport-intersection proof at a deep scroll position, in both
configured Playwright projects; and the non-obstruction correction —
rectangle-intersection and real `elementFromPoint()` hit-testing proving
a course control and the mobile sidebar's final nav link both remain
fully outside the banner's rectangle and fully operable, reserved-space
stability under repeated failures, clean reservation collapse on
recovery (with scroll-extent and scroll-position proof, not just the
custom property's own value), correct behavior when the message wraps to
multiple lines at 390px, and no transition applied under a
reduced-motion preference. **Mutation-tested** (8 targeted reversions
total, each confirmed to fail exactly the tests that depend on the guard
it removed, then reverted and confirmed byte-identical via `diff`):
restoring the old silent catch in `saveProgress()`; allowing "Saved —
nice work." without checking `persistState.persistent`; clearing
session-only status before a write is confirmed to succeed
(`markPersistent()` moved ahead of the `setItem()` call); letting the UI
Reset handler reload unconditionally; restoring the unconditional
`markSessionOnly('write-failed')` in `importJSON()`'s catch (caught by
both the dependency-free and the real-browser sticky-`'unavailable'`
test); restoring the `v1Removed && v2Cleared` gate for the API Reset
path's persistence status; restoring the original in-flow, non-fixed
`.storage-warning` CSS (caught by both deep-scroll Playwright tests,
under both projects); and removing only the `.content`/`.sidebar`
space-reservation `calc()` terms while leaving the fixed banner and its
measurement JS intact (caught by the mobile-sidebar overlap test and
both recovery/scroll-extent tests, for genuine overlap and
missing-reservation reasons respectively). Full record:
`docs/QUALITY_LOG.md` QL-026 and its two addenda.

### Analytics semantics: last-attempt mastery

As of 2026-08-03 (Issue #2, `docs/QUALITY_LOG.md` QL-027), the course
names, documents, and tests the one analytics model it has always
actually implemented — **last-attempt mastery** — rather than leaving
`getStats()`'s field names (`questionsCorrect`, `overallPct`) to be
mistaken for total-attempt accuracy, which this schema cannot compute.

**Why total-attempt accuracy is not implemented.** A v2 outcome record
is `{c: <latest correctness>, n: <total attempt count>, ts: <latest
timestamp>}` — it never stored a per-attempt history or an
independently maintained correct-attempt counter. Confirmed by direct
execution before this task: answering a question (correct, incorrect,
correct) across three real reloads, and answering a *different*
question (incorrect, incorrect, correct) across three real reloads,
both end at the byte-identical `{c:true, n:3}` shape (only `ts`
differs) — 2-of-3 attempts correct and 1-of-3 attempts correct are
indistinguishable from the stored record alone. Genuine total-attempt
accuracy would require either a newly persisted per-attempt history or
an independently maintained correct-attempt counter — either is a
`SCHEMA_V`-relevant shape change this task deliberately does not make —
plus an explicit, separate policy decision for every record already
written before that change, whose true historical correct-attempt
count would be permanently unknowable and must never be fabricated,
inferred, or backfilled.

**The model, precisely** (`analyticsModel: 'last-attempt-mastery-v1'`):

- Population: distinct **current** quiz-question ids (`questionIndex()`
  — live `QUIZZES` data only).
- **Answered**: has a current outcome record in `state.answers`.
- **Mastered**: answered AND that record's `c` is `true`.
- **Unmastered**: unanswered, or answered with `c` `false`.
- Reattempting an already-answered question never creates a second
  answered question — the same `qid`'s single record is overwritten in
  place, so the distinct-answered count is unaffected; only that one
  question's mastered/unmastered state can flip, immediately, to match
  its new latest outcome. A correct→incorrect reattempt therefore drops
  a 1-of-1-answered topic's mastery from 100% to 0%, never to 50% — `n`
  (attempt count) is never used as, or blended into, a mastery
  denominator anywhere in this file.
- `lastAttemptMasteryPct = masteredAnswered / distinctAnswered`,
  rounded; `null` when zero questions are currently answered (distinct
  from "answered but none mastered," which correctly reports `0`).
- Completion/coverage (`questionsAnswered / questionsTotal`) is a
  **separate** figure from mastery and is not conflated with it.
- Stale/unknown ids (QL-024) remain excluded from every figure below,
  unchanged. A runtime-injected question (`addQuestions()`) counts only
  while it is still present in the live question index this session;
  this task does not decide whether injected questions persist across
  reloads — that is the separate, still-open content-pack item.
- Exercise records (`state.exercises`) and module-completion records
  (`state.modules`) are recorded through entirely separate functions
  (`recordExercise()`, `markModule()`) and are never read by
  `questionIndex()`, `tally()`, `getStats()`'s question-facing fields,
  `getWeakAreas()`, or `getUnmastered()` — module completion is a
  distinct, manually-declared completion signal
  (`doneCount()`/`modulesComplete`), never represented as question
  mastery.

**Public API — additive, backward-compatible.** `getStats()` adds
`analyticsModel`, `questionsMastered`, and `lastAttemptMasteryPct`;
`questionsCorrect` and `overallPct` remain as compatibility aliases with
values assigned from the exact same computed numbers (never
independently recomputed, so the pair can never silently diverge). Each
`byDomain`/`byTopic`/`byDifficulty` row (`tally()`'s output) adds
`mastered`/`masteryPct` alongside the existing `correct`/`pct` aliases,
same guarantee. `getWeakAreas()` rows add the same
`mastered`/`masteryPct` fields alongside `correct`/`pct`; its
`minAnswered` parameter continues to gate on the number of *distinct*
current questions answered in that topic, never on attempt count.
`getUnmastered()`'s return shape is unchanged — it already returned
exactly "unanswered or latest-incorrect," which *is* this model's
definition of unmastered; `attempts` (from the record's own `n`) is
documented as a plain attempt count, never a mastery denominator.
`exportJSON()`'s embedded `stats` snapshot is produced by the same
`getStats()` call and therefore reports identical fields. No analytics
event is added; reading any analytics method never calls `emit()`.

`SCHEMA_V` remains `2` — no stored field's shape changes, no fabricated
correct-attempt count is introduced, and no historical record is
rewritten or migrated.

12 new tests in `tests/dom-behavior.mjs` and 4 new real-browser
Playwright tests in `tests/e2e/analytics-semantics.spec.mjs` cover:
fresh-state zero/null baselines; single-question mastery; a
correct→incorrect and an incorrect→correct reattempt through the real
reload/rebuild path (proving 0%/100%, never 50%); multi-question
aggregation across multiple domains, topics, and **all three difficulty
levels** (`x:1`/`x:2`/`x:3`), with exact `answered`/`mastered`/
`masteryPct`/`correct`/`pct` asserted for every affected
`byDomain`/`byTopic`/`byDifficulty` row and confirmation that no
unexpected aggregate key is introduced; coverage vs. mastery denominator
independence; stale-record exclusion from every current-facing figure
while remaining in `getProgress()`/`exportJSON()`; exercise/
module-completion non-interference with question analytics; a
runtime-injected question's session-scoped participation under the
existing stale-ID policy; `getWeakAreas()`'s distinct-question threshold,
with **two independently qualifying topics** proving weakest-first sort
order (not just a single-row array, which cannot prove ordering), and a
real reload/rebuild reattempt sequence that reverses which topic is
weaker, with the returned order confirmed to reverse correctly;
`exportJSON()`/`getStats()` field agreement; and the analytics/event
separation, proven via a genuine reload-then-reattempt sequence (not
merely a first attempt) with a navigation sentinel confirming the
reattempt is an in-place interaction — exactly one `answer` event, one
`progress` event, zero `exercise` events, zero `persistence`-transition
events, and the wildcard count agreeing with exactly those two events
(no invented analytics event). **Mutation-tested** (6 targeted
reversions, each confirmed to fail exactly the tests that depend on the
guard it removed, then reverted and confirmed byte-identical via
`diff`): summing attempt count `n` into the mastery denominator instead
of counting distinct questions; making mastery sticky ("ever answered
correctly") by OR-ing prior correctness into `recordAnswer()` instead of
tracking only the latest outcome; making `questionsCorrect` disagree
with `questionsMastered` by one; removing the stale-id exclusion guard
so stale records re-entered question analytics; collapsing
`tally()`'s difficulty grouping into a single bucket; and reversing
`getWeakAreas()`'s sort comparator. Full record: `docs/QUALITY_LOG.md`
QL-027 and its addendum.

### Runtime-injected content lifecycle

As of 2026-08-04 (Issue #2, `docs/QUALITY_LOG.md` QL-028), the course
adopts and enforces a deliberate **split lifecycle** for questions added
at runtime via `addQuestions()`: the question **definition** is
session-only, but a recorded **outcome** for it is durable, using the
existing v2 progress schema, exactly like an authored question's
outcome. Do not describe injected questions as simply "not persisted"
without this distinction — the outcome half genuinely is.

**Alternatives considered.** (1) *Make definitions durable* (e.g. write
them into `state` or `localStorage`) — rejected: this would be a
`SCHEMA_V`-relevant shape change with no size bound, review gate, or
governance, and would blur `state` into carrying both progress and
educational content, which `docs/CONTENT_GOVERNANCE.md` treats as
separate concerns requiring separate review. (2) *Design a persistent,
versioned content-pack format now* — rejected for this release: the task
that would require (collision/replacement/removal/migration policy,
provenance/review metadata, a trust boundary between shipped and
externally-supplied content) is substantial enough to need its own
scoped decision, not a byproduct of closing this checklist item. The
prerequisites for that future design are recorded below, undecided and
unimplemented. (3) *Detect and reject semantic id reuse across
sessions* — rejected as technically impossible with the current schema:
a v2 outcome record is `{c, n, ts}` — it carries no question definition
or content fingerprint to compare a reinjected definition against, so
there is nothing for the application to detect a mismatch with. (4)
*Leave `addQuestions()` storing the caller's own object reference* — the
status quo going in, and a confirmed, real defect (see below) — rejected
outright once reproduced.

**The lifecycle, precisely:**

- A definition added via `addQuestions()` exists only in this
  document's live `QUIZZES` data for the current session. It is never
  written to `localStorage`, `state`, `exportJSON()`'s output, or
  accepted back in by `importJSON()`.
- Reloading without reinjecting removes the definition from the live
  quiz entirely — `getQuestions()` no longer lists it, and no widget
  renders it.
- If the question was answered before that reload, its outcome remains
  in v2 progress as an ordinary record, now excluded from every
  current-facing figure by the existing stale-ID policy (QL-024) — not
  deleted, not fabricated, simply inert until its id is current again.
- Reintroducing the *exact same semantic question* under the *same*
  stable id in a later session makes its preserved outcome current
  again automatically — no injection-specific revival code exists;
  this is the general stale-ID reintroduction rule (QL-024) applying
  identically here.
- **The caller owns semantic id stability.** Reusing a stable id for
  materially different question content across sessions is an
  **unsupported contract violation**, not a detected or rejected error
  — the application cannot tell the difference, since a v2 outcome
  record contains no definition or content fingerprint to check against
  a later reinjection. This limitation is stated honestly here and in
  the public API (`callerOwnsIdStability`), not silently assumed away.
- An explicit, confirmed Reset (UI or API) removes a durable outcome
  belonging to an injected question exactly like any other current or
  stale progress record — no special-case code.
- Persistent, versioned content packs are **not supported** in this
  release (see "Future content-pack prerequisites" below). External
  tooling MAY separately capture `getQuestions()`'s output for its own
  purposes, but this is not a supported versioned format:
  `exportJSON()`/`importJSON()` will not carry a definition through, and
  re-importing such a capture will not reinstall it.

**Public API — `getRuntimeContentPolicy()`.** A small, machine-readable
read method exposing this policy so callers do not have to infer it
from prose. Returns a fresh object literal every call — every field is
a primitive, so (like `getPersistenceStatus()`) a literal already
satisfies "mutating the returned object cannot affect a later call";
there is nothing nested to reach back into. This exact shape is frozen
by a dedicated test:

```js
{
  policyModel: 'runtime-content-lifecycle-v1',
  definitionsSessionOnly: true,
  outcomesPersisted: true,
  outcomeSchemaVersion: 2,      // === SCHEMA_V
  reinjectionRevivesOutcome: true,
  callerOwnsIdStability: true,
  contentPacksSupported: false
}
```

`addQuestions()`'s own success-result shape (`{ok, added, total}`) and
its single `content` event are unchanged by this task — this policy is
exposed once, separately, rather than duplicated onto every call's
result.

**The accepted runtime-question schema**, validated by
`validateRuntimeQuestion()` (reusing the same cross-realm-safe
primitives already established for progress import —
`isPlainObject`/`isSafeKey`/`hasOwn`, see their own comments in
index.html):

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Non-empty string, globally unique |
| `d` | yes | One of the recognized domains |
| `t` | yes | Non-empty topic string |
| `x` | yes | Difficulty: `1`, `2`, or `3` |
| `q` | yes | Non-empty prompt string |
| `o` | yes | A dense array of 2–8 non-empty option strings |
| `a` | yes | A valid zero-based index into `o` |
| `why` | yes | Non-empty rationale string |
| `w` | no | Wrong-answer feedback: a plain object mapping a valid option index to a non-empty feedback string; **preserved and validated**, since its complete safe schema is now defined (see below) — not merely accepted-but-ignored. `w` may be OMITTED entirely; if `w` is an own property of the question at all, its value must satisfy the complete schema — an explicit `w: undefined` is present, not absent, and is rejected exactly like `w: null` (QL-029; see below) |

Rejected outright, with no field ever read via a property access that
could invoke caller code: any own **accessor** property (checked via
property descriptors, before any value is read), any own **symbol**
key, any own **non-enumerable** property, any **dangerous** key
(`__proto__`/`constructor`/`prototype`), any **sparse** array (a hole
in `o`, or in the top-level batch array itself) or array carrying extra
named properties, any **non-record** object (an exotic built-in like
`Date`/`Map`, detected by prototype-chain *shape*, not same-realm
identity — so a legitimate VM- or browser-realm input is never wrongly
rejected), any field only reachable via the **prototype chain** (not
own), and any **unrecognized top-level field** beyond the table above.
A rejected batch entry's `id` (for the diagnostic `rejected[]` report
only) is read via `Object.getOwnPropertyDescriptor`, never `q.id`, so
an adversarial `id` getter is never invoked merely to explain a
rejection. All existing rules are preserved unchanged: recognized
domain, difficulty 1–3, 2–8 options, valid answer index, global id
uniqueness, and atomic batch validation (a rejected batch adds nothing,
rebuilds nothing, and emits nothing — verified by a dedicated test that
mixes one valid and one invalid question in the same call).

**The caller-reference defect and its correction.** Independently
reproduced before any fix: `addQuestions()` pushed the caller's own
object (and its `o` array, and its `w` object, if present) directly
into live `QUIZZES` — `arr.forEach(function(q){ QUIZZES[key].push(q); });`.
Mutating the caller's source object, its options array, or its
wrong-answer-feedback object *after* a successful call changed the
live, accepted, currently-rendered question, including its correct
answer index. Fixed: on success, `validateRuntimeQuestion()` returns a
freshly built **canonical, fully detached snapshot** — a new object
with its own new `o` array (via `.slice()`) and, if present, a new `w`
object rebuilt key-by-key — and only that snapshot is ever pushed into
`QUIZZES`. Nothing in the accepted question references the caller's
original object graph at any depth. See `docs/QUALITY_LOG.md` QL-028
for the full reproduction and correction record.

**Optional-field absent-vs-present correction (QL-029).** Independently
reproduced before any fix: a question with an explicitly OWN `w`
property whose value was `undefined` (`{..., w: undefined}`) passed the
original `isValidWrongAnswerFeedback()` check, because that function
treated `w === undefined` as always meaning "absent" — indistinguishable
by simple value comparison from "present, but its value happens to be
`undefined`" (reading `q.w` yields `undefined` in both cases).
`validateRuntimeQuestion()` then executed `Object.keys(q.w)` while
building the canonical snapshot, throwing `TypeError: Cannot convert
undefined or null to object` — an uncaught exception escaping the
public `addQuestions()` API, rather than the documented structured
`{ok:false, ...}` rejection. Fixed by deciding absent-vs-present ONCE,
explicitly, via `hasOwn.call(q, 'w')` in `validateRuntimeQuestion()` —
never by checking `q.w === undefined` — and calling
`isValidWrongAnswerFeedback()` only when `w` is confirmed present, at
which point `undefined` is exactly as invalid as `null` or any other
non-record value (`isPlainObject(undefined)` already correctly returns
`false` without throwing, via its own `!x` guard). No exception, DOM
change, or `content` event occurs for any rejected input, including
this one. See `docs/QUALITY_LOG.md` QL-029 for the full reproduction and
correction record.

**`SCHEMA_V` remains `2`.** No persisted progress shape changes — an
outcome record's shape was already exactly what a runtime question's
answer needs, and definitions were never part of `state` to begin with,
so there is nothing to migrate.

### Future content-pack prerequisites (documented, not implemented)

Recorded here so a later, separately scoped design does not have to
rediscover them, and so `addQuestions()`'s current session-only
behavior is never mistaken for a placeholder implementation of this:

- A versioned envelope, with an explicit pack identity and version.
- Immutable stable ids **and** a content fingerprint per question, so
  semantic reuse of an id (this release's known, honestly-stated
  blind spot) becomes detectable rather than assumed away.
- Provenance, source, scientific-review status, review date, and
  rights/license metadata per question — the same fields
  `docs/CONTENT_GOVERNANCE.md` already requires for release-qualified
  authored content.
- Exact atomic validation, a size limit, and dangerous-key protection
  at the pack level (not just per-question, as today).
- An explicit collision policy (what happens when an incoming pack's id
  matches an existing one), replacement policy, removal policy, and a
  migration policy for packs authored against an older course version.
- An explicit import/export contract for the pack format itself
  (distinct from `exportJSON()`/`importJSON()`, which are progress-only
  and will remain so), and explicit behavior when storage is at or near
  quota.
- A clear, enforced trust boundary between shipped, reviewed course
  content and externally supplied pack content — an externally injected
  question must never be presented as scientifically reviewed,
  release-qualified, or ASCP-endorsed merely because `addQuestions()`
  accepted its technical shape. `docs/CONTENT_GOVERNANCE.md`'s content
  states (Draft/Source-checked/SME-reviewed/Release-qualified) apply to
  externally supplied content exactly as they do to authored content —
  acceptance by the runtime validator is not review.

## Question provenance and scientific-review governance (Issue #3, Milestone 1)

Adds a strict, auditable governance model that prevents any question from
being described as source-checked, SME-reviewed, independently reviewed, or
release-qualified unless the required evidence is explicitly recorded — see
`docs/CONTENT_GOVERNANCE.md` for the human-readable policy and
`docs/SCIENTIFIC_REVIEW.md` for the current, factual review status this
model enforces.

**Design decision — a separate registry, not fields on the question.** Three
designs were compared: (1) adding governance fields directly to each
`QUIZZES` question object, rejected because it mixes two independently
changing lifecycles (content authored once; review status changed later, by
a different actor) and would let `addQuestions()` accidentally accept or
fabricate governance-shaped fields on a caller-supplied runtime question;
(2) a single flat status string per question, rejected because a bare label
cannot carry the evidence (source, reviewer, date, scope) prerequisites
require, which is exactly the "label alone bypasses the gate" failure mode
this exists to prevent; (3) a **separate registry** (`QUESTION_GOVERNANCE`),
keyed by the question's existing stable authored id, holding a complete
evidence record, with the lifecycle state's validity VALIDATED AGAINST —
not computed from — that evidence (a promotion is a stored, intentional
decision; see "Lifecycle is stored and approved, not computed" below).
Chosen: it keeps scientific governance entirely separate from both question
content and learner progress (`state`/`SCHEMA_V`, unchanged), reuses the
existing stable-id identity mechanism (no position-derived identity), and
gives one place to enforce "a label requires its evidence."

**Registry completeness and duplicate-id safety.** `QUESTION_GOVERNANCE`'s
key set must equal exactly the current authored question id set (every id
in every `QUIZZES.*` array, including the `final` pool) — no missing id, no
stale id, no duplicate id. **Corrected 2026-08-04**: the original design
claimed a duplicate id was "structurally impossible in a JS object
literal." That was wrong — a repeated key in an object literal silently
overwrites the earlier value with no error, confirmed by direct
reproduction against the original implementation (a second `"m1-q1"` entry
collapsed into the registry while every committed test still passed).
`QUESTION_GOVERNANCE` is therefore authored as `QUESTION_GOVERNANCE_ENTRIES`
— an ordered array of `[id, record]` pairs — and built by
`buildGovernanceRegistry()`, which tracks every id it has placed and throws
on a repeat before the registry object is ever constructed. Completeness
(no missing/stale id) is separately enforced by
`assertGovernanceRegistryIntegrity()` at script-load time, and by a
committed structural test (`tests/question-governance.mjs`).

**Corrected again 2026-08-04** (a second independent-review pass, same
day): the fix above protected only the GOVERNANCE registry's own keys. It
did not protect the separate set of AUTHORED QUESTION ids
`assertGovernanceRegistryIntegrity()` itself builds by iterating `QUIZZES`
— if two authored questions shared an `id`, that set-building step
silently collapsed them into one key, the same object-literal footgun one
level up. Confirmed by direct reproduction: renaming one authored
question's id to collide with another's, and removing the now-orphaned
governance entry so the (miscounted) key sets still lined up, let the
script load with no error — 153 question objects, only 152 unique ids,
entirely undetected. The fix does not rely on any keyed set: it counts
the flat list of authored questions and separately counts the unique id
set, and throws the instant those two counts disagree, independent of
which two ids collided. `tests/validate-course.mjs` separately asserts
global id uniqueness as defense in depth (a committed test); this
load-time check is the one that fires on every load, including on a
deployed page a test suite never touches.

**Lifecycle states.** Machine-readable values are the lowercase, hyphenated
form of `docs/CONTENT_GOVERNANCE.md`'s four content states, reconciled 1:1:
`'draft'` / `'source-checked'` / `'sme-reviewed'` / `'release-qualified'`.

**Record schema.** Every governance record is a plain object with exactly
17 own properties (was 14; gained `independentReviewScope`,
`independentReviewChecks`, `independentReviewNoConflictDeclared` in the
2026-08-05 independent-review evidence correction — see below):
`lifecycle`, `drafter` (string or `null`), `sources` (array of structured
source records, `[]` if none — see "Source-reference sufficiency" below),
`sourceCheckedBy` / `sourceCheckedDate`, `reviewer` / `reviewDate` /
`reviewScope` (narrative, see "Structured review checks" below),
`reviewChecks` (array, see below), `independentReviewDocumented` (boolean,
default `false`) with its own `independentReviewer` / `independentReviewDate`
/ `independentReviewScope` / `independentReviewChecks` /
`independentReviewNoConflictDeclared` evidence (see "Independent-review
evidence model" below), `editionSensitive` (boolean once assessed, `null`
if not yet assessed), and `notes`. `null` means "not yet recorded"; `[]`
means "nothing yet cited/checked" — never an empty string standing in for
either. See `index.html`'s own `QUESTION_GOVERNANCE` comment for the
complete field-by-field rationale.

**Source-reference sufficiency (corrected 2026-08-04, revised in a second
pass the same day).** A source record's structural shape is exactly
`{citation, publisher, edition, date, locator, url}` — `publisher` (the
responsible author, publisher, or organization) was added in the second
pass, separate from `citation` (the identifiable title). Structural
validity alone (`isValidGovernanceSource()`) is not enough to support
`source-checked` — `isSufficientGovernanceSource()` additionally requires:
a genuine, non-placeholder `citation`; a genuine, non-placeholder
`publisher`; an exact edition, revision, or publication date (`edition` or
`date` non-`null`); and a question-specific locator or exact webpage
(`locator` or `url` non-`null`). "Non-placeholder" is an exact-token
denylist match (`GOVERNANCE_SOURCE_PLACEHOLDER_TOKENS`: `x`, `xxx`, `tbd`,
`todo`, `n/a`, `na`, `unknown`, `none`, `test`, `placeholder`, `asdf`,
`example`), never a substring match, so a genuine title that happens to
contain one of these words is not penalized for it. This deliberately
replaces the first pass's `≥20`-character length floor on `citation` alone
— independent review correctly flagged a length threshold as an arbitrary
proxy for source identity, not a structural check of it.
`{citation:"x", publisher:null, edition:null, date:null, locator:null,
url:null}` previously satisfied (an earlier version of) `source-checked`;
it no longer does, confirmed by direct reproduction before this
correction. `url`, when present, must be `https://`.

**Approved-SME-reviewer identity (corrected 2026-08-04, restructured in a
second pass the same day).** Previously any non-empty `reviewer` string —
including `"Nobody"`, confirmed by direct reproduction — satisfied
`sme-reviewed`. `docs/CONTENT_GOVERNANCE.md` defines that state
specifically as review **by Austin**. `reviewer` is now checked against
`APPROVED_SME_REVIEWERS` via `isApprovedSmeReviewer()`, using
case/whitespace-normalized comparison (`normalizeGovernanceIdentity()`) so
display variation can never create a second identity. The approved set is
keyed by an explicit `GOVERNANCE_SUBJECT_PACK` identifier
(`'cytogenetics-cg-ascp-v1'`) inside `APPROVED_SME_REVIEWERS_BY_PACK`
(currently `{'cytogenetics-cg-ascp-v1': ['Jerad Austin Anderson']}`,
matching `README.md`'s documented author identity exactly) — an explicit,
extensible structure so a future different subject pack (a different exam,
a different credentialed author) can define its own approved-reviewer set
under its own key without touching this course's. This is an
evidence-backed approved-identity check, not brittle free-text comparison
against arbitrary input, and is never exposed by any public API — a caller
cannot discover, read, or extend the approved set.

**Structured review checks (corrected 2026-08-04).** The original
`reviewScope` completeness gate was a length/vague-phrase heuristic
(`≥15` characters, not matching a short blacklist) — confirmed by direct
reproduction that `"rationale checked carefully"` (which omits distractor
quality, domain/difficulty, originality, exam integrity, and privacy)
satisfied it. `reviewChecks` (a new array field) replaces this: it must
equal, exactly, the closed `GOVERNANCE_REVIEW_CHECKS_V1` set —
`'best-answer-defensible'`, `'rationale-accuracy'`, `'distractor-quality'`,
`'domain-difficulty-correct'`, `'original-wording'`,
`'no-recalled-exam-content'`, `'no-phi-or-confidential'` — matching
`docs/CONTENT_GOVERNANCE.md`'s "Review must verify" list category for
category, for `sme-reviewed`/`release-qualified` to be valid: no missing,
duplicate, or unknown entry. The `_V1` suffix is deliberate: if the
mandatory review categories ever change, the new set ships under a new
versioned name rather than silently redefining `_V1` out from under any
future review evidence (no current record carries any populated
`reviewChecks` yet, so this discipline has not been exercised by real
data). `reviewScope` remains as required narrative documentation
(matching `docs/SCIENTIFIC_REVIEW.md`'s review-log "Scope" column) but is
no longer itself the completeness gate, and `notes` can never substitute
for `reviewChecks`.

**Lifecycle is stored and approved, not computed (corrected 2026-08-04).**
The original design comment claimed the lifecycle was "computed from"
evidence; the code only ever prevented it from *outrunning* its evidence.
That distinction now has an observable contract: `isReleaseQualified(rec)`
(exposed as `releaseQualified` on every `getQuestionGovernance()` result)
is `true` only when the **declared** `lifecycle` is `'release-qualified'`
**and** every prerequisite passes — evidence being complete does not, by
itself, promote a record. `computeGovernanceBlockers()` guarantees the
invariant `blockers.length === 0` **if and only if** `releaseQualified ===
true`: a record with complete evidence but a lifecycle not yet explicitly
promoted reports `releaseQualified:false` and carries exactly one blocker,
`release-approval-pending` — never a bare empty `blockers` array. Confirmed
by direct reproduction that, before this correction, a `lifecycle:'draft'`
record with every other field fully populated reported `blockers:[]`,
falsely implying release-readiness.

**Lifecycle prerequisites, enforced, not trusted.** `isValidGovernanceRecord()`
rejects any record whose declared `lifecycle` outruns its own evidence:
`source-checked` requires ≥1 SUFFICIENT source (see above) plus a
source-checker and date; `sme-reviewed` requires everything
`source-checked` requires plus an APPROVED reviewer identity, a real review
date, non-empty `reviewScope`, and a COMPLETE `reviewChecks` set;
`release-qualified` requires everything `sme-reviewed` requires plus a
named drafter, an explicitly assessed `editionSensitive`, a documented
genuinely distinct second-person INDEPENDENT REVIEW (see below —
**corrected 2026-08-04, second pass**: previously optional, now required),
**and** the declared `lifecycle` must itself equal `'release-qualified'`. A
contradictory record (a promoted label without its prerequisites) fails
validation and makes the script throw at load — see
`assertGovernanceRegistryIntegrity()`.

**Independent-review evidence model — `independentReviewDocumented` means
COMPLETE (corrected 2026-08-04, tightened 2026-08-05, FINALIZED
2026-08-05).** `independentReviewDocumented:false` REQUIRES every
independent-review field (`independentReviewer`, `independentReviewDate`,
`independentReviewScope`, `independentReviewChecks` (`[]`),
`independentReviewNoConflictDeclared`) to be in its blank state.
`:true` now means a COMPLETE review record exists — REQUIRES ALL of:
non-empty `independentReviewer`; a valid `independentReviewDate`; a
non-empty `independentReviewScope` (a SEPARATE recorded instance from the
SME reviewer's own `reviewScope` — it can never stand in as evidence of
what a different person independently reviewed); a COMPLETE
`independentReviewChecks` set against the same versioned
`GOVERNANCE_REVIEW_CHECKS_V1` enum, recorded as its OWN separate array
instance (reusing or aliasing the SME reviewer's `reviewChecks` does not
satisfy this); an actual recorded `independentReviewNoConflictDeclared`
boolean (`true` or `false` — `null`, "not yet assessed," fails this gate,
since an unassessed conflict status is not a completed declaration); a
known `drafter`; and the independent reviewer's normalized identity
distinct from both `drafter` and the primary SME `reviewer` (confirmed
rejected even for case/whitespace-variant self-matches against either).
A record claiming `independentReviewDocumented:true` while ANY of this
is missing is REJECTED AT LOAD TIME, as a contradictory record — not
merely flagged with a blocker.

**Corrected again 2026-08-05 (this was itself a defect in the prior
correction).** An earlier version of this check let `true` mean only
"identity and date present" — independent review confirmed a committed
test explicitly expected exactly that incomplete state
(`independentReviewScope:null`, `independentReviewChecks:[]`,
`independentReviewNoConflictDeclared:null`) to load successfully as a
"bare-but-structurally-valid documented independent review." That
contradicted the field's own name, the human policy in
`docs/CONTENT_GOVERNANCE.md` (identity, date, AND scope/checklist), and
the stated goal of preventing content from being described as
independently reviewed without its required evidence. This file
deliberately does not introduce a partial/in-progress review state to
work around it — a future workflow needing to represent "review started
but not finished" would need its own, separately reviewed status field.

**Independent review IS a `release-qualified` prerequisite**
(`meetsIndependentReview()`, folded into `meetsReleaseQualified()`) — the
safer explicit policy for a public, potentially commercial scientific
learning product: Austin's own SME review satisfies `sme-reviewed`, but
`release-qualified` additionally requires a distinct second person's
documented review. Because `independentReviewDocumented:true` now always
means COMPLETE, `meetsIndependentReview()` no longer re-checks
completeness — it only asks whether the (already-complete) review
additionally QUALIFIES: an APPROVED reviewer identity
(`isApprovedIndependentReviewer()`, checked against
`APPROVED_INDEPENDENT_REVIEWERS_BY_PACK` — the same
`GOVERNANCE_SUBJECT_PACK`-keyed structure used for
`APPROVED_SME_REVIEWERS_BY_PACK`, but a SEPARATE registry, since being an
approved SME reviewer and an approved independent reviewer are different
roles by definition. **Deliberately EMPTY for the current production
pack** — no real independent reviewer, credential, or approval record
exists yet, and none is invented here; no record can currently reach
`release-qualified` via independent review at all, matching all 153
current questions remaining Draft. Never exposed by any public API), AND
no declared conflict (`independentReviewNoConflictDeclared === true`, not
`false` — a complete record where the reviewer declared an actual
conflict is honest and valid, just correctly disqualifying).

**Deterministic release blockers, distinguishing MISSING evidence from
COMPLETE-but-disqualified evidence (corrected 2026-08-05).**
`computeGovernanceBlockers()` returns zero or more of these exact, stable
reason codes: `missing-drafter`, `missing-sources`,
`missing-source-check`, `missing-reviewer`, `missing-review-date`,
`incomplete-review-checks`, `unresolved-edition-sensitivity`,
`release-approval-pending`, and, for independent review:
`missing-independent-review` (aggregate — `independentReviewDocumented`
is `false`, nothing at all documented). An EARLIER version of this
correction added GRANULAR "missing-*" codes for the case where
`independentReviewDocumented` was `true` but individual fields were still
absent; that entire case is now IMPOSSIBLE (see above — `true` always
means complete), so those four codes were dead and have been REMOVED
rather than retained as unreachable public-contract codes. What a
COMPLETE, documented review can still fail on is QUALIFICATION, with
codes that reflect a complete-but-disqualified record, never "missing":
`unapproved-independent-reviewer` (the reviewer identity is present, just
not approved — never called `missing-independent-reviewer`, which would
misdescribe a present identity as absent) and
`independent-review-conflict-declared` (the conflict declaration is
present and says `false` — never called
`missing-independent-review-conflict-declaration`, which would misdescribe
a completed, honest declaration as absent). The invariant
`blockers.length === 0` **if and only if** `releaseQualified === true`
(see "Lifecycle is stored and approved, not computed" above) is proven by
a dedicated test that compares both predicates across a matrix of valid
and adversarial fixtures, including an unapproved-but-otherwise-complete
independent reviewer and a complete-but-conflicted one, not merely
asserted informally. Two additional tests confirm `meetsReleaseQualified()`
itself — not merely `computeGovernanceBlockers()`'s display logic —
rejects a `release-qualified` label backed by a complete-but-unapproved
or complete-but-conflicted independent review at load time.

**Current data.** All 153 authored questions are `'draft'`, with every
field `null`/`[]`/`false`, `releaseQualified:false`, and the same 8
blockers present as before this correction (`missing-independent-review`,
the aggregate form, since nothing is documented — never
`release-approval-pending`, since the other blockers are present too) —
nothing is asserted without evidence. See `docs/SCIENTIFIC_REVIEW.md` for
the full record.

**Runtime-injected questions stay outside this registry.** `addQuestions()`
never reads or writes `QUESTION_GOVERNANCE`; a runtime-injected question's
id is treated exactly like any other unknown id by
`getQuestionGovernance()` (returns `null`). `RUNTIME_QUESTION_ALLOWED_KEYS`
does not include any governance-shaped field, so a caller cannot smuggle a
self-certified review status onto an injected question — it is rejected as
an unrecognized field, same as any other unsupported key. The
runtime-injected-content lifecycle itself (session-only definitions,
durable-by-id outcomes) is unchanged by this work.

**Public API.** `getQuestionGovernance(id?)` is read-only: with a known
authored id, returns that record plus two freshly computed fields —
`releaseQualified` (see above) and `blockers` — never stored, possibly
stale values; with no argument, returns every authored record keyed by id,
same shape; an unrecognized id (including any runtime-injected question's
id) returns `null`. Uses the same `clone()` (JSON-roundtrip) detachment as
every other read method — a caller mutating a returned record cannot reach
the live registry. Emits no event and does not read or write learner
progress. `SCHEMA_V` stays `2`; governance metadata is never written to
`localStorage`, `state`, `exportJSON()`, or accepted by `importJSON()`.

**Public-course disclosure (wording corrected 2026-08-04).** A persistent,
non-modal, non-dismissible in-flow disclosure (`#reviewDisclosure`) sits
inside the hero section, immediately after the hero stats — near the
course introduction on both desktop and mobile (not claimed as guaranteed
within the initial viewport on every device — real browser chrome, font
settings, and zoom vary in ways a fixed layout budget cannot promise). It
states the structural-vs-scientific-review distinction using "Automated
checks validate documented structural and behavioral contracts — they do
not establish scientific accuracy" (the prior wording, "Automated tests
confirm this course is built and behaves correctly," read as a broader
positive-correctness claim than the evidence warrants), and links to
GitHub's **rendered** blob view of `docs/SCIENTIFIC_REVIEW.md` — the
original relative link served raw `text/markdown` on GitHub Pages
(confirmed by direct request: `content-type: text/markdown`), an
unrendered, confusing document in a browser, not the rendered `text/html`
page a learner needs. It is pure static markup with no JS behavior:
nothing to dismiss, no focus management, and therefore nothing that can
obstruct or steal focus from course controls. The existing README beta
warning is unchanged and unaffected.

**Release-gate reconciliation (point 8, 2026-08-04).** Every applicable
`docs/CONTENT_GOVERNANCE.md` Release-qualified prerequisite is either
directly validated by this mechanism or explicitly supplied by a named,
separate repository-level check — never claimed as machine-enforced when
it exists only as prose:

| Prerequisite | How it is enforced |
| --- | --- |
| Stable ID | The question's own `id` field; global uniqueness enforced by `addQuestions()`/`tests/validate-course.mjs`, AND at script-load time by `assertGovernanceRegistryIntegrity()`'s authored-question duplicate-count check |
| Domain and topic | The question's own `d`/`t` fields; validated by `tests/validate-course.mjs`'s content-contract test |
| Intended cognitive level | The question's own `x` (difficulty) field; same content-contract test |
| Source evidence | `QUESTION_GOVERNANCE.sources`, gated by `isSufficientGovernanceSource()` (citation, publisher, edition-or-date, locator-or-url) |
| Drafter | `QUESTION_GOVERNANCE.drafter`, required non-null for `release-qualified` |
| Scientific reviewer (SME) | `QUESTION_GOVERNANCE.reviewer`, gated by `isApprovedSmeReviewer()` against `APPROVED_SME_REVIEWERS_BY_PACK` |
| Independent second-person reviewer | `QUESTION_GOVERNANCE.independentReviewDocumented`/`independentReviewer`/`independentReviewDate`/`independentReviewScope`/`independentReviewChecks`/`independentReviewNoConflictDeclared`, gated by `meetsIndependentReview()` against `isApprovedIndependentReviewer()` (empty for the current production pack), required for `release-qualified` |
| Review date and status | `QUESTION_GOVERNANCE.reviewDate` / `lifecycle`, gated by `isValidGovernanceDate()` / `lifecycleRequirementsMet()` |
| Edition/SOP-sensitive assessment | `QUESTION_GOVERNANCE.editionSensitive`, required non-null for `release-qualified` |
| Mandatory scientific/originality/exam-integrity/privacy checks | `QUESTION_GOVERNANCE.reviewChecks`, gated by `hasAllRequiredReviewChecks()` against the versioned `GOVERNANCE_REVIEW_CHECKS_V1` enum — machine-enforced completeness of the checklist categories; the actual human judgment behind each check is not machine-verifiable and remains a reviewer responsibility, same as any review process |
| Schema and automated gates | The full CI suite (`npm test`, Playwright) passing, independent of `QUESTION_GOVERNANCE` |
| Assessment-bank/exam-form validity (answer-choice cueing, distribution balance) | **Not covered by per-question `QUESTION_GOVERNANCE` at all** — a separate, bank-level concern; per-item release qualification is necessary but not sufficient for the question bank or an exam form to be release-qualified. See `docs/QUALITY_LOG.md` QL-032 and `docs/ROADMAP.md` for the tracked, unresolved risk. |

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

## Future direction: adaptive, subject-independent learning platform (planning only)

Everything above this section describes **current, implemented behavior**.
`docs/LEARNING_PLATFORM_ROADMAP.md` is a separate, durable planning
document describing a possible long-term direction — a reusable learning
engine, a cytogenetics content pack, concept/prerequisite modeling,
evidence-qualified strength/weakness diagnostics, spaced retrieval, and
eventual portability to other subjects — none of which exists in this
codebase today. Tracked by
[Issue #24](https://github.com/jaustinanderson/cytogenetics-cg-course/issues/24).

That document explicitly treats this section's "Restructuring trigger"
doctrine as a real constraint, not a hurdle to route around: extracting a
reusable engine from the current single-file architecture (its Phase 7) is
gated on the same "measured maintenance problem, not modernization for its
own sake" bar stated above, and even then the shipped product is expected
to remain one portable artifact unless Austin approves a genuine
product-boundary change. Until that phase is reached and approved, this
"Data model," "Progress," and "Public API" documentation above remains the
complete and authoritative description of what the application actually
does.
