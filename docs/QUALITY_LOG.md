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

