# Changelog

All notable repository changes are recorded here.

## [Unreleased]

### Added

- Storage-failure detection and an honest session-only warning
  (`index.html`, Issue #2, draft PR — not yet merged): `saveProgress()`
  previously caught every `localStorage` write error silently and still
  advanced/reported progress as if it had been saved, `loadProgress()`
  treated a genuine read failure identically to "no progress yet" with
  no warning, and the UI Reset handler reloaded unconditionally even
  when the storage removal it depended on had failed — all three
  confirmed as real, pre-fix defects by direct execution. A new
  `persistState` state machine now distinguishes a write-only failure
  (self-heals the moment any later save succeeds, since every save
  serializes the complete current state) from a read failure at
  initialization (sticky for the session, since the app cannot rule out
  unseen prior progress); a non-modal, `role="status"` warning banner
  (`#storageWarning`) communicates session-only mode without stealing
  focus mid-answer, deduplicated so repeated failures produce exactly
  one warning; `CytoCourse.getPersistenceStatus()` and a new
  `persistence` event expose the status publicly, with no raw browser
  exception text ever surfaced; `reset()` now returns `{ok:false}`
  honestly on a storage failure instead of an unconditional
  `{ok:true}`; `importJSON()`'s existing all-or-nothing atomicity
  guarantee is unweakened, with only the shared persistence status
  reflecting a genuinely observed write failure. Does not change
  `SCHEMA_V`, stable-ID formats, migration policy, the stale-ID policy,
  scoring, or existing `progress`/`answer`/`exercise` event semantics.
  15 new dependency-free regression tests in `tests/dom-behavior.mjs`
  (124 → 139) and 6 new real-browser Playwright tests in
  `tests/e2e/storage-failure-warning.spec.mjs`, mutation-tested across
  4 reversions. See `docs/QUALITY_LOG.md` QL-026 and
  `docs/ARCHITECTURE.md` "Storage-failure detection and session-only
  mode" for the full record.
- Exercise widgets now correctly re-render after `CytoCourse.importJSON()`
  and `CytoCourse.reset()` (`index.html`, Issue #2): both previously
  rebuilt only `.quiz-mount` widgets, never `.exer` (exercise) ones, so a
  rendered exercise widget's score, status, and controls silently
  disagreed with `getProgress()` immediately after either call —
  confirmed as a real, currently-shipped defect by direct execution
  before any fix was written. Fixed by adding `rebuildContentWidgets()`
  and routing `init()`, `importJSON()`, and `reset()` through it instead
  of three separately maintained selector loops; `buildExercise()`'s own
  rendering logic (including its existing reattempt-after-reload
  behavior — an exercise widget always restarts at item 0 with fresh,
  unlocked controls on any rebuild, letting a learner correct a previous
  answer) is unchanged. A resume-position variant of this fix was tried
  and reverted before committing after it broke a pre-existing, shipped
  Playwright test depending on that exact reattempt behavior; see
  `docs/QUALITY_LOG.md` QL-025 for the full account. 9 new dependency-free
  regression tests in `tests/dom-behavior.mjs` (115 → 124) and 6 new
  real-browser Playwright tests in
  `tests/e2e/progress-and-reset.spec.mjs` — including one that calls
  `window.CytoCourse.reset()` directly, with no page reload or
  navigation, specifically to prove the public API method itself (not a
  subsequent reload) rebuilds the exercise widget — mutation-tested. Does
  not change stable-ID formats, migration policy, `SCHEMA_V`, or the
  stale-ID policy (Issue #2)
- Stale question/exercise/module ID policy (`index.html`, Issue #2): a
  `modules`/`answers`/`exercises` key that no longer corresponds to
  current `MODULES`/`QUIZZES`/`EXERCISES` data (a renumbered or removed
  question, a dropped exercise item, a deleted module, or a
  runtime-injected question whose session ended) is preserved under its
  original id — never deleted, moved, or quarantined by
  `loadProgress()`, `migrateExerciseIds()`, or `importJSON()` — and
  simply excluded from every current-facing figure at read time, decided
  fresh by checking membership in the live content each time rather than
  trusting a stored map's own keys. Reintroducing the same id later
  revives its preserved history automatically, with no migration code.
  Fixed a real, pre-existing bug found while defining this: `getStats()`'s
  top-level `questionsAnswered`/`questionsCorrect`/`overallPct` counted
  every key in `state.answers` regardless of whether the course still
  recognized it — a state holding only a fabricated question id reported
  a fabricated 100% overall accuracy, confirmed by direct execution
  before the fix; `tally()` (`byDomain`/`byTopic`/`byDifficulty`) already
  filtered correctly and the fix mirrors its exact pattern. Does not
  decide whether runtime-injected content should persist (the separate,
  still-open content-pack item) and does not bump `SCHEMA_V` (no stored
  field's shape or meaning changes). An explicit, user-confirmed Reset
  (`#resetBtn`/`reset()`) remains the one deliberate exception — it
  deletes everything, current or stale, in both storage keys, as already
  implemented; a dedicated test now proves that combination explicitly.
  14 new dependency-free regression tests in `tests/dom-behavior.mjs`
  (101 → 115), mutation-tested across three mutations. See
  `docs/QUALITY_LOG.md` QL-024 and its addendum, and
  `docs/ARCHITECTURE.md` "Stale question/exercise/module ID policy" for
  the full decision record and rejected alternatives (Issue #2)
- `validateImportedState()`/`validateImportEnvelope()` in `index.html`:
  `importJSON()` now validates the complete import — either a bare state
  object or an export wrapper whose own keys are exactly
  `exported`/`state`/`stats` — checking every required field (including
  `c`/`n`/`ts` inside each outcome record) as an OWN property, not merely
  one reachable via the prototype chain, plus a documented size limit
  (262,144 characters — a JS string-length/code-unit count, not a byte or
  KiB limit — checked before `JSON.parse`) and entry-count cap (2000),
  both grounded in a real measured full-course export (~8.7 KB, 200
  entries) — before anything observable changes. Rejects unsupported
  schema versions, unrecognized or inherited-only top-level/wrapper
  fields, incorrect nested types (nulls, arrays, wrong primitives),
  invalid counters/timestamps/correctness values, extra/missing/inherited-
  only outcome-record fields, and dangerous map keys
  (`__proto__`/`constructor`/`prototype`) wherever they appear, including
  on the wrapper itself. Builds an entirely new, deep-cloned object graph,
  so mutating the caller's source object after a successful import
  (including when `importJSON()` is called with a plain object rather
  than a JSON string, which previously aliased that object directly into
  live state) cannot affect course progress. Accepted objects (the state,
  the wrapper, the `modules`/`answers`/`exercises` containers, and every
  outcome record) must also be genuine RECORD objects — an ordinary plain
  object or an explicit null-prototype object, in any realm, never an
  exotic built-in like `Date`/`Map`/`Set`/`RegExp` (which previously
  passed the weaker `typeof x === 'object'` check while carrying no data
  reachable through normal own-property enumeration) — and every one of
  their own properties must be a plain, enumerable, string-keyed DATA
  property, rejecting any own symbol key, non-enumerable extra, or
  accessor (getter/setter) property outright. The full transaction —
  validate, migrate the candidate, serialize, then attempt the
  `localStorage` write — runs to completion *before* live state is ever
  committed, so a rejected import, and now also one whose persistence
  itself fails (full quota, private browsing), both leave `getProgress()`,
  `localStorage`, the rendered UI, and public API events completely
  unchanged. Does not bump `SCHEMA_V`. 49 dependency-free regression tests
  in `tests/dom-behavior.mjs` (27 from the initial pass, 13 from a
  correction pass after independent review found three further gaps —
  persistence-failure atomicity, own-property vs. inherited-property
  validation, and the wrapper contract — plus a terminology fix, and 9
  more from a further correction pass closing the record-object gap
  above), mutation-tested across nine separate mutations in total. Found
  and fixed a real self-contained bug in the process: a
  `{'__proto__':true, ...}`-shaped blocklist never actually contained
  `__proto__` as an own key (object-literal syntax silently drops it when
  the value isn't itself an object), replaced with a plain array. See
  `docs/QUALITY_LOG.md` QL-006 and its addenda, and QL-023, and
  `docs/VALIDATION.md` "Progress-import validation and cloning" (Issue #2)
- Explicit, stable `id` fields, plus a literal frozen `legacyId` recording
  each item's original position-derived key, on all 30 exercise items
  (`EXERCISES.ex7`/`ex9group`/`ex9chrom`/`ex10`/`ex14`/`ex15` in
  `index.html`), and `migrateExerciseIds()`, a deterministic, idempotent
  migration that renames any surviving legacy key — read from each item's
  own frozen `legacyId`, never recomputed from its current array position
  — to its item's real stable id on every load and after every import.
  When both a legacy and stable record already exist for the same item,
  migration keeps the entire record (`c`, `n`, and `ts` together) from
  whichever key was written more recently, deterministic ties favoring the
  canonical stable-key record — a conservative snapshot policy, not an
  arithmetic merge, because these records carry no attempt-level
  provenance and their histories cannot be assumed disjoint. Does not
  require a `SCHEMA_V` bump. 17 new dependency-free regression tests in
  `tests/dom-behavior.mjs` plus a structural check in
  `tests/validate-course.mjs` that verifies all 30 `id`/`legacyId` pairs
  against an independently hard-coded, frozen historical mapping table —
  exact key-for-key and value-for-value equality, not merely that every
  value happens to be unique, which a swap between two items' `legacyId`
  values would still satisfy. Also includes a true end-to-end reordering
  proof and a reorder-before-migration proof that both run the real
  product script with `EXERCISES.ex7.items.reverse()` injected into a copy
  of the exact inline script text. Mutation-tested. See
  `docs/QUALITY_LOG.md` QL-005 and `docs/VALIDATION.md` "Stable
  exercise-item identity" (Issue #2)
- `tests/e2e/figure-9-1-morphology.spec.mjs`: real-browser bounding-box
  regression coverage (not screenshots) for Figure 9.1's centromere-morphology
  labels — each label's containment inside its own card and inside the
  figure, no pairwise label-bounding-box intersection, no label text
  clipping, and no page-level horizontal overflow, across all five
  acceptance-criteria viewports (1440×900, 1280×900, 768×1024, 390×844,
  360×800). Mutation-verified: reverted against the pre-fix markup, 10 of 12
  test runs failed for the expected reason (zero `.morph-label`/`.morph-item`
  elements found), confirming the suite actually depends on the fix. See
  `docs/QUALITY_LOG.md` for the full diagnosis
- `assets/images/wellcome-b0000249-trisomy21-karyotype-47xy.jpg`: replaces
  the removed CDC PHIL trisomy-21 image as Figure 10.1 — a genuine,
  individually numbered (1–22, X, Y) G-banded karyogram labeled
  "47,XY,+21 TRISOMY 21 (DOWN'S SYNDROME)" on the plate itself, with an
  arrow marking the third chromosome-21 copy, from Wellcome Collection
  (credit: Wessex Regional Genetics Centre), CC BY 4.0, 1176×1158 pixels.
  Selected only after decoding and visually inspecting it directly (not
  from its filename or listing text) and after the same direct-inspection
  step rejected a same-collection, similarly named Wikimedia Commons
  candidate that turned out to be an unsorted, overlapping metaphase spread
  rather than an arranged karyogram. See `THIRD_PARTY_NOTICES.md` for the
  full provenance/license record

- `tests/e2e/progressive-disclosure.spec.mjs`: real-browser regression
  coverage for the quiz/exercise progressive-disclosure redesign below —
  default collapsed state with an informative summary, click/keyboard/touch
  expand and collapse, status/score correctly derived from persisted
  progress after reload (partial and completed, for both a quiz and an
  exercise), a correctness-changing reattempt replacing rather than
  double-counting a prior result, toggling and loading never touching
  stored progress or firing a `progress` event, Reset behavior, print
  exposure (including a pre-existing case-study `details.card` regression
  check), and no narrow-viewport overflow. See `docs/QUALITY_LOG.md`
  QL-021 and its addendum, and `docs/VALIDATION.md` "Quiz/exercise
  progressive-disclosure suite"
- `tests/e2e/visual-polish.spec.mjs`: real-browser regression coverage (46
  runs across both Playwright projects, plus 1440×900/768×1024/360×800
  exercised directly within the file) for the visual-polish fixes below —
  no horizontal overflow, no mobile-header control overlap/clipping, the
  hamburger/Print/Reset controls each independently proven Tab-reachable,
  visibly focused, keyboard-operable, and touch-operable (Reset additionally
  seeding and clearing disposable progress via both paths), zero "Image
  needed" placeholder text, figures constrained to the viewport, captions
  that stay attached and readable, and representative components (callouts,
  case studies, quick-reference cards, disclaimers, the source note) proven
  unaffected by the reading-measure rule. See `docs/QUALITY_LOG.md` QL-020
  and its addendum, and `docs/VALIDATION.md` "Visual-polish regression
  suite"

- `assets/images/`: the two previously remote, approved course images —
  `nhgri-human-male-karyotype-46xy.png` and
  `cdc-phil-12504-trisomy21-karyotype.jpg` — committed byte-for-byte as
  fetched from the exact URLs the page already displayed remotely (no
  re-encoding or editing). See `THIRD_PARTY_NOTICES.md` for retrieval dates,
  SHA-256 hashes, and license basis
- `assets/fonts/ibm-plex-sans/` and `assets/fonts/ibm-plex-mono/`: the exact
  IBM Plex Sans (400/500/600/700) and IBM Plex Mono (400/500/600) weights
  the course uses, as unmodified WOFF2 files from the official
  [IBM/plex](https://github.com/IBM/plex) GitHub release assets
  (`@ibm/plex-sans@1.1.0`, `@ibm/plex-mono@2.5.0`), under the bundled SIL
  Open Font License 1.1 (license text and file hashes recorded in
  `THIRD_PARTY_NOTICES.md`)
- A structural check (`tests/validate-course.mjs`) proving every `@font-face`
  `src` and both embedded figures' `<img src>` resolve to a local
  `assets/` path, that no reference to `fonts.googleapis.com`/
  `fonts.gstatic.com` remains, that every referenced local asset actually
  exists on disk with nonzero size, and that the figures' external
  source-page/credit links are unchanged. Mutation-tested
- `tests/e2e/local-images.spec.mjs`: a local real-browser check (both
  viewport projects) that both embedded images load with nonzero natural
  dimensions from the local static server — previously untestable without
  network access, now possible because the images are local
- `docs/SCIENTIFIC_REVIEW.md`: the current scientific-review status record.
  States plainly that no question, exercise, flashcard, or case content has
  an independently recorded scientific review yet (Draft, per
  `docs/CONTENT_GOVERNANCE.md`'s content-state definitions); only the exam
  blueprint's domain names and published target ranges are source-checked
  against the dated ASCP BOC content guideline — the current question
  distribution against those ranges is a separate, mechanically measured
  fact, and only the specimen domain currently falls within its published
  range (analysis, molecular, and operations do not; see `README.md`
  "Course coverage"). Reconciles its use of "SME-reviewed" with
  `docs/CONTENT_GOVERNANCE.md`'s existing definition (review by Austin
  specifically) rather than silently broadening it, and distinguishes
  Austin's future documented review from independent second-person review.
  Separates scientific/content review from software validation,
  accessibility testing, source/provenance review, and image/licensing
  (rights) review, each pointing to where its own evidence lives. Covers
  all 17 modules and the 42-question final-exam pool in a status table
  (153 total: 111 across modules + 42 in the separate final pool; counts
  read directly from the committed course data, not estimated), states
  explicitly that passing automated tests establishes structural/behavioral
  consistency and not scientific correctness, and includes a practical
  per-item review checklist and a reusable review-log table format for
  recording future reviews. A structural check (`tests/validate-course.mjs`)
  parses the status table and verifies: the total row count equals the
  live module count plus exactly one; the module-row count alone matches
  the live module count; module IDs are unique (checked explicitly, not
  inferred from `Set`/`Map` construction, which silently collapses
  duplicates); the module-ID set exactly matches the live module set (no
  missing or stale rows); every title matches `getModules()`; every
  per-module question count matches `getQuestions()`; exactly one
  final-pool row exists, identified by an exact `*(pool)*` Module-cell
  match (not by exclusion) with its title verified as exactly "Final
  cumulative exam" and its count matching `getQuestions("final")`; and
  module counts plus the final-pool count reconcile to the live total —
  so future module or content changes, including a duplicated row or a
  renamed pool identifier, can't silently leave the document stale or
  pass an unearned check
- `docs/assets/course-overview.png`: a course-only README screenshot
  (1440x1430, ~274KB), embedded near the top of `README.md` with alt text
  and a link to the full-size image. Generated by `npm run
  capture:readme-screenshot` (`scripts/capture-readme-screenshot.mjs`),
  which captures a fresh ("0 of 17 modules complete") localStorage state at
  the top of the page with transitions disabled (`reducedMotion: "reduce"`),
  and — before capturing — asserts the expected title, hero heading, and
  exactly 17 dashboard cards, and confirms the IBM Plex webfonts actually
  reached `status: "loaded"` (not merely that `document.fonts.ready`
  resolved, which can also happen after a failed font request). Uses an
  OS-assigned ephemeral local-server port and treats an early server exit as
  a conclusive startup failure. This is a generation script, not a test —
  no pixel-comparison assertion was added. Same-environment reproducibility
  is verified with `sha256sum`, not file size. The documented optional
  lossless-PNG-optimization commands install `sharp` into an isolated
  temporary directory (`npm install --no-save --prefix`, `NODE_PATH`) and
  create their working directories with `mktemp -d`, so they run correctly
  on a clean clone with nothing globally pre-installed and no assumed
  pre-existing `/tmp` state — see `docs/QUALITY_LOG.md` QL-017
- `tests/e2e/dashboard-layout.spec.mjs`: a real-browser regression test
  (bounding-box/computed-line-height assertions, not pixel snapshots) added
  after the screenshot itself exposed a genuine dashboard-card layout defect
  (title text running into "Module N" on one line; status text able to
  wrap). Asserts all 17 cards render with title/subtitle on separate
  non-overlapping lines and single-line, non-overlapping status text, at
  both viewports
- Automated WCAG scanning via `@axe-core/playwright`
  (`tests/e2e/accessibility.spec.mjs`), run against the real course at
  desktop and narrow/mobile viewports in five states (fresh load, mobile
  nav open, quiz answered, exercise answered, module complete + flashcard
  flipped); zero violations after fixes
- A representative real-browser keyboard interaction suite
  (`tests/e2e/keyboard-navigation.spec.mjs`) covering the skip link, visible
  sidebar nav, mobile menu, quizzes, exercises, module completion, Print,
  and Reset. Every claimed-reachable control is proven so via real `Tab`
  key presses to the exact target element (never programmatic `.focus()`,
  which would pass on an unreachable `tabindex="-1"` element), with a
  `toHaveAccessibleName()` check against real expected content, a shared
  `assertVisibleFocus()` check (non-`none` outline style, non-zero width,
  non-transparent color) applied uniformly to all nine covered controls, and
  a keyboard-trap check for the mobile menu
- `@axe-core/playwright` as a development-only dependency
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
- A dedicated deployed-site Playwright smoke suite (`tests/e2e-deployed/`,
  `npm run test:deployed`, `playwright.deployed.config.mjs`) targeting the
  real HTTPS GitHub Pages deployment (URL configurable via
  `DEPLOYED_BASE_URL`, default
  `https://jaustinanderson.github.io/cytogenetics-cg-course/`) at the same
  1280x900 and 390x844 viewports as the local suite. Verifies a successful
  HTTPS response, expected title/heading, the 17 quiz mounts / 17 modules / 6
  exercise sets, page-origin console cleanliness, absence of horizontal
  overflow at the narrow viewport, touch-emulated (`hasTouch`/`.tap()`)
  mobile-navigation open/close/backdrop/module-link behavior with
  `aria-expanded` checked against the sidebar's actual on/off-canvas
  position, a touch-emulated quiz interaction, module-completion persistence
  across a real reload in an isolated browser context (`browser.newContext({
  baseURL })`, with an explicit assertion that navigation reached the
  expected deployed origin/path), and the natural decoded dimensions of the
  two approved remote images. Entirely separate from `tests/e2e/`: it has no
  `webServer`, is never invoked by `npm test` or `npm run test:e2e`, and
  requires outbound internet access only when explicitly run
- `scripts/verify-deployed-revision.mjs` (`npm run
  verify:deployed-revision`), which requires **both** of two checks to agree
  before treating a deployment as verified: GitHub's deployments API record
  for the `github-pages` environment (commit SHA + status) for the target
  commit, and a cache-busted, no-cache SHA-256 comparison of the live
  `index.html` at the exact `DEPLOYED_BASE_URL` against the checked-out
  `index.html`. Each check's precise, narrower scope — the API proves a
  registered build record, the hash proves current live-artifact equivalence,
  neither alone proves "the currently served commit" — is stated in the
  script's own comments and log output, not only in documentation. Warns
  explicitly if `DEPLOYED_BASE_URL` doesn't match the canonical Pages URL
  derived from `GITHUB_REPOSITORY`, so overriding the target URL without
  also binding the repository/commit it verifies cannot silently claim a
  meaningless result
- `tests/verify-deployed-revision.mjs` (part of `npm test`): focused,
  loopback-only checks of the hashing/fetch logic (identical/differing
  content hashes, and a local HTTP server standing in for "the live URL"
  fetched with a distinct cache-busting query parameter each time), requiring
  no external network access
- `.github/workflows/deployed-smoke.yml`: a separate, network-dependent
  workflow (manual `workflow_dispatch`, plus automatic `workflow_run` after
  GitHub's own `pages-build-deployment` completes on `main`) that runs the
  revision check and the deployed suite against the same `DEPLOYED_BASE_URL`
  (bound once at job level); requests `deployments: read` alongside
  `contents: read`. `ci.yml` is unchanged and still requires no external
  network access

### Changed

- Figure 9.1 (centromere morphology) no longer renders its three labels as
  embedded SVG `<text>` inside one fixed viewBox — the layout that produced
  "Metacentric" overlapping "Submetacentric" and "Acrocentric + satellite"
  extending outside the figure at real widths. Each morphology is now a
  separate, individually contained card in a responsive CSS grid
  (`.fig-morph-grid`, `repeat(auto-fit,minmax(150px,1fr))`) with the label as
  ordinary wrapping HTML text below a small, label-free drawing. Stacks to a
  single column at narrow widths, verified at all five acceptance-criteria
  viewports with no overlap, no clipping, and no horizontal page overflow.
  The figure keeps its "(schematic)" title and caption badge unchanged
- Figure 10.1 (trisomy 21 karyotype) replaced: removed the CDC PHIL image
  (heavily thresholded, chromosomes grouped but not individually numbered,
  and — confirmed by reading its own printed group label rather than
  assumed — an XX-derived karyotype that did not match the course's own
  primary `47,XY,+21` worked ISCN example directly beneath it) and embedded
  a Wellcome Collection karyogram instead (CC BY 4.0, Wessex Regional
  Genetics Centre; see "Added" above). Figure title, alt text, caption, and
  the `IMAGES` manifest record were all updated to match; no ISCN notation,
  question, or scoring content changed
- Every quiz and exercise widget (`.quiz`, `.exer`) is now a native
  `<details>`/`<summary>` element, collapsed by default, instead of an
  always-fully-expanded block — the same disclosure pattern already used
  for case-study reveal cards. The summary communicates activity type,
  title, item count, and a "Not started"/"In progress"/"Completed" status
  word; the pre-existing `.qh-score`/`.eh-score` "X / Y" text is unchanged.
  Because the widget is collapsed by default, this summary is the
  learner's primary status indicator, so status and score are derived from
  `state.answers`/`state.exercises` on every render rather than reset to
  zero — a fresh activity reads "Not started — 0 / N," one with existing
  records reads "In progress — X / N" or "Completed — N / N" immediately
  on load, and reattempting a previously recorded item replaces its latest
  result instead of double-counting it. Measured at 1440×900: document
  height dropped 45.2% (110,209px → 60,386px), quiz/exercise share of
  document height dropped from 46.6% to 2.5%, and answer buttons
  simultaneously visible on a fresh load dropped from 636 to 0. Question
  text, answers, rationales, scoring, completion rules, stable question/
  exercise IDs, progress storage schema, analytics semantics, and the
  public API are unchanged; opening/closing a disclosure, and loading a
  page with existing progress records, is never recorded as new progress
  and fires no API event. See `docs/QUALITY_LOG.md` QL-021 and its
  addendum, and `docs/VALIDATION.md` "Quiz/exercise progressive-disclosure
  suite"
- Fixed a print-exposure defect affecting both the new quiz/exercise
  disclosures and the pre-existing case-study reveal cards: the
  `display:block !important` CSS override for closed `<details>` content
  did not actually work under real print media (Chromium suppresses that
  content via an internal rendering behavior, not a plain `display`
  value). `beforeprint`/`afterprint` now force-open every `<details>` for
  the duration of printing and restore each one's true prior state
  afterward
- Removed the five learner-facing "Image needed" authoring/search placeholder
  figures from Modules 8–12. No new scientific explanation was added in their
  place — where the surrounding lesson text did not already stand alone, the
  placeholder was simply deleted, identical treatment across all five. No new
  imagery was fabricated, generated, downloaded, or embedded — only the two
  already-approved local images remain embedded, and the image manifest's
  provenance records are unchanged. The "Image credits & licensing" section's
  remaining prose was reworded to describe the same unfilled candidates
  without shipping search instructions in the learner UI
- Capped embedded figure images at `max-height:min(52vh,460px)` so they stay
  proportionate to surrounding content instead of dominating most of a
  screen before their caption is visible
- Raised figcaption/`.src`/`.lic` font sizes (.92rem/.85rem/.78rem) and
  recolored `.src` from `--ink-faint` to the already-AA-passing `--ink-soft`
  for more comfortable reading
- Added a `max-width:70ch` reading-measure cap scoped to genuine long-form
  lesson prose (`.module p:not(.callout p):not(.case-body p):
  not(.grid-card p):not(.source-note)`, derived from a real-DOM survey of
  every paragraph in the document); tables, quizzes, exercises, callouts,
  case studies, quick-reference cards, disclaimers, and the exam-weighting
  source note are confirmed unaffected — see `docs/QUALITY_LOG.md` QL-020's
  addendum
- Fixed a mobile-header flexbox bug where the brand-name wrapper's default
  `min-width:auto` refused to shrink, causing the course name to visually
  overlap the Print button around 390px/360px; the brand text now shrinks
  and ellipsizes correctly. At ≤560px, Print/Reset become icon-only with an
  explicit `aria-label` matching their visible text, preserving their
  accessible name
- The course no longer requests any third-party font or image host at
  runtime: the Google Fonts `<link>`/`preconnect` tags are replaced with
  local `@font-face` rules, and both figures' `<img src>` and the
  `IMAGES` data array now point at the local `assets/images/` files
  (external source-page/credit links are unchanged). See
  `docs/ARCHITECTURE.md` "External resources" and `docs/VALIDATION.md`
  "Asset localization"
- `tests/e2e-deployed/remote-images.spec.mjs` renamed to
  `local-images.spec.mjs` and updated to assert same-origin delivery, now
  that the images it checks are localized rather than third-party
- `docs/assets/course-overview.png` regenerated after self-hosting the
  fonts: a pixel-buffer diff against the previous version showed only
  text-glyph anti-aliasing differences (a different font binary rendering
  the same text), no layout/content change — see `docs/VALIDATION.md`
  "README screenshot"
- `npm test` now runs structural validation followed by 36 DOM behavior checks
- Validation documentation now distinguishes the DOM harness from the
  real-browser Playwright suite, and both from the accessibility, screen-reader,
  and rights-review gates that remain open
- CI now installs dependencies and a Chromium binary and runs the Playwright
  suite after `npm test`, uploading the HTML report as a build artifact on
  failure
- Darkened the `--ink-faint`, `--accent`, and `--ok-ink` CSS color variables to
  meet WCAG AA 4.5:1 text contrast (no other visual change)
- Corrected 22 heading-order violations (17 "Learning objectives" headings
  plus 5 others) to the correct heading level, with a matching CSS override
  so their visible size and weight are unchanged
- Added an accessible name (or `aria-hidden`, where the image is purely
  redundant with adjacent quiz/exercise text) to instructional/quiz/exercise
  SVGs via a new optional parameter on the shared `svgWrap()` helper
- Added a visually hidden label to the two comparison-table corner cells
  that previously had no accessible header text
- Made the 18 scrollable data-table containers keyboard-focusable

### Fixed

- The skip link's target (`#main`) is now focusable, so keyboard-activating
  "Skip to content" moves focus into the content instead of silently
  returning it to `<body>`
- Progress-dashboard cards no longer run the module title directly into
  "Module N" on one line, and the "To do"/"Done" status text can no longer
  wrap — found from the committed README screenshot itself, confirmed
  against `index.html`, and fixed with a scoped CSS/markup change (a new
  `.dc-body` wrapper class with flex/column layout, `display:block` on the
  title/subtitle, `flex:0 0 auto`/`white-space:nowrap` on the status). No
  scientific content changed
- The new quiz/exercise disclosure summary text (`.qh-meta`/`.eh-meta`)
  initially used `--ink-faint`, which measured 4.31–4.41:1 against its
  background — just under the WCAG AA 4.5:1 threshold, found by the
  existing axe-core suite on the very first run. Changed to `--ink-soft`
  (6.23–6.39:1)
- Independent review of the still-open, unmerged progressive-disclosure PR
  found that a collapsed quiz/exercise summary reset to "Not started —
  0 / N" after a page reload even when `getProgress()` still held correct
  answer records, because `buildQuiz`/`buildExercise` always initialized
  score/answered to zero instead of deriving them from persisted state.
  Fixed by seeding both from `state.answers`/`state.exercises` before
  rendering; see `docs/QUALITY_LOG.md` QL-021's addendum

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
