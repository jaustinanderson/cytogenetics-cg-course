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
