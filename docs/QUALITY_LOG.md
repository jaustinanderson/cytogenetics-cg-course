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

- **Status:** Open; Milestone 1
- **Finding:** `importJSON()` checks schema version but does not fully validate
  nested maps and outcome records.
- **Impact:** Malformed imported data can break later operations or distort
  headline analytics.
- **Cause:** Version compatibility was treated as structural validity.
- **Correct action:** Validate, normalize, and deep-clone imported state; define
  handling for stale IDs.
- **Prevention:** Add hostile/malformed import fixtures and round-trip tests.

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

