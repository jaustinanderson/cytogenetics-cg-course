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

- **Status:** Open; Milestone 1
- **Finding:** Exercise outcomes use IDs such as `ex7-1`, derived from array
  position.
- **Impact:** Inserting or reordering exercise items can attach saved history to
  a different item.
- **Cause:** Presentation order was used as persistent identity.
- **Correct action:** Give each item a stable explicit ID and migrate existing
  position-based records.
- **Prevention:** Any persistable entity must have an order-independent identity
  and a migration test.

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
