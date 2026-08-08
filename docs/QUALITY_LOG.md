# Quality Log

This log records documentable failures in reasoning, implementation, or
planning. Each entry includes the diagnosis, correction, and prevention measure.

## QL-001 — Development-only dependency in the distributable artifact

- **Status:** Corrected in v1.1.1
- **Finding:** The page loaded Tailwind's browser CDN even though all production
  styling used custom CSS.
- **Impact:** A production console warning, unnecessary third-party executable
  code, extra privacy/supply-chain exposure, and misleading architecture.
- **Cause:** A prototyping dependency survived after its utilities were no
  longer used.
- **Correct action:** Remove the script and validate visual/structural behavior.
- **Correction:** Removed the CDN script; JavaScript and HTML validation pass.
- **Prevention:** Inventory every external runtime dependency and fail browser
  smoke tests on unexpected console output.

## QL-002 — Documentation overstated API validation

- **Status:** Core contract corrected in v1.1.1; broader API review remains open
- **Finding:** The roadmap said `addQuestions()` validated the full schema and
  rejected duplicates, but implementation checked only a few fields and only
  deduplicated within one quiz.
- **Impact:** Malformed content and cross-quiz duplicate IDs could enter memory;
  duplicate IDs could corrupt analytics indexing.
- **Cause:** Documentation described intended behavior rather than tested
  behavior.
- **Correct action:** Treat public API statements as contracts and prove them.
- **Correction:** Added full core-schema checks, answer bounds, recognized
  domains/difficulties, global duplicate detection, atomic rejection, and tests.
- **Prevention:** Every public API guarantee requires a committed contract test.

## QL-003 — Reset could resurrect migrated progress

- **Status:** Corrected in v1.1.1
- **Finding:** UI Reset removed v2 state but left the v1 migration source.
- **Impact:** Reload could re-import old module completion immediately after the
  user chose to erase it.
- **Cause:** Reset was designed around current storage without testing the full
  migration lifecycle.
- **Correct action:** Clear both keys or use a tested migration tombstone.
- **Correction:** UI and API Reset now clear the legacy key.
- **Prevention:** Test Reset from fresh, v1-only, migrated, and v2-only states.

## QL-004 — Historical validation claim was not reproducible

- **Status:** Structural and DOM-behavior instruments committed; real-browser,
  scientific, rights, and full accessibility layers remain open
- **Finding:** The archived roadmap described a runtime harness that was not
  included with the supplied project.
- **Impact:** Readers could not reproduce the evidence behind the claim.
- **Cause:** Validation results were recorded without committing the instrument.
- **Correct action:** Commit tests and distinguish structural, behavioral,
  scientific, accessibility, and rights validation.
- **Correction:** Added a committed structural/content validator, a
  dependency-free DOM behavior harness, mutation checks, and CI.
- **Prevention:** No validation claim without the command, instrument, scope, and
  exact result in the repository.

## QL-005 — Exercise progress identity is position-dependent

- **Status:** Corrected on branch `claude/issue-2-stable-exercise-ids`
  (Issue #2)
- **Finding:** Exercise outcomes use IDs such as `ex7-1`, derived from array
  position.
- **Impact:** Inserting or reordering exercise items can attach saved history to
  a different item.
- **Cause:** Presentation order was used as persistent identity.
- **Correct action:** Give each item a stable explicit ID and migrate existing
  position-based records.
- **Correction:** Every one of the 30 items across the 6 exercise sets
  (`EXERCISES.ex7`/`ex9group`/`ex9chrom`/`ex10`/`ex14`/`ex15` in
  `index.html`) now carries an explicit, literal `id` field
  (`"<key>-i<n>"`, e.g. `"ex7-i1"`) — deliberately a different string
  format from the legacy `"<key>-<n>"` position-derived form, so the two
  can never collide and a genuine migration (not a same-string no-op) is
  both meaningful and testable — **and** a second literal, frozen
  `legacyId` field recording the exact position-derived key that item
  held before this change (e.g. `"ex7-1"`). `buildExercise()`'s seeding
  loop and `choose()` handler read/write `state.exercises[it.id]`
  directly instead of recomputing `key + '-' + (idx+1)` from the current
  render index.

  A new `migrateExerciseIds()` renames any surviving legacy-format key —
  read from each item's own frozen `legacyId`, **never recomputed from
  its current array index** — to its item's real stable id, called
  unconditionally from `loadProgress()` (both on a fresh v2 load and
  after a v1→v2 migration produces no legacy exercise keys, since v1
  never had an `exercises` field) and from `importJSON()`. It is
  deterministic (driven entirely by each item's own `legacyId`/`id`
  fields and the live `EXERCISES` data, never a stored "already migrated"
  flag) and idempotent (once no legacy key remains, every further call —
  on every load, forever — finds nothing to do and performs zero writes;
  verified directly, not assumed, in `tests/dom-behavior.mjs`).

  **Conflict rule**, for the case where both a legacy key and its item's
  stable key already hold a record (a stale re-import, or a state a
  mixed-version session partially wrote into): these records carry no
  attempt-level identifiers or provenance, so their two histories cannot
  be exactly reconstructed or merged — they might be disjoint, but they
  might just as well overlap, and nothing in the stored fields can tell
  the two cases apart. Migration therefore takes a conservative
  deterministic **snapshot**: it keeps the entire record (`c`, `n`, and
  `ts` together, never mixed from the two sides) from whichever key was
  written more recently; ties keep the canonical stable-key record. This
  is not a claim that no history can ever be lost — it is the best
  available choice given records with no provenance, not a guarantee
  every individual attempt survives.

  **Schema-version decision:** `SCHEMA_V` stays `2`. The stored record's
  shape (`{v,modules,answers,exercises,started}`) is unchanged — only the
  convention for which strings populate `exercises`'s keys changed — and
  the migration is unconditional, deterministic, and cheap enough (at
  most 30 items) to simply always run rather than gate behind a new
  version number that would add bookkeeping (an "already migrated" flag,
  or a version-comparison branch) without any corresponding benefit, since
  the migration is already safe to run on every load indefinitely.

  Tests in `tests/dom-behavior.mjs` (17 total) and a structural
  check in `tests/validate-course.mjs` cover: every item has an explicit
  unique id and a unique, non-colliding `legacyId`, **and** the complete
  live `id → legacyId` mapping matches an independently hard-coded,
  frozen historical table exactly — not merely that every value happens
  to be unique, which a swap between two items' `legacyId` values would
  still satisfy (see the second addendum below); an item's
  id is a literal property (verified by reordering a cloned array and
  confirming ids travel with their items, not their positions); legacy
  records migrate correctly on load, with the legacy key gone from both
  memory and storage; migration is idempotent both in the simple case and
  after a conflict resolution (a second load performs *zero* further
  writes, verified by exact storage-string equality, not just an
  equivalent-value check); a fresh answer is recorded only under its
  stable id, never the legacy form; exercise progress survives a real
  reload and an export/import round-trip under its stable id; and
  importing a legacy-format export migrates it. Two dedicated end-to-end
  tests run the real product script with one line —
  `EXERCISES.ex7.items.reverse();` — injected into a copy of the exact
  inline script text (not a stub): one answers two items with
  deliberately different (correct/incorrect) outcomes, reverses their
  array order, and confirms each item's recorded outcome stays correctly
  attributed to its own id after the reorder; the other seeds a legacy
  record and reorders the array *before* migration ever runs, confirming
  the record follows its original item's `legacyId`-derived identity, not
  whichever item now occupies that position (covered for both the load
  path and the import path). The conflict-resolution tests cover a newer
  stable record winning outright, a newer legacy record winning outright,
  an equal-timestamp tie keeping the canonical stable record, idempotency
  after resolution, and the mixed-version-tab overlap example described
  in the addendum below (proving `n` stays the true attempt count, not an
  inflated sum).

  **Mutation-tested**, per the standing discipline in this log: (1)
  disabling the `migrateExerciseIds()` call in `loadProgress()` made
  exactly the 6 migration/conflict/idempotency/export tests fail, each
  for the correct reason; restored, all checks passed again. (2)
  reverting `choose()`'s `var thisId = it.id;` back to the legacy
  `key + '-' + (idx+1)` made exactly the "answering a fresh exercise item
  records ... only under the stable id" and the reordering end-to-end
  test fail, each for the correct reason; restored (confirmed identical
  to the pre-mutation file via `diff`), all checks passed again. Three
  further mutations from the addenda below are recorded there.

  `tests/e2e/progressive-disclosure.spec.mjs`'s existing seeded-record
  test was updated to seed under `"ex7-i1"` (the real stable id) instead
  of the legacy `"ex7-1"`, so it keeps proving its original claim (an
  already-current-format record needs no migration, so loading it writes
  nothing new and fires no `progress` event) rather than incidentally
  exercising migration, which now has its own dedicated coverage.

  No question, answer, rationale, scoring, quiz progress, analytics
  semantics, image, styling, layout, or accessibility presentation
  changed.
- **Prevention:** Any persistable entity must have an order-independent identity
  and a migration test.

### Addendum — independent review found two blocking correctness problems

- **Status:** Corrected on the same branch, before merge
- **Finding 1 — legacy ID was recomputed from current array position, not
  frozen.** The first version of `migrateExerciseIds()` computed each
  item's legacy key as `legacyExerciseId(key, i)`, where `i` was the
  item's position in `EXERCISES[key].items` **at migration time**. That
  reintroduced exactly the bug this correction exists to fix, one level
  up: a learner who skips a release and first loads a later one *after*
  an item was inserted or reordered could have their legacy progress
  migrated onto whichever item currently occupies that array position,
  not the item it actually belongs to. The reordering test committed with
  the original fix did not catch this, because it answered items *after*
  stable ids already existed and only then reordered — it proved the
  runtime lookup uses a stable id correctly, but never exercised the
  legacy-migration path against a reordered array at all.
- **Impact:** None shipped — caught in independent review before merge.
  Had it shipped, the exact class of bug QL-005 was opened to fix could
  recur on any future reorder, silently, for any learner who happened to
  still be on the old key format at the time.
- **Correction:** Every exercise item now also carries a literal, frozen
  `legacyId` field (e.g. `"ex7-1"`) — the exact key that item held before
  this change — authored once, never recomputed. `migrateExerciseIds()`
  reads `it.legacyId` directly instead of calling a position-based
  helper, which was removed as now-dead code. Two new tests seed a legacy
  record for a specific item, reorder `EXERCISES.ex7.items` via the same
  script-injection technique *before* boot/migration ever runs (so the
  reorder is in effect for the very first load, not just after), and
  confirm the record follows that item's real stable id — never
  whichever item now sits at the original array position — covering both
  the direct-load path and the `importJSON()` path. **Mutation-tested:**
  reverting to a position-derived legacy-key computation made exactly
  these two new tests fail, for the correct reason; restored and
  confirmed identical via `diff`.
- **Finding 2 — the conflict rule's "disjoint sequences" claim is false,
  and summing `n` can silently inflate the attempt count.** The original
  conflict rule summed `n` from both records, justified by the claim that
  a legacy key and its item's stable key "can only exist by recording two
  genuinely disjoint sequences of attempts." That claim does not hold.
  Concrete counterexample: a learner has two browser tabs open on
  different app releases. Tab B (new version) migrates an early snapshot
  of the item's history — 5 attempts — to the stable key. Tab A (old
  version), still open, then records one more attempt under the legacy
  key, so the legacy record's own count (6) already *includes* every
  attempt the stable snapshot's count (5) does, plus one. The two records
  overlap; they are not disjoint. The next migration, seeing both keys,
  summed 6 + 5 and reported 11 attempts for an item that was genuinely
  attempted 6 times — silently double-counting the 5 shared attempts.
  Because these records carry no attempt-level identifiers or timestamps
  per attempt (only one aggregate `n`/`c`/`ts` per key), there is no way
  to detect or correct for overlap after the fact — exact reconciliation
  is impossible with the data available.
- **Impact:** None shipped — caught in independent review before merge.
  Had it shipped, any learner using the app across a version boundary in
  more than one tab (or any other path that leaves both a legacy and
  stable record for the same item) could have their exercise attempt
  count silently inflated, corrupting a number this course exposes
  directly to the learner and to `getProgress()`/`exportJSON()`.
- **Correction:** Replaced the summing merge with a conservative
  deterministic **snapshot** policy: keep the entire record — `c`, `n`,
  and `ts` together, never reconstructed by mixing fields from the two
  sides — from whichever key was written more recently; a tie keeps the
  canonical stable-key record. This does not claim no history can ever be
  lost; it is documented as the best available choice given records with
  no provenance, not a guarantee every individual attempt is preserved.
  Rewrote the conflict tests to match: the mixed-tab overlap example
  above (proving `n` stays 6, not 11), a newer stable record winning
  outright, a newer legacy record winning outright, an equal-timestamp
  tie keeping the stable record, and idempotency after resolution.
  **Mutation-tested:** reverting to the sum-based merge made exactly
  these five tests fail, for the correct reason; restored and confirmed
  identical via `diff`.
- **Cause:** Both problems share a root cause: an assumption ("the array
  index is a safe proxy for identity across time"; "the two records must
  be disjoint") was stated in a comment and acted on without being
  checked against a concrete adversarial scenario (a future reorder; two
  tabs on different versions) before shipping.
- **Correct action:** For any migration or merge logic, name the specific
  adversarial scenario the design must survive (a reorder happening
  *before* the affected learner's next load; concurrent/overlapping
  writers) and write a test that actually constructs that scenario, not
  only a test of the mechanism in isolation. Treat "these two things can
  only be disjoint" as a claim to prove, not assume, whenever the data
  involved carries no identifiers that could confirm it.
- **Prevention:** `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`,
  `docs/VALIDATION.md`, `docs/CLAUDE_HANDOFF.md`, and `CHANGELOG.md` were
  all updated so none retain the disproven "disjoint sequences," "sum,"
  or "never double-counts" claims; see `docs/VALIDATION.md` "Stable
  exercise-item identity" for the corrected test-coverage record.

### Addendum — independent review found a remaining test-coverage blocker

- **Status:** Corrected on the same branch, before merge
- **Finding:** The structural check added in the addendum above (every
  item has a unique `id` and a unique, non-colliding `legacyId`) proves
  presence and uniqueness, but never proves each `legacyId` is paired
  with the *correct* item. Swapping two items' `legacyId` values with
  each other — e.g. giving `ex7-i1` the value `"ex7-2"` and `ex7-i2` the
  value `"ex7-1"` — leaves every one of those checks satisfied: both
  values are still present, still unique among all 30, and still don't
  collide with any stable id. The check could not have caught this class
  of authoring mistake, even though it is exactly the mistake this
  correction pass exists to make impossible: migration would attach
  `ex7-1`'s saved history to `ex7-i2` and `ex7-2`'s to `ex7-i1`, silently
  swapping the two items' recorded progress.
- **Confirmed directly, not assumed, before writing the fix:** swapped
  `ex7-i1`/`ex7-i2`'s `legacyId` values in `index.html` and re-ran the
  then-current structural test in isolation — it passed. A separate
  standalone script isolated and re-ran just the count/uniqueness/
  collision assertions against the mutated data and printed `true` for
  every one of them, confirming the gap precisely rather than inferring
  it.
- **Impact:** None shipped — caught in independent review before merge.
  Had a real authoring mistake of this shape ever landed, the committed
  test suite would have reported full coverage while silently permitting
  the exact identity-swap bug this whole correction pass was written to
  prevent.
- **Cause:** Uniqueness and non-collision are necessary conditions for a
  correct mapping but not sufficient ones — a permutation of otherwise-
  valid values satisfies both while still being wrong. The original check
  tested the *shape* of the id/legacyId data (right count, right
  distinctness) without testing its *content* (the right value is
  attached to the right item).
- **Correct action:** For any per-item mapping where a permutation of
  valid-looking values would be an undetected wrong answer, assert the
  complete mapping against an independently authored expected value — not
  a property (uniqueness, count, non-collision) that a permutation would
  still satisfy.
- **Correction:** Added `EXPECTED_STABLE_TO_LEGACY_ID` to
  `tests/validate-course.mjs`: a literal, hard-coded object mapping all 30
  stable ids to their exact historical legacy keys, written independently
  of `EXERCISES`/`index.html` — deliberately not computed from an item's
  current array position, from `item.legacyId` itself, or from any other
  transformation of the live data under test, since computing "expected"
  from the same data being checked cannot detect a mistake in that data.
  The test now builds the complete actual `id → legacyId` mapping from
  live `EXERCISES` data and asserts, in order: the key sets match exactly
  (so a missing or unexpected stable id is reported as a set mismatch, not
  a confusing value diff), then the complete mapping matches the frozen
  table exactly, value-for-value. The pre-existing count/uniqueness/
  non-collision assertions are unchanged and still run first.
- **Mutation-tested:** the same `ex7-i1`/`ex7-i2` `legacyId` swap used to
  confirm the original gap was re-applied to `index.html` after the fix.
  The pre-existing count/uniqueness/non-collision assertions still
  passed, exactly as before (confirmed directly, not assumed, by
  isolating and re-running just those checks against the mutated data).
  The new exact-mapping assertion failed with a diff naming exactly the
  two swapped entries (`'ex7-i1': 'ex7-2'` / `'ex7-i2': 'ex7-1'` where
  `'ex7-i1': 'ex7-1'` / `'ex7-i2': 'ex7-2'` was expected). Reverted;
  `index.html` confirmed byte-identical to the pre-mutation file via
  `diff` before committing; the full test passed again.
- **Prevention:** `docs/VALIDATION.md`, `docs/QUALITY_LOG.md` (this
  entry), and `CHANGELOG.md` now describe this check as verifying the
  complete frozen mapping, not merely uniqueness. When a structural check
  claims an id/key *pairing* is correct, confirm it actually tests the
  pairing (value-for-value against an independent source of truth), not
  only properties (count, uniqueness, non-collision) a wrong-but-
  permuted pairing would still satisfy.

## QL-006 — Progress import trusts malformed nested state

- **Status:** Corrected on branch `claude/issue-2-import-hardening`
  (Issue #2). The "define handling for stale IDs" clause of the original
  correct action is intentionally NOT part of this correction — see
  "Not corrected here" below.
- **Finding:** `importJSON()` checks schema version but does not fully validate
  nested maps and outcome records.
- **Impact:** Malformed imported data can break later operations or distort
  headline analytics.
- **Cause:** Version compatibility was treated as structural validity.
- **Correct action:** Validate, normalize, and deep-clone imported state; define
  handling for stale IDs.
- **Correction:** Added `validateImportedState()` (`index.html`), a pure
  function that never mutates its input and never touches the live
  `state`, `localStorage`, or the DOM. It checks, in order: the top-level
  object is a plain object with only recognized keys (`v`, `modules`,
  `answers`, `exercises`, and the optional `migratedFrom`); `v` equals
  `SCHEMA_V` exactly; `started` is a finite, non-negative number;
  `modules`/`answers`/`exercises` are each plain objects; a cheap combined
  entry-count check against a documented cap (2000); then a full per-entry
  structural pass building an entirely NEW, deep-cloned object graph —
  every `modules` value must be the literal `true`, every `answers`/
  `exercises` value must be a plain object with EXACTLY `{c: boolean,
  n: integer 1..1000000, ts: finite number >=0}` (no missing or extra
  fields), and no map key anywhere may be `__proto__`, `constructor`, or
  `prototype`. `importJSON()` now checks a raw string's length (262,144 characters)
  against `MAX_IMPORT_JSON_LENGTH` **before** ever calling `JSON.parse`,
  and only assigns the validated, freshly-built object to the live
  `state` (then runs `migrateExerciseIds()`, saves, and re-renders) after
  `validateImportedState()` returns success — so a rejected import cannot
  leave a partial write by construction, not via a separate rollback
  step, and mutating the caller's own object (if `importJSON()` was
  called with a plain object rather than a JSON string, which previously
  aliased that object directly into live state) cannot affect progress
  after the fact.

  Both numeric limits are grounded in a real measurement, not a guess: a
  synthetic full-course completion (17 modules + 153 questions + 30
  exercise items, all recorded) was built via the real public API and
  exported, producing exactly 200 entries and an 8,667-character
  `exportJSON()` blob. `MAX_IMPORT_JSON_LENGTH` (262,144 characters) is
  ~30x that; `MAX_IMPORT_ENTRIES` (2000) is ~8x that measured entry count
  and ~8x the post-expansion target (199 questions + 30 exercises + 17
  modules = 246, per `docs/ROADMAP.md` Milestone 2A) — comfortable
  headroom without being unbounded.

  27 new tests in `tests/dom-behavior.mjs`: a current export round-trips
  (extended to also cover an exercise outcome, not only a module and a
  quiz answer); importing a plain object and mutating it afterward — at
  the top level, inside a nested record, and via a newly added key —
  never changes live progress; both a wrong and an entirely missing
  schema version are rejected; an oversized, deliberately-invalid-JSON
  string is rejected with a size-specific error (proving the length check
  runs before `JSON.parse`, not after a parse failure); a 2,001-entry
  payload is rejected before the expensive per-entry pass; a dedicated
  rejection case for each nested-type category named in the roadmap item
  (wrong-typed/null/array `modules`/`answers`, a non-true modules value,
  non-boolean `c`, an invalid `n` in four different ways, an invalid `ts`
  in two different ways, an outcome record with an extra key, an
  unrecognized top-level field, a non-numeric `started`, and
  `constructor`/`prototype` used as map keys); a shared
  `assertImportRejectedAtomically()` helper applied to every rejection
  case above, asserting `getProgress()`, `localStorage`, the rendered
  module-count label, and the fired-`progress`-event count are all
  byte-for-byte unchanged; and a dedicated test
  proving a payload with valid `modules`/`answers` but one malformed
  `exercises` entry writes nothing at all, not even the fields that were
  individually valid.
- **Not corrected here:** the original correct action's "define handling
  for stale IDs" clause is intentionally out of scope for this
  correction — whether an id belongs to a module/question/exercise that
  currently exists is a separate, still-open Milestone 1 roadmap item
  ("stale ID policy"), not a structural-validity question. This
  correction validates that an id is a syntactically safe non-empty
  string, never whether it is a *currently known* one.
- **Prevention:** Add hostile/malformed import fixtures and round-trip tests.

### Addendum — independent review found three further blocking gaps, plus a terminology inaccuracy

- **Status:** Corrected on the same branch (`claude/issue-2-import-hardening`),
  before merge.
- **Finding 1 — a successful validation could still be silently lost to a
  storage failure.** `importJSON()` replaced live `state` and only *then*
  called `saveProgress()`, which wraps its `localStorage.setItem()` call in
  a bare `try{}catch(e){}` and unconditionally emits the `progress` event —
  a design that is correct for `saveProgress()`'s other callers
  (`recordAnswer()`/`recordExercise()`/`markModule()`, where in-memory
  progress should keep advancing even if persistence is temporarily
  unavailable) but wrong for `importJSON()`, whose entire contract is "this
  either fully took effect or it didn't." A full, validated import could
  therefore return `{ok:true}`, update the rendered UI, and fire a
  `progress` event, while `localStorage` silently kept the pre-import data
  — confirmed by temporarily reverting the fix below and observing exactly
  that outcome before writing the correction.
- **Impact:** None shipped — this entire gap was found and fixed within the
  same draft PR, before merge or independent sign-off. Had it shipped, a
  learner importing progress in a full or disabled-storage browser (private
  browsing, a full quota, a locked-down profile) would have believed the
  import succeeded — the UI and the return value both said so — while
  losing it on the next reload.
- **Correction:** Rewrote `importJSON()`'s transaction order so persistence
  is attempted *before* anything observable changes, not after:
  validate the full envelope into a fresh, fully detached candidate state
  (touches nothing live) → run `migrateExerciseIds()` against that
  candidate, not global `state` → `JSON.stringify()` the candidate → 
  `localStorage.setItem()` it. Only once that write has actually succeeded
  does the function assign `state = candidate`, emit `progress`, and
  refresh the rendered UI; a thrown error at the serialize or storage step
  returns `{ok:false, error}` immediately, having touched none of those four
  surfaces. `importJSON()` deliberately does **not** call `saveProgress()`
  — it needs to observe and react to a storage failure, not swallow it —
  and `saveProgress()` itself is unchanged, since redesigning its
  swallow-and-emit behavior for its other callers is separate, out-of-scope
  work. `migrateExerciseIds()` was refactored to accept an explicit target
  state parameter (defaulting to global `state` for its other caller,
  `loadProgress()`) instead of always mutating global state directly, so it
  can run against the not-yet-committed candidate. One new test seeds real
  progress, monkey-patches the test harness's storage object so `setItem()`
  throws mid-import, and asserts `getProgress()`, `localStorage`, the
  rendered module-count label, and the fired-`progress`-event count are all
  unchanged, that `importJSON()` returns `{ok:false}`, and that the same
  import succeeds once storage is restored (proving the failure was
  specifically about persistence, not an unrelated validation rejection).
  **Mutation-tested:** moving `state = candidate` back before the storage
  write (reintroducing the original bug) failed exactly that one new test;
  restored and confirmed identical via `diff`.
- **Finding 2 — required fields were checked by property access, not
  ownership, letting prototype-chain values substitute for real data.**
  Property access (`candidate.v`, `rec.c`) follows the prototype chain, but
  `Object.keys()` lists only *own* enumerable properties. The previous
  validator counted/enumerated own keys but then read values via plain
  access — so an object built with `Object.create(realStateShapedProto)`,
  owning **zero** keys of its own, passed every check (the "unrecognized
  key" loop ran zero times; `candidate.v !== SCHEMA_V` read `2` off the
  prototype and passed), and an outcome record with three own keys that
  were *not* `c`/`n`/`ts`, plus genuine `c`/`n`/`ts` inherited from its
  prototype, passed the old `Object.keys(rec).length === 3` check while
  reading the inherited values. Both were confirmed as real, working
  exploits by direct execution against the pre-fix validator before any
  fix was written, not assumed from reading the code.
- **Impact:** None shipped — found and fixed within the same draft PR.
  Had it shipped, a hand-crafted import (not producible by this app's own
  `exportJSON()`, but trivially constructable by any caller of the public
  `importJSON()` API) could have been accepted as a fully valid state
  update while carrying attacker-chosen values that never appeared as this
  object's own data.
- **Correction:** Added `REQUIRED_STATE_KEYS` and an explicit
  `Object.prototype.hasOwnProperty` ownership check for
  `v`/`modules`/`answers`/`exercises`/`started` before any of those fields
  is read, and the same ownership check for `c`/`n`/`ts` inside
  `isValidOutcomeRecord()` (replacing the previous "own-key count is 3,
  then read whatever's there" logic). Six new tests: a state object built
  via `Object.create()` with every required field only on its prototype and
  zero own keys; an outcome record with three own keys that are none of
  `c`/`n`/`ts`, plus `c`/`n`/`ts` inherited from its prototype; and each of
  `modules`/`answers`/`exercises`/`started` individually absent as an own
  property (the fifth, `v` entirely absent, was already covered by an
  existing test). Deliberately did **not** adopt a same-realm prototype
  equality rule (e.g. rejecting any object whose prototype isn't exactly
  `Object.prototype`) — `importJSON()` is a public API method, and a
  legitimate caller running this course's test harness under Node's `vm`
  module passes objects from a different realm, whose plain object
  prototype is a different (but equally legitimate) `Object.prototype`;
  ownership-of-property is the correct check, cross-realm identity is not.
  **Mutation-tested:** two separate mutations, each reverted and confirmed
  identical via `diff`: (1) removing the `hasOwn` check in
  `isValidOutcomeRecord()` failed exactly the inherited-outcome-record
  test; (2) removing the `REQUIRED_STATE_KEYS` ownership loop failed
  exactly the six tests above that depend on it (the prototype-only state
  test, the four individually-missing-field tests, and the pre-existing
  missing-`v` test).
- **Finding 3 — the export-wrapper envelope was unwrapped without
  validating its own shape.** `var candidate = isPlainObject(o.state) ?
  o.state : o;` selected `o.state` whenever it was object-valued and
  silently discarded everything else about `o` — an extra field alongside
  `state`, a dangerous key on the wrapper itself, or (per Finding 2's
  pattern) a `state` value that was only *inherited*, not owned, by the
  outer object all passed through un-validated, contradicting this course's
  own documentation, which described the "complete envelope" as validated.
- **Impact:** None shipped — found and fixed within the same draft PR.
  Had it shipped, a malformed or hostile wrapper around an otherwise valid
  `state` (including one carrying a dangerous own key like `__proto__`
  alongside `state`) would have been silently accepted rather than
  rejected as documented.
- **Correction:** Added `validateImportEnvelope()`, which defines exactly
  two accepted forms: a **bare state** object (owns
  `v`/`modules`/`answers`/`exercises`/`started`, no `state` field of its
  own) validated directly against `validateImportedState()`; or an
  **export wrapper**, distinguished by owning a `state` key
  (`hasOwn.call(o,'state')`), whose own keys must be *exactly*
  `exported`/`state`/`stats` — no more, no fewer, none of them
  `__proto__`/`constructor`/`prototype` — with `state` validated against
  the identical bare-state schema, and `exported`/`stats` checked to the
  basic types `exportJSON()` actually produces (a string; a plain object
  with no dangerous own keys), since neither is persisted or otherwise
  used. An object whose `state` is only *inherited* (not own) correctly
  falls through to the bare-state branch, which rejects it on the same
  ownership grounds as Finding 2 — this was verified as the actual
  behavior, not assumed from the branch condition. Six new tests: an
  unknown wrapper field, a dangerous own key on the wrapper (a genuine
  own `__proto__` built via `JSON.parse`, per QL-023's established
  technique), a wrapper whose `state` is prototype-inherited rather than
  own, a wrapper missing `exported`, wrong types for `exported`/`stats`,
  and a full current `exportJSON()` → `importJSON()` round trip proving
  the accepted wrapper shape still matches what this app actually
  produces. **Mutation-tested:** reverting `validateImportEnvelope()` to
  the original `isPlainObject(o.state) ? o.state : o` logic failed exactly
  those five rejection tests (the round-trip test continued to pass, as
  expected, since a genuinely valid wrapper is accepted by both versions);
  restored and confirmed identical via `diff`.
- **Finding 4 — terminology: "256 KiB" mischaracterized a character
  limit as a byte limit.** `MAX_IMPORT_JSON_LENGTH` (262144) bounds a
  JavaScript string's `.length` — UTF-16 code units — checked before
  `JSON.parse`. 262,144 UTF-16 code units is not reliably 256 KiB of
  bytes: once UTF-8 or UTF-16 encoded, that same string ranges from
  ~256 KiB (all-ASCII/BMP content, one byte or two bytes per unit) up to
  ~512 KiB (entirely non-BMP characters, which JavaScript counts as two
  `.length` units — a surrogate pair — but which encode to 4 bytes in
  UTF-8 or UTF-16). "256 KiB" was simply the wrong unit for what the code
  actually measures.
- **Impact:** Documentation-only; the limit's behavior was never wrong,
  only its description. `MAX_IMPORT_JSON_LENGTH` still bounds hostile-input
  parsing cost the same way regardless of what the comment called it.
- **Correction:** Reworded every occurrence (`index.html`'s
  `MAX_IMPORT_JSON_LENGTH` comment, `docs/ARCHITECTURE.md`,
  `docs/ROADMAP.md`, `docs/VALIDATION.md`, `docs/CLAUDE_HANDOFF.md`,
  `CHANGELOG.md`, and this entry) to describe the limit as
  "262,144 characters" (a JS string-length/code-unit limit), removing every
  "256 KiB" claim rather than switching to a byte-accurate implementation —
  the limit's actual purpose (bound hostile-payload parsing cost with
  generous headroom over a real measured export) does not need byte-exact
  accounting to hold.
- **Cause:** All three correctness gaps share a root cause with QL-005's
  addendum above: a design choice (persist-then-commit ordering; "own key
  count" as a stand-in for "own keys"; "if `.state` is object-valued, use
  it") was implemented and, in two of the three cases, actually tested —
  but the test doubles/fixtures used ordinary object literals and JSON
  round-trips that happen to always produce own properties, so the
  property-access-vs-ownership distinction and the storage-failure path
  were never exercised by any existing test. The terminology gap is a
  simpler cause: "KB"/"KiB" was used as a familiar shorthand for "a large
  number of characters" without checking that the code path being
  described actually measured bytes.
- **Correct action:** When a validator's job is specifically to resist
  adversarial input, "the mechanism worked in the tests I wrote" is not
  sufficient evidence — construct the adversarial input that most directly
  attacks the stated guarantee (own vs. inherited; a failing dependency;
  the surrounding envelope) and confirm the mechanism actually holds
  against it, the same discipline QL-005's addendum, QL-013, and QL-023
  all converged on independently.
- **Prevention:** `docs/ARCHITECTURE.md`, `docs/VALIDATION.md`,
  `docs/ROADMAP.md`, and `docs/CLAUDE_HANDOFF.md` were all updated to
  describe only the schema, transaction order, and terminology now proven
  by the corrected tests above; see `docs/VALIDATION.md` "Progress-import
  validation and cloning" for the corrected test-coverage record.

### Addendum 2 — independent review found a contract-level gap: `isPlainObject()` accepted any non-array object, not a genuine record

- **Status:** Corrected on the same branch (`claude/issue-2-import-hardening`),
  before merge.
- **Finding.** `isPlainObject(x)` was `!!x && typeof x === 'object' &&
  !Array.isArray(x)` — true of *any* non-array object, including exotic
  built-ins (`Date`, `Map`, `Set`, `RegExp`, …) that carry no data
  reachable through ordinary own-property enumeration. Every exact-shape
  check in this validator (the state, the wrapper, the
  `modules`/`answers`/`exercises` containers, and every outcome record) is
  built on `Object.keys()`, which lists only OWN ENUMERABLE STRING keys —
  so it was also blind to an own SYMBOL key, a genuine own property marked
  NON-ENUMERABLE, and an ACCESSOR (getter/setter) property, none of which
  `Object.keys()` can see. Four counterexamples were independently
  reproduced by direct execution against the pre-fix validator, through
  the same `vm`-sandboxed `importJSON()` the test suite exercises, before
  any fix was written: (1) `{v:2, modules: new Date(0), answers: new
  Map(), exercises:{}, started:0}` was accepted, with `modules`/`answers`
  silently stored as empty objects (`Object.keys(new Date(0))` and
  `Object.keys(new Map())` are both `[]`); (2) an otherwise-valid outcome
  record `{c:true,n:1,ts:1}` with a fourth own property added via
  `Object.defineProperty(rec,'hidden',{value:'secret',enumerable:false})`
  was accepted — `Object.keys(rec)` still reported exactly `['c','n','ts']`
  despite `Object.getOwnPropertyNames(rec)` confirming four real own
  properties; (3) a state object with a genuine own `Symbol('evil')` key
  alongside otherwise-valid fields was accepted, the symbol key completely
  invisible to `Object.keys()`; (4) a wrapper `{exported:'x', state:{...
  valid...}, stats:new Date(0)}` was accepted, `stats` silently treated as
  an empty object.
- **Impact:** None shipped — this entire gap was found and fixed within
  the same draft PR, before independent sign-off or merge. Had it shipped,
  a direct-object caller of the public `importJSON()` API (not achievable
  via a JSON string, since `JSON.parse` cannot produce a `Date`/`Map`/
  symbol key/accessor/non-enumerable property — but trivially achievable
  by any JavaScript caller passing an object directly, which this API
  explicitly supports and has a dedicated detachment test for) could have
  had `modules`/`answers`/`exercises`/wrapper `stats` silently replaced
  with empty data while `importJSON()` reported `{ok:true}`, or smuggled a
  fourth outcome-record field or a symbol-keyed state field past checks
  that document themselves as exact-own-property-shape.
- **Correction.** Added `isRecordObject(x)`, which rejects exotic
  built-ins by checking prototype-chain SHAPE rather than identity or
  `Object.prototype.toString`: the object's own prototype must be `null`,
  or that prototype's own prototype must be `null` — true for an ordinary
  plain object or a null-prototype object in *any* realm (verified
  directly against Node's `vm` module before relying on it, since this
  course's own test harness runs the app in a separate realm from its
  test file), and false for any exotic built-in, whose prototype chain is
  at least one level deeper. This also resists a
  `Symbol.toStringTag`-spoofing exotic object (e.g. a `Map` subclass
  overriding its tag to read as `"[object Object]"`, which would defeat a
  `Object.prototype.toString.call(x) === '[object Object]'`-style check)
  — verified directly: the spoofed tag reads as `"[object Object]"` while
  `isRecordObject()` still correctly returns `false` for it, since it
  never consults `toString` at all. Added `hasOnlyOwnDataProperties(x)`,
  which rejects any own symbol key (`Object.getOwnPropertySymbols(x).length
  > 0`), any own property whose descriptor is not `enumerable`, and any
  own property that is an accessor rather than a data property (no
  `'value'` key on its descriptor). `isPlainObject(x)` is now
  `isRecordObject(x) && hasOnlyOwnDataProperties(x)` — both checks are
  necessary together, confirmed by mutation testing below: an exotic
  built-in with zero own properties at all (`new Date(0)`, `new Map()`,
  `new Set()`) vacuously satisfies `hasOnlyOwnDataProperties()` alone, and
  neither check subsumes the other.

  **Deliberate design decision, documented:** a null-prototype object
  (`Object.create(null)`) IS accepted as a valid record at every level.
  Every check in this validator reads own properties via explicit
  `hasOwnProperty`/bracket access, never through an object's own inherited
  methods, so a null-prototype object behaves identically to an ordinary
  plain object for every purpose this validator cares about — and a
  direct (non-JSON-string) caller may reasonably build one specifically to
  avoid prototype-pollution surface entirely. Rejecting it would
  needlessly penalize that defensive habit for no security benefit. A
  dedicated positive test constructs a complete state, entirely out of
  `Object.create(null)` objects at every level (state, `modules`,
  `answers`, `exercises`, and an outcome record), and confirms it imports
  successfully.

  9 new tests in `tests/dom-behavior.mjs`: the four reproduced
  counterexamples above; a state whose `exercises` is a `Set` and,
  separately, whose `modules` is a `RegExp` in the same test (a `RegExp`
  instance owns a non-enumerable `lastIndex` property, so it is
  independently caught by `hasOnlyOwnDataProperties()` too — confirming
  the two defenses are not redundant with each other for every exotic
  type); the `Symbol.toStringTag`-spoofing case; an outcome record whose
  `c` field is an accessor (getter) that legally returns a different value
  on a second read; and the null-prototype-acceptance positive test.
  Additionally, one existing test ("a state object with required fields
  only on its prototype is rejected, not read through the prototype
  chain") was rebuilt to use a null-prototype intermediate object (rather
  than an ordinary plain-object-literal prototype), since a plain-object
  prototype now makes the whole chain two levels deep and gets correctly
  rejected by `isRecordObject()` before the OWNERSHIP check it was written
  to isolate is ever reached — a new companion test
  ("...whose prototype chain is deeper than a plain record...") covers
  that now-earlier rejection path explicitly, so no coverage was lost, and
  the original test still isolates the specific ownership-only exploit it
  was written for.
- **Mutation-tested:** two mutations, each reverted and confirmed
  byte-identical via `diff`: (1) weakening `isRecordObject()` to accept
  any non-array object failed exactly the four exotic-built-in tests and
  none of the own-data-property tests; (2) weakening
  `hasOnlyOwnDataProperties()` to always return `true` failed exactly the
  three own-property-shape tests (non-enumerable extra, accessor `c`,
  symbol key) and none of the exotic-built-in tests — confirming neither
  check is redundant with the other.
- **Cause:** Same root cause as this entry's first addendum and QL-005's
  addendum: `isPlainObject()`'s original check and the exact-shape checks
  built on `Object.keys()` were both correct for every fixture any
  existing test constructed (ordinary object literals, JSON round-trips),
  because nothing had yet tried to construct an object that is
  `typeof === 'object'` yet not record-shaped, or an own property that
  `Object.keys()` cannot see.
- **Correct action:** Same discipline restated once more, now across four
  independent findings in this one file: a validator's job is to resist
  input its own author did not think to construct, so audit each
  primitive JavaScript check it relies on (`typeof x === 'object'`,
  `Object.keys()`, property access) against what that primitive actually
  guarantees versus what the surrounding code assumes it guarantees, and
  construct the gap directly rather than trusting that existing tests
  would have caught it.
- **Prevention:** `docs/ARCHITECTURE.md` and `docs/VALIDATION.md` updated
  to document the record-object requirement, the null-prototype
  acceptance decision, and the corrected test/mutation-test record;
  `CHANGELOG.md` updated with the corrected test and mutation counts.

## QL-007 — A test instrument produced a false defect report

- **Status:** Corrected before any product change was made
- **Finding:** The new DOM harness initially reported that dynamically created
  exercise option buttons lacked `type="button"`. The course correctly sets
  `button.type = "button"`; the harness did not yet reflect that property to the
  underlying attribute as a browser does.
- **Impact:** None shipped. Trusting the report would have produced a pointless
  product edit and a changelog entry for a defect that did not exist.
- **Cause:** A partial DOM fixture was briefly treated as an oracle before its
  browser-model fidelity was checked.
- **Correct action:** Confirm unexpected findings against product source and a
  real browser before changing the product.
- **Correction:** Added `type` property/attribute reflection and correct
  text-to-`innerHTML` escaping to the harness; `index.html` was not modified.
- **Prevention:** Keep harness scope limits explicit, mutation-check critical
  paths, and add fixture-fidelity assertions when a product behavior depends on
  a modeled browser contract.

## QL-008 — Initial Playwright suite authoring produced false failures, not product defects

- **Status:** Corrected before any product change was made
- **Finding:** While authoring `tests/e2e/` (Playwright/Chromium), several
  tests initially failed at the narrow/mobile viewport project. Causes:
  (1) `page.addInitScript` re-seeds `localStorage` on every navigation in a
  page, including the reload the Reset control itself triggers, which
  silently re-wrote the very keys Reset had just cleared and made a working
  Reset look broken; (2) at 390px width the open sidebar visually overlaps
  most of the full-screen backdrop and the fixed topbar header overlaps its
  top strip, so a default center-point click on the backdrop landed on
  those elements instead; (3) a scroll-to-module test clicked a sidebar nav
  link without first opening the mobile nav, and the link is off-canvas
  (`transform: translateX(-105%)`) until opened.
- **Impact:** None shipped; `index.html` was not modified. Trusting these
  first-run failures would have produced an incorrect Reset regression claim
  and pointless product edits for the backdrop/nav-link cases.
- **Cause:** The test instrument itself was new and not yet proven; real
  browser geometry, overlapping fixed-position layers, and reload-scoped
  init scripts were not accounted for on the first pass.
- **Correct action:** Reproduce unexpected failures with a minimal isolated
  script before concluding the product regressed; fix the test's seeding and
  targeting strategy rather than the product.
- **Correction:** Reset/migration tests that need to trigger a subsequent
  reload now seed `localStorage` via `page.evaluate` after one `goto` plus
  one `reload`, not `addInitScript`, so nothing re-seeds on Reset's own
  reload. Backdrop clicks target an explicit on-screen point clear of the
  sidebar and header. Tests that click sidebar nav links open the mobile
  toggle first when it is the visible affordance. All 18 Playwright checks
  now pass at both the desktop and narrow/mobile viewport across repeated
  runs.
- **Prevention:** When a real-browser test seeds storage and the flow under
  test reloads the page, seed with `evaluate` + one explicit `reload`, not
  `addInitScript`, unless "first load" behavior is specifically what is
  under test. At narrow viewports, expect fixed-position layers (headers,
  open sidebars) to overlap default click targets and aim clicks explicitly.

### Addendum — import/export test shared storage with its own source page

- **Status:** Corrected in independent review of PR #5, before merge
- **Finding:** The `exportJSON`/`importJSON` round-trip test opened its
  "fresh" destination page with `context.newPage()`. `localStorage` is
  partitioned per `BrowserContext` + origin, not per page, so that second
  page shared the exact storage partition the first page had already
  written module-completion and answer state into. The test asserted the
  destination showed the exported progress after calling `importJSON()`,
  but that assertion would have passed identically even if `importJSON()`
  silently did nothing, because the state was already present in shared
  storage before import ran. The test was green and looked like it proved
  import restores progress; it actually proved nothing about import at all.
- **Impact:** None shipped; `index.html` was not modified. This was a latent
  false-confidence risk in the test suite itself: a passing check that did
  not exercise the behavior its name claimed to.
- **Cause:** `context.newPage()` reads as "a fresh page" but is not "fresh
  storage" — the two are easy to conflate, and nothing in the test made the
  shared partition visible.
- **Correct action:** Before asserting an import restores state, first
  assert the destination has zero/undefined progress, so the test would
  fail loudly if storage were ever inadvertently shared again.
- **Correction:** The destination now comes from `browser.newContext()` — a
  genuinely separate storage partition — and the test asserts `#tpLabel`
  reads "0 of 17 modules complete" and the target answer is `undefined`
  immediately after that context's first load, *before* calling
  `importJSON()`. Only then does it import and assert the exported progress
  is restored.
- **Prevention:** Any real-browser test claiming to prove cross-instance
  persistence, import, or migration must assert the destination's clean
  starting state before the action under test runs, not just the end state
  after. A test that only checks the end state cannot distinguish "the
  action worked" from "the state was already there."

## QL-009 — Recording a CI run as "current" inside a commit is self-invalidating

- **Status:** Corrected
- **Finding:** `docs/CLAUDE_HANDOFF.md` described a specific commit as "the
  current branch head" and its GitHub Actions run as "the authoritative
  current CI result." The act of committing that wording produced a newer
  head and a newer CI run, so the claim was already stale the moment it
  merged into the branch's history — a document cannot correctly describe
  itself as reflecting the branch's live state, because committing it is
  itself a branch change.
- **Impact:** None shipped; no product or test behavior was affected. A
  future reader could be misled into treating a specific old run ID as
  "current" indefinitely, when live status was only ever a PR or Actions
  page away.
- **Cause:** Conflating two different kinds of fact: a stable, timeless
  claim ("commit X was verified by run Y") with a time-relative claim
  ("this is the current state"), which decays the instant it's written down.
- **Correct action:** Record which commit a specific CI run verified, as a
  fixed historical fact, and separately tell the reader to consult GitHub
  for live status rather than trust any run ID recorded in a document.
- **Correction:** Reworded both references in `docs/CLAUDE_HANDOFF.md` to
  say a named commit is a "post-correction implementation checkpoint" that a
  named run "verified," with explicit instruction to check the PR or GitHub
  Actions for the branch's actual current status. Removed "current branch
  head" and "authoritative current CI result" phrasing.
- **Prevention:** Document CI results as fixed checkpoints ("commit X, run
  Y, verified Z") tied to a specific commit, never as "current" or "latest."
  Point readers to GitHub (the PR, the Actions tab) for live status instead
  of asserting it in committed prose.

## QL-010 — Six confirmed accessibility defects found by automated WCAG scanning

- **Status:** Corrected on branch `claude/issue-1-accessibility-baseline`
  (Issue #1)
- **Finding:** An initial `@axe-core/playwright` scan of the fully rendered
  course found six distinct, independently confirmed defects:
  1. Insufficient color contrast for `--ink-faint` (~213 nodes across
     `.brand-sub`, `.side-title`, `.nav-section`, `.source-note`,
     `.dc-s`/`.dc-state`, and more), `--accent` used as text color, and
     `--ok-ink` against its own background — all below the WCAG AA 4.5:1
     threshold for normal text.
  2. Heading-order violations (22 nodes): the "Learning objectives" `<h4>` in
     all 17 modules, plus five more `<h4>`s (the final-exam quiz-head, four
     `.grid-card` group headings, and the disclaimer heading) that jumped
     directly from an `<h2>` with no intervening `<h3>`.
  3. Two comparison-table corner cells (`<th></th>`, mosaicism/chimerism and
     interphase/metaphase FISH) carried no accessible text for their
     row-label column.
  4. Instructional/quiz/exercise SVGs rendered with `role="img"` but no
     accessible name, so any visible `<text>` label already inside them was
     invisible to assistive tech.
  5. The 18 scrollable `.tbl-wrap` table containers were not
     keyboard-focusable, so a keyboard user could not scroll a table wider
     than its container.
  6. The skip link's target, `#main`, was not focusable, so keyboard-activating
     "Skip to content" silently returned focus to `<body>` instead of moving
     it into the content. Found while authoring the keyboard-navigation
     suite, not by axe-core (which does not check this).
- **Impact:** A screen-reader or low-vision user would have hit unreadable
  low-contrast text and a confusing heading structure, missed labeled row
  context in two tables, been unable to identify several images, and would
  have had the single most important keyboard shortcut on the page silently
  fail.
- **Cause:** None of the existing structural, DOM-behavior, or Playwright
  smoke suites perform contrast, heading-structure, or accessible-name
  analysis, so these defects were never exercised.
- **Correct action:** Add automated WCAG scanning and representative
  keyboard testing; independently confirm every finding against product
  source before editing `index.html`; apply the narrowest fix that resolves
  the defect without touching scientific content.
- **Correction:** Darkened `--ink-faint`, `--accent`, and `--ok-ink` by the
  minimum amount needed to clear 4.5:1 against every background they appear
  on. Promoted the 22 affected headings to the correct level with a
  same-size CSS override so no visual size/weight changed. Added a
  `.sr-only` label to both empty table corner cells. Added an optional
  `name` parameter to the shared `svgWrap()` helper (threaded through
  `rowCard`/`nucleusCard`/`nucleusRow`/`metaphaseCard`/`karyoLayoutSVG`) that
  exposes an SVG's own already-visible text as its accessible name, or marks
  it `aria-hidden` when it is purely redundant with its adjacent quiz/exercise
  prompt text — no new descriptive content was invented. Added `tabindex="0"`
  to every `.tbl-wrap`. Added `tabindex="-1"` to `#main`. A full re-scan of
  all five axe states plus two additional interaction states (flashcard
  flipped, all modules complete) at both viewports now returns zero
  violations.
- **Prevention:** `tests/e2e/accessibility.spec.mjs` runs this scan on every
  CI push/PR with no rule disabled and no violation filtered. A new axe
  finding must be fixed or recorded here as a specific, justified exception —
  never suppressed to force a green run.

## QL-011 — Two self-caught test-authoring mistakes, corrected before commit

- **Status:** Corrected before any product or committed-test change shipped
- **Finding:** While authoring the accessibility/keyboard suites for Issue #1:
  (1) an initial fix for the `scrollable-region-focusable` axe finding added
  `role="region" aria-label="Scrollable data table"` to all 18 `.tbl-wrap`
  containers; because all 18 shared the identical accessible name, this
  created a new `landmark-unique` violation (18 indistinguishable landmark
  regions) that a full re-scan caught before commit. (2) An initial
  keyboard-navigation assertion assumed that, immediately after opening the
  mobile sidebar, the very next `Tab` press would land on a sidebar
  `.nav-link`; running the test against the real page showed focus actually
  moves to the Print button first, because the hamburger toggle precedes
  Print/Reset in DOM order and tab order follows DOM order, not visual
  position — the test was wrong, not the product.
- **Impact:** None shipped in either case. Trusting either result would have
  produced a pointless "fix" for a landmark-labeling collision introduced by
  the previous fix itself, and a false keyboard-trap defect report against a
  product that has none.
- **Cause:** (1) A fix scoped to one axe rule was applied without re-scanning
  for new violations it might introduce. (2) An assumption about tab order
  was written into an assertion without first confirming actual DOM order in
  the real page.
- **Correct action:** Re-run the full axe scan after every accessibility fix,
  not just the rule being addressed; confirm real browser behavior before
  asserting it in a test, per the same discipline already recorded in
  QL-007/QL-008.
- **Correction:** `.tbl-wrap` now gets only `tabindex="0"` (no `role` or
  `aria-label`), which resolves `scrollable-region-focusable` without
  creating a landmark. The keyboard test now presses `Tab` in a bounded loop
  and asserts a sidebar `.nav-link` is *eventually* reached without focus
  stalling, instead of asserting it is the very next stop.
- **Prevention:** Treat "does this fix introduce a new finding" as part of
  fixing any accessibility violation — re-scan, don't just re-check the one
  rule. Treat an assumption about DOM/tab order as a claim to verify against
  the real page, exactly like any other claimed product behavior.

### Addendum — `locator.focus()` cannot prove Tab-order reachability

- **Status:** Corrected in independent review of PR #6, before merge
- **Finding:** Every test in the original `tests/e2e/keyboard-navigation.spec.mjs`
  that claimed a control was "reachable by Tab" actually used Playwright's
  `locator.focus()` to set focus, then asserted keyboard activation from
  there. `locator.focus()` calls the DOM `HTMLElement.focus()` method
  directly — it succeeds on any focusable element, including one with
  `tabindex="-1"`, which is explicitly *removed* from the sequential
  (Tab-key) focus order by spec. A test written this way would pass
  identically whether or not a real keyboard user could ever reach that
  control by pressing Tab, so it proved keyboard *activation* but not
  keyboard *reachability* — despite test names and prior documentation
  (this log, `docs/VALIDATION.md`) explicitly claiming the latter.
- **Impact:** None shipped to `index.html`; this was a latent
  false-confidence risk in the test suite itself, parallel in kind to the
  QL-008 addendum's shared-storage false pass — a green suite that did not
  prove what its names and the surrounding documentation claimed it proved.
  A future `tabindex="-1"` regression on any of these controls would have
  shipped with this suite still green.
- **Cause:** `locator.focus()` reads, in isolation, like "give this element
  keyboard focus" and is a reasonable-looking shortcut to skip a long,
  fragile-seeming sequence of real Tab presses. The distinction between
  "focusable" and "reachable via sequential Tab navigation" is easy to
  elide when writing the assertion, especially once the test is passing.
- **Correct action:** A test that claims Tab-reachability must drive actual
  `page.keyboard.press("Tab")` input from wherever focus currently is and
  assert the specific target element becomes `document.activeElement`,
  never call `.focus()` to shortcut there. Verified with a mutation check
  before closing this addendum: adding `tabindex="-1"` to the module-1
  mark-complete button caused the corrected test to fail immediately with
  a clear "not reached by natural Tab order" message; the same mutation
  against the original `.focus()`-based test would have passed unchanged.
- **Correction:** Every "reachable by Tab" test now calls a shared
  `tabUntilFocused(page, locator, {max, label})` helper that presses real
  `Tab` keys (bounded, with a descriptive error naming what focus landed on
  instead) until the exact target element is `document.activeElement`,
  before any keyboard activation is attempted. Bounds were set from
  measured real Tab-press counts on the actual page (2–208 presses
  depending on the control's DOM depth), not guessed. Accessible-name
  assertions were also tightened from raw `textContent`/`aria-label`
  presence checks to `toHaveAccessibleName()` against the computed
  accessible name. No test in the corrected file retains programmatic
  focus for any purpose.
- **Prevention:** A test name or doc claim containing "Tab-reachable,"
  "keyboard-reachable," or "keyboard-only" is a specific, checkable claim —
  treat `locator.focus()` anywhere in that test as a sign the claim is not
  actually being tested, and confirm reachability with real `Tab` input
  instead. When in doubt whether a keyboard test proves what it claims,
  mutation-test it: make the specific regression it claims to catch (e.g.
  add `tabindex="-1"`) and confirm the test actually fails.


- **Status:** Corrected in a second independent review of PR #6, before merge
- **Finding:** After the first addendum's fix, the PR body and
  `docs/VALIDATION.md` described the suite as asserting a computed
  accessible name and a visible keyboard-focus outline for every covered
  control. Three specific gaps meant that description was not yet true:
  (1) the skip link had no `toHaveAccessibleName("Skip to content")`
  assertion at all; (2) the exercise option, the exercise Next control,
  Print, and Reset were each reached via real `tabUntilFocused()` but never
  received a visible-focus (outline) check afterward — only a bare
  `toBeFocused()`; (3) the outline checks that did exist verified
  `outline-style` and `outline-width` but never checked `outline-color`, so
  a focus style that was technically non-`none` but fully transparent (and
  therefore still invisible to a sighted keyboard user) would have passed.
- **Impact:** None shipped to `index.html`. As with the addendum above, this
  was documentation overclaiming what the committed instrument actually
  checked — a reader of the PR body or `docs/VALIDATION.md` would
  reasonably have believed Print, Reset, and the exercise controls had
  their focus visibility verified, when they did not.
- **Cause:** The visible-focus check was added ad hoc per test as each one
  was written, rather than as a single shared assertion applied uniformly;
  it was easy to add the reachability proof (`tabUntilFocused`) everywhere
  while only remembering the accompanying visibility proof for some
  controls. The outline-color gap was a narrower version of the same
  problem: the two properties that were checked felt like "the outline
  check," so a third relevant property went unchecked without the
  documentation's claim being narrowed to match.
- **Correct action:** Write one shared assertion for a claim that applies to
  many controls, so adding a new covered control cannot silently omit part
  of the claim; and word documentation claims narrowly enough to match
  exactly what that shared assertion checks.
- **Correction:** Added `assertVisibleFocus(page, locator, {label})`,
  called immediately after `tabUntilFocused()` for every control this file
  or `docs/VALIDATION.md` describes as visibly focused (skip link, m5 nav
  link, hamburger toggle, quiz option, exercise option, exercise Next,
  mark-complete button, Print, Reset). It checks `outline-style !== "none"`,
  `outline-width > 0`, and a non-transparent `outline-color` (rejecting the
  literal `"transparent"` keyword and any `rgba()` value with zero alpha).
  Added the missing `toHaveAccessibleName("Skip to content")` assertion for
  the skip link. Mutation-verified: adding `#printBtn:focus-visible{outline:
  none}` made the Print control's test fail immediately with a clear
  `outline-style` message; reverted before commit.
- **Prevention:** When a claim ("visible focus," "accessible name") is meant
  to apply uniformly across a set of controls, implement it once as a
  shared helper and call it for every member of that set, not per-test —
  otherwise coverage silently narrows to whichever tests happened to
  include the check when it was first written. Word documentation to match
  exactly what the shared helper checks, not what the feature could
  plausibly be assumed to check.

## QL-012 — Deployed-suite authoring: a relative-URL bug and a backwards assertion, both self-caught before commit

- **Status:** Corrected before any commit; no product change
- **Finding:** While authoring `tests/e2e-deployed/` (Issue #1, deployed-Pages
  testing), two mistakes were found and corrected during the first live run
  against `https://jaustinanderson.github.io/cytogenetics-cg-course/`:
  1. Every test called `page.goto("/")`, copied from the local suite's
     convention. Against a `baseURL` that itself has a path segment (a
     GitHub Pages *project* site, not a user/org site), `new URL("/",
     baseURL)` resolves to the origin root and drops the repository path —
     `https://jaustinanderson.github.io/` instead of
     `https://jaustinanderson.github.io/cytogenetics-cg-course/`. Every test
     in the suite failed with a 404 on the first real run, which at first
     read like the deployment itself was broken; a direct `curl` and a raw
     Playwright script against the real URL both returned 200, isolating the
     bug to the relative-URL resolution in the tests, not the product or the
     network. `page.goto("/")` is correct for the local suite only because
     its `baseURL` (`http://127.0.0.1:4173`) has no path component to lose.
  2. A mobile-navigation test asserted
     `expect(openBox.x).toBeLessThan(closedBox.x + 5)` intending to confirm
     the sidebar moved on-canvas after opening. Because `closedBox.x` is a
     large negative off-canvas coordinate, this compared the open position
     against a large negative number and was logically backwards — it failed
     against the real, correctly-behaving page on the very first live run.
- **Impact:** None shipped; both were caught by the deployed suite's own
  first execution against the real live page, before either was committed.
  Trusting either failure without investigating would have produced a false
  "the live deployment is broken" or "mobile nav is broken" report about a
  page that was working correctly.
- **Cause:** (1) Relative-URL resolution against a `baseURL` with an existing
  path is a easy-to-miss WHATWG URL semantics difference from resolving
  against an origin-only `baseURL`, and the local suite's convention was
  copied without re-deriving it for a different kind of base. (2) The
  assertion's direction was written without checking the actual sign/scale of
  the values involved.
- **Correct action:** Run a new test suite against the real target at least
  once before trusting any of its assertions, exactly as required elsewhere
  in this log (QL-007/QL-008); when a brand-new suite fails everywhere on
  first run, suspect the suite before suspecting the product, and confirm
  independently (here, `curl` plus a minimal standalone Playwright script)
  before concluding the deployment itself is at fault.
- **Correction:** All `page.goto("/")` calls in `tests/e2e-deployed/` changed
  to `page.goto("./")`, which resolves against the existing base path instead
  of the origin root (verified with `new URL(...)` directly before editing).
  The backwards comparison was replaced with
  `expect(openBox.x).toBeGreaterThan(closedBox.x)`, i.e. "the open position
  is to the right of the closed position," which is the actual claim being
  made. All 22 scheduled deployed-suite test runs (16 run, 6 intentionally
  skipped per-viewport/per-project) passed after both fixes.
- **Prevention:** When a `baseURL` includes a path (a GitHub Pages project
  site, a subpath deployment, etc.), verify relative-navigation strings with
  `new URL(candidate, baseURL)` before relying on them, rather than reusing a
  root-site convention unchanged. Word boundary-direction assertions
  (`toBeLessThan`/`toBeGreaterThan`) by first writing out the actual expected
  values, not just the comparison operator that "sounds right."

### Mutation-test evidence for the horizontal-overflow assertion

- **Method:** Rather than modify the shipped test file, a standalone
  Playwright script loaded the real live page at the 390x844 project's
  configuration, then used `page.evaluate()` to append a 2000px-wide element
  to `document.body` — simulating an actual CSS regression that would make
  content wider than the viewport — and re-read
  `document.documentElement.scrollWidth` / `clientWidth`.
- **Result:** Before the injected element: not applicable (real page has no
  overflow). After: `scrollWidth` 2000 vs `clientWidth` 390, which the
  committed assertion in `tests/e2e-deployed/mobile-touch-navigation.spec.mjs`
  (`scrollWidth <= clientWidth + 1`) would fail. This confirms the assertion
  actually detects the specific regression it claims to catch, using a
  transient change to the loaded page in an ephemeral browser tab — nothing
  in the repository or the live deployment was modified to run this check.

### Remote-image delivery — observed 2026-07-31, this environment

- **Result:** Both approved remote images completed loading with nonzero
  natural dimensions when tested from this development environment's network:
  Wikimedia Commons NHGRI karyotype 1280x1003, CDC PHIL trisomy-21 karyotype
  700x563. `img.complete` was `true` and `naturalWidth`/`naturalHeight` were
  both nonzero for each — the stronger check this suite specifically added
  because `complete` alone becomes `true` on a failed load too, not only a
  successful one.
- **Scope:** This is one successful observation, from one network, at one
  point in time. It supersedes the earlier "cloud test browser did not
  complete either request" note in `docs/VALIDATION.md`'s 2026-07-30 entry
  for *this* environment, but does not establish delivery from GitHub
  Actions' runners or any other network — see `docs/VALIDATION.md` for the
  full non-claim. `tests/e2e-deployed/remote-images.spec.mjs` re-checks this
  on every run it is given network access to.
- **Update, 2026-07-31 (asset localization):** both images are now committed
  to `assets/images/` and served from the page's own origin rather than
  Wikimedia/CDC at runtime (see `docs/ROADMAP.md` and
  `docs/VALIDATION.md` "Asset localization"). The test file above was
  renamed to `tests/e2e-deployed/local-images.spec.mjs` and now also asserts
  same-origin delivery; the local suite gained an equivalent
  `tests/e2e/local-images.spec.mjs` check that no longer depends on outbound
  network access at all. The dimensions above (1280x1003, 700x563) are
  unchanged — the localized files are byte-identical to what was previously
  fetched remotely.

## QL-013 — Independent review of QL-012's work: an overclaim corrected, a claim verified before acting on it

- **Status:** Corrected; no product change
- **Finding:** An independent review of the branch introduced in QL-012 found
  four issues, three of which were real and are corrected here:
  1. `scripts/verify-deployed-revision.mjs` claimed to verify "the deployed
     revision" using only the GitHub deployments API. That API proves GitHub
     *registered a successful build for a given commit SHA* — it does not by
     itself prove the bytes `DEPLOYED_BASE_URL` returns *right now* are those
     bytes (CDN caching, propagation delay, and a custom domain routed
     elsewhere can all make the API record and the live response disagree).
     The wording did not distinguish these.
  2. The workflow (`.github/workflows/deployed-smoke.yml`) requested only
     `contents: read`, with no explicit permission scoped to the deployments
     API it actually calls, and only the deployment-list request's failures
     were retried — a transient failure from the deployment-*status* request
     was unhandled and would have crashed the whole script with a stack trace
     instead of a bounded retry.
  3. `DEPLOYED_BASE_URL` (used by the Playwright suite) and the URL implicitly
     assumed by the revision verifier were never explicitly bound to each
     other, so overriding one without the other could silently verify one
     target while testing a different one.
  4. (Reported, not confirmed as stated) That `tests/e2e-deployed/quiz-and-
     persistence.spec.mjs`'s manually created `browser.newContext()` "does
     not automatically inherit the project baseURL," and that this made
     `page.goto("./")` inside it unreliable.
- **Investigation before changing anything:** Per the standing rule already
  established in this log (QL-007/QL-008/QL-011 — confirm an unexpected or
  reported claim against real behavior before trusting it), finding 4 was
  checked directly rather than assumed. A minimal standalone script
  (`chromium.launch()` + `browser.newContext()` with no options + `page.goto
  ("./")`, no `@playwright/test` runner involved) reproduced the *general*
  claim: without a runner, a manually created context genuinely does not
  know about any `baseURL` and the navigation fails outright
  (`Cannot navigate to invalid URL`). But re-running the *actual* committed
  test file, and a minimal reproduction added temporarily under
  `tests/e2e-deployed/` and removed again immediately after, showed
  `page.goto("./")` inside a manually created `browser.newContext()`
  resolving correctly to the live deployed URL. Tracing
  `@playwright/test`'s own source
  (`node_modules/playwright/lib/index.js`, the `runBeforeCreateBrowserContext`
  instrumentation hook wired to a test's `_combinedContextOptions`) confirmed
  why: the Playwright Test runner installs a client instrumentation listener,
  for the lifetime of each test, that merges the config's `use` options
  (`baseURL`, `viewport`, `hasTouch`, etc.) into **any** `newContext()` call
  made during that test — including a manual one — for any option the caller
  did not already specify. So the specific claim as stated was not accurate
  for this codebase's actual test runner; the general intuition behind it
  (a raw, unmanaged `Browser.newContext()` has no implicit baseURL) is true,
  but doesn't apply here because `@playwright/test` is managing the context.
- **Impact:** None shipped incorrectly as a result of finding 4 — the
  original test was not broken in the way described. Trusting the claim
  without checking it would have added a misleading "fix" description (and,
  worse, a misleading `docs/QUALITY_LOG.md`/`docs/VALIDATION.md` entry
  asserting a defect that was never real) — exactly the kind of unverified
  claim this log exists to catch, whichever direction it comes from.
- **Correct action:** Verify a specific, checkable claim about tooling
  behavior against that tooling's actual behavior and source before
  recording it as a defect or changing code to "fix" it — the same
  discipline already applied to claims about the product (QL-007, QL-008)
  and about DOM/tab order (QL-011), extended here to a claim about the test
  runner itself. Separately, apply the *recommended fix* anyway where it adds
  real, independent value regardless of whether the stated cause was
  accurate.
- **Correction:**
  1. `scripts/verify-deployed-revision.mjs` now requires **both** the
     deployments-API match (commit SHA + `state: success`) **and** a
     SHA-256 comparison of a cache-busted, no-cache fetch of
     `DEPLOYED_BASE_URL`'s live `index.html` against the checked-out
     `index.html`, and its comments/log output state precisely what each
     check does and does not prove — including the explicit case where
     `index.html` is byte-identical across commits (true for every commit in
     this branch), where the hash alone cannot distinguish which commit is
     live. See `docs/VALIDATION.md` "Protecting against a stale deployment"
     for the full scope statement and real verification results (both checks
     agreeing on `main`'s HEAD; a mismatched-SHA run correctly timing out; a
     mismatched-URL run correctly warning and then failing).
  2. `.github/workflows/deployed-smoke.yml` now requests `deployments: read`
     alongside `contents: read`, and the verifier's per-attempt loop wraps
     the deployment-list request, the deployment-status request, and the
     live-hash fetch in one shared try/catch, so a transient failure from
     any of the three triggers the same bounded retry instead of an
     unhandled crash.
  3. The workflow now binds `DEPLOYED_BASE_URL` once at job level so the
     revision-verification step and the Playwright suite step are
     guaranteed to target the same URL. The verifier also derives the
     canonical `owner.github.io/repo/` URL from `GITHUB_REPOSITORY` and
     prints an explicit warning when `DEPLOYED_BASE_URL` doesn't match it —
     a custom domain/CNAME for the *same* repository is a legitimate,
     expected mismatch; a different fork or repository being tested without
     also overriding `GITHUB_REPOSITORY`/`TARGET_SHA` is not, and is now
     surfaced rather than silently "verified."
  4. `tests/e2e-deployed/quiz-and-persistence.spec.mjs`'s isolated-context
     test now obtains the `baseURL` fixture and passes it explicitly —
     `browser.newContext({ baseURL })` — and asserts, immediately after
     `page.goto("./")`, that `page.url()`'s origin and path equal the
     expected `baseURL`'s. This does not depend on whether a reader
     understands or trusts the instrumentation behavior described above,
     and it independently guards against the test silently passing against
     the wrong target if that behavior ever changes, a config typo points
     `baseURL` somewhere unintended, or a future Playwright version stops
     merging context options into manually created contexts.
  5. `tests/verify-deployed-revision.mjs` (part of `npm test`, loopback-only,
     no external network) adds focused checks: identical content hashes
     match, different content hashes differ, and a local HTTP server
     standing in for "the live URL" is fetched with a distinct cache-busting
     query parameter on every call. A deliberate mutation removing the
     cache-busting parameter made the corresponding test fail with a clear
     message; reverted before commit.
- **Prevention:** When a review (or any source) reports "X does not work the
  way you think," check X directly against real behavior before writing a
  fix or a log entry — the same standing rule already in this file, now
  explicitly extended to claims about the test framework's own behavior, not
  only the product or the test's assumptions about DOM/tab order. Separately:
  a verification script's job is to state exactly what it establishes: name
  each distinct check, state what each one does and does not prove on its
  own, and say so in both the code comments and the user-facing log output —
  not only in a document a reader might not open.

## QL-014 — An image-optimization tool defaulted to lossy output; caught before committing the asset

- **Status:** Corrected before commit; no degraded asset shipped
- **Finding:** While generating `docs/assets/course-overview.png` for the
  README (Issue #1), the raw Playwright capture (389,650 bytes) was passed
  through `sharp-cli` (fetched on demand via `npx`, not a project dependency)
  for lossless size reduction. The first attempt used
  `--compressionLevel 9 --effort 6` with no other flags and produced a much
  smaller file (122,166 bytes), but decoding both images to raw pixel
  buffers and comparing them byte-for-byte showed they were **not**
  identical: 6.08% of bytes differed, by up to 25 out of 255. Checking each
  image's metadata explained why: the "optimized" output had
  `isPalette: true` while the original did not — `sharp-cli`'s PNG encoder
  defaults to quantizing to a 256-color indexed palette, which is a lossy
  transformation (color reduction/dithering), not a size-only re-encode.
- **Impact:** None shipped — the discrepancy was caught by comparing raw
  decoded buffers before the optimized file was copied into `docs/assets/`.
  Had it been trusted on file-size improvement alone, the committed
  screenshot would have had subtly altered colors (most visible as banding
  in the hero section's gradient background or softened anti-aliased text
  edges), silently, with no error or warning from the tool.
- **Cause:** A general-purpose image CLI's default behavior favors smaller
  files over pixel fidelity unless told otherwise; "optimize this PNG"
  without further qualification does not obviously imply "and quantize its
  colors," but that's what happened. Trusting a size reduction as evidence
  of a safe, lossless operation, without checking pixel content, would have
  been the same category of mistake this log already warns against for
  test-authoring claims (QL-007, QL-008, QL-013) — here applied to a build
  tool's output instead of a test's assertion.
- **Correct action:** Before trusting any transformation's output — a test
  result, a tool's claim, or in this case an "optimized" asset — verify the
  specific property being relied on (here: pixel-for-pixel equivalence)
  directly, not by proxy (here: file size alone).
- **Correction:** Re-ran with `--palette=false` added; the result
  (286,140 bytes, still a genuine ~27% reduction from the raw capture) was
  re-verified as byte-for-byte identical to the raw capture when both were
  decoded to raw pixel buffers, before being committed. The verification
  method and command are documented directly in
  `scripts/capture-readme-screenshot.mjs`'s header comment and
  `docs/VALIDATION.md`, so a future re-generation repeats the same check
  rather than trusting file size as a proxy for losslessness.
- **Prevention:** When optimizing any binary asset for size, verify losslessness
  by comparing decoded content (raw pixel buffers for images), not by
  file-size reduction alone or by assuming a tool's default settings are
  safe; record the exact flags required to keep a given tool lossless so the
  step is reproducible without rediscovering the same default.
- **Update:** The screenshot was regenerated again after the dashboard-card
  layout fix below (QL-016) and a recalculated, shorter capture height, so
  the exact byte counts above describe an intermediate version that was
  never committed. The same `--palette=false` verification was re-run
  against the final image and again confirmed pixel-identical before commit
  — see QL-016 for the current figures (raw 383,090 bytes; optimized
  280,149 bytes, ~27% reduction). The methodology finding above (verify
  losslessness directly, don't trust file size or tool defaults) is
  unaffected by which specific capture it was first demonstrated against.

## QL-015 — Reproducibility evidence used file-size equality, not a real comparison

- **Status:** Corrected before commit
- **Finding:** An earlier record of this screenshot work claimed the capture
  script was reproducible because running it twice produced files of the
  *same size* (389,650 bytes both times). Identical file size is not
  evidence of identical content — two different PNGs (different pixels,
  different metadata, different internal chunk ordering) can coincidentally
  share a byte count, and nothing about the check actually inspected the
  bytes themselves.
- **Impact:** None shipped incorrectly — the underlying capture genuinely
  was reproducible in this environment, so the conclusion happened to be
  right, but the evidence offered for it was not actually proof. Recording
  an unverified inference as if it were a checked fact is the same category
  of mistake this log tracks elsewhere (QL-002, QL-004), regardless of
  whether the conclusion turns out correct.
- **Cause:** File size is an easy, cheap signal to compare and was
  available immediately from `ls -la`; reaching for it instead of an actual
  content comparison substitutes a proxy for the real property being
  claimed.
- **Correct action:** When claiming two artifacts are identical, compare
  their actual content (a cryptographic hash of the bytes, or a decoded
  pixel-buffer comparison for images), not a derived property like size
  that merely correlates with content in the common case.
- **Correction:** Re-ran `npm run capture:readme-screenshot` twice and
  compared `sha256sum` output for the resulting file both times; both runs
  produced the identical hash
  (`a81201a670cf64f7457111a5df011e00e802ea568a5e562f3f362c510d63261a`),
  which is a real, checkable claim. `docs/VALIDATION.md` and this log now
  state plainly that this is same-environment reproducibility evidence
  only — not a claim that the script (or the separate, optional
  `sharp-cli` optimization step) produces byte-identical output across
  different OS/Chromium/font environments, which font hinting and
  rendering differences could legitimately change.
- **Prevention:** Prefer a cryptographic hash or decoded-content comparison
  over file size whenever "these two things are the same" is the actual
  claim being made; word any reproducibility claim to name the exact scope
  it was verified under (here: this environment, this Chromium build, this
  font availability) rather than an unqualified "reproducible."

## QL-016 — Confirmed dashboard-card layout defect, exposed by the committed screenshot

- **Status:** Corrected on branch `claude/issue-1-readme-screenshot`
  (Issue #1); no scientific content changed
- **Finding:** Independent review of the committed `docs/assets/
  course-overview.png` identified a real, visible layout defect in every
  one of the 17 progress-dashboard cards: the module title ran directly
  into "Module N" on one line (e.g. "How to use this courseModule 1"
  instead of two separate lines), and the "To do"/"Done" status text had
  no protection against wrapping.
- **Confirmed against `index.html` before changing anything** (per the
  standing discipline in this log): the title/subtitle wrapper `<span>`
  generated at the dashboard-card template (`grid.innerHTML = MODULES.map
  (...)`) had no class and no CSS applied to it, so its two children
  (`.dc-t`, `.dc-s`), both plain inline `<span>`s with no layout rules of
  their own, rendered on the same line by default. Separately, `.dc-state`
  had `margin-left:auto` but neither `flex:0 0 auto` nor
  `white-space:nowrap`, so at a narrow width it could shrink and wrap its
  two words onto separate lines.
- **Impact:** Every dashboard card was affected — this was the single most
  visible element in the very screenshot meant to showcase the product,
  not a rare edge case. Anyone viewing the README screenshot (or the real
  page) would see concatenated, harder-to-read card text.
- **Cause:** The wrapper span was written without a class at the time the
  dashboard-card template was authored; nothing in the structural
  validator, the DOM behavior suite, or the axe-core/keyboard suites checks
  visual line arrangement, so this had no automated coverage in any
  existing test.
- **Correct action:** Fix the product with the narrowest change that
  resolves the defect without touching scientific content or unrelated
  styling, verify it with real bounding-box measurements at both desktop
  and narrow viewports (not visual inspection alone), and add a committed
  regression test.
- **Correction:** `index.html`:
  - `.dash-cell .dc-body{flex:1 1 auto;min-width:0;display:flex;
    flex-direction:column;gap:.15rem}` added, and the dashboard-card
    template's wrapper span now carries `class="dc-body"`
  - `.dash-cell .dc-t`/`.dc-s` gained explicit `display:block`
  - `.dc-state` gained `flex:0 0 auto;white-space:nowrap`
  - Verified by real bounding-box measurement at 1440px and 390px: the
    subtitle now starts at or below the title's bottom edge (on its own
    line) and the status text's box stays within a single computed
    line-height, at both widths, for the first card and (via the new test
    below) all 17
- **New test:** `tests/e2e/dashboard-layout.spec.mjs` (6 runs across both
  Playwright projects, part of `npm run test:e2e`) asserts, via bounding
  boxes and computed line-height — not pixel snapshots — that all 17 cards
  render, that every card's title/subtitle are on separate non-overlapping
  lines, and that the status text neither overlaps the title nor wraps, at
  both viewports. Mutation-verified: temporarily reverting both the CSS
  and the template's `class="dc-body"` back to the pre-fix state made 4 of
  the 6 test runs fail immediately, each naming the specific overlap/line
  violation it caught; reverted before commit.
- **Screenshot regenerated and height recalculated:** the fix actually
  made dashboard rows *shorter* on average (the pre-fix concatenated text
  had wrapped across more lines than the corrected two-line layout), so
  the previous capture height (1500px, chosen before this fix) was
  re-measured rather than assumed still correct. An intermediate capture
  at 1500px was visually inspected and found to cut into module 1's own
  header — a real, avoidable defect in the capture itself, caught before
  committing it. The final height (1430px) was chosen from a fresh
  measurement: the dashboard now ends at ~1415.8px and module 1 begins at
  ~1441.4px, so 1430 shows the complete dashboard with a small margin and
  stops cleanly before any module content.
- **Prevention:** A screenshot is also a review surface — visually
  inspecting a generated artifact before committing it can surface real
  product defects the automated suites don't check (here: line
  arrangement/wrapping, which none of the structural, DOM-behavior,
  axe-core, or keyboard suites evaluate). When a generated artifact's
  dimensions depend on a product layout that changes, re-measure rather
  than assume the previous constant is still correct.

## QL-017 — The documented pixel-verification command was not portable to a clean clone

- **Status:** Corrected before commit; no product/screenshot change
- **Finding:** Independent review found that the optional lossless-PNG
  verification command documented in
  `scripts/capture-readme-screenshot.mjs`'s header comment invoked
  `node -e 'const sharp = require("sharp"); ...'` as its own separate
  process, entirely apart from the preceding `npx --yes --package=sharp-cli`
  step. `sharp` (the library) is not a project dependency — only
  `sharp-cli` (a different package, fetched ephemerally by that `npx` call
  purely for its own CLI use) was ever available, and nothing makes the
  `sharp` library resolvable to a plain `node -e` invoked afterward.
- **Reproduced directly, in this environment, before changing anything**:
  confirmed no global or local `sharp` was reachable
  (`node -e 'console.log(require.resolve("sharp"))'` from the repo root
  failed with `Error: Cannot find module 'sharp'`), then ran the exact
  documented command block verbatim and got the identical failure at the
  verification step, immediately after the `sharp-cli` re-encode step had
  already completed successfully — confirming the bug was specifically in
  the second command, not the first.
- **A second bug found while fixing the first**: the natural first fix
  attempt — have `sharp-cli` itself write a `--format raw` file so `cmp`
  could compare it directly, avoiding `sharp`/Node entirely — turned out
  not to be supported by the installed `sharp-cli` version's `-o`
  file-output path (`Unsupported output format ...` for every extension
  tried, including a literal `.raw` file path). While testing an
  alternative, a second, unrelated portability bug surfaced: the
  documented re-encode command pointed `sharp-cli`'s `-o` flag at a fixed
  path (`/tmp/png-opt`) that the surrounding documentation never created.
  `sharp-cli` only treats `-o` as "a directory to write
  `<input-basename>` into" when that directory *already exists on disk*;
  pointing it at a path that does not yet exist makes it write a single
  literal *file* at that exact path instead, with no error — reproduced by
  removing `/tmp/png-opt` first and observing a 280,149-byte PNG land at
  the literal path `/tmp/png-opt` (a file, not a directory) instead of
  `/tmp/png-opt/course-overview.png`.
- **Impact:** None shipped — both were caught by literally executing the
  documented commands end-to-end before trusting them, not by inspection
  alone. Had either shipped uncorrected: the first would make the
  documented optimization workflow fail outright for anyone without a
  coincidentally-available global `sharp`, including on a genuinely clean
  clone; the second would silently produce a same-sized but wrongly-placed
  file that a copy-pasted next step (reading
  `"$OPT_TMP/course-overview.png"`) would fail to find, or — worse, on a
  machine where `/tmp/png-opt` happened to already exist as a directory
  from unrelated prior state — would appear to work while being entirely
  dependent on that undocumented precondition.
- **Cause:** (1) The verification command was written and tested in a
  session that happened to have `sharp` available from unrelated prior
  work in that same environment (an ad hoc scratch install used earlier
  while developing this feature), so the missing-dependency failure was
  never actually observed before being documented as a command anyone could
  run. (2) The re-encode command's `-o /tmp/png-opt` was copied from an
  interactive session where that directory had already been created by an
  earlier, unrelated `mkdir`/prior run — the command "worked" there for a
  reason the documented text itself did not create or mention.
- **Correct action:** Execute a documented command sequence exactly as
  written, from a genuinely clean state (no assumed pre-existing
  directories, no assumed pre-installed packages), before publishing it as
  something a reader can copy-paste — the same discipline this log already
  applies to test claims and tool defaults (QL-007, QL-008, QL-013,
  QL-014), extended here to documentation itself.
- **Correction:** Rewrote the documented block in
  `scripts/capture-readme-screenshot.mjs`:
  - `export OPT_TMP=$(mktemp -d)` replaces the fixed `/tmp/png-opt`, so the
    `sharp-cli` re-encode always writes into a directory guaranteed to
    exist, regardless of the machine's prior `/tmp` state
  - the verification step installs `sharp` into its own isolated temporary
    directory (`SHARP_TMP=$(mktemp -d); npm install --no-save --prefix
    "$SHARP_TMP" sharp`) and points `NODE_PATH` at
    `"$SHARP_TMP/node_modules"`, so `require("sharp")` resolves without
    ever adding `sharp` to this repository's `package.json` — confirmed by
    checking `git diff --stat package.json package-lock.json` showed no
    change after running the full sequence
  - both temporary directories are removed at the end
    (`rm -rf "$SHARP_TMP" "$OPT_TMP"`)
  - the full, corrected sequence was then executed end-to-end, in one
    shell session (so the `export`ed `OPT_TMP` was actually visible to the
    child `node` process — a separate detail worth naming, since shell
    state does not carry across independently-invoked shells), from a
    clean state: the re-encode succeeded, the isolated install succeeded
    (`added 11 packages`), the verification printed
    `pixel-identical: true`, the committed asset was replaced, and both
    temporary directories were confirmed gone afterward. The resulting
    `docs/assets/course-overview.png` hash
    (`c5f9bf8162e1376bce957b2d11f53f7cfa9a25fa5dcabeead6994135661523a7`)
    is identical to the asset already committed — this correction changed
    only the documentation/tooling, not the product, the screenshot, or
    any scientific content
- **Prevention:** A one-off "fetched via npx, not a dependency" tool and
  the *library* underlying it are not automatically the same thing —
  `npx --package=X` only makes `X`'s own CLI available, not an arbitrary
  library of the same name or from the same publisher, for a separately
  invoked process. When a documented command needs a Node library
  specifically (not a CLI), and that library is intentionally not a
  project dependency, resolve it through an isolated, explicitly-scoped
  install (`npm install --no-save --prefix <tmpdir>` plus `NODE_PATH`),
  not an unqualified `require()` that depends on whatever happens to be
  globally or ambiently available in the environment where it was
  authored. Separately: any command that depends on a directory already
  existing should create that directory itself (`mktemp -d`), not assume
  the reader's environment happens to have it.

## QL-018 — A quoted source was misattributed while drafting the scientific-review record

- **Status:** Corrected before commit; nothing incorrect shipped
- **Finding:** While drafting `docs/SCIENTIFIC_REVIEW.md` (Issue #1), a
  draft passage quoted the phrase "Structurally validated beta; full
  scientific and accessibility review is in progress" and attributed it to
  `README.md`'s current beta-status blockquote. Checking the actual text of
  both files before committing showed that phrase does not appear in
  `README.md` at all — it is `docs/VALIDATION.md`'s "Release language"
  section, describing *recommended future release wording*, not the
  project's current status text. `README.md`'s actual current blockquote
  reads: "Status: beta baseline. The application is functional and
  structurally validated. The full question bank has not yet completed a
  documented, question-by-question scientific review for public release."
- **Impact:** None shipped — caught by `grep`-verifying the exact quoted
  text against both files before committing, not after. Had it shipped, a
  document whose entire purpose is recording accurate, evidence-based
  status would have contained an inaccurate quotation about the project's
  own current status — a direct contradiction of its own stated standard.
- **Cause:** Both passages are short, thematically similar sentences about
  the same beta/review status, drafted from memory of prior reading in this
  session rather than re-checked against the source files at the moment of
  writing the quote.
- **Correct action:** Verify any quoted text against the literal source
  file at the time of writing it down, especially in a document whose
  purpose is asserting what is and is not established — the same standing
  discipline this log already applies to test claims, tool defaults, and
  documented commands (QL-007, QL-008, QL-013, QL-014, QL-017), extended
  here to quotations.
- **Correction:** Reworded the passage to quote `README.md`'s actual
  current text, and added a separate sentence correctly attributing the
  "Structurally validated beta..." phrase to `docs/VALIDATION.md`'s
  Release language section as future-release guidance, not current status.
- **Prevention:** Any quotation in committed documentation should be
  produced by copying the literal source text (or grep-verified against
  it) at the point of writing, not reproduced from recollection of an
  earlier read in the same session.

## QL-019 — Independent review found claim-to-evidence and terminology problems in the scientific-review record

- **Status:** Corrected on branch `claude/issue-1-scientific-review-status`
  (Issue #1), before merge; no scientific content changed
- **Finding:** Independent review of `docs/SCIENTIFIC_REVIEW.md` (QL-018's
  document) found five distinct problems, none of them scientific-content
  errors but all of them exactly the kind of claim-to-evidence gap this
  document exists to prevent everywhere else in the repository:
  1. The "Five separate review types" section stated it "only speaks to
     the first and third rows" of a five-row table. That ordinal reference
     did not correspond to any consistent pairing a reader could verify
     against the table — it was true only if the reader guessed which
     rows the author meant, which defeats the purpose of a document whose
     entire value is being independently checkable.
  2. `docs/CONTENT_GOVERNANCE.md` defines **SME-reviewed** specifically as
     review **by Austin**. The new document silently broadened this to
     "a named subject-matter expert" in its own restatement of the four
     content states, and used "independently reviewed" throughout without
     ever reconciling the two — a documentation task had, without
     authorization or discussion, redefined a piece of project governance
     policy.
  3. The document implied the course's current 33/91/14/10 question
     distribution was itself "Source-checked" against the ASCP BOC
     guideline. Source-checked, per `docs/CONTENT_GOVERNANCE.md`, means an
     identified authoritative source exists — it does not mean the
     content has been validated against that source. The guideline being
     dated and cited is a fact about the guideline; whether the current
     distribution falls within its ranges is a separate, mechanically
     measured comparison, and (per `README.md`'s own "Course coverage"
     table, already committed before this document existed) three of the
     four domains currently fall *outside* their published ranges. The
     original wording did not surface that.
  4. The inventory summary read "153 questions... across 17 modules, plus
     a 42-question... pool," which a reader could parse as 153 module
     questions with 42 more on top (195 total) rather than the intended
     153 = 111 (modules) + 42 (pool).
  5. The structural check added by QL-018 only confirmed each module ID
     appeared somewhere in the document's text — it did not verify titles,
     per-module counts, the final-pool row, or that the numbers reconciled
     to the live total, despite the document's surrounding prose reading
     as though the table were fully verified against live data.
- **Impact:** None shipped to `index.html` or any scientific content —
  every issue was in the documentation layer describing review status, not
  in the underlying (already honestly "Draft") content itself. The impact
  was to the document's own credibility: a record whose stated purpose is
  precise, evidence-backed claims about review status contained an
  unverifiable ordinal reference, a silent governance-policy change, and
  an overclaimed source-checked scope — exactly the categories of error
  the document exists to catch in the *course content*, now found in the
  document about the course content.
- **Cause:** (1) and (4) were imprecise prose written without re-reading
  the table/arithmetic it described. (2) came from generalizing
  `docs/CONTENT_GOVERNANCE.md`'s specific, named definition into more
  generic language without checking the source definition first — the
  same category of drift QL-013 already logged for a different claim
  ("independently reviewed" reads as an obviously correct phrase in
  isolation, which made it easy to use loosely without checking it against
  the one place project policy actually defines the adjacent term
  "SME-reviewed"). (3) conflated "a source exists and is cited" with "the
  content matches the source" — two different claims that share the word
  "checked." (5) was scoped to what was easy to implement first (existence
  of an ID substring) rather than to what the document's own prose claimed
  the check established.
- **Correct action:** State claims using the same names/definitions as
  their authoritative source (`docs/CONTENT_GOVERNANCE.md` for content
  states) rather than paraphrasing them; keep a "Source-checked" claim
  scoped to exactly what was checked (the source's existence/currency, not
  content conformance to it) unless conformance was also actually
  verified; and make a structural check's claims and its actual assertions
  match exactly — the same discipline QL-005/QL-006's open items and
  QL-011's second addendum already establish for other parts of this
  repository, extended here to a document about review status itself.
- **Correction:**
  1. Rewrote the row-explanation to name review types directly
     ("Scientific/content review and Source/provenance review") instead of
     ordinal row numbers, so the claim cannot silently drift out of sync
     with the table again.
  2. Reproduced `docs/CONTENT_GOVERNANCE.md`'s SME-reviewed definition
     verbatim and added an explicit three-way distinction: authored
     content (Draft) vs. Austin's documented SME review (satisfies the
     current SME-reviewed state) vs. independent second-person review (a
     stronger claim SME-reviewed as currently defined does not require).
     States plainly that a future Austin review would satisfy SME-reviewed
     but would not itself be independent second-person review. Added a
     matching rule to the reusable review-log format: recording
     SME-reviewed requires the Reviewer field to be Austin; any other
     reviewer must be logged and labeled as independent second-person
     review instead.
  3. Narrowed the source-checked claim to the guideline's domain names and
     published ranges only, and added the actual current-share-vs-range
     comparison table (reproduced from `README.md`) with the explicit
     statement that only specimen is within range while analysis,
     molecular, and operations are not.
  4. Reworded the inventory summary to "153 total questions: 111 assigned
     across the 17 modules, plus the separate 42-question final cumulative
     pool," with the arithmetic (111 + 42 = 153) stated explicitly.
  5. Replaced the existence-only structural check in
     `tests/validate-course.mjs` with a real table parser that verifies:
     the module-ID set exactly equals the live `getModules()` set (no
     missing module, no stale extra row); every table title equals
     `module.short`; every per-module count equals
     `getQuestions(module.id).length`; exactly one final-pool row exists
     with a count equal to `getQuestions("final").length`; and module
     counts plus the final-pool count reconcile to the live total question
     count. The per-module table's "Title" column was switched from the
     fuller `<h2>` heading text to the exact `module.short` string, so the
     title comparison is an exact string match rather than an
     approximation the test would have to fuzz.
  6. Mutation-verified against the corrected check: a missing module row,
     a stale extra module row (a fabricated "m18"), an incorrect module
     title, and an incorrect question count were each introduced
     one at a time; each failed with a Node `assert` `actual`/`expected`
     mismatch naming the specific problem (e.g. the module-ID-set
     comparison for the missing/extra-row cases, the title string for the
     wrong-title case, the count for the wrong-count case). A fifth
     mutation (wrong final-pool count) was also verified. All were fully
     reverted before commit; `npm test` passed cleanly afterward.
- **Prevention:** When a new document restates or summarizes definitions
  that already exist elsewhere in the repository (content states, review
  scope, terminology), reproduce them verbatim or link to them — do not
  paraphrase from memory, because paraphrasing is exactly how a silent
  policy change or scope-broadening slips in unnoticed. When a structural
  check's surrounding prose claims it verifies something specific (titles,
  counts, reconciliation), the check's actual assertions must cover that
  exact claim, verified by mutation-testing each specific claim
  separately — not just the easiest sub-claim to implement first.

### Addendum — a second independent pass found the ID-set check itself was gameable

- **Status:** Corrected before merge, same branch
- **Finding:** A second independent review of the corrected check (item 5
  above) found it still had two gaps, both in the same
  "verify what the prose claims" category as the original finding:
  1. **Duplicate rows went undetected.** The check compared module IDs as
     `Set`s (`new Set(moduleRows.map(...))`) and looked them up via a
     `Map`. Both collapse duplicate keys silently — a table with the m9
     row listed twice would produce the same ID `Set` and the same `Map`
     lookup result as a table with it listed once, so nothing about the
     "matches the live module set" comparison could ever notice the
     duplication, no matter how many extra copies of a row existed.
  2. **The final-pool row was identified too loosely.** It was defined as
     "any row whose Module cell doesn't match `m<number>`," so a renamed
     or entirely fabricated non-module identifier with a coincidentally
     correct question count would be silently accepted as *the* pool row
     — and the pool row's own title was never checked at all.
- **Impact:** None shipped — caught by review before merge, not by the
  check failing in CI on real content. Had either gap gone uncorrected, a
  future edit that duplicated a module row, or renamed/mistyped the pool
  identifier while keeping the right count, would have passed a check
  whose own name and surrounding prose claimed to catch exactly that.
- **Correct action:** When a check's purpose is "detect an exact-count or
  exact-identity mismatch," verify count and identity with assertions that
  cannot silently absorb a duplicate (array length compared to `Set` size,
  not `Set` membership alone) or a substitute (an exact identifier match,
  not "doesn't look like the other category").
- **Correction:** Added, in `tests/validate-course.mjs`: (a) an assertion
  that the table's total row count equals the live module count plus
  exactly one; (b) an assertion that the module-row count alone equals the
  live module count; (c) an explicit uniqueness check comparing the parsed
  module-ID array's length against a `Set` built from it, before
  constructing the `Map` used for per-module lookups; (d) the final-pool
  row is now matched by the exact Module-cell string `*(pool)*` rather
  than "not shaped like `m<number>`"; (e) a new assertion that the
  final-pool row's title is exactly `"Final cumulative exam"`. The
  existing live-count and full-total reconciliation checks were kept
  unchanged. Mutation-verified: a duplicated module row, a renamed
  final-pool identifier, and a changed final-pool title were each
  introduced separately and each failed with a distinct, correctly-located
  assertion (row-count mismatch, pool-row-count mismatch, and title
  mismatch respectively); all three were fully reverted before commit.
- **Prevention:** For any check built on `Set`/`Map` deduplication, ask
  explicitly whether the property being verified is "this set of distinct
  values is correct" (which `Set` equality suffices for) or "this exact
  list of rows is correct" (which requires a length/count assertion first,
  since `Set`/`Map` construction is where duplicates silently vanish). For
  any check that identifies "the one row that isn't the others" by
  exclusion, prefer identifying it by an exact, positive match instead —
  exclusion-based identification accepts anything that merely fails to
  look like the excluded category, which is a much weaker claim than the
  surrounding prose usually intends.

## QL-020 — Five confirmed visual/responsive defects, found and fixed on a real page before editing

- **Status:** Corrected on branch `claude/issue-11-visual-polish` (Issue #11)
- **Finding:** Before making any change, each reported defect was independently
  measured against the real rendered page (local static server, real
  Chromium, `document.querySelector(...).getBoundingClientRect()` /
  `getComputedStyle(...)`), per the standing discipline in this log
  (QL-007/QL-008/QL-013) of confirming an unverified claim against real
  behavior before trusting it. All five were confirmed real:
  1. Five `<figure class="fig imgneeded">` blocks in Modules 8–12 rendered
     internal authoring/search text ("Image needed: ...", suggested Wikimedia
     search terms) directly in the learner-facing page.
  2. Figure 8.1's embedded karyotype image rendered at 796.8×624.8px at a
     1440px-wide desktop viewport — 81.3% of the content column's width and
     69.4% of the viewport's height, before any caption is visible.
  3. `figcaption` rendered at 13.12px, `.src` at 11.84px, and `.lic` at
     10.88px (16px root font).
  4. A module paragraph's rendered width was 830.8px at 1440px — well past a
     65–75ch reading measure at this font size.
  5. At 390×844 and 360×800, `.brand`'s wrapping `<span>` (holding
     `.brand-name`/`.brand-sub`) had no `min-width:0` of its own; as a flex
     item its default `min-width:auto` refused to shrink below its
     ~232px-wide text content, so the brand name visually overlapped/ran
     into the Print button. Screenshots at both widths confirmed the visible
     truncation/overlap before any CSS changed.
- **Impact:** None shipped incorrectly — all five were confirmed with direct
  measurement before `index.html` changed, so no fix was applied to a
  suspected-but-unreal defect. Left uncorrected, a learner would have seen
  raw authoring instructions, an oversized image dominating a full screen
  before its caption, small/faint source text, wide-uncomfortable prose
  lines, and a header where the course name visually collided with Print.
- **Cause:** These are rendering/layout properties (image size, font size,
  measure, flex shrink behavior) that none of the structural validator, the
  DOM behavior suite, axe-core, or the keyboard suite evaluate — the same
  category of coverage gap QL-016 already found for dashboard-card layout.
- **Correct action:** Measure the specific property each report claims
  (rendered pixel dimensions, computed font size, bounding-box overlap) on
  the real page before changing `index.html`, then fix narrowly and
  re-measure to confirm.
- **Correction:**
  1. Removed all five `.imgneeded` placeholder figures from Modules 8–12.
     Where the surrounding lesson text, tables, or ISCN strings did not
     already stand alone, one short explanatory sentence was added in the
     placeholder's place (no fabricated, generated, downloaded, or
     newly-embedded imagery — only the two already-approved local images
     remain embedded). Reworded the "Image credits & licensing" section's
     two remaining "Image needed" references to describe the same unfilled
     candidates without shipping search instructions in the learner UI. The
     `IMAGES` data manifest (19 records, 2 embedded / 17 needed) is
     unchanged — this is a DOM/UI change, not a change to the provenance
     record `docs/ROADMAP.md` Milestone 2B still governs.
  2. `.fig-media img` gained `max-height:min(52vh,460px)` (with
     `width:auto;height:auto` preserving aspect ratio alongside the existing
     `max-width:100%`), capping figure 8.1 to 586.5×460px (51.1% of a 900px
     viewport height) without cropping or distorting it.
  3. `figcaption` raised to `.92rem`/1.5 line-height, `.src` to `.85rem` and
     recolored from `--ink-faint` to the already-AA-passing `--ink-soft`,
     `.lic` to `.78rem` — measured after the change at 14.72px/13.6px
     respectively (16px root).
  4. Global `p{max-width:70ch}` added; a module paragraph's rendered width
     dropped from 830.8px to 700px at 1440px, while table/quiz/exercise
     containers (which use `div`/`td`, not `p`) were confirmed unaffected.
  5. Added a `.brand-text` wrapper class (`min-width:0;overflow:hidden`) and
     made `.brand`/`.brand-name` shrink-and-ellipsis correctly; at
     ≤560px, `.topbar-actions .btn span` is hidden and each button gained an
     explicit `aria-label` (`"Print"`/`"Reset"`) matching its visible text,
     so hiding the label visually does not remove the accessible name.
     Re-measured after the fix at 390px and 360px: `brand.right` (299.2 /
     269.2) no longer exceeds `topbar-actions.x` (307.2 / 277.2) at either
     width, and a full-page screenshot at both confirmed no visible overlap.
- **New tests:** `tests/e2e/visual-polish.spec.mjs` (40 runs across both
  Playwright projects) asserts, via real bounding boxes/computed styles —
  not pixel snapshots: no page-level horizontal overflow at 1440×900,
  1280×900, 768×1024, 390×844, and 360×800; no header-control overlap or
  viewport clipping at the three narrower widths; the hamburger, Print, and
  Reset controls are reachable by real `Tab` presses, keep their accessible
  name, and are `.tap()`-operable; zero `.imgneeded` elements and zero
  "Image needed" text at any tested width; both embedded figures stay within
  60% of the viewport height and never exceed the viewport width, at all
  five widths; each figure's caption sits within 40px of its image (still
  visually attached); caption/`.src` font sizes stay at or above a 14px/13px
  floor; and a module paragraph stays under 85% of the content column's
  width while its sibling table and quiz keep the full content width.
- **Prevention:** Same standing rule this log already applies elsewhere,
  extended to layout/typography claims: measure the specific rendered
  property on the real page before and after a layout fix, not just
  "looks better."

### Addendum — independent review of draft PR #12 found four issues, corrected before merge

- **Status:** Corrected on the same branch, before merge
- **Finding:** Independent review of the draft PR found:
  1. **An overclaimed "no scientific text changed" statement.** The original
     placeholder-removal work (correction above) replaced three of the five
     "Image needed" figures in Modules 8–10 with newly written explanatory
     sentences — e.g. stating a normal female karyogram is 46,XX, and giving
     specific band-count figures (~400/~550–850 bands) for band resolution.
     These are new scientific explanations, not quotations of pre-existing
     course text, despite the PR describing the change as not touching
     scientific content.
  2. **The mobile-header accessibility test was vacuous for two of its three
     claimed controls.** `tests/e2e/visual-polish.spec.mjs`'s "essential
     controls stay accessible" test proved real Tab-order reachability and
     touch (`.tap()`) operation only for the hamburger. For Print and Reset
     it only checked `toBeVisible()`/`toHaveAccessibleName()` — never a real
     `Tab`-press walk, a visible-focus check, keyboard activation, or a
     touch interaction — despite the surrounding documentation implying all
     three controls were equally proven.
  3. **The global `p{max-width:70ch}` rule reached further than intended.**
     It applied to every `<p>` in the document, including
     `.source-note`, `.callout p`, `.case-body p`, and `.grid-card p` — this
     was the actual, confirmed cause of the README-screenshot layout shift
     recorded in the main QL-020 entry above (the weighting chart's
     `.source-note` paragraph got narrowed and re-wrapped), not a
     coincidence. Component paragraphs with their own established width
     (callouts, case studies, quick-reference cards, source notes) should
     not have been affected by a prose reading-measure change at all.
  4. **Visual evidence was scratchpad-only.** Before/after screenshots
     existed only in the session's temporary scratchpad directory, not
     accessible to an independent reviewer of the PR.
- **Impact:** None shipped to a merged `main` — all four were caught on the
  open draft PR before merge. Had they gone uncorrected: a documentation
  claim central to this repository's scientific-content governance
  (`docs/CONTENT_GOVERNANCE.md`) would have been false; two of three header
  controls' keyboard/touch accessibility would have been asserted but not
  actually verified, the same category of gap QL-011's addendum already
  found and corrected once for a different suite; and a future author could
  have widened the reading-measure rule further, trusting the existing test
  suite to catch collateral narrowing, when it did not check for it at all.
- **Correct action:** For finding 1, apply the same discipline
  `docs/CONTENT_GOVERNANCE.md` already requires of all course content: new
  scientific explanation is Draft until reviewed, and this visual-polish
  task is not the place to introduce any. For finding 2, apply the standing
  QL-011 rule (a claim of Tab-reachability or touch-operability must be
  backed by the same proof for every control the claim covers, not just
  one). For finding 3, scope a CSS rule to what it is actually meant to
  affect, verified by checking real matched elements, not assumed from the
  rule's simplicity. For finding 4, use a form of evidence an independent
  reviewer can actually open without needing this environment's local
  filesystem.
- **Correction:**
  1. Removed all three added sentences from Modules 8–10, leaving pure
     placeholder deletions in all five modules (8–12) — identical treatment
     to Modules 11–12, which never had replacement prose. Verified via
     `git diff` against the pre-visual-polish baseline (`b3bc3a8`) that
     every added line is CSS/markup/accessibility-attribute-only and every
     removed line is placeholder/authoring-instruction text, none of it
     course-content prose.
  2. Rewrote the header-accessibility tests in
     `tests/e2e/visual-polish.spec.mjs` into three independent tests
     (hamburger, Print, Reset), each duplicating the same
     `tabUntilFocused()`/`assertVisibleFocus()` helpers
     `tests/e2e/keyboard-navigation.spec.mjs` already uses (an independent
     copy, not a cross-file import, matching the existing
     `tests/e2e`/`tests/e2e-deployed` independence convention). Each test
     proves real Tab reachability, a visible focus outline, keyboard
     activation (`Enter`), and touch activation (`.tap()`) for its control;
     the Reset test additionally seeds a disposable completed-module state
     via a real UI click, reloads, and verifies both a keyboard-driven and a
     touch-driven Reset actually clear it back to "0 of 17 modules
     complete". Mutation-tested: added `tabindex="-1"` to `#printBtn`,
     re-ran the Print test in isolation, and it failed immediately with
     `tabUntilFocused: "Print control" was not reached by natural Tab order
     within 15 presses. Focus ended on a.nav-link.`; reverted, confirmed
     `git diff index.html` showed no `tabindex` remaining, and the test
     passed again.
  3. Replaced the global `p{max-width:70ch}` rule with
     `.module p:not(.callout p):not(.case-body p):not(.grid-card p):
     not(.source-note){max-width:70ch}`, derived from a real-DOM survey (via
     `Element.closest()` in a live Chromium page, not a regex heuristic)
     of every `<p>` in the document and its true nearest component
     ancestor — 32 paragraphs are genuine narrative lesson prose (correctly
     capped); the rest (callouts, case-body, grid-card, source-note, plus
     everything outside any `.module` — hero, disclaimer, credits) are now
     provably untouched. Two new regression tests in
     `tests/e2e/visual-polish.spec.mjs` check a genuine module paragraph
     against `getComputedStyle(...).maxWidth` for five representative
     protected components. Re-measuring `#dashboardGrid`'s bottom edge
     after this fix showed it returned to exactly the original ~1415.8px
     (from the ~1463.0px the unscoped rule had produced), so
     `docs/assets/course-overview.png` was reverted to the exact
     pre-visual-polish committed file (`git checkout b3bc3a8 --
     docs/assets/course-overview.png`, confirmed by matching SHA-256)
     rather than kept as a regenerated-but-now-unnecessary replacement.
  4. Published a self-contained HTML evidence page (real before/after
     screenshots and the mutation-test transcript, no external asset
     requests) as a hosted Artifact, linked from the PR description, so an
     independent reviewer can open it directly.
- **Prevention:** Treat "no scientific content changed" as a specific,
  checkable claim requiring a real diff review before stating it, the same
  discipline this log already applies to quotations (QL-018) and validation
  claims generally. Treat a test suite's own claims about what it proves
  (Tab-reachable, visibly focused, touch-operable) as requiring the same
  proof for every control the claim names, not just the first one written.
  When a CSS rule's selector is broader than its intent, verify the exact
  set of matched elements against a real DOM before trusting a global
  selector's simplicity.

## QL-021 — Quiz/exercise progressive disclosure: measured density claim, and two real defects caught before shipping

- **Status:** Corrected on branch `claude/issue-11-progressive-disclosure`, before merge (Issue #11)
- **Finding:** Before choosing a design, the actual rendered behavior was
  measured directly (not assumed): at 1440×900, quiz and exercise widgets
  together accounted for 46.6% of the document's total scroll height
  (110,209px), with 636 answer buttons (`.qopt`/`.eopt`) simultaneously
  present and focusable on a single fresh page load — the concrete,
  measured shape of the "overwhelming density" Issue #1 named. Every quiz
  (`buildQuiz`) and exercise (`buildExercise`) widget, plus the six static
  `<div class="exer">` mount points, was converted to a native
  `<details>`/`<summary>` element, collapsed by default, following the
  same disclosure pattern already established in this course for
  case-study reveal cards (`details.card`). While implementing and testing
  this, two real defects were found and fixed before commit, plus one
  test-harness incompatibility caught the same way:
  1. **A confirmed WCAG AA contrast failure**, found by the existing
     `tests/e2e/accessibility.spec.mjs` axe-core scan on the very first run
     against the new markup (including the unmodified "freshly loaded
     course" state, which does not even open a disclosure): the new
     `.qh-meta`/`.eh-meta` summary text used `--ink-faint` (`#637181`) on
     the `--primary-050`/`--iscn-bg` summary backgrounds, measuring 4.41:1
     and 4.31:1 against the 4.5:1 AA threshold for normal text.
  2. **A confirmed print-exposure defect, in both the new code and a
     pre-existing case-study pattern.** The first implementation added
     `body.printmode .quiz-body,.exer-body{display:block !important}`,
     mirroring the existing (pre-existing, not introduced here)
     `details.card>.card-body{display:block !important}` print rule. A
     mutation test on this rule passed unexpectedly, which prompted
     checking the mechanism directly with
     `page.emulateMedia({ media: 'print' })` rather than trusting a
     `getComputedStyle().display` check — and found that closed
     `<details>` content is suppressed by Chromium via an internal
     rendering behavior, not a plain `display` value: `getComputedStyle
     (...).display` reports `"block"` for content inside a closed
     `<details>`, and `getBoundingClientRect()` on that content returns a
     real, nonzero-but-stale layout box, while the content is genuinely
     not painted, not hit-testable, and not visible under real print-media
     emulation. This meant the `.card-body` print override — already
     present in this codebase before this work — never actually worked
     either; it was a latent, unverified defect this investigation
     happened to surface, not something introduced by this change.
  3. **A dependency-free-harness incompatibility**, caught by
     `npm run test:behavior` immediately after adding the real fix: the
     initial fix used `element.dataset.printReopened`, but
     `tests/dom-harness.mjs`'s minimal `Node` class (intentionally
     implementing only the DOM surface the course actually uses) has no
     `dataset` getter, so the print test crashed with `Cannot set
     properties of undefined`.
- **Impact:** None shipped — all three were caught by the project's own
  committed test suites or by direct verification before any commit. Had
  finding 1 shipped, the disclosure summary text would have failed WCAG AA
  contrast on every one of the 17 quiz and 6 exercise widgets, all now
  visible on first paint (they were not previously flagged because the
  text did not exist before this change). Had finding 2 shipped as
  originally written, printing the course would have silently omitted
  every quiz and exercise question — the exact opposite of the "print
  output must expose all educational content regardless of on-screen
  collapsed state" requirement — while the test guarding it would have
  falsely reported success, and the same pre-existing gap for case-study
  cards would have remained unnoticed and undocumented.
- **Correct action:** Apply the same standing discipline this log already
  uses throughout (QL-007/008/013/014): a test passing unexpectedly is as
  worth investigating as one failing unexpectedly, and a claim about
  what a CSS override achieves must be checked against the real rendering
  behavior it depends on (here, real print-media emulation), not a proxy
  (computed `display`) that turned out not to track it.
- **Correction:**
  1. Changed `.qh-meta`/`.eh-meta` from `--ink-faint` to `--ink-soft`
     (`#46596d`), verified at 6.39:1 and 6.23:1 against their respective
     backgrounds — comfortably clear of the 4.5:1 threshold, not just
     barely passing. Re-ran the full axe-core suite (all 5 states, both
     viewports): zero violations.
  2. Replaced the CSS-only print override with a JavaScript fix in the
     existing `beforeprint`/`afterprint` handlers (`wirePrintReset()`):
     `beforeprint` records each `<details>` element's real prior state via
     a `data-print-reopened` attribute (not `.dataset`, for harness
     compatibility) and force-sets `.open = true`; `afterprint` restores
     each one's genuine prior state and removes the marker attribute. This
     is a correct fix precisely because it sets the real `open` property
     rather than fighting the internal suppression with CSS, and it
     uniformly covers `details.card` (fixing the pre-existing gap as a
     side effect), `.quiz`, and `.exer` with one mechanism. Verified with
     real `page.emulateMedia({ media: 'print' })` (not computed-style
     checks) that: a closed quiz's questions/options are genuinely visible
     and present under print media; a closed exercise's current
     prompt/options are genuinely visible; a pre-existing closed
     case-study `details.card` is also genuinely visible; and a disclosure
     that was already open before printing (a genuine prior user action)
     remains open afterward, not force-closed.
  3. Switched the two attribute accesses from `.dataset.printReopened` to
     `setAttribute('data-print-reopened', …)`/`getAttribute(…)`/
     `removeAttribute(…)`, already fully supported by the existing harness
     with no harness changes needed. `npm run test:behavior` passed
     36/36 again.
- **Measured result:** Re-measuring after the fix, on the same real page,
  at the same viewports: document height dropped from 110,209px to
  60,386px at 1440×900 (-45.2%), 114,441px to 65,478px at 768×1024
  (-42.8%), and 149,545px to 98,373px at 390×844 (-34.2%); quiz/exercise
  share of document height dropped from 44–47% to 2.3–2.5%; and visible
  answer buttons on a fresh load dropped from 636 to 0 (provably, via a
  `.quiz[open] .qopt`/`.exer[open] .eopt` selector — 0 widgets are open by
  default). See the published before/after evidence artifact linked from
  the PR description for screenshots and the full measurement table.
- **New tests:** `tests/e2e/progressive-disclosure.spec.mjs` covers default
  collapsed state with informative summaries, click/keyboard/touch
  expand-and-collapse, status persisting visibly while collapsed, that
  opening/closing never touches stored progress or fires a `progress`
  event, reload behavior (disclosure resets, recorded answer data does
  not), Reset, and print exposure (including the case-study regression
  check and the already-open-stays-open check). Existing suites
  (`quiz-and-exercise`, `accessibility`, `api-print-console`, `init`,
  `keyboard-navigation` locally; `identity-and-console`,
  `quiz-and-persistence` in `tests/e2e-deployed/`) were updated to open the
  relevant disclosure before interacting with content inside it, via a
  small `openDisclosure()` fixture helper (an independent copy in each
  suite's own `fixtures.mjs`, matching this repository's existing
  local/deployed suite-independence convention).
- **Mutation-tested:** removed the `beforeprint` force-open loop entirely;
  the print-exposure test failed immediately with `expect(locator).
  toBeVisible() failed ... Received: hidden`; reverted, confirmed
  `git diff index.html` showed no remaining change, and the test passed
  again.
- **Prevention:** When a CSS override for a "make hidden content visible"
  claim is added, verify it against the actual rendering mode it targets
  (real print-media emulation for print CSS, not a computed-style proxy)
  before trusting it — the same standing discipline this log applies
  elsewhere, now specifically naming `<details>` content suppression as a
  case where `display`/`getBoundingClientRect()` do not reliably reflect
  true visibility, unlike ordinary `display:none` toggles.

### Addendum — independent review of draft PR #13 found a blocking defect: collapsed summaries disagreed with persisted progress

- **Status:** Corrected on the same branch, before merge
- **Finding:** Independent review reproduced, against the exact commit
  `eb5ee8be2ff8d481a18825934f8f4578bd71437e`: a fresh quiz summary correctly
  read "Not started — 0 / 5"; answering one question correctly updated it
  to "In progress — 1 / 5" within the same session; but reloading the page
  reset the summary to "Not started — 0 / 5" even though
  `getProgress().answers` still held the correct, persisted record for
  that question. The first exercise behaved identically. Root cause:
  `buildQuiz`/`buildExercise` always initialized `score = 0, answered = 0`
  (or the equivalent local closure variables) unconditionally on every
  render, never reading `state.answers`/`state.exercises` first — a
  regression this progressive-disclosure change newly exposed, because the
  collapsed summary is now the learner's primary (often only-visible)
  status indicator, not a pre-existing limitation that could be dismissed
  the way the per-question visual lock-state gap already was.
  Independently reproduced before making any change, per the standing
  discipline in this log: fresh → "Not started | 0/5"; answered → "In
  progress | 1/5"; reload → back to "Not started | 0/5" while
  `getProgress().answers` correctly showed `{"c":true,"n":1,...}` for the
  answered question, and the equivalent exercise mismatch, confirmed the
  same way.
- **Impact:** None shipped to a merged `main` — caught on the open draft
  PR before merge. Had it shipped, every learner who left and returned to
  a quiz or exercise (the normal way anyone resumes studying) would have
  seen "Not started" on content they had already partially or fully
  completed, directly contradicting the actual, correctly-persisted
  progress data one API call away — exactly the "unclear collapsed state"
  outcome this feature's own stated requirements said to avoid.
- **Correct action:** Derive the initial summary status/score from the
  existing `state.answers`/`state.exercises` records on every render,
  the same source of truth `getStats()`/`getUnmastered()` already use, and
  handle a reattempt (only reachable across a reload, since a locked item
  cannot be clicked twice within one render) by replacing the prior
  result rather than double-counting the item as newly answered.
- **Correction:**
  1. `buildQuiz` now seeds `answered`/`score` by scanning `qs` and reading
     `state.answers[item.id]` for each question before building any
     markup — read-only, no `recordAnswer`/`saveProgress` call, so loading
     a quiz with existing records never fires a `progress` event.
     `buildExercise` does the equivalent, keyed by the same
     `key + '-' + (i+1)` id `recordExercise` already writes.
  2. A shared `summaryStatus(answeredCount, total)` helper (`total<=0 ||
     answeredCount<=0` → "Not started"; `answeredCount>=total` →
     "Completed"; else "In progress") replaces the two independent inline
     ternaries, so the initial render and every later update use
     identical status logic.
  3. Both click handlers now read `state.answers[data.id]` /
     `state.exercises[thisId]` *before* calling `recordAnswer`/
     `recordExercise` (which overwrites it), to determine whether this
     item already had a record (`wasCounted`) and, if so, whether it was
     previously correct (`wasCorrect`). Score is adjusted by the delta
     between the old and new correctness (`+1` wrong→right, `-1`
     right→wrong, unchanged same→same); `answered`/`answeredCount` is
     incremented only when `!wasCounted`, so a reattempt updates the score
     to the latest result without counting the question as newly
     answered a second time.
  4. Verified directly (not just via the new automated tests) with a
     manual reproduction script covering fresh → answered → reload
     (partial) → reattempt with the opposite correctness → complete → reload
     (completed) → Reset, confirming each state exactly matches the
     required behavior, including the score correctly decrementing on a
     correct→wrong reattempt without the distinct-question count changing.
- **New tests, `tests/e2e/progressive-disclosure.spec.mjs`:**
  - Rewrote the quiz reload test (previously asserted "Not started" after
    reload, which was actually asserting the bug) to expect "In progress"
    and the correct score; added the equivalent exercise reload test.
  - Added dedicated "fully answered" (Completed) reload coverage for both
    quiz and exercise, not just "partially answered."
  - Added a reattempt test for both quiz and exercise: answer once, reload,
    answer the *same* item again with the opposite correctness, and assert
    the score reflects only the latest result while exactly one distinct
    item id is recorded (`Object.keys(...).length === 1`) and its stored
    attempt count (`n`) is `2`, not a fresh `1`.
  - Added a load-time test that seeds `localStorage` with fixed-value
    sentinel records (`ts`/`n` set to arbitrary, checkable constants)
    before navigation, then asserts those exact values are byte-for-byte
    unchanged after load (proving the seeding code only reads, never
    writes) and that zero `progress` events fire from either the load or
    from toggling every disclosure on the page afterward.
  - Removed `"singular item counts read naturally"`: it evaluated a copy
    of the pluralization ternary inline in the test itself and asserted
    against that copy, never touching `buildQuiz`/`buildExercise` or the
    rendered DOM at all — a vacuous test that could not have caught a
    regression in the real template. No real quiz or exercise in this
    course has exactly one item, and the public API provides no way to
    construct one, so there is no way to exercise this branch against
    real product code without modifying the product; removed rather than
    kept as false coverage.
- **Mutation-tested:** temporarily reduced `buildQuiz`'s seeding loop to a
  no-op (the exact pre-fix behavior). Four distinct tests failed
  immediately across both projects (8 runs) with specific, correctly
  diagnostic messages: the partial-reload test reported `Expected: "In
  progress", Received: "Not started"`; the completed-reload test reported
  `Expected: "Completed", Received: "Not started"`; the sentinel-seed test
  failed on the derived summary text; and the reattempt test — reachable
  only because the *other* tests already prove seeding is broken — reported
  a revealing `Received: "-1 / 6"` (the reattempt's score-decrement logic
  correctly fired for a wrongly-assumed-absent prior record, going
  negative), an even clearer signal than a simple mismatch. Reverted;
  confirmed `git diff index.html` showed no remaining change and all
  tests passed again.
- **The PR's browser find-in-page claim was unverified and has been
  softened.** The PR description stated that native `<details>` gives
  "browser find-in-page support for free" and is "friendlier to find-in-page
  than the old always-expanded markup." This is a real, documented Chromium
  behavior (auto-expanding a closed `<details>` when a find-in-page match
  falls inside it), but it was never actually verified in this repository:
  Playwright automates the page, not the browser's native find UI (no CDP
  surface exposes the find bar), so this claim could not be exercised by
  any test here. The PR body was reworded to describe this as expected
  native `<details>` behavior this repository has not itself verified,
  rather than an established fact.
- **Prevention:** When a UI redesign makes a summary/status element the
  *primary* (often only visible) indicator of state, any pre-existing gap
  in restoring that state from persisted data stops being a dismissible,
  already-known limitation and becomes a newly blocking defect — the
  visibility of the gap changed even though the underlying storage logic
  did not. Re-evaluate every "we already knew about this" claim against
  what is now actually user-visible before waving it through unchanged.

## QL-022 — Figure 9.1 label overlap, and a rejected Figure 10.1 candidate caught by inspecting pixels instead of trusting a filename

- **Status:** Corrected on branch `claude/figure-9-10-quality`, a new,
  separately scoped issue (does not reopen Issue #11)
- **Finding, Figure 9.1:** Confirmed against the live page before any
  change: the three centromere-morphology labels ("Metacentric",
  "Submetacentric", "Acrocentric + satellite") were embedded SVG `<text>`
  elements inside one shared `<svg>` (`rowCard()` with `opt.labels:true`).
  The `viewBox`'s width was computed only from the chromosome drawings'
  geometry (`x`/`W` accumulated from `cfg.w`/`cfg.gap`), never from the
  labels' own rendered text width. At real font sizes this made
  "Metacentric" overlap "Submetacentric" and made "Acrocentric + satellite"
  extend past both the `viewBox`'s right edge and the figure's own visible
  boundary.
- **Impact:** Every visitor to Module 9 at any width saw at least one
  broken or overlapping label in a figure whose entire purpose is teaching
  the visual distinction between the three morphologies.
- **Cause:** SVG `<text>` has no intrinsic wrapping or reflow; a layout
  computed from shape geometry alone cannot account for label width unless
  that width is measured and fed back into the layout, which `rowCard()`
  never did for its `labels:true` mode.
- **Correct action:** Stop laying text out inside the SVG's fixed
  coordinate space entirely — measure/wrap text with the tool built for it
  (the browser's own block-text layout engine), not by hand-tuning SVG
  coordinates to fit a fixed number of known strings, which would only
  re-break at the next relabeling.
- **Correction:** `index.html` gained `chromoOnlySVG()` (a single
  chromosome drawing with no embedded label) and `morphGrid()` (a
  responsive HTML grid of `.morph-item` cards, each pairing one
  `chromoOnlySVG()` output with an ordinary wrapping `.morph-label` `<div>`
  below it). New CSS: `.fig-morph-grid{display:grid;grid-template-columns:
  repeat(auto-fit,minmax(150px,1fr));gap:1rem}`. `auto-fit`/`minmax`
  collapses to one column once three 150px-minimum tracks stop fitting,
  which stacks the three cards vertically at narrow widths without a new
  hard-coded breakpoint. `injectFigures()`'s `#figMorph` mount now calls
  `morphGrid(...)` instead of `rowCard(..., {labels:true})`.
- **Verification:** A standalone (uncommitted) Playwright script measured
  real bounding boxes at all five acceptance-criteria viewports
  (1440×900, 1280×900, 768×1024, 390×844, 360×800) before the committed
  test was written: full label containment, zero pairwise label-box
  intersections, and no `document.documentElement.scrollWidth >
  clientWidth` at any of the five. `tests/e2e/figure-9-1-morphology.spec.mjs`
  (new) commits this permanently. **Mutation-tested**: with the fix
  temporarily reverted (`git stash`, which does not affect the new,
  untracked test file), 10 of 12 test runs failed for the correct reason
  (`.morph-label`/`.morph-item` do not exist in the pre-fix markup, so the
  containment/overlap assertions cannot locate their targets); restoring
  the fix (`git stash pop`) returned all 12 to passing. See
  `docs/VALIDATION.md` "Figure 9.1 label-layout fix and Figure 10.1
  karyogram replacement" for the full record.

- **Finding, Figure 10.1:** The embedded CDC PHIL image (#12504) had
  unacceptable morphology/band detail for a professional study guide:
  heavily thresholded, chromosomes grouped rather than individually
  numbered, and — confirmed by decoding the image and reading its own
  printed group label directly, not assumed from the filename or the
  course's existing caption — the depicted karyotype is a **female**
  (46,XX-derived, 47,XX,+21) specimen, which did not actually match the
  primary `47,XY,+21` worked ISCN example the lesson text presents
  immediately below it.
- **A same-collection candidate was downloaded and visually rejected, not
  filename-trusted:** searching for a replacement surfaced a Wikimedia
  Commons file from the Josef Reischig CC BY-SA archive titled "Human
  karyotype (263 15) ... 47, XY, +21 (Down syndrome).jpg"
  (3,749×2,399px) — a strong-looking candidate by title, resolution, and
  license alone, and an automated page-text summary of its Commons file
  page described it as "an actual karyotype photograph... not a
  schematic." Downloading and actually looking at the decoded image (per
  the standing discipline in this log — QL-007, QL-008, QL-013 — of
  confirming a claim against the real artifact before trusting it, here
  extended to an image's *content* rather than a test's assertion or a
  tool's stated behavior) showed it is a **raw, unsorted metaphase
  spread**: overlapping, unpaired chromosomes scattered across the field,
  with intact interphase nuclei still visible on the same slide — not an
  arranged karyogram at all, despite its filename. It was rejected on that
  basis, confirming this course's own prior note (`docs/ROADMAP.md`
  Milestone 2B, written before this correction) that this specific
  collection's images are metaphase spreads, "not direct replacements for
  a properly arranged karyogram."
- **Impact:** Had the Reischig file been trusted from its filename, page
  description, or an automated text summary of that page alone, this PR
  would have replaced one scientifically misleading image with another —
  a raw, unpaired chromosome spread mislabeled in the course as an
  arranged "karyotype," which is arguably a worse defect than the one
  being fixed, since it actively misrepresents what a karyogram looks
  like to a learner being taught to recognize one.
- **Correct action:** Never select or approve an image asset from its
  filename, upload description, or an AI-generated summary of its listing
  page alone — decode and visually inspect the actual pixel content
  against every stated acceptance criterion (arranged pairs, individually
  numbered chromosomes, interpretable banding, no thresholding/distortion)
  before treating it as a candidate, exactly as this log already requires
  for test claims and tool defaults, extended here to image content.
- **Correction:** Selected Wellcome Collection work `wmcdanw6` ("Down
  syndrome human karyotype 47,XY,+21", Miro image `B0000249`, credit
  "Wessex Reg. Genetics Centre") instead. Verified directly against
  `api.wellcomecollection.org`'s catalogue JSON (not only the
  human-readable page) as `license.id:"cc-by"` with `accessConditions[].
  status.id:"open"`; fetched at full native resolution
  (1176×1158px) via the IIIF Image API
  (`https://iiif.wellcomecollection.org/image/B0000249/full/full/0/default.jpg`).
  Visual inspection confirmed a genuinely arranged G-banded karyogram —
  chromosomes cut, paired, and laid out in numbered rows 1–22 plus X/Y,
  the title "47,XY,+21 TRISOMY 21 (DOWN'S SYNDROME)" printed on the plate
  itself, and an arrow marking the third chromosome-21 copy — with no
  patient name, date of birth, or accession/specimen number visible
  anywhere on the plate. `assets/images/cdc-phil-12504-trisomy21-
  karyotype.jpg` was removed; `assets/images/wellcome-b0000249-
  trisomy21-karyotype-47xy.jpg` was added byte-for-byte as fetched, no
  re-encoding. `index.html`'s Figure 10.1 markup (title, alt text, both
  caption spans, the `img-credits`/`cred` section, and the `IMAGES`
  manifest's `fig10-1` record), `THIRD_PARTY_NOTICES.md`, and every test
  file referencing the old filename (`tests/validate-course.mjs`,
  `tests/e2e/local-images.spec.mjs`,
  `tests/e2e-deployed/local-images.spec.mjs`) were updated together, and
  the full `npm test` plus local `npm run test:e2e` suites (including
  axe-core, both figure-sizing/caption checks, and the new figure-9-1
  suite) were re-run and passed after the change. See
  `THIRD_PARTY_NOTICES.md` and `docs/VALIDATION.md` for the complete
  provenance/license/verification record, including the rejected
  candidate.
- **Prevention:** Extend the existing "confirm before trusting" discipline
  explicitly to image *content*: a filename, an upload title, or a page
  description is a claim about an image, not the image itself, and an
  automated summary of that page inherits the same limitation — it
  describes what the page's text says, not what a human (or a
  cytogenetics reviewer) would see by actually looking at the decoded
  pixels. This applies with extra force to same-collection "near-lookalike"
  candidates, where a superficially matching title is exactly the
  situation most likely to produce a false positive if the actual image
  content is never checked.

## QL-023 — A `{'__proto__':true}`-shaped dangerous-key list never actually contained `__proto__`

- **Status:** Corrected before merge, self-caught while writing the test
  for the exact defense this bug lived in (branch
  `claude/issue-2-import-hardening`, QL-006)
- **Finding:** The first version of `importJSON()`'s dangerous-key defense
  defined its blocklist as an object literal:
  `var DANGEROUS_KEYS = {'__proto__':true, 'constructor':true, 'prototype':true};`,
  checked via `Object.prototype.hasOwnProperty.call(DANGEROUS_KEYS, k)`. A
  bareword or quoted `__proto__:` key in a JS object literal does not
  create an own property when its assigned value is not itself an object
  or `null` — per the object-initializer special-casing in the
  ECMAScript spec, the assignment is a silent no-op in that case. `true`
  is neither an object nor `null`, so `DANGEROUS_KEYS` ended up with only
  `constructor` and `prototype` as real own keys —
  `Object.keys(DANGEROUS_KEYS)` is `['constructor', 'prototype']`, and
  `hasOwnProperty.call(DANGEROUS_KEYS, '__proto__')` is `false`. The
  single most important entry in a three-entry blocklist was silently
  absent the entire time, so `isSafeKey('__proto__')` incorrectly
  returned `true`.
- **Impact:** None shipped — caught while authoring the dedicated test for
  this exact defense, before any commit. Had it shipped, a hostile
  `answers`/`exercises`/`modules` map containing a genuine own `__proto__`
  key (which `JSON.parse` — unlike an object literal or plain bracket
  assignment — really does produce; see the next finding) would have
  passed `isSafeKey()` and reached `out[k] = value` inside
  `normalizeOutcomeMap()`/`normalizeModulesMap()`, which — because `out`
  is an ordinary object inheriting `Object.prototype`'s accessor
  `__proto__` property — would have set `out`'s prototype to attacker-
  controlled data instead of rejecting the import: the one defense this
  whole PR exists to prove actually works would have been a no-op for
  the one key it most needed to catch.
- **Confirmed directly, not assumed, before writing the fix:** reproduced
  in a bare Node one-liner —
  `Object.keys({'__proto__':true,'constructor':true,'prototype':true})`
  returns `['constructor', 'prototype']`, not all three — before touching
  any code, per the standing discipline in this log of confirming an
  unexpected result against real behavior rather than a mental model of
  what "should" happen.
- **Cause:** The same object-literal special-casing this whole PR's
  `__proto__` defense is designed to protect *against* also silently
  broke the definition of the blocklist meant to detect it — an
  unusually self-referential instance of the exact footgun being
  guarded against. `constructor` and `prototype` are not
  special-cased by object-literal syntax (only `__proto__` is), so they
  worked correctly, which made the object-literal approach look
  superficially fine — 2 of 3 keys behaved as expected, masking that the
  most important one didn't.
- **Correct action:** For a small fixed list of dangerous strings being
  checked for membership, use a data structure with no analogous
  special-casing risk — an array checked via `indexOf()`/`includes()` —
  rather than an object whose keys happen to include one of exactly the
  handful of JavaScript identifiers with literal-syntax special meaning.
- **Correction:** Replaced `DANGEROUS_KEYS` with a plain array,
  `['__proto__', 'constructor', 'prototype']`, and `isSafeKey()` with
  `DANGEROUS_KEYS.indexOf(k) === -1`. No object-literal key is ever
  written for any of these three strings anywhere in the fix.
- **A second, related test-authoring mistake caught in the same pass:**
  the first version of the dedicated `__proto__` test itself tried to
  build the hostile fixture as a JS object literal
  (`answers: { "__proto__": {...} }`), which has the identical problem —
  it sets the prototype of that specific object literal instead of
  creating an own property, and `JSON.stringify` then silently drops it
  entirely, so the resulting "hostile" JSON string was actually
  harmless. A second attempt using plain bracket assignment
  (`answers['__proto__'] = {...}`) has the *same* problem for a
  different reason: on an ordinary object, bracket assignment for a key
  named `__proto__` goes through `Object.prototype`'s inherited
  `__proto__` *accessor* (a getter/setter pair), not a normal own-
  property write — confirmed directly with a Node one-liner showing
  `Object.keys()` empty and the prototype silently polluted instead.
  Neither produces what `JSON.parse` produces from real hostile JSON
  text (confirmed as a genuine own property via the same kind of
  one-liner). The committed test instead writes the hostile fixture as a
  raw JSON string and calls `JSON.parse` on it directly to build a
  sanity-check assertion (`Object.keys(parsed.answers)` includes
  `"__proto__"`) before ever calling `importJSON()`, so the test cannot
  silently test nothing the way both JS-source construction attempts did.
- **Mutation-tested:** reverting `DANGEROUS_KEYS` to the broken
  object-literal form made exactly the dedicated `__proto__` test fail
  (`expected rejection, got {"ok":true}`); reverted, confirmed identical
  to the pre-mutation file via `diff`, and the full suite passed again.
- **Prevention:** When a fixed list of strings includes one of
  JavaScript's object-literal-special-cased property names (`__proto__`
  is effectively the only one with real special-casing in this context —
  `constructor`/`prototype` are ordinary keys, but treating all "keys
  that could theoretically collide with something on Object.prototype"
  with the same caution is the safer habit), prefer a data structure
  with no such special-casing (an array, a `Map`, or a
  `Object.create(null)` base plus `Object.defineProperty` for the risky
  entries) over a plain object literal — and when writing a test fixture
  meant to contain such a key, prefer building it via `JSON.parse` of a
  literal JSON string over any JS-source object construction, since both
  object-literal syntax and ordinary bracket assignment are affected by
  the exact same special-casing a hostile-input test is trying to
  exercise.


## QL-024 — Stale question/exercise ID policy defined, and a real contamination bug found and fixed while defining it

- **Status:** Corrected on branch `claude/issue-2-stale-id-policy`
  (Issue #2), before merge.
- **Finding:** Neither this course nor its documentation had ever defined
  what happens when a `modules`/`answers`/`exercises` key in persisted or
  imported progress no longer corresponds to anything in the current
  `MODULES`/`QUIZZES`/`EXERCISES` data — the roadmap tracked "decide how
  stale question/exercise IDs are handled during import" as an explicitly
  open item. While auditing every consumer of `state.answers`/
  `state.exercises`/`state.modules` to design that policy, found that
  `getStats()`'s top-level `questionsAnswered`, `questionsCorrect`, and
  `overallPct` counted **every** key in `state.answers`, with no check
  against currently authored content — unlike `tally()` (the `byDomain`/
  `byTopic`/`byDifficulty` breakdown a few lines away in the same file),
  which already filtered via `if(!q){ return; }`. Confirmed as a real,
  working bug by direct execution before writing any fix: importing a
  state whose *only* `answers` entry was a fabricated id
  (`"totally-fake-question-id"`) produced `{questionsAnswered:1,
  questionsCorrect:1, overallPct:100}` — a fully fabricated 100% accuracy
  figure from a record that does not correspond to any real, current
  question.
- **Impact:** None shipped as a *new* defect — this bug already existed on
  `main` (inherited unchanged from the original `getStats()`
  implementation, predating this branch) and was caught and fixed within
  this same branch before merge, as part of defining the policy that
  would otherwise have needed to explain away this exact contamination.
  Had a stale-ID policy been documented without first finding and fixing
  this, the policy's own "cannot count toward current... accuracy...
  figures" guarantee would have been false the moment it was written.
- **Cause:** `getStats()` and `tally()` were written at different times
  (`tally()` already existed; the top-level `questionsAnswered`/
  `questionsCorrect`/`overallPct` fields were added to `getStats()`
  separately) and never audited against each other for consistency — both
  read `state.answers`, but only one of the two checked membership against
  current content before counting.
- **Correct action:** When multiple functions read the same underlying
  store for related purposes, audit them side by side for the same
  filtering discipline, not just individually for internal correctness —
  `tally()`'s own correctness didn't surface `getStats()`'s inconsistency
  until both were read together against the same adversarial input.
- **Correction — the policy, in full:** **Preserve the record, filter at
  read.** A stale key is never deleted, moved, quarantined, or rejected by
  `loadProgress()`, `migrateExerciseIds()`, or `importJSON()` — it stays
  in the ordinary `modules`/`answers`/`exercises` map under its original
  id. "Is this id current" is instead decided fresh, at read time, by
  every current-facing consumer checking membership in the live
  `MODULES`/`QUIZZES`/`EXERCISES` data — which `doneCount()`, `tally()`,
  `getUnmastered()`, `getWeakAreas()`, and every quiz/exercise render
  already did; `getStats()`'s three top-level fields were fixed to match,
  mirroring `tally()`'s exact `if(!q){ return; }` pattern via the same
  `questionIndex()` lookup. A stale record therefore cannot count toward
  completion/mastery/accuracy/attempt figures, render as a current item,
  attach itself to a different item after reordering (identity is always
  the id string an item carries, never its array position), or fire a
  misleading `answer`/`exercise` event (load/import never call
  `recordAnswer()`/`recordExercise()`). **Reintroduction revives history**
  automatically and with zero migration code, since staleness is a
  computed property of an id, never a stored flag, and a record is never
  moved anywhere — the moment an id becomes current again, its preserved
  record is picked up by every consumer above.

  **Alternatives considered and rejected:** rejecting the entire
  imported/loaded state on any stale id (would destroy every learner's
  entire progress on the next load after any ordinary content change —
  the opposite of protecting valid progress); stripping stale records on
  load/import (loses history permanently for no safety benefit over
  preserving it, given preserve-and-filter-at-read already guarantees zero
  contamination); quarantining stale records in a separate state field
  (would need new migration code to move records in and out as an id
  flips between known/unknown, a `SCHEMA_V`-relevant shape addition, and
  corresponding `validateImportedState()` changes, for no isolation
  benefit beyond what read-time filtering already proves it provides).

  **Runtime-injected-question boundary**, explicitly *not* resolving the
  separate content-pack decision: a runtime-injected question's answer
  becomes stale the moment its session ends without re-injection (session-
  only content is documented, pre-existing behavior) — this policy only
  defines what happens to the already-recorded progress (preserved,
  excluded from stats, revived if the same id is reintroduced by any
  mechanism, including a future content pack); it does not decide whether
  or how injected content should persist.

  `markModule()` already rejecting an unknown module id outright
  (Milestone 0) is a *different* guarantee — a write-time guard against
  ever *creating* a new record for an id that was never valid — kept
  explicitly distinct from this *read-time* policy for an *existing*
  record whose id *used to be* valid; a dedicated test proves both hold
  simultaneously without conflict.

  **`SCHEMA_V` stays `2`:** no stored field's shape or meaning changes, no
  new top-level state field is introduced, and nothing previously accepted
  becomes rejected — only which records *count* toward current-facing
  figures changes, correcting a silent inconsistency rather than imposing
  a new restriction.

  13 new tests in `tests/dom-behavior.mjs` (101 → 114 checks): known and
  stale question records together in one state; known and stale exercise
  records together (checked via a fresh boot's rendered `.eh-score`, since
  re-rendering exercise widgets after `importJSON()` is a separate,
  still-open Milestone 1 item this correction deliberately does not
  implement); a state containing only stale records across all three maps;
  an orphaned (non-migratable) legacy exercise key surviving migration
  inert alongside a real legacy→stable migration in the same state;
  reordering the live `QUIZZES` array and, separately,
  `EXERCISES.ex7.items` (via the same script-injection technique QL-005
  established) with a stale record present in each case; reload idempotency
  after stale-state normalization (byte-identical storage across two
  successive loads, and `getStats()` agreement, compared via
  `JSON.stringify` rather than `assert.deepEqual` — see the note on
  cross-realm object comparison below); a full export/import round trip
  preserving a stale record value-for-value while excluding it from
  reported stats on both sides; confirmation that loading/importing a
  stale-only state fires no `answer`/`exercise` events, only the ordinary
  `progress` event; import atomicity and storage-failure behavior holding
  unchanged when stale ids are present alongside genuinely malformed data;
  the `getProgress()`/`exportJSON()`-preserves vs. `getStats()`-excludes
  vs. `markModule()`-still-guards distinction; and the runtime-injected-
  question boundary test described above, including its reintroduction
  half.

  **A test-authoring pitfall caught while writing this suite:**
  `assert.deepEqual`/`deepStrictEqual` (from `node:assert/strict`) checks
  prototype identity, not just structural/enumerable-property equality.
  `getStats()`'s `byDomain`/`byTopic`/`byDifficulty` fields, and `tally()`
  generally, are built via raw object-literal syntax (`var out = {}`)
  *inside* the app's own `vm` sandbox realm — a genuinely different
  intrinsic `Object.prototype` from this test file's own realm, and (since
  each `boot()` call creates a fresh `vm.createContext()`) different again
  from a *second* `boot()`'s realm. `assert.deepEqual(stats.byDomain, {})`
  and `assert.deepEqual(second.api.getStats(), statsAfterFirstLoad)` both
  failed with "Values have same structure but are not reference-equal" —
  confirmed directly with a minimal `vm`-based reproduction before
  concluding this was the cause, not a real product defect. Fixed by
  comparing via `JSON.stringify(...)` instead, this codebase's established
  pattern for exactly this class of comparison (used extensively
  elsewhere for the same underlying reason — see QL-006's atomicity
  helper, which already compares `JSON.stringify(getProgress())` rather
  than the live object for the identical reason, one layer up). Values
  that instead pass through `clone()` (`getProgress()`'s and
  `exportJSON()`'s round-trip through the *shared* `JSON` object
  `tests/dom-harness.mjs` injects into the sandbox) do not hit this issue,
  since that shared `JSON.parse` call always constructs its result objects
  using the calling script's own (outer, test-file) realm intrinsics
  regardless of which `vm` context invoked it — confirmed directly,
  not assumed, before relying on the distinction across this suite.

  **Mutation-tested:** (1) reverting `getStats()`'s fixed computation back
  to the original `Object.keys(state.answers).length`-based one failed
  exactly the five tests that depend on the fix, and no others; (2)
  introducing an accidental "strip every exercise key that isn't a current
  stable id" cleanup pass into `migrateExerciseIds()` — i.e., accidentally
  reintroducing the rejected "strip stale records" alternative — failed
  exactly the six tests that depend on preservation, and no others. Both
  mutations reverted and confirmed byte-identical to the pre-mutation file
  via `diff`.
- **Prevention:** `docs/ARCHITECTURE.md` "Stale question/exercise/module
  ID policy" records the full decision, alternatives, and guarantee list;
  `docs/VALIDATION.md` records the corrected test-coverage list;
  `docs/ROADMAP.md` checks off the roadmap item with the same summary.

### Addendum — independent review found the Reset boundary was implicit, not explicit

- **Status:** Corrected on the same branch (`claude/issue-2-stale-id-policy`),
  before merge.
- **Finding:** QL-024's policy above ("preserve the record, filter at
  read") correctly governs loading, migration, import, export, and every
  ordinary read — but neither the policy comment in `index.html`, the
  documentation, nor the 13 new tests ever explicitly established that an
  explicit, user-confirmed Reset is an exception to it. A reader of the
  policy alone could not tell whether Reset was expected to preserve
  stale records (consistent with "preserve, filter at read" read too
  literally) or delete everything (the actual, intended behavior).
- **Impact:** Documentation/test-coverage gap only — independently
  reproduced through the real `#resetBtn` UI click path (`window.confirm`
  simulated, not internal state mutated directly) with both current and
  stale module/answer/exercise records seeded across *both* the v2 and
  legacy v1 storage keys at once before writing any fix: Reset already
  clears both keys wholesale, and a simulated reload afterward shows a
  fully blank `getProgress()`, zeroed `getStats()`, and zeroed rendered
  progress. No product defect existed — `#resetBtn`'s handler and the
  `reset()` API method both already delete/replace state wholesale
  (`localStorage.removeItem()` for both keys; `state = blankState()`),
  never selectively, so they were never capable of preserving a stale
  record in the first place. Confirmed by direct execution before
  concluding no code change was needed, per this log's standing
  discipline of verifying rather than assuming.
- **Cause:** The policy was written and tested from the "ordinary read"
  side only; Reset — the one deliberate, non-read exception — was never
  explicitly named or covered by a test that combined stale records with
  *both* storage keys in one scenario, even though the pre-existing
  per-scenario Reset tests (from the original import-hardening work)
  already proved each storage key clears individually for *current*
  progress.
- **Correction:** Added one regression test proving Reset removes current
  *and* stale records at every level (module, answer, exercise) from
  *both* storage keys simultaneously, through the real UI click path,
  and stays cleared after a simulated reload (`tests/dom-behavior.mjs`,
  114 → 115 checks). Added a concise "RESET IS THE ONE DELIBERATE
  EXCEPTION" paragraph to `index.html`'s PROGRESS file-level policy
  comment, plus a one-line pointer comment at each of the two actual
  Reset implementations (`#resetBtn`'s click handler and the `reset()`
  API method). Added a matching "Reset is the one deliberate exception"
  paragraph to `docs/ARCHITECTURE.md` and a coverage bullet plus updated
  mutation count to `docs/VALIDATION.md`. No product logic changed.
  **Mutation-tested:** removing either storage-key deletion from the
  `#resetBtn` handler (tried separately for `PKEY` and for `PKEY_V1`)
  each failed the new test, plus whichever pre-existing per-scenario
  Reset test already covered that specific key — confirming the new test
  is genuinely sensitive to both halves of the guarantee, not merely
  duplicating existing coverage. Both mutations reverted and confirmed
  byte-identical to the pre-mutation file via `diff`.
- **Prevention:** When documenting a "preserve by default" policy, name
  its exceptions explicitly in the same comment, and write at least one
  test that exercises the exception path with the same adversarial
  fixture (mixed current/stale, every record type, every affected storage
  key at once) used to prove the default path — a policy statement with
  an unstated exception is exactly as dangerous as one with an unproven
  guarantee.

## QL-025 — Exercise widgets were never rebuilt after import or Reset; a follow-on positioning "fix" was itself caught as a regression by the existing e2e suite and reverted

- **Status:** Corrected on branch `claude/issue-2-exercise-rerender`
  (Issue #2), before merge.
- **Finding — confirmed, primary defect.** `importJSON()` and the API
  `reset()` method both rebuilt only `.quiz-mount` widgets
  (`$all('.quiz-mount').forEach(buildQuiz)`); neither ever rebuilt `.exer`
  (exercise) widgets. Reproduced through the real public API and rendered
  DOM before any fix was written: (1) importing a state where every item
  of exercise `ex7` had a persisted `{c:true,...}` record left the
  rendered widget showing `0 / 4` / "Not started" — completely disagreeing
  with `getProgress()`, which correctly showed all four items answered;
  (2) answering an exercise live (options rendered `disabled`, feedback
  shown) and then importing blank progress left every stale
  disabled/feedback/score element on screen, untouched, even though
  `getStats()` correctly reported zero; (3) calling `reset()` after
  answering an exercise item left the same stale rendered state in place.
  All three were independently confirmed as real, working defects by
  direct execution against the pre-fix code.
- **Impact:** None shipped — found and fixed within this same branch
  before merge.
- **Cause:** Three separate call sites (`init()`, `importJSON()`,
  `reset()`) each duplicated the same incomplete
  `$all('.quiz-mount').forEach(buildQuiz)` selector loop, so fixing one
  site by hand would not have guaranteed the other two stayed correct —
  and in fact `init()` already correctly built both widget types (it has
  its own, separate `$all('.exer').forEach(buildExercise)` line), while
  `importJSON()`/`reset()` never did, silently diverging over time.
- **Correct action:** When the same rebuild logic is needed from more
  than one call site, centralize it once and route every call site
  through that single function, rather than trusting each site to
  independently remember every widget type that needs rebuilding — the
  divergence between `init()` and the other two call sites here is
  exactly the failure mode a shared helper eliminates by construction.
- **Correction:** Added `rebuildContentWidgets()`
  (`$all('.quiz-mount').forEach(buildQuiz); $all('.exer').forEach(buildExercise);`)
  and routed `init()`, `importJSON()`, and `reset()` through it, replacing
  three separate selector loops with one. `buildQuiz()`/`buildExercise()`
  are both full `innerHTML` replacements seeded fresh from persisted
  records, so calling either again is idempotent — no duplicate DOM nodes
  or listeners accumulate. Neither function ever calls
  `recordAnswer()`/`recordExercise()` or emits an event, so a rebuild
  never manufactures an `answer`/`exercise` event; `importJSON()`/`reset()`
  still fire only their existing, already-documented `progress` event.

  ### A follow-on "fix" was tried, caught as a real regression by the existing test suite, and reverted before committing

  While reproducing the primary defect, a second issue appeared to exist:
  even a genuine full-page reload never restored an exercise widget's
  resume position — `buildExercise()` always started at array index 0
  regardless of how much progress was already recorded, so a learner who
  answered item 0 and reloaded would see item 0's prompt again rather
  than the next unanswered item, and a fully completed exercise would
  restart at item 0. A first version of this fix added resume-position
  logic (start at the first item without a persisted record, or the last
  item if every item already has one) to make this look "restored."

  Running the **complete** local Playwright suite (not just the new
  tests) surfaced that this "fix" **broke an existing, shipped,
  already-tested contract**:
  `tests/e2e/progressive-disclosure.spec.mjs`'s
  "reattempting an exercise item after reload updates the score to the
  latest result without double-counting" test (added earlier, predating
  this branch, under Issue #11's progressive-disclosure work) — confirmed
  to pass on unmodified `main` before concluding this was a real
  regression, not a flake. That test answers an exercise item
  *incorrectly*, reloads, and expects to click the **same item again**
  (now with fresh, unlocked controls) to correct it. The resume-position
  logic navigated *away* from that item the moment it had any persisted
  record — including an incorrect one — so the test's second click landed
  on the wrong item and the test failed for a real, structural reason.

  Reflecting on this: `buildExercise()` always restarting at item 0 with
  fresh, unlocked controls on every rebuild is not an oversight this
  branch needed to close — it is the **existing, intentional design**,
  exactly matching `buildQuiz()`'s own established behavior (a rebuilt
  quiz mount never disables an already-answered question's options
  either, confirmed directly), which exists specifically so a learner can
  correct a previous answer after a reload. Neither widget type has ever
  persisted *which* option a learner chose, only whether the outcome was
  correct, so a "locked, showing the right answer" rendering of an
  already-recorded item was never something either widget could do
  precisely anyway. The resume-position logic was reverted in full,
  restoring `buildExercise()`'s opening lines to their exact pre-branch
  form (confirmed via `diff` against `main`) — this branch's product
  change is therefore *only* `rebuildContentWidgets()` and the three call
  sites routed through it; `buildExercise()`'s internal rendering logic
  is untouched.
- **9 new tests** in `tests/dom-behavior.mjs` (115 → 124) plus 5 new
  real-browser Playwright tests in `tests/e2e/progress-and-reset.spec.mjs`:
  importing a partially completed exercise restores the exact score and
  status, with item 0 available for reattempt (not stale-disabled);
  importing a fully completed exercise shows its completed state
  accurately in the summary while item 0 remains reattemptable; answering
  live then importing blank progress removes every stale
  answered/disabled/feedback state; the public `reset()` API clears
  exercise progress, both storage keys, statistics, and the rendered
  widget; repeated import/reset operations create no duplicate DOM
  elements, listeners, or scoring; reattempting an already-recorded item
  after an import-driven rebuild replaces its prior outcome without
  double-counting (through the real UI, now that a rebuild can actually
  surface an already-recorded item to reattempt — the dependency-free
  counterpart to the pre-existing Playwright test that caught the
  reverted regression above); stable-ID migration and stale-exercise-ID
  handling remain intact after the rebuild fix (an orphaned legacy key
  stays inert alongside a real migration, exactly as QL-005/QL-024
  established); import and reset fire exactly the already-documented
  events (`progress` on both, never a manufactured `answer`/`exercise`
  event); and a preserved `<details>` open/closed disclosure state
  survives a rebuild (verified structurally: a `.exer` element IS the
  `<details>` itself, so `buildExercise()`'s `host.innerHTML` replacement
  never touches `host`'s own `open` attribute — confirmed directly rather
  than assumed).
- **Mutation-tested:** reverting `importJSON()`/`reset()`'s calls to
  `rebuildContentWidgets()` back to the original
  `$all('.quiz-mount').forEach(buildQuiz)` line (leaving `init()` and the
  helper itself untouched, so only the two specific connections were
  broken, not widget-building generally) failed exactly the five tests
  that depend on either call site actually rebuilding an exercise widget,
  and no others — reverted and confirmed byte-identical via `diff`.
- **Prevention:** Run the *complete* local test suite — not just the
  tests written for the current change — before concluding a fix is
  correct; a suite scoped only to what a change is expected to touch
  cannot catch that change silently breaking an established contract
  elsewhere, which is exactly what happened here and exactly what caught
  it. `docs/ARCHITECTURE.md` records the rendering-approach decision and
  the reattempt-preservation rationale, including the reverted attempt;
  `docs/VALIDATION.md` records the corrected test-coverage list;
  `docs/ROADMAP.md` checks off the corresponding Milestone 1 item.

### Addendum — independent review found the UI Reset test could not prove the public API path was fixed

- **Status:** Corrected on the same branch (`claude/issue-2-exercise-rerender`),
  before merge.
- **Finding:** The real-browser "confirmed Reset path" test added by this
  entry drives Reset through `#resetBtn`, whose handler ends in
  `location.reload()` — a full page re-execution that calls `init()`,
  which has always correctly rebuilt both quiz and exercise widgets. That
  test therefore could pass even if the public `CytoCourse.reset()`
  method itself never rebuilt exercise widgets at all: the subsequent
  reload would mask the defect by rebuilding everything from scratch
  regardless of what `reset()` itself did. The defect this branch fixes
  is specifically that `reset()` (and `importJSON()`) did not rebuild
  exercise widgets — a reload-based test cannot isolate that claim.
- **Impact:** None shipped — a coverage gap, not a product defect; found
  before merge.
- **Correction:** Added a dedicated real-browser test that calls
  `window.CytoCourse.reset()` directly via `page.evaluate()` — no
  `#resetBtn` click, no `location.reload()`, no navigation of any kind —
  and asserts the rendered exercise widget, `getProgress()`, `getStats()`,
  and both storage keys immediately afterward. Proves no navigation
  occurred via a `window`-scoped sentinel property set before calling
  `reset()`: a real navigation replaces `window` entirely, which would
  silently wipe the sentinel, so its survival is direct evidence no
  reload happened (checked instead of merely assumed from the absence of
  a `page.reload()` call in the test source). Also installs
  `progress`/`answer`/`exercise` event counters immediately before
  calling `reset()` (after the setup answer above, so that answer's own
  events are not miscounted as `reset()`'s) and asserts exactly one
  `progress` event and zero `answer`/`exercise` events — measured, not
  assumed, matching this course's standing event-contract discipline.
- **Mutation-tested:** reverted `reset()`'s call to
  `rebuildContentWidgets()` back to the original quiz-only
  `$all('.quiz-mount').forEach(buildQuiz)` line — deliberately leaving
  `importJSON()` and `init()` untouched, isolating exactly the one
  connection this correction targets — and the new direct-call test
  failed for the expected reason (`.eh-score` still read the stale
  `"1 / 4"` instead of `"0 / 4"`, since the exercise widget was never
  rebuilt). The pre-existing UI-Reset (`#resetBtn`) test and the
  `importJSON()` tests continued to pass under this same mutation,
  confirming the reload-based test genuinely cannot detect this specific
  defect — exactly the gap this correction closes. One other test
  (`importJSON()` with a fully completed exercise) failed intermittently
  during the same run; confirmed as the pre-existing, unrelated
  cross-file flake already documented in this branch's Playwright runs
  by rerunning it in isolation with the mutation still applied, where it
  passed. Reverted the mutation and confirmed `index.html` byte-identical
  to the pre-mutation file via `diff`.
- **Prevention:** When a UI action ends in a page reload/navigation, a
  test driving that UI path cannot, by itself, prove a claim about the
  underlying method's own behavior — the reload can mask an unfixed
  method. Any claim about a specific public API method's own effect
  needs a test that calls that method directly and checks state before
  anything else (a reload, a navigation) could have contributed.

## QL-026 — Storage failures were caught and swallowed silently, so learners could lose progress with no warning and no honest failure report

- **Status:** Corrected on branch `claude/issue-2-storage-failure-mode`
  (Issue #2), draft PR open for independent review, not yet merged.
- **Finding — confirmed, multiple related defects.** Reproduced through
  the real public API and rendered DOM before any fix was written: (1)
  `saveProgress()` caught every `localStorage.setItem()` error silently
  and still called `emit('progress', null)`, so `recordAnswer()`,
  `recordExercise()`, `markModule()`, and the module-completion UI all
  kept advancing in-memory state with no indication the write had
  failed; (2) a module's `.mark-status` text could read "Saved — nice
  work." for a change the browser had just rejected; (3) `markModule()`
  and the API `reset()` method both returned `{ok:true}` regardless of
  whether the underlying storage operation actually succeeded; (4) no
  public method existed to inspect persistence status at all; (5)
  `loadProgress()` treated a genuine `localStorage.getItem()` failure
  identically to "no progress yet" (a blank state, no warning) — the
  same code path corrupt-but-readable stored JSON already used, so a
  learner with real prior progress in an inaccessible store had no way
  to know their existing progress might not even have been read; (6) the
  UI `#resetBtn` handler called `location.reload()` unconditionally,
  even when the storage-removal calls it depended on had thrown,
  presenting a Reset that had not actually cleared storage as if it had.
- **Impact:** None shipped — found and fixed within this same branch
  before merge; the branch is a draft PR awaiting independent review,
  not yet on `main`.
- **Cause:** Every storage-touching call site had its own local
  try/catch (or none), each independently deciding what "failure" meant
  and whether to tell the learner — with no shared state to know that
  storage was currently unavailable, no shared decision about when it
  was safe to write, and no shared place to surface a warning.
- **Correct action:** Centralize persistence status in one place, gate
  every storage-touching call site through it, and make an explicit
  policy decision about which situations are stale-safe to keep trying
  (a write failure, since a full serialize of `state` always
  self-heals) versus not (a read failure, since the app may not have
  seen everything already in storage) — rather than trusting every call
  site to independently reimplement that judgment.
- **Correction:** Added a module-level `persistState` variable
  (`{persistent, reason}`, `reason` one of `null | 'unavailable' |
  'write-failed'`) — deliberately kept outside the persisted `state`
  object, never exported/imported, no `SCHEMA_V` involvement.
  `setPersistState()` is the single place that updates it, updates the
  new `#storageWarning` DOM banner (`role="status"`, chosen over
  `role="alert"` specifically so it never steals focus mid-answer), and
  fires a new `persistence` event — and only does any of that when the
  status genuinely changes, so repeated failures produce one warning,
  not one per failed action. `loadProgress()` now separates the
  `getItem()` call (its own try/catch, setting `reason:'unavailable'` on
  failure, before any `JSON.parse()` is attempted) from parsing the
  result (unchanged corrupt-JSON fallback, no warning). `saveProgress()`
  skips the write attempt entirely while `reason === 'unavailable'`
  (`'unavailable'` is sticky for the session — only a reload, a fresh
  read, can clear it) but otherwise always attempts the full-state write
  and reports the genuine outcome (`reason:'write-failed'` self-heals
  the moment any later write succeeds, since it is always a full
  serialize). `performReset()`, a new function shared by both the UI
  `#resetBtn` handler and the API `reset()` method, tracks each storage
  operation's own success independently and reports `{ok: v1Removed &&
  v2Cleared}` — `reset()` no longer unconditionally claims `{ok:true}`,
  and the UI handler now only reloads when both operations actually
  succeeded. `importJSON()` gained one narrow, deliberate exception: a
  storage-write failure during import now also calls
  `markSessionOnly('write-failed')` — a status-only side effect that
  changes no progress data and fires no progress-bearing event, so the
  existing all-or-nothing atomicity guarantee (still `{ok:false}`, still
  no live-state/storage/event change on failure) is unweakened. Added
  `CytoCourse.getPersistenceStatus()` returning `{persistent, reason}`;
  no raw browser exception text is ever exposed through it or the
  warning text. `markModule()`/`addQuestions()` were deliberately left
  unchanged — their `{ok:true}` has always meant "the in-memory action
  was valid," a narrower, already-accurate claim distinct from
  `reset()`'s previous unconditional `{ok:true}`, which was a direct,
  provable false-durability claim.
- **15 new tests** in `tests/dom-behavior.mjs` (124 → 139) plus 6 new
  real-browser Playwright tests in
  `tests/e2e/storage-failure-warning.spec.mjs` (run under both the
  desktop and narrow/mobile configured projects). Full coverage list:
  `docs/VALIDATION.md` "Storage-failure detection and session-only
  progress."
- **Mutation-tested**, each reverted and confirmed `index.html`
  byte-identical via `diff` before committing: (1) restored the original
  unconditional silent-catch `saveProgress()` — failed exactly the 8
  tests that depend on write-failure detection existing; (2) removed the
  `persistState.persistent` guard from the `.mark-status` text condition
  — failed exactly the 2 tests asserting no false "Saved" text under a
  write failure; (3) moved `markPersistent()` ahead of the
  `localStorage.setItem()` call, clearing session-only status before the
  write was confirmed to succeed — failed the repeated-failure dedup
  test (the assertion sensitive to a spurious flicker within one failed
  save; the recovery test's own final-state assertions still converged
  to the same correct values, so it did not independently catch this);
  (4) changed the UI `#resetBtn` handler to reload unconditionally,
  ignoring `performReset()`'s result — failed exactly the one test
  asserting the UI Reset path does not reload on a storage-removal
  failure. Full local validation: `npm test` (139/139),
  `tests/e2e/storage-failure-warning.spec.mjs` (12/12 across both
  projects), and the complete `npx playwright test` suite.
- **Prevention:** A silent `catch(e){}` around a storage write is a
  policy decision disguised as error handling — it decides, by omission,
  that the user never needs to know their action was not saved. Any
  catch block around a persistence operation should be treated as a
  point requiring an explicit, documented decision about what the user
  is told, not a place to make failure invisible.

### Addendum — independent review of draft PR #20 found three blocking corrections, all fixed before merge

- **Status:** Corrected on the same branch
  (`claude/issue-2-storage-failure-mode`), before merge. Independent
  review at head `cf0a815b90e408f6a5dde41844f9ac26ee85525b` confirmed CI
  green, `npm test` passing 139/139, no unresolved review comments, and
  the general read-failure/write-failure model coherent — but reproduced
  three real defects in the implementation itself.
- **Finding 1 — confirmed, a failed import could clobber unseen prior
  progress.** Reproduced exactly: seed genuine prior v2 progress in the
  backing store → make `localStorage.getItem()` throw during
  initialization (status correctly becomes `{persistent:false,
  reason:'unavailable'}`, having never actually read the seeded record)
  → attempt an otherwise-valid `importJSON()` call while
  `localStorage.setItem()` also throws → `importJSON()` correctly
  returned `{ok:false}`, but its catch block unconditionally called
  `markSessionOnly('write-failed')`, downgrading the reason from the
  sticky `'unavailable'` to the non-sticky `'write-failed'` → restore
  write access while read access remains unavailable → an ordinary
  action (`markModule()`) then successfully wrote the session's
  blank/partial in-memory state over the genuine prior progress that
  initialization never actually read — the exact clobber `'unavailable'`
  exists to prevent, and the primary safety guarantee the original
  QL-026 entry claimed to provide.
- **Finding 2 — confirmed, the warning could be off-screen while
  reporting as "visible."** `#storageWarning` was an ordinary in-flow
  element placed immediately below `<header>`, at the top of a page that
  can run tens of thousands of pixels tall. A sighted learner working in
  a later module when a write failed would have the element become
  CSS-visible (non-zero size, not `hidden`) while remaining tens of
  thousands of pixels outside the current viewport. The existing
  Playwright `toBeVisible()` assertions proved only that the element
  renders — not that a learner could actually see it — and could not
  detect this class of defect by construction.
- **Finding 3 — confirmed, API `reset()`'s partial-failure status was
  inaccurate.** Reproduced: seed a legacy v1 key → make only
  `removeItem(PKEY_V1)` throw → the API Reset's canonical v2 blank-state
  write (`localStorage.setItem(PKEY, ...)`) succeeds → `reset()`
  correctly returned `{ok:false}` (both requested cleanup operations did
  not succeed) — but `persistState` was also downgraded to
  `{persistent:false, reason:'write-failed'}` and `#storageWarning`
  displayed, even though the current v2 state was genuinely, durably
  written, and `loadProgress()` always prefers a valid v2 record over
  ever reading `PKEY_V1` at all, making the surviving legacy key provably
  inert. The status and warning falsely implied the learner's current
  progress might be lost, when only dormant legacy-key cleanup had
  failed.
- **Impact:** None shipped — PR #20 remained draft/unmerged throughout;
  all three found and fixed before merge.
- **Cause:** (1) `importJSON()`'s failure branch treated every prior
  `persistState.reason` identically, not accounting for `'unavailable'`
  being a strictly more conservative state that must never be weakened
  by a failed (as opposed to successful) explicit action. (3) similarly
  treated the API and UI Reset paths identically
  (`v1Removed && v2Cleared`), not accounting for the fact that the two
  paths clear `PKEY` by fundamentally different mechanisms (removal vs.
  durable overwrite) with different actual risk profiles for the
  already-inert legacy key. (2) was a placement decision (in-flow,
  top-of-page) made without testing perceivability at realistic scroll
  depth — the original test suite's own `toBeVisible()` checks could not
  have caught it even in principle.
- **Correct action:** A persistence-status transition must be reasoned
  about per *prior state*, not just per *action outcome* — "did this
  write fail" is not sufficient; "was the prior state already more
  conservative than what a failure would produce" must also be checked
  before transitioning. Similarly, two code paths that superficially
  return the same shape (`{v1Removed, v2Cleared}`) can still warrant
  different status logic if their underlying storage operations carry
  different real risk. A "the element is visible" test is not evidence
  of "the element is visible to the user right now" for anything that
  is not always within the initial viewport.
- **Correction 1:** `importJSON()`'s catch block now only calls
  `markSessionOnly('write-failed')` when `persistState.reason !==
  'unavailable'`; when it is already `'unavailable'`, the status is left
  untouched (no transition, no duplicate `'persistence'` event,
  `saveProgress()` keeps skipping every write). A successful import is
  unaffected and still clears `'unavailable'` as before. See
  `docs/ARCHITECTURE.md`'s corrected transition table for the complete
  policy.
- **Correction 2:** `.storage-warning` changed from in-flow to
  `position:fixed; left:0; right:0; bottom:0`, anchored to the viewport's
  bottom edge specifically to avoid competing for screen position with
  the sticky header (`top:0`) and sticky/fixed sidebar (both anchored at
  `top:var(--header-h)`). Remains non-modal, non-auto-dismissing,
  `role="status"`, and never focus-stealing. Added to the `@media print`
  hide list to avoid a repeating fixed element across printed pages.
- **Correction 3:** `performReset()`'s status logic is now path-dependent:
  the API path (`usePkeyRemoval:false`) durability now depends on
  `v2Cleared` alone (a leftover, unremoved `PKEY_V1` is provably inert
  once a valid v2 record exists); the UI path (`usePkeyRemoval:true`,
  which clears `PKEY` by removal, so a genuinely absent `PKEY` plus a
  surviving `PKEY_V1` risks real v1-migration resurrection on reload)
  still correctly depends on both `v1Removed` and `v2Cleared`. `reset()`'s
  returned `{ok: v1Removed && v2Cleared}` is unchanged in both paths —
  the smallest accurate representation, per the review's own guidance:
  no new `persistState.reason` value was added, and `ok` still honestly
  reports the legacy-key cleanup failure; only the *separate* persistence
  status stopped conflating that cleanup failure with current-state
  durability on the API path specifically.
- **6 new dependency-free tests** in `tests/dom-behavior.mjs` (139 → 145)
  and **3 new real-browser Playwright tests** in
  `tests/e2e/storage-failure-warning.spec.mjs` (6 → 9, both configured
  projects) — full coverage list in `docs/VALIDATION.md`'s "Correction —
  sticky `'unavailable'` clobber and warning viewport visibility."
- **Mutation-tested**, each reverted and confirmed `index.html`
  byte-identical via `diff` before committing:
  1. Restored the unconditional `markSessionOnly('write-failed')` in
     `importJSON()`'s catch — failed exactly the new dependency-free
     clobber-sequence test and the new real-browser clobber-sequence
     test, and no others.
  2. Restored the API Reset path's status gate to
     `v1Removed && v2Cleared` — failed exactly the new "only legacy-key
     removal fails" dependency-free test, and no others.
  3. Restored the original in-flow, non-`position:fixed`
     `.storage-warning` CSS — failed both new deep-scroll Playwright
     tests, under both configured projects (4 failures total), and no
     others.
- **Full local validation:** `npm test` (145/145),
  `npx playwright test tests/e2e/storage-failure-warning.spec.mjs`
  (18/18 across both projects), and the complete `npx playwright test`
  suite (196 passed, 4 pre-existing viewport-conditional skips, 0
  failed).
- **Prevention:** When implementing a state machine with a
  "more conservative wins" invariant (here: `'unavailable'` must never
  be weakened by a failed action), explicitly test the case where the
  action fails *while starting from the most conservative state* — not
  only from the default/optimistic state, which is what the original
  test suite exercised. When two code paths share a return shape but
  clear storage by different underlying mechanisms, test each path's
  partial-failure behavior separately rather than assuming shared logic
  is safe to share. Any "is this UI element visible" test for content
  that is not guaranteed to be within the initial viewport should assert
  viewport intersection (e.g. Playwright's `toBeInViewport()`), not
  merely CSS visibility.

### Addendum 2 — the fix for one correction (fixed-position visibility) introduced a new, real obstruction defect

- **Status:** Corrected on the same branch
  (`claude/issue-2-storage-failure-mode`), before merge. Independent
  review at head `e84cf6bfb27574c8117dd2781f5b84ae33301b80` confirmed
  the three prior corrections (addendum 1) all genuinely correct, then
  found one further real defect in the fixed-position banner itself.
- **Finding — confirmed, the fixed banner could obstruct content and
  navigation.** `position:fixed` removes an element from the normal
  document flow entirely, so nothing downstream of `#storageWarning` in
  the document reserved any room for it. While shown, it could
  therefore sit visually on top of the page's own bottom-most course
  content and, on narrow widths, on top of the mobile sidebar's own
  bottom-most nav links — both still fully hit-testable underneath it,
  since `position:fixed` does not disable default pointer events. The
  dependency-free/real-browser tests added by addendum 1 proved the
  banner intersects the viewport at any scroll depth (`toBeInViewport()`)
  and proved earlier page content didn't shift position — necessary
  proofs, but neither one checked whether anything ended up positioned
  *underneath the banner's own rectangle*, which is the actual
  obstruction risk a fixed overlay introduces.
- **Impact:** None shipped — PR #20 remained draft/unmerged throughout;
  found and fixed before merge.
- **Cause:** Fixing one defect (viewport visibility, via
  `position:fixed`) introduced a different one (obstruction) as a direct
  side effect of the fix's own mechanism, and the test suite added
  alongside that fix tested only the property the fix was aimed at, not
  the new failure mode the fix's own mechanism newly permitted.
- **Correct action:** When a fix's mechanism itself changes a structural
  property of an element (here: removing it from document flow), audit
  for what guarantees that structural property was previously providing
  incidentally, and reproduce whether the fix silently drops any of them
  before trusting the fix is complete — visibility and non-obstruction
  are separate properties that do not imply each other.
- **Correction:** Added a `--storage-warning-h` custom property
  (declared on `:root`, default `0px`) kept in sync with the banner's
  actual live rendered height by a new `setStorageWarningReservedHeight()`
  — called synchronously inside `updateStorageWarning()` on every
  show/hide (an immediate post-mutation `getBoundingClientRect()` read,
  forcing on-demand layout rather than waiting a frame), and reactively
  by a new `ResizeObserver` (`wireStorageWarningReservedSpace()`, wired
  once from `init()`) for any later size change with no accompanying
  `persistState` transition — text rewrapping at a new width, browser
  zoom, a web font finishing load, a longer localized message.
  `.content`'s bottom padding and `.sidebar`'s own `height` (both the
  desktop sticky version and the mobile fixed/off-canvas version) each
  add or subtract this same variable, so real layout space is reserved
  for the banner in every affected scroll region whenever it is shown,
  collapsing back to `0px` the instant it hides. `pointer-events:none`
  on the banner alone was considered and explicitly rejected: it would
  let clicks pass through the banner but the banner would still visually
  cover whatever was underneath it -- the fix needed to remove the
  obstruction itself, not merely one symptom of it.
- **3 new dependency-free tests** in `tests/dom-behavior.mjs`
  (145 → 148), covering what is meaningfully checkable without a real
  layout engine (the `--storage-warning-h` custom property's shown/
  hidden tracking, its collapse on recovery, and its stability across
  repeated failures) using new `Node.getBoundingClientRect()`,
  `style.setProperty()`/`getPropertyValue()`/`removeProperty()`, and
  `ResizeObserver` stubs added to `tests/dom-harness.mjs`.
- **6 new real-browser Playwright tests** in
  `tests/e2e/storage-failure-warning.spec.mjs` (9 → 15) replace the
  prior "document position unchanged" assertion (necessary but
  insufficient, per the Finding above) with direct non-obstruction
  proofs: rectangle-intersection AND real `document.elementFromPoint()`
  hit-testing for a course control at the very end of the page and, at
  390×844 with the mobile sidebar open, its final nav link (which must
  also become fully visible strictly above the banner and remain fully
  operable, closing the sidebar normally on activation); no overlap with
  the sticky header; reserved-space stability across repeated failures;
  clean reservation collapse on recovery proven via
  `document.documentElement.scrollHeight` and `window.scrollY` (not just
  the custom property's own value); correct behavior when the message
  wraps to multiple lines at 390px width; and no transition applied
  under an explicit `prefers-reduced-motion: reduce` emulation. Full
  coverage list: `docs/VALIDATION.md`'s "Correction — the fixed warning
  could obstruct content and navigation."
- **Two test-isolation defects were found and fixed while writing the
  recovery/scroll-extent test**, before it was trusted as a correct
  measurement: (1) a lazy-loaded (`loading="lazy"`) figure only actually
  fetches and renders once scrolled near, so `waitForLoadState('networkidle')`
  raced it non-deterministically under parallel-worker contention,
  fixed by waiting on a targeted `waitForFunction` checking `.complete`
  for images near the current scroll position specifically (not every
  `<img>` on the page, which would hang forever on a lazy image never
  scrolled near); (2) an earlier version of the test marked two
  *different* modules complete (one to trigger the failure, a different
  one to trigger recovery) — marking a module complete grows the page
  slightly on its own (a "done" state change), a content change entirely
  unrelated to the reservation under test, which was being
  misattributed to a reservation-cleanup defect. Fixed by toggling the
  *same* module's control on then off, returning the page's own content
  to its exact original state so any remaining `scrollHeight` difference
  could only be attributable to the reservation itself.
- **Mutation-tested:** removed only the three `var(--storage-warning-h)`
  consumption terms (`.content`'s padding, and both the desktop and
  mobile `.sidebar` height rules), leaving the fixed banner, the
  `:root` variable declaration, and all of the measurement JS completely
  intact — failed the mobile-sidebar final-link test (rectangle overlap
  correctly detected: the final link's box and the banner's box were
  confirmed overlapping) and both
  recovery/scroll-extent tests (the page's `scrollHeight` no longer grew
  while the banner was shown), across both projects where each
  respectively applies. The course-control-at-the-bottom, sticky-header,
  repeated-failure, and multi-line-wrap tests did not independently fail
  under this specific mutation given this content's current incidental
  spacing — reverted regardless and confirmed `index.html`
  byte-identical to the pre-mutation file via `diff` before committing,
  since the mutation's purpose (proving the reservation is load-bearing
  somewhere) was already clearly demonstrated by the failures it did
  produce.
- **Full local validation:** `npm test` (148/148),
  `npx playwright test tests/e2e/storage-failure-warning.spec.mjs`
  (consistently passing across repeated runs, aside from the two
  pre-existing, already-documented `networkidle` flakes noted above,
  each confirmed passing in isolation), and the complete
  `npx playwright test` suite.
- **Prevention:** A fix for one accessibility/correctness property (here:
  guaranteed viewport visibility) can silently trade away a different
  one (non-obstruction) if the fix's own mechanism removes a guarantee
  the element previously had for free (here: occupying flow space).
  Whenever a fix changes an element's position/flow scheme, explicitly
  re-derive and test every property that scheme change could plausibly
  affect, rather than only the property the fix was originally aimed at.

## QL-027 — Analytics field names implied total-attempt accuracy the v2 schema cannot compute; named, documented, and tested the actual last-attempt mastery model instead

- **Status:** Corrected on branch `claude/issue-2-analytics-semantics`
  (Issue #2), draft PR open for independent review, not yet merged.
- **Finding — confirmed ambiguity, reproduced by direct execution before
  any fix was written.** A v2 outcome record is `{c: <latest
  correctness>, n: <total attempt count>, ts: <latest timestamp>}` — it
  never stored a per-attempt history or an independently maintained
  correct-attempt counter. Answering a question (correct, incorrect,
  correct) across three real reloads, and answering a *different*
  question (incorrect, incorrect, correct) across three real reloads,
  both produced the byte-identical stored shape `{c:true, n:3}` (only
  `ts` differed) — 2-of-3 attempts correct and 1-of-3 attempts correct
  are genuinely indistinguishable from the stored record alone.
  Meanwhile `getStats()` exposed `questionsCorrect` and `overallPct` —
  names that read naturally as "how many questions were answered
  correctly overall" / "overall percent correct," i.e. total-attempt
  accuracy — when they have only ever meant "questions whose latest
  attempt was correct." The field names did not disclose this.
- **Impact:** None shipped incorrectly — the underlying behavior
  (last-attempt mastery) was always correct and already documented in
  `README.md`/`docs/CLAUDE_HANDOFF.md` in prose; this is a
  documentation/API-clarity gap, not a data-correctness bug. Found and
  addressed before merge.
- **Cause:** The schema was designed to answer "what is this question's
  current status" cheaply (one record, overwritten in place), which is
  sufficient for last-attempt mastery but was never extended to answer
  "how many of the attempts across this question's history were
  correct" — a fundamentally different question requiring different
  persisted information. The public field names did not signal which
  question they answer.
- **Correct action:** Name the actual model precisely
  (`analyticsModel:'last-attempt-mastery-v1'`), add unambiguous fields
  (`questionsMastered`, `lastAttemptMasteryPct`) alongside the existing
  ones as compatibility aliases (never removed or reinterpreted), and
  state explicitly, in both code comments and documentation, why genuine
  total-attempt accuracy is not implemented and cannot be derived from
  existing data — rather than silently leaving misleading names in place
  or fabricating a metric the data cannot support.
- **Correction:** `getStats()` now returns `analyticsModel`,
  `questionsMastered`, `lastAttemptMasteryPct`, plus `questionsCorrect`/
  `overallPct` as compatibility aliases assigned from the identical
  computed numbers (never independently recomputed). `tally()`'s
  `byDomain`/`byTopic`/`byDifficulty` rows gained `mastered`/`masteryPct`
  alongside the existing `correct`/`pct` aliases. `getWeakAreas()` rows
  gained the same pair. `getUnmastered()`'s return shape is unchanged —
  it already implemented exactly this model's definition of
  "unmastered"; only its documentation was strengthened. `SCHEMA_V`
  stays `2` — no stored field's shape changed, no historical record was
  rewritten, and no fabricated correct-attempt count was introduced for
  existing data. Full model definition: `docs/ARCHITECTURE.md`
  "Analytics semantics: last-attempt mastery."
- **12 new dependency-free tests** in `tests/dom-behavior.mjs` and **4
  new real-browser Playwright tests** in
  `tests/e2e/analytics-semantics.spec.mjs` — full coverage list:
  `docs/VALIDATION.md` "Analytics semantics: last-attempt mastery."
- **Mutation-tested**, each reverted and confirmed `index.html`
  byte-identical via `diff` before committing:
  1. Summed attempt count `n` into the mastery denominator instead of
     counting distinct answered questions — failed exactly the two
     reattempt tests, and no others.
  2. Made mastery sticky ("ever answered correctly") by OR-ing prior
     correctness into `recordAnswer()`'s stored `c` — failed exactly the
     correct→incorrect reattempt test (the one assertion sensitive to
     mastery being able to *drop*), and no others.
  3. Made `questionsCorrect` disagree with `questionsMastered` by a
     constant offset — failed the new alias-agreement tests *and*
     several pre-existing tests that independently assert
     `questionsCorrect` against a directly-computed value, confirming
     the alias guarantee is load-bearing for old and new tests alike.
  4. Removed the stale-id exclusion guard in `getStats()` — failed the
     new stale-record exclusion test *and* every pre-existing QL-024
     stale-ID test depending on the same guard.
- **Full local validation:** `npm test` (160/160),
  `npx playwright test tests/e2e/analytics-semantics.spec.mjs` (8/8
  across both projects), and the complete `npx playwright test` suite.
- **Prevention:** A public field's name is part of its contract. When a
  computed figure could plausibly be misread as a different, more
  general metric than the one actually implemented (here: "correct" /
  "percent correct" read as total-attempt accuracy, not latest-outcome
  mastery), either rename it to be unambiguous or add an explicitly
  named, equally accessible alternative — do not rely on documentation
  alone to correct a misleading name callers will encounter first.

### Addendum — independent review of draft PR #21 found three test-coverage claims stronger than the tests actually proved

- **Status:** Corrected on the same branch
  (`claude/issue-2-analytics-semantics`), before merge. Independent
  review at head `98b8d85b0660aeaac0cf21dbd69e758e41839229` confirmed
  the implementation and analytics decision sound and CI green
  (run `30828361852`), but found three test claims stronger than what
  the tests actually exercised.
- **Finding 1 — confirmed, the "different difficulties" claim was
  untested.** The multi-group aggregate test's own title claimed
  coverage across different domains, topics, AND difficulties, but all
  three selected questions (`m1-q1`, `m2-q1`, `m9-q1`) were difficulty
  `x:1`. A regression that broke `byDifficulty` grouping specifically
  could not have been caught. The test also only spot-checked one topic
  row and one difficulty row rather than asserting every affected row
  exactly.
- **Finding 2 — confirmed, `getWeakAreas()`'s sort order was never
  actually tested.** The test created exactly one topic with enough
  distinct answered questions to qualify (`minAnswered:3`), so
  `getWeakAreas()` always returned a single-row array. A single-row
  array cannot demonstrate sort order — reversing or removing the
  comparator entirely would have produced an identical single-row result
  and passed regardless. The subsequent reattempt changed that one row's
  value but still never exercised ordering between two rows.
- **Finding 3 — confirmed, the Playwright "reattempt" test never
  reattempted.** Despite its title ("a real reattempt still fires
  exactly one answer/progress event pair"), the test answered a single
  fresh question exactly once and asserted event counts from that one
  answer — no reload, no reattempt, no proof that a reattempt's event
  behavior matches a first answer's. Additionally, an unrelated
  `waitForLoadState("networkidle")` appeared after all assertions in a
  neighboring test had already completed, adding a timing dependency
  with no corresponding proof obligation — exactly the class of wait
  responsible for this repository's own previously documented,
  recurring parallel-worker-contention flakes.
- **Impact:** None shipped — the underlying implementation was already
  correct (confirmed by the corrected, stronger tests below still
  passing against the unmodified implementation); this was a
  test-coverage gap, not a product defect. Found and fixed before merge.
- **Cause:** Each test's premise (different difficulties; multiple
  qualifying topics; a genuine reattempt) was assumed from the test's
  own title/intent rather than verified by checking which concrete
  fixture values and call sequence the test body actually used.
- **Correct action:** A test's title is a claim; the fixture data and
  call sequence must be checked to actually produce the conditions the
  title claims, not merely be plausible under a quick reading. A sort
  test needs at least two independently ordered items; an "aggregate
  across categories" test needs fixtures that actually span every named
  category; a "reattempt" test needs an actual second attempt on the
  same item through the application's real supported path.
- **Correction:** Rewrote the multi-group aggregate test with six
  questions deliberately spanning multiple domains, multiple topics, and
  all three difficulty levels, asserting every affected
  `byDomain`/`byTopic`/`byDifficulty` row's `answered`/`mastered`/
  `masteryPct`/`correct`/`pct` exactly, plus an exact key-set comparison
  proving no unexpected aggregate key appears. Rewrote the
  `getWeakAreas()` test with two independently qualifying topics at
  different mastery percentages, asserting weakest-first order, then
  reattempting enough questions across a real reload to invert which
  topic is weaker and confirming the returned order reverses. Rewrote
  the Playwright event test to answer once, reload, install fresh
  counters and a navigation sentinel, prove analytics reads emit zero
  events, then reattempt the same question with the opposite
  correctness, asserting the sentinel survived (no unexpected
  navigation), `n===2`, the latest `c`, immediate mastery change, and
  exact event counts (one `answer`, one `progress`, zero `exercise`,
  zero `persistence`, wildcard count agreeing with exactly those two).
  Removed the unnecessary `networkidle` wait, asserting console
  cleanliness directly from the already-listening fixture instead. Full
  coverage list: `docs/VALIDATION.md`'s "Correction — three
  test-coverage claims were stronger than the tests actually proved."
- **Mutation-tested**, each reverted and confirmed `index.html`
  byte-identical via `diff` before committing:
  5. Collapsed `tally()`'s difficulty grouping into a single bucket —
     failed exactly the corrected multi-group aggregate test, and no
     others.
  6. Reversed `getWeakAreas()`'s sort comparator — failed exactly the
     corrected `getWeakAreas()` test, specifically on row order, and no
     others.
- **Full local validation:** `npm test` (160/160, test count unchanged —
  both corrections rewrote existing tests rather than adding new ones),
  `npx playwright test tests/e2e/analytics-semantics.spec.mjs` (8/8
  across both projects), and the complete `npx playwright test` suite.
- **Prevention:** When reviewing a test whose name asserts a specific
  property (ordering, cross-category coverage, a specific interaction
  sequence like a reattempt), verify the property directly from the
  fixture values and call sequence in the test body — not from the test
  name or a summary of what it "should" cover. A test that would pass
  identically under a plausible regression (e.g. a one-row array under
  any sort comparator; a single-difficulty fixture under broken
  difficulty grouping) is not evidence for the property its name claims.

## QL-028 — `addQuestions()` stored the caller's own object reference, letting a post-call mutation change a live, accepted question; defined and enforced the runtime-content split lifecycle while fixing it

- **Status:** Corrected on branch `claude/issue-2-runtime-content-policy`
  (Issue #2), draft PR open for independent review, not yet merged.
- **Finding 1 — confirmed, real defect: `addQuestions()` stored a live
  caller reference, not a detached copy.** `addQuestions()` validated
  each incoming question, then executed
  `arr.forEach(function(q){ QUIZZES[key].push(q); })` — pushing the
  caller's own object (and its `o` options array, and its optional `w`
  wrong-answer-feedback object) directly into live `QUIZZES`. Reproduced
  by direct execution before any fix: after a successful
  `addQuestions()` call returned, mutating the caller's original
  `source.q`, `source.o[0]`, `source.a`, and `source.why` all changed
  the live, currently-rendered, currently-scored question — including
  its correct-answer index, confirmed by re-answering the original
  correct option and observing it now scored incorrect.
- **Finding 2 — confirmed by direct execution, the pre-existing
  session-only/durable-outcome split (not itself a defect, but
  previously undocumented as a coherent policy).** A question added via
  `addQuestions()` exists only in the current session; reloading
  without reinjection removes its definition from the live quiz
  entirely; if it had been answered, that outcome remains an ordinary
  v2 progress record, now excluded from every current-facing figure by
  the existing stale-ID policy (QL-024); `exportJSON()` includes the
  outcome (keyed by id) but never the definition; importing that export
  does not recreate the definition; and reintroducing the identical
  definition under the same id later revives the preserved outcome
  automatically, via the general QL-024 reintroduction rule, with no
  injection-specific code. This is a genuine split lifecycle — session-
  only definitions, durable-by-id outcomes — and had not previously
  been named or documented as such; the checklist item ("decide whether
  runtime-injected questions remain session-only or use a versioned
  content pack") had not actually been closed.
- **Impact:** None shipped — a real defect (Finding 1) plus an
  undocumented-but-correct existing behavior (Finding 2), both addressed
  before merge.
- **Cause:** `addQuestions()`'s validation function (`questionError()`)
  only checked the SHAPE of each field; nothing in the write path ever
  built a fresh object to commit, so the accepted array element and the
  caller's original element were, and remained, literally the same
  object reference.
- **Correct action:** A public write API accepting caller-supplied
  objects that will be retained past the call's return must commit a
  detached, canonical copy — never the caller's own reference — exactly
  the same principle already applied to progress import
  (`validateImportedState()` rebuilds a fresh object graph; see its own
  file-level comment). Separately, adopt and document the split
  lifecycle explicitly rather than leaving "session-only" as an
  incomplete half-truth that omits the durable-outcome behavior.
- **Correction:**
  1. `validateRuntimeQuestion(q)` (new) validates using the same
     cross-realm-safe primitives already established for progress
     import (`isPlainObject`/`isSafeKey`/`hasOwn`) and, only on success,
     returns a freshly built canonical snapshot — a new object, a new
     `o` array (`.slice()`), and, if present, a new `w` object rebuilt
     key-by-key — referencing nothing from the caller's original object
     graph at any depth. `addQuestions()` now pushes only these
     canonical snapshots into `QUIZZES`.
  2. Validation was simultaneously strengthened to the same standard as
     progress import: rejects any accessor property (via property
     descriptors, before any value is read — a rejected batch entry's
     `id`, for the diagnostic report only, is likewise read via a
     descriptor, never `q.id`, so an adversarial getter is never
     invoked even to explain a rejection), any symbol key, any
     non-enumerable property, any dangerous key
     (`__proto__`/`constructor`/`prototype`), any sparse array (in `o`
     or in the top-level batch array), any non-record object (checked
     by prototype-chain shape, not same-realm identity, so a legitimate
     VM- or browser-realm input is never wrongly rejected), any field
     reachable only via the prototype chain, and any unrecognized
     top-level field.
  3. The existing optional `w` (wrong-answer feedback) field — already
     read at render time via `data.w[chosen]` but never previously
     validated at all — now has a complete, defined, validated schema:
     a plain object mapping a valid option index to a non-empty
     feedback string; anything else (wrong shape, an out-of-range key,
     a non-string value) rejects the question.
  4. Added `getRuntimeContentPolicy()`: a small, machine-readable public
     method returning a fresh, frozen-shape 7-field object stating the
     policy explicitly — including the one honestly-stated limitation
     that the application cannot detect a caller reusing a stable id
     for materially different content across sessions, since a v2
     outcome record carries no definition or content fingerprint to
     compare against.
  5. Documented, but did not implement, the prerequisites for any later
     persistent/versioned content-pack design — see
     `docs/ARCHITECTURE.md` "Future content-pack prerequisites."
- **11 new dependency-free tests** in `tests/dom-behavior.mjs` and **6
  new real-browser Playwright tests** in
  `tests/e2e/runtime-content-lifecycle.spec.mjs` — full coverage list:
  `docs/VALIDATION.md` "Runtime-injected content lifecycle."
- **Mutation-tested**, each reverted and confirmed `index.html`
  byte-identical via `diff` before committing:
  1. Reverted `addQuestions()` to push the caller's original object
     reference instead of the canonical snapshot — failed exactly the
     caller-reference-mutation test, and no others.
  2. Added `QUIZZES` to `exportJSON()`'s output — failed the new
     definition-never-in-export test *and* five pre-existing round-trip
     import tests (the added, unrecognized wrapper key is also rejected
     by the existing, independently strict import-wrapper key
     whitelist — an explainable, legitimate side effect of this
     specific mutation).
  3. Removed the stale-id exclusion guard in `getStats()` — failed the
     new stale-outcome-analytics-exclusion test, the new
     `importJSON()`/reinjection tests, *and* every pre-existing QL-024
     stale-ID test depending on the same shared guard.
  4. Weakened `validateRuntimeQuestion()`'s entry check from
     `isPlainObject(q)` to a bare `typeof q === 'object'` check — failed
     exactly the new adversarial-inputs test (which also directly
     confirms an adversarial `id` getter is never invoked), and no
     others.
- **Full local validation:** `npm test` (171/171),
  `npx playwright test tests/e2e/runtime-content-lifecycle.spec.mjs`
  (12/12 across both projects), and the complete `npx playwright test`
  suite.
- **Prevention:** Any public write method that accepts a caller-supplied
  object and retains data from it past the call's return must build a
  detached copy before committing — a live reference to caller-owned
  data is a mutation-after-the-fact hazard by construction, regardless
  of how thoroughly the object's shape was validated at the moment of
  the call. Additionally: an optional field that is read at render time
  (`w`) but never validated at write time is a latent, currently-
  harmless gap that becomes a real one the moment its write path is
  ever more permissive than assumed — treat "supported but unvalidated"
  as equivalent to "unsupported" until a schema is defined for it.

## QL-029 — an explicit own `w: undefined` passed optional-field validation, then crashed `addQuestions()` with an uncaught exception instead of a structured rejection

- **Status:** Corrected on the same branch
  (`claude/issue-2-runtime-content-policy`), before merge. Independent
  review at head `c78761c0592dbb522e954354a08931615f0ac56c` confirmed
  QL-028's split lifecycle, detached canonical snapshots, public policy
  API, documentation, and general adversarial validation sound, but
  found one further real defect in the optional `w` field's validation.
- **Finding — confirmed, real defect, reproduced through both the
  dependency-free harness and a real Chromium page before any fix was
  written.** An otherwise fully valid question with an explicitly
  present own property `w: undefined` — i.e. `hasOwn.call(q, 'w') ===
  true` but `q.w === undefined` — passed `isValidWrongAnswerFeedback()`,
  because that function's entry check, `if(w === undefined){ return
  true; }`, could not distinguish "the field is genuinely absent" from
  "the field is present, but its value happens to be `undefined`" —
  reading `q.w` produces `undefined` in both cases; only
  `hasOwn.call(q, 'w')` can tell them apart. `validateRuntimeQuestion()`
  then reached its canonical-snapshot step and executed
  `Object.keys(q.w)`, which threw `TypeError: Cannot convert undefined
  or null to object` — an uncaught exception escaping the public
  `addQuestions()` API entirely, rather than the documented, structured
  `{ok:false, error:...}` rejection every other invalid input produces.
- **Impact:** None shipped — PR #22 remained draft/unmerged throughout;
  found and fixed before merge.
- **Cause:** `isValidWrongAnswerFeedback()`'s own value-based `w ===
  undefined` check conflated two genuinely different conditions
  (absent vs. present-but-undefined) that are indistinguishable from a
  bare value read — only a presence check (`hasOwn`) can tell them
  apart — and the function was written to decide both "is this field
  present" and "is this field's value valid" in one place, using a
  method (value comparison) that cannot answer the first question
  correctly.
- **Correct action:** For any optional field, decide presence and
  validity as two separate questions: presence via `hasOwn.call(q,
  <field>)` (the only reliable test), validity — only once presence is
  established — via the field's own schema, with no special-casing of
  `undefined` inside the validity check (since `isPlainObject`/similar
  schema checks already correctly reject `undefined` as an invalid
  value on their own, via their existing falsy/type guards).
- **Correction:** `isValidWrongAnswerFeedback()` no longer contains any
  `w === undefined` special case at all — it now purely validates a
  value already confirmed present. `validateRuntimeQuestion()` computes
  `var wPresent = hasOwn.call(q, 'w');` once, calls
  `isValidWrongAnswerFeedback()` only `if(wPresent)`, and gates the
  canonical-snapshot `Object.keys(q.w)` step on the same `wPresent`
  flag — so that step is never reached unless `w` is both present and
  already confirmed valid. An absent `w` remains valid (the function is
  simply never called); a present `w: undefined` is now correctly
  rejected, atomically, with no exception, exactly like `w: null` or
  any other invalid value. No descriptor-based, cross-realm, exact-key,
  or canonical-snapshot protection from QL-028 was weakened — this
  correction only changes how presence is decided.
- **1 new dependency-free test** in `tests/dom-behavior.mjs` (a focused
  validation matrix: `w` absent, valid empty record, valid populated
  record with detachment proof, and eight distinct rejected-without-
  throwing cases including the exact `w: undefined` counterexample) and
  **1 new real-browser Playwright test** in
  `tests/e2e/runtime-content-lifecycle.spec.mjs` (the exact
  counterexample, proven not to throw via a try/catch boundary in
  `page.evaluate()`, plus a recovery proof: a genuinely valid question
  is successfully injected and answered in the same page context
  immediately afterward, with no reload).
- **Mutation-tested:** restored the original conflated check
  (`if(w === undefined){ return true; }`) inside
  `isValidWrongAnswerFeedback()` — failed exactly the new focused
  validation-matrix test, and for the precise original reason
  (`TypeError: Cannot convert undefined or null to object`, confirmed
  by inspecting the thrown message directly), and no others. Reverted
  and confirmed `index.html` byte-identical via `diff` before
  committing.
- **Full local validation:** `npm test` (172/172),
  `npx playwright test tests/e2e/runtime-content-lifecycle.spec.mjs`
  (14/14 across both projects), and the complete `npx playwright test`
  suite.
- **Prevention:** Never use a bare value comparison (`x === undefined`)
  to answer "is this optional property present" for an object whose
  properties might legitimately be assigned the literal value
  `undefined` — `hasOwn.call(obj, key)` is the only construct that
  distinguishes "absent" from "present with an undefined value," and
  any validator for an optional field should use it explicitly rather
  than inferring presence from a value read.

## QL-030 — added a strict, auditable question-provenance and scientific-review governance model (Issue #3, Milestone 1)

- **Status:** Implemented on branch `claude/milestone-1-question-provenance`
  (Issue #3), draft PR open for independent review, not yet merged.
- **Goal.** Prevent any question from being described as source-checked,
  SME-reviewed, independently reviewed, or release-qualified unless the
  required evidence is explicitly recorded — see
  `docs/CONTENT_GOVERNANCE.md` and `docs/SCIENTIFIC_REVIEW.md`, which
  already documented that no current question carries a recorded source,
  drafter, reviewer, review date, or review scope, and that all 153
  authored questions are Draft.
- **Design decision — a separate registry, not fields on the question.**
  Three designs were compared before writing code: (1) governance fields
  added directly to each `QUIZZES` question object — rejected, since it
  mixes two independently changing lifecycles and would let
  `addQuestions()` accidentally accept or fabricate governance-shaped
  fields on a caller-supplied runtime question; (2) a single flat status
  string per question — rejected, since a bare label cannot carry the
  required evidence, exactly the "label alone bypasses the gate" failure
  mode this task exists to prevent; (3) a **separate `QUESTION_GOVERNANCE`
  registry**, keyed by the question's existing stable authored id — CHOSEN,
  since it keeps governance data separate from both question content and
  learner progress (`state`/`SCHEMA_V`, unchanged) and gives one place to
  enforce "a label requires its evidence." See `docs/ARCHITECTURE.md`
  "Question provenance and scientific-review governance" for the full
  record.
- **Implementation.** `QUESTION_GOVERNANCE` (`index.html`) holds one
  13-field record per authored question id (lifecycle, drafter, sources,
  source-check identity/date, reviewer/reviewDate/reviewScope, documented
  independent review with its own evidence, edition-sensitivity, notes),
  using `null`/`[]`/`false` — never an ambiguous empty string — for
  anything not yet recorded. `assertGovernanceRegistryIntegrity()` runs
  at script-load time and throws if the registry's key set does not
  exactly match the live authored-question id set, or if any record is
  structurally invalid or self-contradictory (a declared lifecycle
  without its prerequisites). `isValidGovernanceRecord()` enforces the
  full prerequisite chain: `source-checked` requires ≥1 well-formed
  source plus a source-checker and date; `sme-reviewed` requires
  everything `source-checked` requires plus a named reviewer, a real
  date, and a specific (non-vague, ≥15-character) review scope;
  `release-qualified` requires everything `sme-reviewed` requires plus a
  named drafter and an explicitly assessed `editionSensitive`.
  `computeGovernanceBlockers()` returns deterministic, stable reason
  codes (`missing-drafter`, `missing-sources`, `missing-source-check`,
  `missing-reviewer`, `missing-review-date`, `missing-review-scope`,
  `unresolved-edition-sensitivity`). The new public
  `CytoCourse.getQuestionGovernance(id?)` method is read-only, returns
  detached (`clone()`-roundtripped) data, emits no event, and returns
  `null` for any unrecognized id — including a runtime-injected
  question's id, since `addQuestions()` never reads or writes this
  registry and `RUNTIME_QUESTION_ALLOWED_KEYS` rejects any
  governance-shaped field outright, so a caller cannot self-certify a
  review status. A persistent, non-modal, non-dismissible in-course
  disclosure (`#reviewDisclosure`, pure static markup, no JS behavior)
  was added inside the hero, stating the structural-vs-scientific-review
  distinction and linking to `docs/SCIENTIFIC_REVIEW.md`.
- **Current data confirmed truthful.** All 153 authored questions remain
  `draft`; every field is `null`/`[]`/`false`; every record carries all 7
  blockers; no drafter, source, source-check, reviewer, review date,
  review scope, independent review, or release-qualification is asserted
  anywhere in the registry.
- **25 new dependency-free tests** in `tests/question-governance.mjs`
  (`npm run test:governance`, included in `npm test`) and **10 new
  real-browser Playwright tests** in `tests/e2e/review-disclosure.spec.mjs`
  — see `docs/VALIDATION.md` "Question provenance and scientific-review
  governance" for the complete coverage list, including fixture-based
  lifecycle-transition tests built by patching a single registry entry's
  source text (the only way to exercise the internal validation logic,
  since there is no public write method for governance data by design).
- **Mutation-tested:** removing an authored governance entry, adding a
  stale entry, marking an incomplete record release-qualified, weakening
  a required source/reviewer/date/scope check, returning the live
  registry by reference instead of through `clone()`, and
  removing/hiding `#reviewDisclosure` — each failed exactly its intended
  test and no others; reverted and confirmed byte-identical via `diff`
  before committing.
- **Full local validation:** `npm test` (172 dependency-free DOM-behavior
  checks + 25 governance checks), targeted
  `npx playwright test tests/e2e/review-disclosure.spec.mjs` (10/10
  across both projects), and the complete `npx playwright test` suite.
- **Scope:** No question, answer, rationale, image, or scientific claim
  changed — this task adds governance metadata, validation, and a
  truthful disclosure; it performs no scientific review, source
  attribution, or content correction. `SCHEMA_V` stays `2`. The
  runtime-injected-content lifecycle (QL-028/QL-029) is unchanged. The
  `README.md` beta warning is unchanged.
- **Prevention:** A lifecycle label is only as trustworthy as the
  mechanism that assigns it. Any future content-state field must be
  paired with a load-time or write-time check that the label's own
  prerequisites are actually present — a comment or convention alone
  cannot prevent a future hand-edit from promoting a record without its
  evidence.

## QL-031 — the question-provenance governance mechanism did not yet fully implement the policy it claimed to enforce (Issue #3, Milestone 1)

- **Status:** Corrected on the same branch
  (`claude/milestone-1-question-provenance`), draft PR open for
  independent review, not yet merged. Independent review at head
  `fd9b897205f9edaeb7c6e87368bc220ba0a9e709` confirmed the separate-
  registry design (QL-030) and the truthful current-data claims sound,
  but found nine distinct ways the mechanism could certify incomplete or
  contradictory records.
- **Finding 1 — confirmed: duplicate governance ids silently collapsed.**
  The original implementation's claim that "duplicate keys are
  structurally impossible in a JS object literal" was wrong — a repeated
  key silently overwrites the earlier value with no error. Reproduced: a
  second `"m1-q1": DRAFT_GOVERNANCE_RECORD()` entry collapsed into
  `QUESTION_GOVERNANCE` while the runtime integrity check and every
  committed test still passed, because the resulting key SET remained
  exactly correct even though a real record had been silently discarded.
- **Finding 2 — confirmed: an inexact citation satisfied
  "source-checked".** `{citation:"ASCP", edition:null, date:null,
  url:null}` — a bare organization acronym with no date and no locator —
  passed `meetsSourceChecked()`, despite `docs/CONTENT_GOVERNANCE.md`
  explicitly stating "General organization names without an exact source
  are not sufficient for a disputed claim."
- **Finding 3 — confirmed: an arbitrary reviewer satisfied
  "SME-reviewed".** `reviewer:"Nobody"` passed `meetsSmeReviewed()`, even
  though `docs/CONTENT_GOVERNANCE.md` defines that state specifically as
  review by Austin, not by an arbitrary named person.
- **Finding 4 — confirmed: a review-scope length heuristic stood in for
  actual verification.** `reviewScope:"rationale checked carefully"`
  (28 characters, not matching the vague-phrase blacklist) satisfied
  `sme-reviewed`, despite omitting distractor quality, domain/difficulty,
  originality, exam integrity, and privacy — five of the seven items
  `docs/CONTENT_GOVERNANCE.md`'s "Review must verify" list requires.
- **Finding 5 — confirmed: lifecycle and blocker semantics were
  inconsistent.** A record with `lifecycle:'draft'` but every other field
  (`drafter`, `sources`, `sourceCheckedBy`/`Date`, `reviewer`,
  `reviewDate`, `reviewScope`, `editionSensitive`) fully and validly
  populated reported `blockers:[]` — a bare empty array indistinguishable
  from a genuinely release-ready record, despite nobody having actually
  approved promotion.
- **Finding 6 — confirmed: independent-review evidence was not
  bidirectionally consistent.** `independentReviewDocumented:false` with
  `independentReviewer`/`independentReviewDate` still populated was
  accepted (only the reverse direction — `true` requiring evidence — was
  checked); a same-person independent reviewer (identical, or a
  case/whitespace variant of, the drafter or primary reviewer) was
  accepted with no distinct-identity check at all.
- **Finding 7 (documentation) — the "computed from evidence" claim
  overstated the code.** The architecture comment claimed lifecycle was
  "computed from" evidence; the code only ever prevented it from
  outrunning its evidence — a stored, intentionally-approved model, which
  is defensible, but was described backwards.
- **Finding 8 (disclosure) — wording overclaimed, and the link served an
  unrendered document.** "Automated tests confirm this course is built
  and behaves correctly" read as a broader positive-correctness claim
  than automated tests establish. The relative link to
  `docs/SCIENTIFIC_REVIEW.md` was confirmed, by direct request, to serve
  raw `text/markdown` on GitHub Pages (`content-type: text/markdown`) —
  an unrendered, confusing document in a browser.
- **Impact:** None shipped — PR #23 remained draft/unmerged throughout;
  found and fixed before merge.
- **Cause:** Each defect traces to validating a WEAKER proxy than the
  policy actually requires: object-literal key uniqueness assumed instead
  of checked; a citation's mere presence checked instead of its
  sufficiency; a reviewer's mere non-emptiness checked instead of its
  approved identity; a review-scope's length checked instead of the
  actual categories verified; blockers computed only from evidence gaps,
  never cross-checked against the declared lifecycle; and independent-
  review evidence checked in only one direction.
- **Correction:**
  - `QUESTION_GOVERNANCE_ENTRIES` (ordered `[id, record]` array) +
    `buildGovernanceRegistry()`, which throws on a repeated id at
    construction, replaces the object-literal registry.
  - A source record gained `locator`; `isSufficientGovernanceSource()`
    requires a ≥20-character citation, an exact edition-or-date, and a
    locator-or-url.
  - `APPROVED_SME_REVIEWERS` (`["Jerad Austin Anderson"]`, matching
    `README.md`'s documented author) + `normalizeGovernanceIdentity()` +
    `isApprovedSmeReviewer()` gates `sme-reviewed`; never exposed by any
    public API.
  - New `reviewChecks` field (closed 7-value `GOVERNANCE_REVIEW_CHECKS`
    enum, matching `docs/CONTENT_GOVERNANCE.md`'s "Review must verify"
    list exactly) must be exactly complete for `sme-reviewed`/
    `release-qualified`; `reviewScope` remains required narrative
    documentation but is no longer the completeness gate; `notes` cannot
    substitute for either.
  - `isReleaseQualified(rec)` (exposed as `releaseQualified` on
    `getQuestionGovernance()`) plus a new `release-approval-pending`
    blocker guarantee `blockers.length === 0` if and only if
    `releaseQualified === true`.
  - `independentReviewDocumented:false` now requires both evidence
    fields `null`; `:true` requires `drafter` known and the independent
    reviewer's normalized identity distinct from both `drafter` and
    `reviewer`. Independent review remains explicitly NOT a
    `release-qualified` prerequisite, matching
    `docs/CONTENT_GOVERNANCE.md`'s actual definition of that state.
  - The architecture comment now states the stored/approved model
    honestly.
  - Disclosure wording changed to "Automated checks validate documented
    structural and behavioral contracts"; its link now points to
    GitHub's rendered blob view; the "first-screen" documentation claim
    was softened to "near the course introduction."
  - `docs/ARCHITECTURE.md` gained a release-gate reconciliation table
    naming, for every `docs/CONTENT_GOVERNANCE.md` Release-qualified
    prerequisite, exactly which mechanism enforces it.
- **Tests:** `tests/question-governance.mjs` rewritten: 46 dependency-free
  tests (up from 25), including two isolated single-check source fixtures
  added specifically so the citation-length and locator/date rules can
  each be mutation-tested independently. `tests/e2e/review-disclosure.spec.mjs`
  updated (10 tests): the link test now performs a real `request.get()`
  against the live GitHub destination and verifies status, content-type,
  and body content — not merely the href string.
- **Mutation-tested:** all 10 required scenarios (duplicate id, short
  citation in isolation, missing date, missing locator, unapproved
  reviewer, incomplete review-checks, complete-evidence-zero-blockers,
  contradictory independent-review flag, same-person independent
  reviewer, hidden disclosure) — each failed exactly its intended test(s)
  and no others, reverted to byte-identical via `diff` before committing.
  Also re-verified the two originally-required mutations (removing an
  authored entry; returning a value without `clone()`) still fail against
  the corrected schema.
- **Full local validation:** `npm test` (172 dependency-free DOM-behavior
  checks + 46 governance checks), targeted
  `npx playwright test tests/e2e/review-disclosure.spec.mjs` (10/10
  across both projects), targeted
  `npx playwright test tests/e2e/runtime-content-lifecycle.spec.mjs`
  (14/14), and the complete `npx playwright test` suite.
- **Scope:** No question, answer, rationale, image, or scientific claim
  changed. No source was added to any current question, no drafter or
  reviewer was asserted, and no question was marked release-qualified.
  `SCHEMA_V` stays `2`. Runtime-injected-content lifecycle (QL-028/
  QL-029) unchanged.
- **Prevention:** When a validator's job is to gate a policy statement
  (e.g. "reviewed by Austin," "review must verify these seven things"),
  check the policy's actual substance (an approved identity registry, a
  closed structured enum) rather than a structural proxy for it (a
  non-empty string, a length threshold) — a proxy can always be satisfied
  by input that technically passes but does not actually mean what the
  policy requires. Also: any "X is impossible" claim in a comment is
  itself an untested assertion until a fixture proves it — the
  duplicate-key claim here was wrong and went unnoticed through an entire
  prior review round because nobody had actually tried it.

## QL-032 — a second independent review found the governance mechanism still did not fully implement its stated policy (Issue #3, Milestone 1)

- **Status:** Corrected on the same branch
  (`claude/milestone-1-question-provenance`), draft PR open for
  independent review, not yet merged. A second independent review at
  head `eaf18c9ca9aac300e7cbc9908853f3e2c6373e1c` (itself the QL-031
  correction) confirmed the separate-registry design, source-sufficiency
  direction, approved-reviewer direction, structured-checklist direction,
  and lifecycle/blocker invariant direction all sound, but found six
  further ways the mechanism could still certify incomplete or
  contradictory records, plus a distinct human-policy tightening.
- **Finding 1 — confirmed: `assertGovernanceRegistryIntegrity()` cannot
  detect a duplicate AUTHORED question id.** QL-031 fixed duplicate
  GOVERNANCE-registry ids (via `buildGovernanceRegistry()`), but the
  integrity check itself still builds its `authoredIds` set by iterating
  `QUIZZES` and writing `authoredIds[q.id] = true` — the exact same
  object-literal collapse, one level up. Reproduced: renaming one
  authored question's id to collide with another's, and removing the
  now-orphaned governance entry so the (miscounted) key sets still lined
  up, let the script load with no error at all — 153 question objects,
  only 152 unique ids, entirely undetected.
- **Finding 2 — confirmed: the citation-length heuristic was itself an
  arbitrary proxy.** QL-031's `≥20`-character floor on `citation` was
  flagged as not actually checking source identity. A source needs a
  separate, genuine `publisher` (responsible author/publisher/
  organization), not just a longer title string.
- **Finding 3 — confirmed: the approved-reviewer set was not structured
  for extensibility.** A single flat array did not name which "subject
  pack" (this course's authored content) it governed, making a future
  different subject pack's reviewer set ambiguous to add correctly.
- **Finding 4 — confirmed: the review-checklist enum was not versioned.**
  `GOVERNANCE_REVIEW_CHECKS` had no version identifier; a future change
  to the mandatory categories could silently redefine what past evidence
  meant.
- **Finding 5 — a deliberate human-policy tightening, not a defect: for
  a public, potentially commercial scientific learning product,
  `release-qualified` should require a documented independent
  second-person review, not merely Austin's own SME review.** The prior
  design (QL-030/QL-031) explicitly left independent review optional,
  per instruction at the time; this instruction reversed that decision.
  `docs/CONTENT_GOVERNANCE.md` and `docs/SCIENTIFIC_REVIEW.md` were
  updated to state the new policy explicitly, and the mechanism now
  enforces it.
- **Finding 6 — confirmed: `computeGovernanceBlockers()` did not name a
  `missing-independent-review` blocker**, an omission that would have
  become a genuine gap once Finding 5's policy took effect.
- **Impact:** None shipped — PR #23 remained draft/unmerged throughout;
  found and fixed before merge.
- **Cause:** Finding 1 is the same root cause as QL-031's Finding 1
  (silent object-literal key collapse), not yet applied to every place
  that pattern appeared. Findings 2–4 are refinements of QL-031's
  corrections that a second review pass caught as still incomplete.
  Finding 5 is a policy decision communicated after QL-031 shipped.
- **Correction:**
  - `assertGovernanceRegistryIntegrity()` now counts the flat authored-
    question list and separately counts the unique id set, throwing the
    instant those two counts disagree — independent of any keyed set,
    and independent of which two ids collided.
  - Source schema gained `publisher` (6 fields total:
    `{citation, publisher, edition, date, locator, url}`).
    `isSufficientGovernanceSource()` requires both `citation` and
    `publisher` to be genuine, non-placeholder strings (exact-token
    denylist match, `GOVERNANCE_SOURCE_PLACEHOLDER_TOKENS`), replacing
    the length heuristic entirely.
  - `APPROVED_SME_REVIEWERS_BY_PACK`, keyed by `GOVERNANCE_SUBJECT_PACK`
    (`'cytogenetics-cg-ascp-v1'`), replaces the flat
    `APPROVED_SME_REVIEWERS` array structure.
  - `GOVERNANCE_REVIEW_CHECKS_V1` replaces `GOVERNANCE_REVIEW_CHECKS`
    (kept as an alias for internal use), documenting the versioning
    discipline for any future checklist change.
  - `meetsIndependentReview(rec)` + `MISSING_INDEPENDENT_REVIEW` blocker;
    `meetsReleaseQualified()` now requires it.
  - `docs/CONTENT_GOVERNANCE.md`'s Release-qualified definition, and
    `docs/SCIENTIFIC_REVIEW.md`'s corresponding text, updated to state
    the independent-review requirement explicitly.
- **Tests:** `tests/question-governance.mjs` extended to 54 dependency-
  free tests (from 46): a dedicated duplicate-authored-question-id test
  (patching `QUIZZES` source text directly, not just the governance
  entries); isolated placeholder-citation and placeholder-publisher
  fixtures; a missing-publisher fixture; a genuine-title-containing-a-
  placeholder-word fixture (proving exact-token, not substring, matching);
  release-qualified-without-independent-review rejection; an sme-reviewed-
  with-complete-evidence-but-no-independent-review blocker-exactness
  test; a malformed (non-string) `reviewChecks` entry test; and a
  zero-blockers-vs-releaseQualified equivalence matrix test across 6
  fixtures (Draft/source-checked/sme-reviewed with complete evidence,
  sme-reviewed missing only independent review, and valid
  release-qualified).
- **Mutation-tested:** 7 targeted reversions — removing the duplicate-
  authored-id count check; removing the citation-placeholder check;
  removing the publisher-non-null requirement; removing
  `isApprovedSmeReviewer()` from `meetsSmeReviewed()`; removing
  `meetsIndependentReview()` from `meetsReleaseQualified()`; removing the
  `missing-independent-review` blocker; and weakening the reviewChecks
  type check to accept non-string values — each failed exactly its
  intended test(s) and no others, reverted to byte-identical via `diff`
  before committing.
- **Full local validation:** `npm test` (172 dependency-free
  DOM-behavior checks + 54 governance checks), targeted
  `npx playwright test tests/e2e/review-disclosure.spec.mjs` (10/10
  across both projects, unaffected by this round's code changes), and
  the complete `npx playwright test` suite.
- **Scope:** No question, answer, rationale, image, or scientific claim
  changed. No source was added to any current question, no drafter or
  reviewer was asserted, and no question was marked release-qualified.
  `SCHEMA_V` stays `2`.
- **Prevention:** When a fix collapses a duplicate-key risk in ONE place
  (a governance registry built from a fixed literal), check every OTHER
  place the same collapsing pattern (`obj[key] = value` inside a loop
  over externally-authored data) appears before declaring the class of
  defect closed — the same footgun reappeared one level up, in code that
  looked unrelated to the first fix.

## QL-033 — confirmed assessment-bank answer-choice cueing risk across the 153-question bank (bank-level, not per-question)

- **Status:** Confirmed known risk, recorded for tracking. Not fixed in
  this PR (Issue #3, Milestone 1) — this is a bank-level assessment-
  validity concern, distinct from per-question scientific governance,
  and rewriting/shuffling/rebalancing questions is explicitly out of
  scope for PR #23.
- **Finding — confirmed by direct, independent computation against the
  live 153-question bank (all `QUIZZES.*` arrays, via
  `window.CytoCourse.getQuestions()`):**
  - Answer-index distribution: index 0/A = 11, index 1/B = 139, index
    2/C = 3, index 3/D = 0.
  - The correct choice is the UNIQUELY longest option in 114 of 153
    questions (74.5%).
  - The correct choice is the longest OR tied-longest option in 133 of
    153 questions (86.9%).
  - These exact counts were independently reproduced by iterating every
    authored question's `o` (options) and `a` (answer index) fields
    directly, not assumed from the report that prompted this entry.
- **Impact:** A test-savvy learner (or an automated answer-key
  extraction) could score well above their actual cytogenetics knowledge
  by exploiting these cues alone — answer index B is correct roughly
  91% of the time, and "pick the longest option" alone would score
  correctly on the majority of questions. This is a genuine psychometric
  validity defect at the BANK level. It says nothing about whether any
  individual question's stated facts, rationale, or difficulty tagging
  are scientifically accurate — that is the separate, per-question
  concern `QUESTION_GOVERNANCE` (QL-030–QL-032) already tracks.
- **Cause:** Authoring pattern — questions were apparently drafted
  without deliberately randomizing/balancing the position of the correct
  answer, and without controlling for the correct answer's option length
  relative to distractors.
- **Correct action (recorded here, not performed in this PR):** A future,
  separately scoped task must rebalance the answer-index distribution
  toward a roughly uniform 25/25/25/25 split (or the nearest achievable
  given fixed 2–4 option counts) and revise distractor lengths so the
  correct answer is not disproportionately the longest option — without
  changing which answer is scientifically correct for any question. This
  requires human/scientific judgment to rewrite distractors credibly, not
  a mechanical shuffle, since a naive index reassignment alone would
  leave the length-cueing problem intact, and a naive distractor-padding
  pass could introduce new scientific inaccuracies.
- **Explicitly not decided here:** no psychometric pass threshold (e.g.
  "no domain may exceed 40% at answer position B") is invented in this
  entry — that is a future, separately scoped measurement-and-policy
  decision, not assumed or implied by this record.
- **Relationship to per-question release-qualification:** Per-item
  release qualification (`QUESTION_GOVERNANCE`, individual questions
  reaching `release-qualified`) is **necessary but not sufficient** for
  the question bank, or any exam form drawn from it, to be considered
  release-qualified as a whole. A bank could have every individual
  question source-checked, SME-reviewed, and independently reviewed, and
  still be unsuitable for release due to this bank-level cueing problem.
  `docs/ARCHITECTURE.md`'s release-gate reconciliation table records this
  distinction explicitly.
- **Tests:** No new automated test asserts a specific target
  distribution (that would require deciding the still-undecided
  threshold above). The exact counts in this entry were verified by a
  one-off computation against the live course data before being
  recorded, and remain independently reproducible via
  `window.CytoCourse.getQuestions()`.
- **Full local validation:** N/A — no code changed for this entry; see
  QL-032 for this PR's code-level validation.
- **Prevention:** Any future automated or human authoring workflow for
  new questions should track the running answer-index distribution and
  relative distractor lengths as it drafts, rather than discovering the
  imbalance only after 153 questions exist. See `docs/ROADMAP.md` for
  the tracked follow-up item.

## QL-034 — the independent-review requirement (QL-032) did not actually enforce the documented evidence contract (Issue #3, Milestone 1)

- **Status:** Corrected on the same branch
  (`claude/milestone-1-question-provenance`), draft PR open for
  independent review, not yet merged. A fourth independent review at
  head `d4eabb6095f616ba119ec59098f75acd702645b5` confirmed QL-030/
  QL-031/QL-032's corrections present and materially improving, but
  found one remaining release-gate blocker.
- **Finding — confirmed by direct reproduction.**
  `docs/CONTENT_GOVERNANCE.md` states an independent reviewer must have a
  stable identity, a recorded date, a defined scope/checklist, and be
  distinct from the drafter and SME reviewer. The QL-032 implementation
  enforced only distinctness and date-shape via `meetsIndependentReview()
  = rec.independentReviewDocumented === true` (plus the pre-existing
  `isValidGovernanceRecord()` distinct-identity checks). Reproduced: a
  release-qualified fixture with `independentReviewer: "A Distinct
  Reviewer"` (an arbitrary, unqualified, unapproved name), only a flag and
  a date, no recorded scope, no checklist, no conflict declaration,
  loaded cleanly and reported `releaseQualified:true` with `blockers:[]`.
  The existing "valid, genuinely distinct future independent-review
  fixture" test in `tests/question-governance.mjs` explicitly blessed
  this exact inadequate record.
- **Impact:** None shipped — PR #23 remained draft/unmerged throughout;
  found and fixed before merge.
- **Cause:** `meetsIndependentReview()` checked only the field that was
  ALREADY present at the time (the boolean flag), not the evidence the
  human policy actually requires (approval, scope, checklist, conflict
  declaration) — none of which had fields to hold them yet.
- **Correction:**
  - Three new record fields: `independentReviewScope` (narrative,
    separate from the SME `reviewScope`), `independentReviewChecks`
    (structured array, separate instance of the same versioned
    `GOVERNANCE_REVIEW_CHECKS_V1` enum used by the SME `reviewChecks`),
    `independentReviewNoConflictDeclared` (`null`/`true`/`false` — `null`
    = not yet assessed, the only valid value while
    `independentReviewDocumented` is `false`; `true` = explicitly
    declared no authorship stake/conflict, the ONLY value that can
    satisfy `release-qualified`; `false` = a conflict was explicitly
    declared to exist, a legitimate but disqualifying record). Record
    schema grows from 14 to 17 own properties.
  - `APPROVED_INDEPENDENT_REVIEWERS_BY_PACK`, keyed by the same
    `GOVERNANCE_SUBJECT_PACK` used for `APPROVED_SME_REVIEWERS_BY_PACK`
    but a SEPARATE registry (different role). **Deliberately empty for
    the current production pack** — no real independent reviewer,
    credential, or approval evidence is invented; this means no record
    can currently reach `release-qualified` via independent review at
    all, matching all 153 current questions remaining Draft.
    `isApprovedIndependentReviewer()` gates it, mirroring
    `isApprovedSmeReviewer()`.
  - `meetsIndependentReview()` now requires: `independentReviewDocumented
    === true`, an approved reviewer identity, a non-empty
    `independentReviewScope`, a COMPLETE `independentReviewChecks` set,
    and `independentReviewNoConflictDeclared === true`.
  - `isValidGovernanceRecord()`'s bidirectional check extended: `false`
    requires every independent-review field (including the three new
    ones) in its blank state; `true` requires reviewer/date present plus
    the existing distinct-identity checks (unchanged in direction, now
    also checked against the primary reviewer with a dedicated
    whitespace/case-variant test, not only the drafter).
  - Blocker codes: kept `missing-independent-review` as the aggregate
    code for `independentReviewDocumented === false` (nothing documented
    at all); added GRANULAR codes for when `true` but still insufficient
    — `missing-independent-reviewer`, `missing-independent-review-scope`,
    `incomplete-independent-review-checks`,
    `missing-independent-review-conflict-declaration` — matching the
    granular style already used for the primary SME review's own
    blockers, decided and documented explicitly (`docs/ARCHITECTURE.md`).
    **SUPERSEDED by QL-035 (2026-08-05):** these four granular codes
    described a state — `independentReviewDocumented: true` with some
    fields still missing — that QL-035 determined should never be
    reachable at all; `true` now requires the complete record or the
    record is rejected at load, so these four codes are dead and were
    removed. This bullet is left as-is because it accurately describes
    what this correction actually shipped at the time; it no longer
    describes the current design. See QL-035 below.
  - Corrected a stale comment inside `isValidGovernanceRecord()` that
    claimed "Independent review is intentionally NOT required for any
    lifecycle state" — true when originally written, false the moment
    `meetsReleaseQualified()` was changed (QL-032) to require it; the
    comment had not been updated to match, a genuine documentation/code
    drift this correction also fixes.
  - Reconciled `docs/CONTENT_GOVERNANCE.md`, `docs/SCIENTIFIC_REVIEW.md`,
    and `docs/ARCHITECTURE.md` with the final schema.
- **Tests:** `tests/question-governance.mjs` extended to 68 dependency-
  free tests (from 54): a new `bootWithApprovedTestReviewerAndPatchedRecord()`
  helper that patches BOTH a test-only entry into the (otherwise empty)
  approved-independent-reviewer list AND a governance record in the same
  script mutation ("test fixtures may patch in a clearly test-only
  approved reviewer," per instruction); the exact reproduced loophole,
  now confirmed rejected; an unapproved-but-otherwise-complete reviewer
  rejection; missing-scope, empty-checklist, and partial-checklist
  rejections; a proof that the SME reviewer's own complete checklist
  cannot substitute for an unpopulated independent checklist;
  null-conflict-declaration and explicit-false-conflict-declaration
  rejections; a malformed (non-boolean)
  `independentReviewNoConflictDeclared` rejection; stray-evidence
  rejections for all three new fields when `independentReviewDocumented`
  is `false`; a same-person-as-SME-reviewer whitespace/case-variant
  rejection (the drafter case already existed; the reviewer case was
  new); a fully populated, test-only approved fixture proven to satisfy
  `release-qualified` with a dedicated detachment proof on the new
  fields; and an exact-granular-blocker-set test for a documented-but-
  incomplete independent review.
- **Mutation-tested:** 5 targeted reversions — removing the
  approved-independent-reviewer gate; reusing the SME `reviewChecks`
  instead of `independentReviewChecks`; removing the independent-scope
  requirement; removing the conflict/no-authorship-stake requirement;
  weakening the `false`-requires-blank-state rule to omit the three new
  fields — each failed exactly its intended test(s) and no others,
  reverted to byte-identical via `diff` before committing.
- **Full local validation:** `npm test` (172 dependency-free
  DOM-behavior checks + 68 governance checks), targeted
  `npx playwright test tests/e2e/review-disclosure.spec.mjs` (10/10
  across both projects, unaffected by this round's code changes), and
  the complete `npx playwright test` suite.
- **Scope:** No question, answer, rationale, image, or scientific claim
  changed. No source was added to any current question, no drafter,
  reviewer, or independent reviewer was asserted, and no question was
  marked release-qualified. `SCHEMA_V` stays `2` — this registry is not
  learner progress.
- **Prevention:** When a human policy document lists MULTIPLE required
  properties of an evidence type ("stable identity, recorded date,
  defined scope/checklist, and distinct from X and Y"), verify the code
  checks EVERY listed property, not just the ones that happened to
  already have a field to hold them — a partial implementation that
  satisfies some sub-clauses can look complete without a clause-by-clause
  comparison against the source policy text.

## QL-035 — `independentReviewDocumented:true` still permitted an incomplete record; blocker codes conflated "missing" with "complete but disqualified" (Issue #3, Milestone 1)

- **Status:** Corrected on the same branch
  (`claude/milestone-1-question-provenance`), draft PR open for
  independent review, not yet merged. A fifth independent review at head
  `92732b5df97f893bd8771b0d47b810d3880dbb9e` (the QL-034 correction)
  found one remaining defect in the field the prior correction had just
  added.
- **Finding — confirmed by direct reproduction.** QL-034 added
  `independentReviewScope`, `independentReviewChecks`, and
  `independentReviewNoConflictDeclared`, but `isValidGovernanceRecord()`
  never required them to be populated when
  `independentReviewDocumented` was set `true` — only `meetsIndependentReview()`
  (a `release-qualified`-only qualification check) looked at them.
  Reproduced: a fixture with `independentReviewDocumented: true`, a
  present `independentReviewer` and `independentReviewDate`, but
  `independentReviewScope: null`, `independentReviewChecks: []`, and
  `independentReviewNoConflictDeclared: null` loaded successfully as a
  structurally valid record. A committed test in
  `tests/question-governance.mjs` explicitly expected exactly this
  "documented but missing scope/checklist/conflict-declaration reports
  granular blockers" record to load — that test's own expectation was
  the bug: it let a question be described as having a "documented"
  independent review when almost none of the required evidence existed,
  contradicting the field's own name and the "bidirectionally exact"
  claim made in the PR body and `docs/ARCHITECTURE.md`.
- **Impact:** None shipped — PR #23 remained draft/unmerged throughout;
  found and fixed before merge.
- **Cause:** The three fields added in QL-034 were wired into the
  qualification check (`meetsIndependentReview()`) but never into the
  structural validity check (`isValidGovernanceRecord()`)'s existing
  bidirectional `independentReviewDocumented` block, which still only
  checked the two ORIGINAL fields (`independentReviewer`,
  `independentReviewDate`) present at the time that block was first
  written (QL-032) — the block was never revisited when the three new
  fields were added alongside it in the same correction.
- **Correction:**
  - `isValidGovernanceRecord()`'s independent-review block now enforces
    `independentReviewDocumented` as a true all-or-nothing package.
    `false` still requires every independent-review field blank. `true`
    now REQUIRES, in the same record: non-empty `independentReviewer`; a
    valid `independentReviewDate`; a non-empty `independentReviewScope`;
    a COMPLETE `independentReviewChecks` (exact-set match via
    `hasAllRequiredReviewChecks()`, not the structural-only
    `isValidReviewChecksArray()`); an actual boolean
    `independentReviewNoConflictDeclared` (never `null`); a known
    `drafter`; and normalized-distinct identity from both drafter and
    SME reviewer. Any `true` record missing any of this now fails at
    script load, not merely a reported blocker. No partial/in-progress
    review state was introduced; a future "review started but not
    finished" workflow needs its own, separately reviewed status field.
  - Because an incomplete `true` record can no longer exist in any
    successfully loaded registry, the four granular "missing-*" blocker
    codes QL-034 added became dead code and were removed (see the
    SUPERSEDED marker on QL-034 above) rather than retained for
    contract stability. Two new codes describe what a *complete*
    documented review can still fail on — qualification, not
    completeness: `unapproved-independent-reviewer` (present identity,
    not on the approved list — never called "missing," since the
    identity is present) and `independent-review-conflict-declared`
    (present declaration, value `false` — never called "missing," since
    the declaration is present and says a conflict exists).
  - `meetsIndependentReview()` and `computeGovernanceBlockers()`
    simplified accordingly: they no longer re-check scope/checklist
    completeness, since it is now load-time-guaranteed whenever
    `documented:true`; `meetsIndependentReview()` now checks only
    approval and no-declared-conflict.
  - Reconciled `docs/CONTENT_GOVERNANCE.md`, `docs/SCIENTIFIC_REVIEW.md`,
    `docs/ARCHITECTURE.md`, and the PR #23 body's "bidirectionally exact"
    paragraph (which previously said `true` requires only reviewer/date
    and distinctness) with the final schema. Corrected the main
    in-source `GOVERNANCE_RECORD_KEYS` schema comment, which still said
    "EXACTLY these 14 own properties" and did not document the three
    QL-034 fields at all (17 properties, documented field-by-field).
- **Tests:** `tests/question-governance.mjs`, 68 → 70 (net, after
  removing the one obsolete test whose expectation was the bug and
  adding several new ones): missing-scope, empty-checklist, and
  partial-checklist rejected at load; a proof the SME reviewer's own
  complete checklist cannot substitute for an empty independent one;
  null-conflict-declaration and malformed-conflict-declaration rejected
  at load (the null case deliberately exercised at
  `lifecycle: 'sme-reviewed'`, not `'release-qualified'`, to isolate the
  structural check under test from a separate, qualification-level check
  that would otherwise also reject a `null` value for an unrelated
  reason and mask whether the structural gate itself was load-bearing —
  a masking issue caught during this round's own mutation testing); a
  complete-but-unapproved fixture that loads, stays
  `releaseQualified:false`, and reports exactly
  `unapproved-independent-reviewer`; a complete-but-conflicted fixture
  that loads, stays `releaseQualified:false`, and reports exactly
  `independent-review-conflict-declared`; a complete, approved,
  conflict-free fixture reaching `releaseQualified:true` with zero
  blockers, with a detachment proof extended to cover the conflict
  field; a full-registry scan asserting no `documented:true` record in
  `getQuestionGovernance()`'s output can ever be incomplete; and two new
  tests proving `meetsReleaseQualified()` itself, not only
  `computeGovernanceBlockers()`'s display logic, rejects a
  `release-qualified` label backed by a complete-but-unapproved or
  complete-but-conflicted independent review.
- **Mutation-tested:** 7 targeted reversions — allowing `true` without
  scope, allowing `true` without a complete checklist, allowing `true`
  with a `null` conflict declaration, treating an unapproved reviewer as
  approved, treating a declared conflict as conflict-free, and reverting
  each of the two new blocker codes' string values — each failed exactly
  its intended test(s) and no others, reverted to byte-identical via
  `diff` before committing. Two mutations (unapproved-as-approved,
  declared-conflict-as-conflict-free) initially showed ZERO failures
  against the pre-existing suite — a genuine, previously-uncovered test
  gap (no test asserted rejection at load time for a
  `release-qualified`-labeled record built on complete-but-disqualified
  independent review, only that the correct blocker was reported at a
  lower lifecycle), not a masking artifact; the two new tests above were
  added specifically to close it, after which both mutations failed
  exactly those tests.
- **Full local validation:** `npm test` (172 dependency-free
  DOM-behavior checks + 70 governance checks), targeted
  `npx playwright test tests/e2e/review-disclosure.spec.mjs` (10/10
  across both projects, unaffected by this round's code changes), and
  the complete `npx playwright test` suite (237/238 passing; the one
  failure was GitHub's own transient 429 rate-limit on the live
  link-reachability check in that same file, confirmed transient by an
  isolated re-run passing cleanly).
- **Scope:** No question, answer, rationale, image, or scientific claim
  changed. No source, drafter, reviewer, or independent reviewer was
  fabricated; the production `APPROVED_INDEPENDENT_REVIEWERS_BY_PACK`
  list stays empty. `SCHEMA_V` stays `2`. All 153 questions remain
  Draft with every governance field blank.
- **Prevention:** When a correction adds new fields alongside an
  existing bidirectional validity check, verify the EXISTING check was
  actually extended to cover the new fields, not just that a DIFFERENT,
  later-stage check (here, the qualification check) happens to reference
  them — two checks referencing the same fields for different purposes
  (structural completeness vs. qualification) can create the illusion of
  coverage where only one of them is load-bearing at the point that
  matters (record validity at load, not just release-gate qualification).

## QL-036 — QL-033 foundation delivered: frozen baseline, Gate A/Gate B design, deterministic pilot batch (Issue #24, Phase 0 steps 1-3)

- **Status:** Delivered on branch `claude/phase-0-ql033-foundation`, draft
  PR open against `main` for independent review, not yet merged. This is
  **foundation only** — QL-033 itself remains confirmed and unresolved;
  see `docs/ASSESSMENT_VALIDITY.md` for the complete record this entry
  summarizes.
- **Scope:** `docs/LEARNING_PLATFORM_ROADMAP.md` Phase 0's first three
  batched-remediation steps — (1) freeze and independently reproduce the
  original QL-033 baseline, (2) define the Gate A bank/form statistical
  guardrails and the Gate B item-writing/cue-review rubric, (3) select a
  deterministic, representative pilot batch. Steps 4-9 (actual item
  rewriting, review, re-audit, scaling) are explicitly **not** performed
  here.
- **Tooling delivered:** `scripts/assessment-cue-audit.mjs`, the single
  authoritative implementation of every measurement, Gate A rule, and
  pilot-selection algorithm this entry describes, imported (never
  re-implemented) by `tests/assessment-cue-audit.mjs` (53 dependency-free
  checks) and `tests/e2e/assessment-cue-audit.spec.mjs` (10 real-browser
  cross-check tests across both configured projects). `npm run
  audit:assessment-cues` runs the human-readable report; `-- --json`
  produces deterministic machine-readable output.
- **Baseline reproduction:** independently re-derived (not copied from
  QL-033's own text) against the live 153-question bank: position counts
  A=11/B=139/C=3/D=0, uniquely-longest 114/153, longest-or-tied 133/153 —
  an exact match to QL-033's original figures, confirmed by a dedicated
  test that would fail if the bank or the measurement diverged from the
  frozen record.
- **Length-measurement finding (superseded — QL-037):** this entry
  originally claimed QL-033's original metric was "independently
  identified" as plain JavaScript `.length`. **That overstated the
  evidence — see QL-037: reproducing the frozen counts is evidence the
  original method was character-count-shaped, not proof of exactly which
  implementation was used; no original script survives to check.** QL-033's
  metric was independently identified (by testing candidate metrics until
  one reproduced the recorded counts, not assumed) as plain JavaScript
  `.length` (raw UTF-16 code units) — confirmed distinct from a word-count
  metric, which produces different counts (89/153, 138/153) on the same
  data. A more robust canonical metric (`canonicalLength()`: strip literal
  markup, decode HTML entities, NFC-normalize, collapse whitespace, strip
  one trailing decorative punctuation mark, count grapheme clusters) was
  defined for future use **(superseded — QL-037: this design measured a
  different string than `index.html` actually renders to learners; see
  QL-037 for the corrected metric)**; it currently reproduces the identical
  counts to the historical metric on every one of the 153 questions'
  options (no markup, entities, irregular whitespace, or non-BMP
  characters exist in the current bank), so no divergence from the frozen
  baseline exists yet — but the historical numbers are preserved as an
  immutable record (`ORIGINAL_BASELINE`, `Object.freeze()`d) regardless, so
  a future divergence, if one ever occurs, can never silently overwrite
  them.
- **A genuine implementation bug found and fixed during this same
  work, before any test asserted the wrong behavior as correct:** an
  early version of `canonicalLength()` decoded HTML entities before
  stripping tags. That order let an escaped tag typed as literal source
  text (e.g. `&lt;tag&gt;`, meant to be read as the visible characters
  `<tag>`) decode into something that then looked exactly like a real tag
  and get wrongly stripped — undercounting genuinely visible text as zero
  characters. Caught by a test written against the *intended* behavior
  (not against whatever the first implementation happened to do), before
  any code merged. Fixed by stripping literal tags first, decoding
  entities second; a dedicated regression test and a test confirming a
  real current option's literal `>` comparison-operator character
  (`"Countable > analyzable > karyotypable"`, module 9) is never
  mis-stripped were both added. No current measurement was affected by
  either the bug or the fix (verified: zero current options contain
  markup or entities), but a future authored item using either could have
  been silently mismeasured had this not been caught here.
- **Gate A defined**, with two authoritative, directly-inspected sources
  (University of Illinois CITL "Improving Your Test Questions," items #11
  and #14; NBME Item-Writing Guide, November 2020, "Correct Option Stands
  Out," page 21 — both quoted verbatim with retrieval dates in
  `docs/ASSESSMENT_VALIDITY.md`), an explicit, justified numeric threshold
  (`PRACTICAL_MARGIN = 0.15`, an additive allowance above the `1/n` chance
  rate — 40% max share at n=4), a zero-floor rule for a never-used
  position, and a statistical corroboration (chi-square / normal
  approximation, α=0.01, only computed above the standard minimum
  expected-cell-count of 5, otherwise honestly reported
  `not-computed`/`inconclusive` rather than silently passed. **The
  current bank, and every one of its 17 individual forms, is reported as
  FAILING Gate A** — confirmed by a dedicated test, and by design: no
  threshold was weakened to make the present bank pass.
- **Gate B defined**: a 17-point human-reviewer rubric in
  `docs/ASSESSMENT_VALIDITY.md` covering distractor plausibility,
  parallel construction, grammatical/keyword/absolute-word cues,
  paired-opposite and all/none-of-the-above risks, padding risk,
  rationale/feedback alignment, stable-ID-preservation-vs-supersession
  criteria, and quarantine as a legitimate outcome. Explicitly kept
  distinct from scientific correctness, `QUESTION_GOVERNANCE` lifecycle,
  Gate A's bank-level statistics, diagnostic eligibility, and future
  psychometric validation. No question has been reviewed against it.
- **Deterministic pilot batch selected**: 13 of 153 questions
  (`final-q33`, `m1-q1`, `m1-q2`, `m1-q3`, `m12-q6`, `m15-q1`, `m16-q1`,
  `m2-q1`, `m2-q3`, `m4-q1`, `m6-q1`, `m6-q4`, `m7-q2`), via a purely
  mechanical, cherry-pick-resistant rule (first-encountered representative
  per domain × cueClass stratum in canonical file order, then
  supplemental coverage passes for difficulty, answer position, form
  context, and distractor-feedback structure) — confirmed deterministic
  across repeated runs by a dedicated test. Selection records only
  mechanical facts (stratum, current cue measurement, current governance
  state) — no item's scientific content was evaluated, and selection is
  explicitly not authorization to rewrite.
- **Two honest domain-level findings surfaced by this work** (not
  previously broken out in QL-033's original bank-wide entry): the
  `operations` domain's correct answer is the uniquely longest option in
  all 10 of its questions (100%); the `molecular` domain has zero
  `not-longest` items across its 14 questions (13 uniquely-longest, 1
  tied-longest). Recorded here and in `docs/ASSESSMENT_VALIDITY.md` for
  whoever performs the later item-rewriting batches.
- **Impact:** None shipped to production — draft PR, not yet merged. No
  question, answer, rationale, distractor feedback, domain, topic,
  difficulty, or stable ID was changed; `index.html` is byte-for-byte
  unchanged by this work. No `QUESTION_GOVERNANCE` field was populated;
  all 153 questions remain `draft`. QL-033 is not marked corrected.
- **Tests:** 53 new dependency-free checks (`tests/assessment-cue-audit.mjs`)
  covering the frozen-baseline reproduction, both length metrics
  (including the entity/tag-order regression above), malformed-input
  rejection, 2/3/4-option generalization, Gate A boundary/threshold
  behavior (inconclusive/pass/fail transitions, chi-square validity
  floor, both-direction length-rate flagging), the current bank's and
  every form's confirmed Gate A failure, and pilot-selection determinism
  and coverage. 10 new real-browser Playwright checks
  (`tests/e2e/assessment-cue-audit.spec.mjs`) confirming
  `window.CytoCourse.getQuestions()` and the dependency-free audit agree
  exactly, and that reading the audit's inputs touches no progress,
  storage, or event.
- **Mutation-tested:** 8 targeted reversions against
  `scripts/assessment-cue-audit.mjs` (never `index.html`) — position-
  change detection, correct-answer-length-change detection, tie-handling
  correctness, module omission, module double-counting, generalization
  collapse (hardcoded option count), Gate A threshold weakening, and
  pilot-selection determinism — each failed exactly its intended,
  directly-attributable test(s) and no others, reverted to byte-identical
  via `diff` before committing. The Gate A threshold-weakening mutation
  was caught by the per-form test specifically; the whole-bank test
  remained independently failing at N=153 even at the weakened margin,
  expected redundancy rather than a masked gap. See
  `docs/VALIDATION.md` for the full record.
- **Full local validation:** `npm test` (172 dependency-free DOM-behavior
  checks + 70 governance checks + 53 assessment-cue checks + 5
  deployed-revision checks) and the complete `npx playwright test` suite,
  both green except pre-existing, already-documented flakes confirmed
  transient by isolated re-run.
- **Scope:** No product code behavior changed for any existing feature;
  `index.html` is unmodified. No scientific review, psychometric
  validation, or QL-033 correction was performed or claimed.
- **Prevention:** When defining a statistical or measurement threshold,
  reproduce the number the threshold is meant to catch independently
  (here, the historical QL-033 counts) before trusting any derived
  metric — and write the tests against the *intended* correct behavior
  first, not against whatever the first draft implementation happens to
  output, which is exactly what caught the entity/tag-order bug above
  before it reached a committed baseline.

## QL-037 — QL-036's Gate A design was unreachable for real small forms; its length metric measured the wrong string; nine further reproducibility/validity gaps (Issue #24, Phase 0 steps 1-3)

- **Status:** Corrected on the same branch
  (`claude/phase-0-ql033-foundation`), draft PR open against `main` for
  independent review, not yet merged. QL-033 itself remains confirmed and
  unresolved; this entry corrects the QL-036 *tooling*, not the bank.
- **Finding — ten problems, each reproduced by direct construction before
  any fix (full detail in `docs/ASSESSMENT_VALIDITY.md`):**
  1. **Gate A was mathematically unreachable for real small forms.**
     `evaluatePositionBalance()`/`evaluateLengthBalance()` treated any
     scope below `5n` observations as `inconclusive` unless it failed.
     Confirmed: a perfectly balanced synthetic 5-item, 4-option form
     reported `inconclusive`, never `pass` — and every real course form
     has 5-9 items, the pilot has 13. No real form or the pilot could
     ever pass, contradicting Phase 0's own exit criteria.
  2. **The canonical length metric measured a different string than the
     one actually rendered.** `index.html`'s `esc()` round-trips option
     text through `textContent`/`innerHTML` losslessly — a literal
     `<b>Bold</b>` or `&amp;` displays to the learner as those literal
     characters, never interpreted. The prior `canonicalLength()` stripped
     tag-shaped text, decoded entities, and stripped trailing punctuation
     — all three measured text the learner never sees.
  3. **Mixed option-count scopes were never actually evaluated for
     length.** `evaluateGateA()` made the length result `inconclusive`
     whenever more than one option-count group was present, despite the
     feature's claimed generic 2/3/4-option support.
  4. **The length null model ignored tie structure.** Comparing only the
     uniquely-longest rate against a flat `1/n` missed a bank that always
     keys a member of a *tied* maximum-length set. Confirmed: a 50-item
     synthetic bank with 20% uniquely-longest (looks normal against a
     flat 25% baseline) and 80% two-way-tied-with-correct-always-included
     (100% in the max-length set) passed the old check entirely.
  5. **Statistical computability and regime-selection logic disagreed.**
     The z-test's `N*p*(1-p) >= 5` condition and the status logic's
     `N >= 5n` condition were separately derived and could diverge; the
     length check was also mis-labeled a "two-proportion z-test" (it was
     one-sample).
  6. **Pilot selection depended on input array order**, and the committed
     test claiming to prove otherwise did not: its `strataOf()` helper
     filtered to `stratum === "domain-x-cueClass"` then mapped to
     `.stratum`, producing only the constant Set `{"domain-x-cueClass"}`
     regardless of which domains/cueClasses were actually selected —
     vacuously true, unable to catch the order-dependence it was named
     for.
  7. **`ORIGINAL_BASELINE` froze only aggregate counts, not the exact
     153 ids.** A hypothetical id removed and replaced by an unrelated
     one could preserve every aggregate count. `noDuplicateOrOmittedIds`
     checked only uniqueness (`idSet.size === length`) despite its name.
  8. **Historical-method provenance was overstated.** Reproducing
     QL-033's aggregate counts with raw `.length` was presented as
     evidence of the *original* one-off method; no original script
     survives to actually prove that.
  9. **The NBME citation was mislabeled.** Both CITL and NBME were called
     "directly inspected primary sources," but the NBME wording was
     extracted from a third-party mirror because the official PDF is
     gated behind a lead-capture form (confirmed again for this
     correction: the official download URL returns an HTML landing page,
     not a PDF; an archive.org mirror could not be reached).
  10. **The `--json` CLI output embedded `new Date().toISOString()`**,
      so identical input produced byte-different output across runs,
      contradicting the deterministic-output claim.
- **Impact:** None shipped — PR #26 remained draft/unmerged throughout;
  found and fixed before merge.
- **Correction (full detail, exact mathematics, and every reproduced
  counterexample in `docs/ASSESSMENT_VALIDITY.md`):**
  1. **Two-regime Gate A for position balance**, both driven by one
     shared threshold `REGIME_THRESHOLD(n) = 5n`: below it, a fully
     derived, zero-free-parameter **exact pigeonhole rule** (every
     position's count must be `floor(N/n)` or `ceil(N/n)`, the
     mathematically tightest achievable balance) decides pass/fail with
     no statistic attempted; at or above it, the existing practical-
     margin-plus-chi-square approach (now guaranteed computable by the
     same threshold). `inconclusive` is now reserved for exactly `N < n`.
     Verified: synthetic balanced 5/6/7/8/9/13-item forms all now pass;
     correspondingly imbalanced ones still fail.
  2. **`canonicalLength()` rewritten** to NFC-normalize, collapse
     whitespace (a genuine rendering effect — no `white-space:pre`
     override on `.qopt`), and count grapheme clusters — no entity
     decoding, no tag stripping, no punctuation stripping. A new
     real-browser **rendered-text oracle**
     (`tests/e2e/assessment-cue-audit.spec.mjs`) injects synthetic
     runtime-only option text (literal tags, entities, NFC/NFD, emoji,
     whitespace, punctuation) via the existing `addQuestions()` API and
     directly compares the metric against the real rendered `.qopt` text.
  3. **Length association evaluated once per scope, ungrouped**, since
     the corrected per-item model (below) needs no option-count grouping.
  4. **Tie-aware length model**: per item, `P(correct in max-length set)
     = k_i/n_i` (tie count over option count), aggregated as an exact
     **Poisson-binomial** distribution (independent Bernoulli trials with
     different probabilities) via a new `O(N^2)` DP
     (`poissonBinomialPMF`/`poissonBinomialTwoSidedPValue`) — exact and
     valid at any N, needing no separate small/large-N split for this
     check. Symmetric both directions, documented why. Verified against
     the exact evasion scenario in Finding 4, now correctly failing.
  5. **`REGIME_THRESHOLD(n)`** is now the single named value used
     everywhere a "is this large enough" decision is made for position
     balance; the length check's exact test needs no such threshold at
     all, eliminating this class of disagreement structurally. Naming
     corrected throughout.
  6. **Pilot selection sorts into a canonical order first**
     (`compareCanonicalOrder`, derived only from each id — numeric module
     comparison, `final` sorting last — never from array position), then
     applies the same stratum-first-encountered rule. Verified: reversing
     or pseudo-randomly shuffling the live bank's 153-item input array now
     produces the *exact same* selected ids. `FROZEN_PILOT_MANIFEST`
     records the resulting ordered list; a test enforces it exactly.
  7. **`ORIGINAL_ID_MANIFEST`** (new
     `scripts/assessment-cue-audit-id-manifest.mjs`) freezes the literal
     153 ids independently of the live bank, plus a SHA-256 digest.
     `compareToIdManifest()` detects removal, addition, replacement, and
     duplication. `noDuplicateOrOmittedIds` renamed to the accurately
     scoped `noDuplicateIds`; `idManifestCheck` is the real
     omission/addition/replacement detector.
  8. Every historical-method claim corrected to the exact strength the
     evidence supports: raw `.length` *independently reproduces* the
     frozen counts; word count does not; the *original* one-off method
     cannot be proven from retained evidence, since none survives.
  9. NBME downgraded from "directly inspected primary source" to an
     explicitly labeled, unverified secondary mirror citation, kept only
     as corroborating color; CITL (fully, directly verified, covering
     both required guidance points) is now the sole basis for every
     numeric threshold and rule.
  10. The deterministic JSON payload
      (`buildDeterministicReport()`) no longer contains any wall-clock
      value; execution metadata is generated separately and passed only
      to the human-readable console banner.
- **Tests:** `tests/assessment-cue-audit.mjs` rewritten and expanded from
  53 to 81 dependency-free checks, each new one directly reproducing its
  counterexample before asserting the fix: balanced/imbalanced position
  fixtures at N=5,6,7,8,9,13; the exact `REGIME_THRESHOLD` boundary
  (below/at/above); the tie-evasion scenario from Finding 4, all-way-tie
  zero-information case, and both-direction symmetry; mixed-option-count
  pass and fail fixtures; reversed- and shuffled-input pilot-selection
  equality (a real, strong assertion, not the prior vacuous one);
  frozen-pilot-manifest exact match; id-manifest removal/addition/
  replacement/duplication detection; deterministic-JSON byte-identity
  across repeated calls with no timestamp present. `tests/e2e/assessment-cue-audit.spec.mjs`
  expanded to 7 real-browser checks, including the rendered-text oracle
  and reversed-order pilot-selection equality against the live bank.
- **Mutation-tested:** 8 targeted reversions against
  `scripts/assessment-cue-audit.mjs` (never `index.html`), covering every
  required category, each failed exactly its intended, directly-attributable
  test(s) and no others, reverted to byte-identical via `diff` before
  committing. See `docs/VALIDATION.md` for the full record. **Count
  precision (corrected retroactively — QL-038):** this is this round's
  (round 2's) count specifically, separate from round 1's (QL-036's) own 8
  mutations and round 3's (QL-038's) 4 — see QL-038 for the reconciled,
  cumulative total across all three rounds. An earlier PR-body draft
  described "8 mutations across two rounds," which undercounted the actual
  total; that wording has been corrected in the PR body.
- **Full local validation:** `npm test` (172 dependency-free DOM-behavior
  checks + 70 governance checks + 82 assessment-cue checks + 5
  deployed-revision checks) and the complete `npx playwright test` suite,
  both green except pre-existing, already-documented flakes confirmed
  transient by isolated re-run.
- **Scope:** No question, answer, rationale, distractor feedback, domain,
  topic, difficulty, or stable ID changed; `index.html` is unmodified. No
  `QUESTION_GOVERNANCE` field populated; all 153 questions remain `draft`.
  QL-033 is not marked corrected. Phase 0 stays unchecked in
  `docs/ROADMAP.md` and Issue #24.
- **Prevention:** A validity check's *achievability* is itself a
  correctness property, not just its detection power — a check that can
  never be satisfied by good-faith content is as much a defect as one
  that never detects bad content, and both need a directly-constructed
  counterexample (a synthetic fixture proven to pass, or proven to evade
  detection) before being trusted, not only a check against the one
  already-known-bad real bank.

## QL-038 — QL-037's own tests only proved position balance in isolation, not the combined Gate A; aggregate balance alone missed predictable answer-key sequences; statistical significance alone could fail a practically trivial deviation; the exact two-sided p-value convention was unnamed (Issue #24, Phase 0 steps 1-3)

- **Status:** Corrected on the same branch
  (`claude/phase-0-ql033-foundation`), draft PR still open against `main`
  for independent review, not yet merged. QL-033 itself remains confirmed
  and unresolved; this entry corrects the QL-036/QL-037 *tooling* further,
  not the bank.
- **Finding — four problems, each reproduced by direct construction before
  any fix (full detail in `docs/ASSESSMENT_VALIDITY.md`):**
  1. **QL-037's own size-loop tests, and the documentation table they
     supported, only ever exercised `evaluatePositionBalance()` directly.**
     No test constructed a full question form and asserted
     `evaluateGateA(...).overall === "pass"`, including the tie-aware
     length component. This was a test/documentation coverage gap — the
     underlying `evaluateGateA()` was independently confirmed, by direct
     construction, to already support a full-Gate pass at every required
     size once a genuinely decoupled fixture was used; an initial naive
     fixture construction was found to accidentally introduce its own
     length cue and, separately, to use a plain `i % n` rotation that is
     itself a repeating cycle (see Finding 2) — both caught before being
     used as "proof," not shipped as false evidence.
  2. **Aggregate position balance does not detect a predictable answer-key
     sequence.** Confirmed directly: `A,B,C,D,A,B,C,D,A` (N=9, n=4)
     satisfies `exactPigeonholeBalance()` perfectly
     (`positionCounts=[3,2,2,2]`, `balanced: true`) while being an
     obviously learnable cycle; nothing in Gate A examined sequence order
     before this correction.
  3. **A statistically significant but practically trivial large-N
     deviation could fail Gate A on significance alone.** Confirmed
     directly: `N=100,000`, `n=4`, position counts
     `[25,500, 24,834, 24,834, 24,832]` — maximum observed share 25.5%,
     far inside the 40% practical threshold — yet chi-square (13.33)
     exceeds the α=0.01 critical value (11.345), so the prior
     `practicalFail || statisticalResult === "rejects-uniform"` decision
     failed this scope on statistical significance alone. The same defect
     existed in length association's decision rule.
  4. **The exact two-sided Poisson-binomial p-value convention was
     unnamed, and not the only defensible one.** The prior
     `poissonBinomialTwoSidedPValue()` used a doubled-minimum-tail
     convention (`2 * min(P(X<=obs), P(X>=obs))`, clipped to 1) without
     stating so, and without acknowledging that "two-sided" is not
     self-defining for an asymmetric discrete distribution (this
     Poisson-binomial generally is asymmetric, since per-item null
     probabilities differ item to item).
- **Impact:** None shipped — PR #26 remained draft/unmerged throughout;
  found and fixed before merge.
- **Correction (full detail, exact mathematics, and every reproduced
  counterexample in `docs/ASSESSMENT_VALIDITY.md` sections 4.3a, 4.4a,
  4.6a, 4.10):**
  1. **Full-Gate achievability directly proven**, not merely
     position-balance achievability: for every required size (5, 6, 7, 8,
     9, 13), three independently constructed full forms — one fully
     balanced/non-cyclic/non-cued (proven `overall: pass`), one with ONLY
     position perturbed (proven `overall: fail` via position specifically,
     length and sequence unaffected), one with ONLY length perturbed
     (proven `overall: fail` via length specifically, position and
     sequence unaffected) — using a construction (`buildIndependentItem()`)
     that gives independent control over which slot is correct and
     whether that slot is the item's own length-max slot, so a passing
     fixture cannot be a lucky coincidence of the two properties. A mixed
     2-/3-/4-option scope, each group sized for a definitive small-N
     result, also reaches a complete `pass` with no group, nor length, nor
     sequence, inconclusive. Every "Gate A passes" claim in the PR and
     documentation is now stated precisely as either the full combined
     result or explicitly labeled position-only.
  2. **New answer-key sequence detection** (`detectAnswerSequencePatterns()`,
     `evaluateAnswerSequence()`), reported as its own field
     (`evaluateGateA().sequence`), separate from position balance and
     length association but still contributing to `overall`. Deterministic
     structural detection, not a statistical test (an inferential test
     over the space of balanced sequences at N=5-13 would itself claim
     statistical meaning from one short, static sample — rejected for
     exactly the reason Finding 3/Correction 3 rejects that elsewhere):
     exact short repeating cycles (period `1..min(n, floor(N/2))`,
     confirmed at least twice), whole-sequence palindromes (`N>=4`), and
     excessive identical-position runs (`>= n` consecutive). A detected
     finding is `fail` (an exact cycle/palindrome/run is unambiguous, not
     something for a reviewer to adjudicate); `inconclusive` only for
     `N < n`. Does not demand a mechanically rotating key — a rotating key
     is exactly what the repeating-cycle check flags.
  3. **Practical-vs-statistical decision policy corrected**, applied
     identically to position balance's large-N regime and to length
     association: the practical/effect-size margin is now the SOLE
     authoritative driver of `fail`; a statistically significant result
     that stays within the practical margin no longer fails the gate by
     itself, and instead raises an explicit `reviewFlag` (`{required,
     reason}`), aggregated onto `evaluateGateA()`'s own `reviewRequired` /
     `reviewFlaggedComponents`. A genuine practical-margin violation still
     fails regardless of statistical power (this was already true in the
     small-N structural regime, which never attempts a statistic; it is
     now equally true in the large-N regime). Verified: the exact
     boundary counterexample above now returns `pass` with
     `reviewFlag.required: true`; a margin-exceeding-but-underpowered
     scope still fails; a scope that both exceeds the margin and is
     significant fails with `reviewFlag.required: false` (a fail is never
     softened into a review).
  4. **Poisson-binomial two-sided p-value switched to the
     PROBABILITY-ORDERING convention** (the sum of every outcome no more
     likely than the one observed), precisely named
     (`"exact-poisson-binomial-two-sided-probability-ordering"`) and
     explicitly documented as one defensible convention among several, not
     the only one. Verified against independently hand-computed (not
     implementation-derived) fixtures: probabilities `[0.9, 0.5, 0.5]`
     give hand-derived `pmf = [0.025, 0.275, 0.475, 0.225]`; the
     probability-ordering p-values `[0.025, 0.525, 1.0, 0.25]` differ from
     the prior doubled-minimum-tail convention's `[0.05, 0.6, 1.0, 0.45]`
     at every non-modal outcome and coincide only at the mode. Boundary
     (`p=0`, `p=1`) and fully degenerate all-tied cases independently
     hand-verified. The live bank's length-association p-value moved from
     ≈1.2×10⁻⁴⁹ (prior convention) to ≈6.1×10⁻⁵⁰ (corrected convention) —
     both astronomically significant; the convention change does not
     change any pass/fail conclusion for the live bank.
- **Tests:** `tests/assessment-cue-audit.mjs` grew from 82 to 127
  dependency-free checks. New coverage: 18 full-form fixtures (3 per
  required size × 6 sizes) proving complete-Gate-A pass/fail with each
  perturbation isolated; a mixed-option-count complete-Gate-A pass
  fixture; the literal cyclic/alternating/mirrored/excessive-run
  counterexamples from the task, each independently verified caught; a
  hand-verified balanced-non-cyclic order for every required size proving
  a genuinely non-obvious key is not penalized; sequence
  inconclusive-only-below-N-behavior and its non-statistical-claim
  property; the exact large-N practical-vs-statistical boundary
  counterexample for both position and length, plus the
  margin-exceeds-but-underpowered and margin-exceeds-and-significant
  cases; nine hand-computed Poisson-binomial p-value fixtures (asymmetric
  divergence, symmetric coincidence, modal agreement, both single-item
  boundary probabilities, degenerate all-tie). No existing e2e coverage
  needed new browser-specific tests — every corrected behavior is pure
  computation over already-verified rendered/measured data, not a new
  rendering-dependent claim, so the existing 7 real-browser checks in
  `tests/e2e/assessment-cue-audit.spec.mjs` (unchanged this round) remain
  sufficient and were re-run and reconfirmed passing.
- **Mutation-tested (this round):** 4 targeted reversions against
  `scripts/assessment-cue-audit.mjs` (never `index.html`), covering the
  four required categories (full-Gate-vs-position-only coverage,
  sequence-pattern detection, practical/statistical decision separation,
  the exact two-sided calculation), each failed exactly its intended,
  directly-attributable test(s) and no others, reverted to byte-identical
  via `diff` before committing. See `docs/VALIDATION.md` for the full
  record.
- **Mutation count, reconciled from retained evidence (not guessed):**
  round 1 (QL-036, this PR's first commit): **8**. Round 2 (QL-037, this
  PR's second commit): **8**. Round 3 (this entry, this PR's third
  commit): **4**. **Cumulative total across all three rounds: 20.** The
  PR body's prior "8 mutations across two rounds" wording undercounted
  round 2 alone and omitted round 1 entirely; corrected in the current PR
  body to state the reconciled per-round and cumulative counts explicitly.
- **Full local validation:** `npm test` (172 dependency-free DOM-behavior
  checks + 70 governance checks + 127 assessment-cue checks + 5
  deployed-revision checks) and the complete `npx playwright test` suite,
  both green except pre-existing, already-documented flakes confirmed
  transient by isolated re-run.
- **Scope:** No question, answer, rationale, distractor feedback, domain,
  topic, difficulty, or stable ID changed; `index.html` is unmodified. No
  `QUESTION_GOVERNANCE` field populated; all 153 questions remain `draft`.
  QL-033 is not marked corrected. Phase 0 stays unchecked in
  `docs/ROADMAP.md` and Issue #24. Steps 4-9 of the Phase 0 protocol were
  not begun.
- **Prevention:** Position/length balance alone is not the full claim a
  "Gate A pass" makes — a test suite (and the documentation drawn from it)
  must exercise the exact aggregate object callers actually consult
  (`evaluateGateA()`), not only a lower-level helper it happens to call,
  or a coverage gap can silently persist behind an otherwise-real fix.
  Aggregate distributional balance and sequence predictability are
  genuinely different properties of the same data and must be checked
  separately — one can hold without the other. "Statistically detectable"
  and "practically meaningful" are also different claims; conflating them
  in a single fail condition guarantees a large enough sample will
  eventually manufacture a failure out of noise. An "exact" statistical
  convention is not automatically unique; asymmetric distributions in
  particular can support more than one defensible p-value definition, and
  the choice deserves a name and a stated rationale, not silent
  application.

## QL-039 — the large-N practical decision missed material underrepresentation; position balance never reported a real p-value; the frozen manifest's own comment overclaimed order detection; NBME URL roles were described imprecisely (Issue #24, Phase 0 steps 1-3)

- **Status:** Corrected on the same branch
  (`claude/phase-0-ql033-foundation`), draft PR still open against `main`
  for independent review, not yet merged. QL-033 itself remains confirmed
  and unresolved; this entry corrects the QL-036/QL-037/QL-038 *tooling*
  further, not the bank.
- **Finding — four problems, each reproduced by direct construction
  before any fix (full detail in `docs/ASSESSMENT_VALIDITY.md`):**
  1. **The large-N practical/effect-size decision examined only the
     single largest answer position**, never the complete distribution,
     so it could not detect material UNDERrepresentation unless that same
     imbalance happened to also inflate some other position's share past
     the threshold. Confirmed directly: at `N=20`, `n=4` (the smallest N
     in the large-N regime for 4-option items), distributions `[7,7,6,0]`,
     `[8,6,6,0]`, and `[8,8,4,0]` — every one leaving position D with
     **zero** correct answers — all reported `pass`. A complete, fully
     independent full-Gate fixture confirmed the same gap at the
     whole-gate level.
  2. **Position balance never reported an actual p-value.** Its `detail`
     object contained a chi-square statistic and a Boolean
     critical-value-table comparison, but no `pValue` field — a
     critical-value lookup is not itself a p-value, and this directly
     contradicted the round-3 correction's own stated intent to report
     the statistical result and p-value separately (length association's
     exact Poisson-binomial test already did this correctly).
  3. **`compareToIdManifest()`'s own comment claimed it detected
     "reordering where order is part of the contract,"** immediately
     contradicted by the very next clause, which correctly explains the
     digest is computed over the SORTED id list and is therefore
     order-independent by construction. Confirmed directly: reversing all
     153 frozen ids still reports `matches: true` (correct behavior for a
     set-identity check; the comment's claim about order was simply
     wrong). Separately, this became more consequential once the sequence
     check (QL-038) started examining each form's real rendered order,
     which had no frozen record of its own at all.
  4. **NBME source-provenance wording described the two official NBME
     URLs less precisely than directly re-inspecting them supports.**
     Both official URLs were re-fetched and directly inspected for this
     correction: `https://www.nbme.org/institutions/nbme-item-writing-guide/`
     is the official request page (its own text: *"Complete the form to
     receive your PDF download today"*); the separate URL
     `https://www.nbme.org/file/nbme_item-writing-guide_r_6-pdf/` serves
     an HTML attachment/page-shell (`content-type: text/html`, `pdftotext`
     cannot parse it as a PDF) that does **not** itself expose the request
     form (its only `<form>` elements are generic site-search forms).
- **Impact:** None shipped — PR #26 remained draft/unmerged throughout;
  found and fixed before merge.
- **Correction (full detail, exact mathematics, and every reproduced
  counterexample in `docs/ASSESSMENT_VALIDITY.md` sections 2.2, 4.3b,
  4.6b):**
  1. **Cohen's w** (Cohen, J. (1988), *Statistical Power Analysis for the
     Behavioral Sciences*, 2nd ed.), `w = sqrt(chiSquare / N)`, replaces
     the single-largest-position-share rule as the large-N practical
     decision. Scale-free (unlike raw chi-square, which grows with N),
     symmetric to over- and under-representation by construction, with
     Cohen's own published "medium effect" threshold (`0.3`) adopted as
     the fail threshold — an independently-sourced number, not tuned to
     this bank. Per-position directional deviations are retained as
     diagnostic detail (`positionDeviations`/`materialDeviations`),
     reusing the existing `PRACTICAL_MARGIN`, so the report states not
     just THAT a material deviation exists but WHICH position(s) and in
     WHICH direction. Verified: all three counterexample distributions
     now fail (w = 0.583, 0.600, 0.663 — all a "large" Cohen's effect);
     the N=19/structural-regime and N=20/21-statistical-regime results
     agree for a comparable omission (no easier-to-pass transition);
     balanced N=20 distributions still pass comfortably (w=0 and
     w=0.141); verified for 2- and 3-option forms, not only 4-option.
     The existing policy that statistical significance alone does not
     fail an educationally trivial deviation (QL-038) is unchanged.
  2. **`chiSquareUpperTailPValue(chiSquareStat, df)`** computes the exact
     upper-tail chi-square p-value via the regularized upper incomplete
     gamma function (standard series/continued-fraction algorithm,
     Numerical Recipes 3rd ed. §6.2), valid at any positive df (not
     limited to the previously tabulated df 1-7). Verified against an
     independently-sourced published critical-value table at both
     α=0.01 and α=0.05, matching to 4-5 significant figures at every
     tabulated point. Position balance now uses the same
     `pValue < SIGNIFICANCE_ALPHA` comparison length association already
     used, replacing the prior `chiSquare > criticalValue` comparison.
  3. **`compareToIdManifest()`'s comment corrected** to state plainly it
     answers only "does the same SET of ids exist," never order. A new,
     genuinely separate, order-SENSITIVE contract is added:
     `ORIGINAL_FORM_ORDER_IDS` (new,
     `scripts/assessment-cue-audit-id-manifest.mjs`) freezes each of the
     17 forms' exact authored order; `ORIGINAL_FORM_ORDER_MANIFEST` wraps
     it with a per-form order-sensitive SHA-256 digest;
     `compareToFormOrderManifest()` compares live per-form order against
     it. Four genuinely separate questions are now each independently
     reported: id-SET identity (`idManifestCheck`), per-form
     ENCOUNTER-ORDER identity (`formOrderCheck`, new), mechanical
     aggregate-metric drift (`baselineComparison`), and current Gate A
     status (`bank.gateA`/`forms[].gateA`). Verified: reversing or
     permuting questions within one form triggers order drift for that
     form specifically while the id-set check still matches; an id
     replacement triggers set drift; unchanged input matches both frozen
     contracts; pilot selection (its own separate canonical-order
     contract) remains fully input-order-independent regardless.
     Additionally, the WHOLE-BANK aggregate scope is no longer treated as
     one learner-facing encounter order for sequence purposes:
     `evaluateGateA(metrics, { sequenceApplicable: false })` computes and
     reports sequence findings informationally but excludes them from
     `overall` — an artificial cross-module concatenation can no longer
     create or clear a release gate via a property that was never
     meaningful for it. Every per-form call remains fully
     `sequenceApplicable: true` by default.
  4. NBME provenance wording corrected to describe the two official URLs
     precisely, per the direct re-inspection above; the overall
     conclusion (NBME is unverified/secondary corroborating color, never
     a basis for any threshold; CITL, fully verified, supplies no
     numerical thresholds either — the project's numeric/effect-size
     rules are its own operationalizations) is unchanged and restated
     explicitly.
- **Tests:** `tests/assessment-cue-audit.mjs` grew from 127 to 157
  dependency-free checks. New coverage: the three N=20 counterexample
  distributions and a full-Gate fixture for `[7,7,6,0]`; the N=19/20/21
  regime-boundary consistency check; balanced-N=20 and 2-/3-option
  Cohen's-w fixtures; the position-detail-completeness check (observed
  distribution, expected distribution, effect measure, threshold,
  material-deviation directions, final decision); independently-sourced
  chi-square-critical-value cross-checks at α=0.01 and α=0.05 for df 1-7
  and 1-3 respectively; the alpha-boundary pValue/statisticalResult
  agreement check; per-form order-drift detection (reversal, permutation,
  id replacement) and its independence from id-set identity; pilot
  selection's continued input-order-independence; the
  whole-bank-vs-per-form `sequenceApplicable` behavior, including that it
  changes only sequence's contribution to `overall` and nothing else; and
  deterministic-JSON preservation with every new field present. Two
  mutation-testing-driven coverage gaps were found and closed with
  permanent tests (see Mutation-tested below) —
  `tests/e2e/assessment-cue-audit.spec.mjs` stays at 7 (no new
  browser-specific behavior this round; re-run and reconfirmed passing).
- **Mutation-tested (this round):** 7 targeted reversions against
  `scripts/assessment-cue-audit.mjs` (never `index.html`), covering the
  seven required categories (omitted/underrepresented answer positions;
  the N=5n regime boundary; the Cohen's-w distribution-wide practical
  effect calculation itself; the chi-square p-value calculation; per-form
  order drift; separation of set/order/metric drift in the report; and
  whole-bank-vs-learner-facing sequence scope). Two of the seven initially
  showed **zero** failures instead of the expected relevant one(s) — both
  investigated as genuine coverage gaps, not skipped:
  - The chi-square-p-value mutation replaced the real computation with a
    placeholder (`0.001` if past the reference critical value, else
    `0.5`) that preserved the SAME significant/not-significant
    classification by construction, evading a boundary test that only
    checked the classification, not the numeric p-value itself. Fixed
    with a permanent test asserting the exact numeric p-value for a known
    `(chiSquare, df)` pair against an independently hand-computed
    expected value (`chiSquare=120, df=3` → `pValue ≈ 7.71679×10⁻²⁶`).
  - The `formOrderCheck`-stubbing mutation (`buildDeterministicReport()`
    replaced with a hardcoded `{matches: true, perForm: {}}`) evaded
    detection because every existing test calling
    `buildDeterministicReport()` only ever passed the unchanged live bank,
    which trivially "matches" a stub too. Fixed with a permanent test
    that passes a deliberately module-reordered copy of the live bank
    through `buildDeterministicReport()` and asserts the resulting
    `formOrderCheck` reflects that real drift.
  Every one of the 7 mutations was reverted to byte-identical via `diff`
  before committing. See `docs/VALIDATION.md` for the full record.
- **Mutation count, reconciled from retained evidence (not guessed):**
  round 1 (QL-036): 8. Round 2 (QL-037): 8. Round 3 (QL-038): 4. Round 4
  (this entry, QL-039): 7. **Cumulative total across all four rounds: 27.**
- **Full local validation:** `npm test` (172 dependency-free DOM-behavior
  checks + 70 governance checks + 157 assessment-cue checks + 5
  deployed-revision checks, all passing) and the complete `npx playwright
  test` suite run at a deterministic, fixed worker count (`--workers=2`,
  rather than the variable auto-detected parallelism under which the
  known pre-existing `storage-failure-warning.spec.mjs` flake has
  previously appeared) — **252 passed, 6 skipped, 0 failed**, a fully
  clean complete-suite result, not a partial-file rerun.
- **Scope:** No question, answer, rationale, distractor feedback, domain,
  topic, difficulty, or stable ID changed; `index.html` is unmodified. No
  `QUESTION_GOVERNANCE` field populated; all 153 questions remain `draft`.
  QL-033 is not marked corrected. Phase 0 stays unchecked in
  `docs/ROADMAP.md` and Issue #24. Steps 4-9 of the Phase 0 protocol were
  not begun.
- **Prevention:** A "practical effect" measure that looks at only one
  cell of a multi-cell distribution is not a distribution-wide measure,
  no matter how well-justified its single-cell threshold is — symmetric
  treatment of over- and under-representation requires a genuinely
  aggregate statistic. A significant/not-significant Boolean is not a
  p-value, and a test that only checks the Boolean cannot distinguish a
  correct exact computation from a placeholder that merely preserves the
  same threshold comparison — assert the actual numeric value against an
  independently derived expectation, not only its relationship to a
  threshold. A comment's claims are part of the contract too: a docstring
  that overclaims what a function detects is itself a defect, independent
  of whether the function's actual behavior is correct. A report field
  populated by a stub that happens to match the one fixture every test
  exercises is invisible to those tests — cover the field with an input
  specifically constructed to differ from the trivial case.
