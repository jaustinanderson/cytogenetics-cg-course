# Validation

## Current status

The v1.1.1 repository baseline has passed local structural, content-contract,
DOM-level behavior, and real-browser (Playwright/Chromium) smoke validation,
including automated WCAG scanning (axe-core) and representative
keyboard-only interaction testing, plus a dedicated smoke suite run against
the actual deployed HTTPS GitHub Pages URL (narrow-viewport overflow,
touch-emulated mobile navigation, a touch-emulated quiz interaction, and
reload persistence). This is a reproducible software result, not a claim that
every scientific statement is correct, that touch emulation is equivalent to
physical touch hardware, or that a full accessibility review — which still
requires a representative screen-reader pass — or a rights review has
passed.

## Run all committed tests

Requirements: Node.js 20 or newer.

```bash
npm test
```

`npm test` runs the structural validator followed by the DOM behavior suite.
Each can also be run independently:

```bash
npm run validate
npm run test:behavior
```

The real-browser Playwright suite is separate because it requires installing
a Chromium binary; it is not part of `npm test` and is not required to
install anything to run the dependency-free suites above.

```bash
npm ci
npm run test:e2e:install   # one-time Chromium download (devDependency only)
npm run test:e2e
```

The deployed-site suite is separate again, for a different reason: it targets
the real HTTPS GitHub Pages URL over the open internet rather than a local
static server, so it is never run as part of `npm test` or `npm run test:e2e`
and requires outbound network access:

```bash
npm run test:deployed                          # defaults to the live course URL
DEPLOYED_BASE_URL="https://…/" npm run test:deployed   # or target another URL
```

See "Deployed-site smoke suite" below for scope and limits.

### Structural and content-contract validator

The structural validator checks:

- document shell and required landmarks
- embedded JavaScript syntax
- absence of the Tailwind browser CDN
- explicit static button types
- unique static DOM IDs
- HTTPS external page resources
- public API version and module count
- all 153 question schemas
- globally unique question IDs
- answer-index bounds
- exact domain and difficulty distributions
- 6 exercise sets / 30 exercise items
- 7 flashcard decks / 61 cards
- 19 image records / 2 embedded / 17 needed
- embedded-image license and redistribution metadata
- quiz and exercise mount resolution
- atomic rejection of malformed and globally duplicate injected questions
- `docs/SCIENTIFIC_REVIEW.md` names every current module (catches drift if a
  module is added, removed, or renamed without updating the status record)
- displayed fonts and embedded images are served locally, not from a remote
  runtime host (added 2026-07-31; see "Asset localization" below)

### DOM behavior suite

`tests/dom-behavior.mjs` boots the real inline course script inside the minimal,
dependency-free fixture in `tests/dom-harness.mjs`. Its 36 checks cover:

- rendering of all declared quiz, exercise, flashcard, and schematic mounts
- generated sidebar/dashboard navigation and mobile open/close state
- correct and incorrect quiz behavior, item locking, feedback, and stable IDs
- exercise answering, scoring, advancing, and completion
- module completion, v1-to-v2 migration, storage, and simulated reload
- UI Reset from v1-only, migrated, and v2-only states
- API Reset, import/export, print hooks, public API methods, events, and
  analytics
- runtime question injection and safe handling of markup characters as text
- implemented accessibility affordances: landmarks, skip link, focus-visible
  and reduced-motion CSS, `aria-expanded`, typed controls, and keyboard-
  operable flashcards

The suite was independently mutation-checked. Deliberately breaking migration,
legacy Reset cleanup, answer recording, or import-version validation caused the
expected checks to fail.

The harness is not a browser. It cannot establish rendering, layout, color
contrast, real focus behavior, touch input, networking, or screen-reader
output. CI runs `npm test` on pushes to `main` and pull requests.

### Real-browser smoke suite (Playwright)

`tests/e2e/` runs 34 checks per project against `index.html` in a real
Chromium instance, served locally over HTTP (`python3 -m http.server`, the
same approach the README documents for manual local development), across a
1280×900 desktop viewport and a 390×844 narrow/mobile viewport
(`isMobile`/`hasTouch` enabled). Of 68 total scheduled test runs, 64
currently pass and 4 are intentionally skipped where a check only applies to
one viewport (the mobile-only sidebar/hamburger tests skip on desktop, where
the hamburger control is CSS-hidden; the desktop-only sidebar-link keyboard
test skips on the narrow viewport, where the sidebar is off-canvas until
opened). Coverage:

- page initialization: title, all declared quiz/exercise/flashcard mounts,
  hero stat counts, and the public API's reported version/schema/module count
- sidebar navigation generation and target resolution; scroll-driven active
  nav-link highlighting through the real `IntersectionObserver` (the DOM
  harness only stubs this and requires a manual trigger)
- the mobile navigation toggle's open/close state, backdrop dismissal, and
  close-on-link-activation, at the narrow viewport where the hamburger is
  actually rendered
- correct and incorrect quiz answers: scoring, item locking, and feedback
- exercise answering, scoring, advancing, and full completion
- module completion and its persistence across a real `page.reload()`
- legacy v1-to-v2 progress migration on first real-browser load
- Reset clearing both storage keys and reloading to a clean course, and the
  declined-confirmation path leaving progress untouched
- `exportJSON`/`importJSON` round-tripping progress between two independent
  browser contexts (separate storage partitions, proven empty before import)
- the public API's documented method surface, read-copy isolation, and
  `answer`/`exercise`/`progress`/`content` events firing from real UI actions
- the print control invoking `window.print`, and `beforeprint`/`afterprint`
  toggling `body.printmode`
- page-origin console errors/warnings staying empty through load and through
  a representative navigation/quiz/exercise interaction pass
- dashboard-card layout (`dashboard-layout.spec.mjs`): all 17 cards render,
  title/"Module N" on separate non-overlapping lines, status text does not
  overlap or wrap, at both viewports — added after a confirmed defect; see
  "README screenshot" below and `docs/QUALITY_LOG.md`

Playwright (`@playwright/test`) is a devDependency used only for this suite;
it adds no production runtime dependency and `index.html` requires no build
step. `npm test` (structural + DOM behavior) still runs with zero installed
dependencies; `npm run test:e2e` requires `npm ci` and one Chromium download
via `npm run test:e2e:install`. CI runs both.

This suite establishes real rendering, real layout-dependent scrolling, a
real `IntersectionObserver`, real `localStorage` across navigations, and
real `window.print`/dialog behavior — the specific gaps the DOM harness
above documents that it cannot cover. On its own it does not perform an
accessibility scan or screen-reader review, and does not exercise true
touch-gesture testing (only viewport/`hasTouch` emulation). As of 2026-07-31
(see "Asset localization" below), the two approved course images and the IBM
Plex webfonts are committed to this repository rather than requested from a
third-party host, so `tests/e2e/local-images.spec.mjs` now confirms their
delivery (nonzero natural dimensions) as part of this same local suite —
that confirmation no longer depends on the sandboxed CI runner's network
reachability to any external font or image host, unlike before this change.
Automated accessibility scanning and keyboard testing are added by the two
suites documented next.

### Asset localization — added 2026-07-31

The course previously requested IBM Plex Sans/Mono from Google Fonts and the
two approved course images from Wikimedia Commons/CDC PHIL at runtime. Both
are now committed to this repository (`assets/fonts/`, `assets/images/`) and
served from the page's own origin. See `THIRD_PARTY_NOTICES.md` for exact
upstream sources, retrieval dates, licenses, and file hashes, and
`docs/ARCHITECTURE.md` "External resources" for the current dependency
summary. This closes the asset-localization roadmap item tracked under
Issue #1 (PR #10); Issue #1 itself remains open for its other Milestone 0
items, including a genuine screen-reader review and physical touch-hardware
testing.

Verification performed:

- **Structural** (`tests/validate-course.mjs`, part of `npm test`): every
  `@font-face` `src` resolves to a local `assets/fonts/` path (none remote);
  no reference to `fonts.googleapis.com`/`fonts.gstatic.com` remains
  anywhere in the document; both embedded figures' `<img>` tags point to
  their local `assets/images/` paths and no `<img>` loads from a remote
  host; every referenced local font/image file actually exists on disk with
  nonzero size; and the figures' external source-page/credit links
  (Wikimedia Commons, `phil.cdc.gov`) remain present and unchanged.
  Mutation-tested: temporarily reverting one `<img src>` to its old remote
  URL, and separately reverting one `@font-face src` to a remote URL, each
  made the check fail immediately with a message naming the exact offending
  URL; both were reverted before commit.
- **Local real-browser** (`tests/e2e/local-images.spec.mjs`, part of `npm
  run test:e2e`, both viewport projects): loads the page from the local
  static server and confirms both images' `img.complete` is `true` and
  `naturalWidth`/`naturalHeight` are both nonzero — the same
  `complete`-alone-is-insufficient discipline the deployed suite already
  used, now also exercised locally and requiring no outbound network
  access, because the images no longer depend on one.
- **Deployed real-browser** (`tests/e2e-deployed/local-images.spec.mjs`,
  renamed from `remote-images.spec.mjs`, part of `npm run test:deployed`):
  the same nonzero-natural-dimension check against the real deployed URL,
  now also asserting each image's `currentSrc` resolves to the deployed
  page's own origin rather than a third-party host — a positive
  same-origin-delivery claim, not only "it loaded from somewhere."
- **Visual/layout**: both the desktop and narrow/mobile Playwright projects
  in `npm run test:e2e` render the page with the self-hosted fonts; the
  existing `tests/e2e/dashboard-layout.spec.mjs` and the rest of the suite
  passed unchanged at both viewports, and no visual regression was found on
  manual inspection (see "README screenshot" below for whether the
  screenshot itself needed regenerating).
- **Console/network cleanliness**: `tests/e2e/init.spec.mjs`'s page-origin
  console-cleanliness checks and the local static server's own access log
  were inspected directly during this work and showed only successful
  (`200`) local requests to `assets/fonts/*.woff2` and `assets/images/*` —
  no request to any third-party font or image host, and no console error or
  warning.

### Automated WCAG scanning (axe-core) — added 2026-07-31

`tests/e2e/accessibility.spec.mjs` runs a full-document
[`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm) scan
against the real, fully rendered course, at the same desktop and
narrow/mobile Playwright projects as the rest of the suite, in five states:
immediately after load, with the mobile navigation open (narrow viewport
only), after answering a quiz item, after answering an exercise item, and
after marking a module complete and flipping a flashcard. Each test asserts
the axe-core violation list is empty; no rule is disabled and no violation is
filtered to force a pass. `@axe-core/playwright` is a devDependency used only
by this suite and adds no runtime dependency to `index.html`.

A full-document scan against this single-file, ~4,000-line course takes
roughly 20–30 seconds per run; these five tests call `test.slow()` (3×
Playwright's default per-test timeout) so that is comfortable headroom rather
than a near-miss under normal CI load.

Six confirmed defects were found by this scan, independently verified against
the real page and product source before any change, and corrected with
narrowly scoped fixes that touch styling, markup, and accessible-name
plumbing only — no scientific content changed. See `docs/QUALITY_LOG.md`
QL-010 for the full diagnosis/correction/prevention record. All five states
above now scan clean on both projects.

Scope and an explicit non-claim: axe-core detects a documented subset of
mechanically checkable WCAG 2.x success criteria (missing accessible names,
contrast ratios, heading order, landmark structure, and similar). It cannot
judge whether an experience actually makes sense to someone using a screen
reader. **A green axe-core scan is not a screen-reader review.** No
representative screen-reader review has been performed; that item stays open
in Issue #1 and below.

### Keyboard-navigation interaction — added 2026-07-31

`tests/e2e/keyboard-navigation.spec.mjs` drives the same real Chromium
instance with `page.keyboard` input, covering nine controls named in
Issue #1: the skip link, the desktop sidebar nav, the mobile hamburger menu,
a quiz item, an exercise item plus its Next control, a module-completion
button, Print, and Reset. For every control claimed as Tab-reachable, the
suite proves it by actually pressing `Tab` (via a shared, bounded
`tabUntilFocused()` helper) and asserting the specific target element
becomes `document.activeElement` — it does not call `locator.focus()`,
because programmatic focus succeeds even on a `tabindex="-1"` element that a
real keyboard user could never reach, which would silently defeat the claim
being tested (see the first QL-011 addendum below). Each control's computed
accessible name is asserted with `toHaveAccessibleName()` against real
expected content (a static string or a regex derived from the actual product
data, including the skip link's own "Skip to content"), not merely checked
for presence. Immediately after each real `Tab` arrival, a shared
`assertVisibleFocus()` helper confirms the target is genuinely
`document.activeElement` and that its computed `:focus-visible` style would
actually be visible: `outline-style` other than `"none"`, `outline-width`
greater than zero, and a non-transparent `outline-color`. Only after that
check does the test activate the control with `Enter` or `Space`. The
mobile-menu test also confirms repeated `Tab` presses keep moving focus
forward and reach the sidebar's own links once it is open, rather than
stalling — the absence-of-keyboard-trap check for that control.

This suite confirmed one real defect (the skip link did not move keyboard
focus; see QL-010) and, across authoring and two independent reviews of
PR #6, three false claims in the test file or its surrounding documentation:
an incorrect assumption about mobile-menu tab order (corrected during
authoring); every "keyboard-reachable" test originally using
`locator.focus()` instead of real `Tab` input, which cannot distinguish a
genuinely reachable control from a `tabindex="-1"` one (first review); and,
after that fix, documentation claiming every control's accessible name and
visible-focus outline were asserted when the skip link's name and four
controls' (exercise option, exercise Next, Print, Reset) focus visibility
were not yet actually checked (second review). All three were corrected
before merge; see QL-011 and both of its addenda. Each fix was
mutation-verified against the real page: adding `tabindex="-1"` to the
module-1 mark-complete button, and separately adding
`#printBtn:focus-visible{outline:none}`, each made the corresponding
corrected test fail with a clear message; both mutations were reverted
before commit.

This is representative, not exhaustive, coverage: it does not tab through
every one of the 153 questions or 30 exercise items, and it does not
implement or test Escape-to-close, focus trapping, or inert background
content for the mobile sidebar, because the product does not implement those
either — see "Gates still open" below.

### Deployed-site smoke suite (Playwright, real HTTPS Pages) — added 2026-07-31

`tests/e2e-deployed/` is a dedicated, repeatable Playwright suite that runs
against the real deployed GitHub Pages URL over the open internet, not a
local static server:

```bash
npm run test:deployed
```

The target URL is configurable via `DEPLOYED_BASE_URL`; the documented
default is:

<https://jaustinanderson.github.io/cytogenetics-cg-course/>

This suite is entirely separate from `tests/e2e/`: it lives in its own test
directory with its own Playwright config (`playwright.deployed.config.mjs`,
no `webServer` block) and its own small fixtures file (a deliberate,
independent copy of `tests/e2e/fixtures.mjs`'s console-collecting fixture, not
a shared import), specifically so it can never be pulled into `npm test` or
`npm run test:e2e` and never makes an ordinary local or PR run depend on
outbound internet access. `.github/workflows/deployed-smoke.yml` is a
separate GitHub Actions workflow for the same reason; `ci.yml` is unchanged.

At the same 1280x900 desktop and 390x844 narrow/mobile (`isMobile`/`hasTouch`)
viewports as the local suite, 22 scheduled test runs (16 applicable, 6
intentionally skipped per-viewport/per-project, matching the local suite's
own skip convention) verify against the live page:

- a successful (`response.ok()`), HTTPS `page.goto()` response, the exact
  document title, and the exact hero heading text
- 17 `.mark-complete` module-completion controls, 17 `.quiz-mount` elements,
  6 `.exer` exercise sets, and the public API's reported module/question
  counts
- no page-origin console error or warning, both on load and after a
  representative navigation/quiz/exercise interaction pass
- no horizontal page overflow at the narrow viewport
  (`document.documentElement.scrollWidth <= clientWidth`, narrow project only)
- the mobile hamburger opens via a touch-emulated `.tap()`, with
  `aria-expanded` checked against the sidebar's actual on-canvas/off-canvas
  bounding-box position (not just its CSS class name) in both the closed and
  open state
- tapping a module link scrolls to that module (`window.location.hash`
  updates, the target section's bounding rect reaches the top of the
  viewport), and closes the mobile nav
- tapping the backdrop closes the mobile nav
- a representative quiz answer, driven by `.tap()`, scores and locks the item
- module-completion persistence across a real `page.reload()`, verified in a
  dedicated `browser.newContext({ baseURL })` (an isolated storage partition
  asserted to start at "0 of 17 modules complete" before anything is marked,
  the same discipline the QL-008 addendum established for the local suite's
  import/export test). `baseURL` is passed explicitly and the test asserts
  navigation actually reached the expected deployed origin/path — see
  `docs/QUALITY_LOG.md` QL-013 for why this is asserted directly rather than
  relying on it implicitly
- the two approved images' actual decoded state (`tests/e2e-deployed/
  local-images.spec.mjs`, renamed 2026-07-31 from `remote-images.spec.mjs`
  now that the images are localized — see "Asset localization" below): each
  is scrolled into view (both use `loading="lazy"`), then checked for
  `img.complete` **and** nonzero `naturalWidth`/`naturalHeight` — `complete`
  alone is not sufficient, because it becomes `true` once loading finishes
  whether it succeeded or failed, so it does not by itself prove delivery —
  plus, since 2026-07-31, an explicit same-origin check on each image's
  `currentSrc` against the deployed page's own origin

No smaller viewport was added: the product's only two responsive breakpoints
are `max-width:980px` and `max-width:560px` (`index.html`'s `@media` rules),
and 390px already crosses both, so a third, smaller viewport would not
exercise any additional CSS path.

Authoring this suite against the real live page caught two mistakes in the
suite itself before either was committed — a relative-URL bug
(`page.goto("/")` against a `baseURL` with a path segment drops that path,
copied unexamined from the local suite's convention) and a backwards
bounding-box comparison — see `docs/QUALITY_LOG.md` QL-012 for the full
diagnosis. QL-012 also records a mutation-test demonstration (injecting an
artificially wide element into the live page's loaded DOM, in an ephemeral
browser tab, to confirm the horizontal-overflow assertion actually fails when
overflow is genuinely present) and the exact remote-image result observed
from this environment: both images completed loading with nonzero natural
dimensions (Wikimedia 1280x1003, CDC PHIL 700x563).

**Explicit scope limits, none of which this suite establishes:**

- Playwright's `hasTouch` context option and `.tap()` emulate touch input
  (dispatching `touch*` events plus a synthesized `click`, as real touch
  browsers do) inside a desktop Chromium engine. They are not physical touch
  hardware, a mobile OS, or a mobile browser build, and this suite does not
  claim otherwise.
- A result from this development environment, from a GitHub Actions runner,
  or from any other single network is a result from that network. It is not
  a claim about every visitor's network path to GitHub Pages. (As of
  2026-07-31 the two images and the webfonts are served from GitHub Pages
  itself rather than a separate third-party host, which narrows — but does
  not eliminate — this network-path caveat to GitHub Pages' own delivery.)
- Testing the deployed `main` URL exercises only that URL. It does not create
  or exercise a per-pull-request preview environment; no such environment
  exists for this repository.
- None of the above substitutes for the still-required representative
  screen-reader review (see "Gates still open" below), which remains
  unperformed and is tracked separately in Issue #1.

### Protecting against a stale deployment

GitHub Pages deployment is asynchronous relative to a push to `main`; sleeping
for a fixed period and assuming it finished cannot distinguish "still
deploying" from "deployed" from "deploy failed." Instead,
`scripts/verify-deployed-revision.mjs` (`npm run verify:deployed-revision`)
combines two checks, polling — bounded, not indefinitely — until both agree:

1. GitHub's own deployments API
   (`GET /repos/{repo}/deployments?environment=github-pages`), which records
   the exact commit SHA each Pages deployment was built from, plus that
   deployment's status.
2. A cache-busted (unique query parameter plus `Cache-Control: no-cache`),
   no-cache fetch of the live `index.html` at the exact `DEPLOYED_BASE_URL`
   Playwright's deployed suite is about to use, SHA-256-hashed and compared
   byte-for-byte against the checked-out `index.html`.

**Neither check alone proves "the currently served commit"; that is a
deliberate, precise claim, not an oversight.** The deployments API proves
GitHub *registered a successful build for the target commit SHA* — it says
nothing about whether the bytes a request receives *right now* are those
bytes (CDN caching, propagation delay, or a custom domain pointed elsewhere
could all make the record and the live response disagree). The hash proves
the *live artifact's current bytes* are identical to the checked-out file —
it says nothing about *which commit* produced those bytes if `index.html`
happens to be byte-identical across multiple commits, which it is across
every commit in the branch that introduced this script (this change touches
no product code). Only requiring both together — the deployment record
names the target commit with `state: success`, and the live hash matches —
gives complementary evidence strong enough to trust; the script's own log
output states this scope explicitly on every successful run, not just here.

This was confirmed against the real repository, both mechanisms combined and
each independently:

- Querying the live API for the commit that was `main`'s HEAD at authoring
  time (`033f8c5c8bfae2a0bdb394d4030c2f405f262068`) returned exactly that SHA
  with `state: success`, **and** a cache-busted fetch of
  <https://jaustinanderson.github.io/cytogenetics-cg-course/> hashed to the
  same SHA-256 as the checked-out `index.html`
  (`1e2c0f882dc816aa66f42f2d7fcf4bed5d6e98f355134a12c7322ff106c80b35`) — the
  combined check passed.
- Deliberately querying for a SHA that has never been deployed (`000...000`)
  correctly timed out and exited non-zero rather than silently passing.
- Deliberately pointing `DEPLOYED_BASE_URL` at an unrelated URL
  (`https://example.com/...`) while leaving `GITHUB_REPOSITORY` at its
  default printed an explicit warning that the deployment record and the
  fetch target may not describe the same thing, then correctly failed (the
  unrelated URL 404'd) rather than reporting a false pass.
- `tests/verify-deployed-revision.mjs` (part of `npm test`) adds focused,
  loopback-only checks of the hashing/fetch logic itself — identical content
  hashes match, different content hashes differ, and a local HTTP server
  standing in for "the live URL" is fetched with a distinct cache-busting
  query parameter on every call — without requiring any external network
  access. A deliberate mutation removing the cache-busting query parameter
  made the corresponding test fail with a clear message; reverted before
  commit.

`.github/workflows/deployed-smoke.yml` runs this check before the deployed
Playwright suite, using the exact same `DEPLOYED_BASE_URL` the suite itself
targets (bound once at job level so the two cannot silently diverge). It
requires network access to `api.github.com` (a `GITHUB_TOKEN` raises the
unauthenticated rate limit but is not required for this public repository,
and the workflow's `deployments: read` permission scopes exactly what the
check needs) and to `DEPLOYED_BASE_URL` itself.

**On overriding `DEPLOYED_BASE_URL`:** the deployment-record check is scoped
to `GITHUB_REPOSITORY` (default `jaustinanderson/cytogenetics-cg-course`), not
to whatever URL `DEPLOYED_BASE_URL` happens to point at. If you override
`DEPLOYED_BASE_URL` alone — to test a fork's Pages URL, for example — without
also setting `GITHUB_REPOSITORY` and `TARGET_SHA` to match that fork, the
script is verifying a deployment record for an unrelated repository while
fetching bytes from somewhere else entirely, and it prints a warning saying
so. A custom domain or CNAME that still serves *this* repository's Pages site
is a legitimate reason for `DEPLOYED_BASE_URL` to differ from the canonical
`owner.github.io/repo/` form and does not indicate a problem; a different
fork or repository does, and only setting all three variables together
against the same target produces a meaningful result.

## Deployed smoke test — 2026-07-30 (superseded by the suite above)

This was a one-off manual check of the live deployment, not a repeatable
instrument. `tests/e2e-deployed/` above now provides a repeatable, committed
instrument for its navigation, quiz, module-completion, and
console-cleanliness observations, run against the real deployed URL, not only
`index.html` served locally.

Verified URL:
<https://jaustinanderson.github.io/cytogenetics-cg-course/>

Observed:

- page title and course hero rendered correctly
- custom CSS rendered without Tailwind
- all 17 quiz mounts rendered
- all 6 exercise sets rendered
- the hero correctly displayed 6 interactive exercises
- a correct quiz answer produced the expected feedback
- marking Module 1 complete updated the UI
- Module 1 completion survived a full page reload
- no page-origin console warning or error was recorded

The cloud test browser did not complete either third-party image request at
the time, so successful delivery of the Wikimedia and CDC images was not
established by this one-off test. The page itself emitted no image error, and
source links/fallback content remain present. The repeatable suite above has
since observed both images completing successfully from a different
environment; see QL-012. Asset localization is still an open roadmap
decision, now informed by that mixed evidence rather than a single failed
observation.

## Independently run HTML validation

The initial repository hardening was also checked with:

```bash
npm exec --yes --package=html-validate@10.4.0 -- html-validate index.html
```

That tool is intentionally not a runtime or committed package dependency.

## README screenshot — added 2026-07-31, corrected 2026-07-31, regenerated 2026-07-31

`docs/assets/course-overview.png` is a course-only screenshot embedded near
the top of `README.md`. It is regenerated with:

```bash
npm run capture:readme-screenshot
```

### Regenerated for the font-localization change (2026-07-31)

Self-hosting the IBM Plex webfonts (see "Asset localization" above) is a
change that could plausibly alter rendered text, so the screenshot was
re-evaluated rather than assumed unaffected. A fresh raw capture was decoded
to a raw pixel buffer (via the isolated `sharp` install described below) and
compared against the previously committed image: 2.476% of bytes differed
(out of 6,177,600), confined — per a rendered diff image inspecting exactly
which pixels changed — entirely to text-glyph edge/anti-aliasing pixels
throughout the page, with **no** difference in layout, card structure,
color blocks, icons, or content. This is consistent with, and expected from,
a different font binary (the official `IBM/plex` GitHub release WOFF2 files
now used, versus whatever build Google Fonts previously served) rendering
the same text with slightly different sub-pixel hinting — exactly the kind
of environment/font-source-dependent difference `docs/QUALITY_LOG.md` QL-015
already cautions is not something this script's reproducibility claim
covers across different font sources. Visually inspected side-by-side with
the previous version before committing: no layout or content difference is
visible to the eye. The new raw capture was then losslessly re-optimized
with the same `sharp-cli --palette=false` process documented below and
re-verified pixel-identical to the raw capture before replacing the
committed file. New hash:
`sha256:0db3106529b8e458ff0c1880eca06221b6dba51afc9f0f20d73b64fa0f666331`
(275,156 bytes; same 1440x1430 dimensions as before).

### A confirmed product defect, found from the screenshot itself

Independent review of the first version of this screenshot found a real
layout defect in the dashboard cards it exposed: every card's title ran
directly into "Module N" on one line (e.g. "How to use this
courseModule 1"), and the "To do"/"Done" status text had no protection
against wrapping. Confirmed against `index.html` before changing anything:
the title/subtitle wrapper `<span>` had no class and no layout rules, so the
two plain inline spans (`.dc-t`, `.dc-s`) rendered on the same line instead
of stacking, and `.dc-state` lacked `flex:0 0 auto`/`white-space:nowrap`.

Fixed with a narrowly scoped CSS/markup change: the wrapper span now has a
`dc-body` class (`flex:1 1 auto;min-width:0;display:flex;flex-direction:
column`), `.dc-t`/`.dc-s` are explicitly `display:block`, and `.dc-state`
gained `flex:0 0 auto;white-space:nowrap`. No scientific content changed.
Verified at both the desktop and narrow/mobile (390px) viewports, by real
bounding-box measurement (not visual inspection alone) and by a new
committed test — see below and `docs/QUALITY_LOG.md`.

### Dashboard-layout regression test

`tests/e2e/dashboard-layout.spec.mjs` (part of `npm run test:e2e`, both
projects) checks, via bounding-box and computed-line-height assertions —
**not** pixel snapshots:

- all 17 dashboard cards render
- for every card, the subtitle ("Module N") starts at or below the title's
  bottom edge (i.e. on its own line, not overlapping it)
- for every card, the status text starts at or after the title's right
  edge (i.e. does not overlap it horizontally)
- the status text's rendered height stays within one computed line-height
  (i.e. it did not wrap)
- the same checks hold at the narrow/mobile viewport, plus a check that no
  card forces the grid wider than the viewport

Mutation-tested: temporarily reverting both the CSS and markup to the
pre-fix state made 4 of the 6 test runs fail immediately, with messages
naming the exact overlap/line-order violation; reverified passing and
reverted before commit.

### Capture script

`scripts/capture-readme-screenshot.mjs` produces the screenshot
deterministically and defensively:

- an OS-assigned ephemeral port (`python3 -m http.server 0`) rather than a
  fixed port that could collide with another process; the server's own
  stdout announces the assigned port, and an early process exit (bind
  failure, missing interpreter, etc.) is treated as a conclusive startup
  failure and reported with the captured stderr, not silently retried into
  a generic timeout
- fresh `localStorage` (both progress keys cleared, so the course always
  renders its pristine "0 of 17 modules complete" state)
- a 1440×1430 viewport: 1440px keeps the layout solidly in the desktop CSS
  path (the product's only breakpoints are 980px and 560px); 1430px is not
  guessed, it is measured — the topbar, hero, weighting chart, and the
  full 17-card dashboard grid end at ~1415.8px at this width (re-measured
  after the layout fix above; the pre-fix concatenated/wrapped text had
  actually made rows *taller*, at ~1477.4px, so the fix left more headroom,
  not less), and module 1's own section begins only ~25.6px after that
  (~1441.4px) — 1430 includes the full dashboard with a small margin and
  stops cleanly before any module content, avoiding both an overly short
  crop and the ~100,000px-tall document a `fullPage` capture would produce.
  (An intermediate 1500px capture was visually inspected and rejected
  during this correction: it cut into module 1's header mid-way, which
  reads as an accidental cut-off rather than an intentional edge.)
- `reducedMotion: "reduce"`, which the page's own
  `prefers-reduced-motion` CSS rule responds to, disabling transitions
  with no extra injected styling
- after `networkidle` on reload, explicit assertions — **before**
  capturing — that the page title, the hero heading, and the dashboard
  card count (exactly 17) all match expected values, so a broken boot or a
  future regression fails the script loudly instead of silently capturing
  broken content
- a font-load check that goes beyond `document.fonts.ready`:
  `document.fonts.ready` resolves once font loading has *settled*,
  including a **failed** request, so on its own it cannot distinguish "the
  IBM Plex webfont loaded" from "the request failed and the browser gave
  up." The script additionally inspects each `FontFace` in `document.fonts`
  and requires at least one entry per expected family
  (`status: "loaded"`), failing clearly if the family was never registered
  at all or never reached that status — verified by deliberately blocking
  the Google Fonts requests and confirming `document.fonts.ready` still
  resolved (with `document.fonts` empty) while this check correctly failed
- the local server is terminated and its exit awaited in both the success
  and failure paths (`finally`), confirmed by checking for a leftover
  process after both a normal run and each induced-failure run above

This is a **generation script, not a test**: it is not part of `npm test` or
`npm run test:e2e`, and deliberately does not add a pixel-comparison
assertion. A screenshot that "looks the same" pixel-for-pixel across font
hinting, Chromium versions, or OS font substitution is not a claim this
repository can make, and a brittle pixel-diff test would fail for reasons
unrelated to any real regression. The script produces an artifact for a
human to look at and commit; nothing automatically re-runs it or asserts
against its output. (The dashboard-layout *content* is separately covered
by the real committed test above — that is a layout-correctness claim, not
a visual-identity claim.)

### Reproducibility evidence — corrected

An earlier version of this record claimed reproducibility because two runs
produced the *same file size*. That is not evidence of identical output —
two different images can happen to share a byte count. This was corrected:
running `npm run capture:readme-screenshot` twice in this same environment
and comparing `sha256sum` of the resulting file both times produced the
identical hash
(`a81201a670cf64f7457111a5df011e00e802ea568a5e562f3f362c510d63261a` for the
raw, pre-optimization capture) — a real cryptographic proof for *this*
environment, not a file-size inference. This is **not** a claim that
`npm run capture:readme-screenshot` alone reproduces the *optimized*
(`sharp-cli`-processed) PNG byte-for-byte across different OS/Chromium/font
environments — font hinting, subpixel rendering, and Chromium build
differences can legitimately change rendered output on another machine, and
the optional optimization step is a separate, manual, explicitly-verified
action (below), not part of what the capture script itself guarantees.

The PNG is optionally, losslessly re-encoded after capture with `sharp-cli`
(fetched on demand via `npx`, not a committed dependency, the same pattern
as `html-validate` above) at a higher compression effort than Playwright's
default encoder uses. This step is **not** trusted by file size or by
"looks the same" — it is verified by decoding both the raw capture and the
re-encoded file to raw pixel buffers and comparing them byte-for-byte
(`Buffer.compare(...) === 0`) before the committed asset is replaced.
`sharp-cli`'s default PNG output quantizes to a 256-color palette (lossy; a
first attempt measured a 6% pixel byte difference with values up to 25/255
off), so `--palette=false` is required.

The pixel-buffer comparison needs the `sharp` *library*, which is a
different thing from the `sharp-cli` binary used for the re-encode itself —
`sharp` is not a project dependency, so a plain `node -e
'...require("sharp")...'` fails on a clean clone with "Cannot find module
'sharp'" (this was an actual bug in an earlier version of this
documentation, reproduced and corrected — see `docs/QUALITY_LOG.md` QL-017).
The corrected, portable form installs `sharp` into an isolated temporary
directory (`npm install --no-save --prefix "$SHARP_TMP" sharp`) and points
`NODE_PATH` at it, so the comparison works on any clean clone without ever
adding `sharp` to `package.json`. Both temporary directories involved (the
`sharp-cli` output directory and the `sharp` install directory) are created
with `mktemp -d`, not a fixed path — pointing `sharp-cli`'s `-o` flag at a
path that does not already exist as a directory silently makes it write a
single file at that exact path instead of a directory, a second real
portability bug caught while fixing the first one (also QL-017). The exact,
verified-working command sequence is documented directly in
`scripts/capture-readme-screenshot.mjs`'s header comment, so regenerating
the optimization step repeats the same check rather than trusting it by
inference. See `docs/QUALITY_LOG.md` for the full account of all three
corrections to this record.

## Visual-polish regression suite — added 2026-08-01, corrected 2026-08-01

`tests/e2e/visual-polish.spec.mjs` (Issue #11, `docs/QUALITY_LOG.md` QL-020)
adds real-browser layout coverage for five confirmed visual/responsive
defects and their fixes: learner-facing "Image needed" authoring placeholders
in Modules 8–12, oversized figures with captions that could read as detached,
too-small/faint caption and source text, over-wide prose lines, and an
overlapping/truncating mobile header around 390px. Each defect was
independently measured against the real rendered page (bounding boxes,
computed styles) before any change, per the standing discipline in
`docs/QUALITY_LOG.md`.

The suite runs across both existing Playwright projects (1280×900 desktop,
390×844 narrow/mobile) and, per the acceptance criteria's explicit viewport
matrix, also exercises 1440×900, 768×1024, and 360×800 directly via
`test.use({ viewport })`/`page.setViewportSize()` within the file — 46 test
runs total, all passing. It checks:

- no page-level horizontal overflow at any of the five viewports
- the hamburger, brand, Print, and Reset controls never overlap or get
  clipped past the viewport edge at 768×1024, 390×844, or 360×800
- at the narrow/mobile viewport, the hamburger, Print, and Reset are each
  independently proven: reachable by real `Tab` presses (never `.focus()`),
  visibly focused (a real, non-transparent `:focus-visible` outline),
  keyboard-operable (`Enter`), and touch-operable (`.tap()`) — Print and
  Reset carry an explicit `aria-label` matching their visible text, so
  hiding the label text at ≤560px does not change their accessible name;
  the Reset checks additionally seed a disposable completed-module state via
  a real UI click and verify both the keyboard-driven and the touch-driven
  path actually clear it back to "0 of 17 modules complete"
- zero `.imgneeded` elements and zero "Image needed" text at any tested width
- both embedded figures (Figure 8.1, Figure 10.1) stay within the viewport's
  width and within 60% of its height at all five viewports
- each figure's caption sits within 40px of its image (still visually
  attached), and figcaption/`.src` font sizes stay at or above a 14px/13px
  floor
- a genuine module paragraph is narrowed to the reading measure while its
  sibling table and quiz keep the full content width, **and** a
  representative paragraph from each protected component — a callout, a
  case study, a quick-reference card, a disclaimer, and the exam-weighting
  source note — keeps an unconstrained (`"none"`) computed `max-width`,
  proving the reading-measure rule does not reach into them

This is layout/bounding-box coverage, deliberately not pixel snapshots, for
the reasons already stated for `tests/e2e/dashboard-layout.spec.mjs` above.
It does not replace the still-open screen-reader review, and it does not
address the dense, fully-expanded quiz/exercise disclosure noted as the
recommended next isolated UX task in `docs/ROADMAP.md`.

Mutation-tested: added `tabindex="-1"` to `#printBtn`, re-ran the Print
reachability test in isolation, and it failed immediately with
`tabUntilFocused: "Print control" was not reached by natural Tab order
within 15 presses. Focus ended on a.nav-link.`; reverted before commit,
confirmed by `git diff index.html` showing no remaining `tabindex` change.

### The reading-measure rule is scoped to genuine lesson prose only

An intermediate version of this work applied `p{max-width:70ch}` globally,
which — confirmed by independent review, not assumed — reached into
`.source-note`, `.callout p`, `.case-body p`, and `.grid-card p`, narrowing
component paragraphs that were never meant to be affected. The rule is now
`.module p:not(.callout p):not(.case-body p):not(.grid-card p):
not(.source-note){max-width:70ch}`, derived from a real-DOM survey (using
`Element.closest()` in a live Chromium page) of all 159 `<p>` elements in the
document: exactly 32 are genuine narrative lesson prose with no enclosing
callout/case/card wrapper, and only those are capped. See
`docs/QUALITY_LOG.md` QL-020's addendum for the full survey method and
the two new regression tests that check this directly via computed
`max-width`, not by comparing rendered widths across unrelated components
(a first attempt at that comparison produced a false failure against
`.grid-card p`, which is legitimately narrower than the reading-measure cap
because of its own two-column card layout — see the addendum).

### README screenshot — reverted, not regenerated

Because the reading-measure rule no longer reaches `.source-note`, the
progress-dashboard grid's measured bottom edge returned to exactly its
original ~1415.8px (confirmed directly in a real browser), so
`docs/assets/course-overview.png` no longer needs regenerating —
`scripts/capture-readme-screenshot.mjs`'s capture height was restored to
1430, and the committed screenshot was reverted to the exact
pre-visual-polish file (`git checkout b3bc3a8 -- docs/assets/
course-overview.png`), confirmed by matching SHA-256
(`0db3106529b8e458ff0c1880eca06221b6dba51afc9f0f20d73b64fa0f666331`) rather
than kept as an unnecessary regenerated replacement.

## Quiz/exercise progressive-disclosure suite — added 2026-08-01

`tests/e2e/progressive-disclosure.spec.mjs` (Issue #11,
`docs/QUALITY_LOG.md` QL-021) adds real-browser coverage for the quiz and
exercise redesign: every `.quiz`/`.exer` widget is now a native
`<details>`/`<summary>` element, collapsed by default, instead of an
always-expanded block. Before choosing this design, the actual rendered
behavior was measured directly at desktop, tablet, and narrow/mobile
widths (see "Measured density" below) rather than assumed. This suite is
complementary to disclosure-specific coverage already added to
`tests/e2e/keyboard-navigation.spec.mjs` (Tab-reachability, visible focus,
and keyboard-opening the summary for both a quiz and an exercise) and
`tests/e2e/accessibility.spec.mjs` (a freshly opened, unanswered quiz
state). It covers, across both Playwright projects:

- every quiz/exercise starts collapsed with a summary communicating
  activity type, title, item count, and a "Not started"/"In
  progress"/"Completed" status word (in addition to the pre-existing
  `.qh-score`/`.eh-score` "X / Y" text, kept in its exact original format)
- click, keyboard (Enter and Space), and touch (`.tap()`) expand and
  collapse, both directions
- status and score stay visible on the summary while collapsed, after a
  partial answer — the "avoid trapping a partially answered activity in an
  unclear collapsed state" requirement
- opening/closing a disclosure never writes to stored progress and never
  fires a `progress` API event — confirmed by diffing `getProgress()`
  before and after toggling every quiz and exercise on the page
- after a real `page.reload()`, every disclosure is collapsed again (its
  default, not persisted, matching "collapsing/expanding is not course
  progress"), but the **summary status and score are derived from
  `state.answers`/`state.exercises` on every render**, so a quiz or
  exercise with existing persisted records reads "In progress — X / N" or
  "Completed — N / N" immediately, never "Not started," while records
  remain untouched (no `progress` event fires from loading a page with
  existing data). Covered for both partially- and fully-answered persisted
  state, for both quiz and exercise. The quiz's own pre-existing behavior
  of not visually restoring per-question lock state on reload is
  unaffected by this change, confirmed directly rather than assumed.
- reattempting a previously recorded item (only reachable across a reload,
  since a locked item cannot be clicked twice within one render session)
  replaces its latest result rather than double-counting it: the summary
  score reflects only the newest correctness, and the item's stable ID is
  not counted as newly answered a second time — covered for a
  correctness-changing reattempt on both a quiz and an exercise, asserting
  exactly one distinct recorded ID and its stored attempt count (`n`)
  incrementing to `2`
- Reset clears progress and reloads with every disclosure collapsed and
  every status back to "Not started — 0 / N"
- print mode (`page.emulateMedia({ media: 'print' })`, not a computed-style
  proxy — see the finding below) genuinely exposes a closed quiz's full
  question set and a closed exercise's current item, and also a
  pre-existing closed case-study `details.card`; a disclosure already open
  before printing stays open afterward, never force-closed
- the narrow-viewport summary row does not cause horizontal page overflow

Existing suites that interact with quiz/exercise content
(`tests/e2e/quiz-and-exercise.spec.mjs`, `accessibility.spec.mjs`,
`api-print-console.spec.mjs`, `init.spec.mjs`, `keyboard-navigation.spec.mjs`,
and `tests/e2e-deployed/identity-and-console.spec.mjs`,
`quiz-and-persistence.spec.mjs`) were updated to open the relevant
disclosure before interacting with content inside it, via a small
`openDisclosure()` helper added to each suite's own `fixtures.mjs` (an
independent copy in the local and deployed suites, matching the existing
suite-independence convention).

### A confirmed print-exposure defect — the CSS-only approach did not work

The first implementation mirrored the pre-existing `details.card>
.card-body{display:block !important}` print rule for the new
`.quiz-body`/`.exer-body`. A mutation test on this rule passed
unexpectedly (removing it did not make the print-exposure test fail),
which prompted verifying the actual mechanism with
`page.emulateMedia({ media: 'print' })` instead of trusting
`getComputedStyle(...).display`. That direct check found closed
`<details>` content is suppressed by Chromium via an internal rendering
behavior: `getComputedStyle(...).display` reports `"block"` for it, and
`getBoundingClientRect()` returns a real but stale layout box, while the
content is genuinely not painted or visible under real print media. This
meant the pre-existing `.card-body` print override never actually worked
either — a latent defect this investigation surfaced, not one introduced
by this change. Fixed by setting the real `open` property in the existing
`beforeprint`/`afterprint` handlers (force-open every `<details>` for
print, restore each one's true prior state afterward), verified with real
print-media emulation, and mutation-tested (removing the fix made the
print-exposure test fail with a clear "Expected: visible / Received:
hidden" message). See `docs/QUALITY_LOG.md` QL-021 for the full account,
including the WCAG contrast defect (`.qh-meta`/`.eh-meta` on the summary
background measured 4.41:1/4.31:1 against the 4.5:1 AA threshold, found by
the existing axe-core suite) and a dependency-free-harness incompatibility
(`.dataset` unsupported by `tests/dom-harness.mjs`) that were also found
and fixed before merge.

### A confirmed blocking defect — collapsed summaries disagreed with persisted progress after reload

Independent review of the draft PR found that a fresh quiz's collapsed
summary correctly read "Not started — 0 / 5," updated to "In progress —
1 / 5" after answering one question, but reset back to "Not started —
0 / 5" after a page reload — even though `getProgress().answers` still
held the correct record. The first exercise had the same defect. Because
these widgets are now collapsed by default, the summary is the learner's
primary status indicator, so this is newly blocking product behavior, not
a restatement of the pre-existing per-question lock-rendering gap noted
above. Root cause: `buildQuiz`/`buildExercise` always initialized
`score`/`answered` to zero on every render instead of deriving them from
`state.answers`/`state.exercises`. Fixed by seeding both from the
persisted records before rendering (read-only — confirmed to fire zero
`progress` events) and by making the answer/choice handlers capture the
prior record before overwriting it, so a reattempt updates the score to
the latest result without counting the item as newly answered twice. See
`docs/QUALITY_LOG.md` QL-021 addendum for the full account, including the
mutation-test evidence.

### Measured density — before and after

Measured with a real Chromium page against the exact pre-change merge
commit (`197eec4b75c4f6dc3c339335c21e7680e8402434`) and this branch, same
methodology both times: `document.documentElement.scrollHeight`, real
`getBoundingClientRect()` heights for every `.quiz`/`.exer` element, and a
provably-correct `.quiz[open] .qopt`/`.exer[open] .eopt` count for
"answer buttons a user could currently see and tab to."

| Viewport | Doc height before | Doc height after | Reduction | Quiz/exercise share before | Quiz/exercise share after |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1440×900 | 110,209px | 60,386px | 45.2% | 46.6% | 2.5% |
| 768×1024 | 114,441px | 65,478px | 42.8% | 44.1% | 2.3% |
| 390×844 | 149,545px | 98,373px | 34.2% | 35.8% | 2.4% |

Visible answer buttons on a fresh load: 636 before, 0 after, at every
viewport. Full before/after screenshots are in the evidence artifact
linked from the PR description (not committed to the repository).

## Gates still open

### Browser behavior

The DOM suite and the Playwright real-browser suite together cover the core
logic paths, real scrolling/highlighting, real reload/storage behavior,
print invocation, and console cleanliness described above. Still required:

- ~~running the same repeatable browser assertions against the deployed
  GitHub Pages URL, not only a local static server~~ done 2026-07-31 via
  `tests/e2e-deployed/` (see above) for navigation, mobile-nav
  open/close/backdrop/module-link, a quiz interaction, and reload
  persistence, all against the real HTTPS URL
- pixel/visual print-rendering review (the suite verifies the print hook and
  class toggling, not print layout)
- true touch-gesture testing (both suites emulate touch input via
  `hasTouch`/`.tap()`, which is Playwright's touch emulation, not real touch
  hardware, a mobile OS, or a mobile browser build)
- ~~confirmation, in an environment with normal network access, that the two
  third-party images load or fall back as expected~~ done 2026-07-31 for
  *this* environment: both images completed loading with nonzero natural
  dimensions (see QL-012). This is one observation from one network, not a
  claim about every visitor's or every CI runner's network path; re-checked
  automatically whenever `npm run test:deployed` has network access

### Accessibility

The DOM suite checks the implemented static and keyboard affordances listed
above. `tests/e2e/accessibility.spec.mjs` adds an automated axe-core WCAG
scan (five real-browser states, both viewports, zero violations, six
confirmed-and-fixed defects — see QL-010) and
`tests/e2e/keyboard-navigation.spec.mjs` adds representative keyboard-only
interaction coverage with focus-visibility and keyboard-trap checks (see
above).

Still required:

- Escape and focus behavior for the mobile sidebar
- hidden/inert navigation state
- live announcements for results and completion
- flashcard front/back screen-reader state
- a representative screen-reader review — **not established by an automated
  scanner or by keyboard-only testing, no matter how thorough**; this remains
  a distinct, unperformed gate

### Scientific review

Required before release qualification:

- exact source record
- authoritative-source check
- Austin's subject-matter review
- review date and status
- edition/SOP sensitivity where applicable

The current, itemized status against these requirements — what is
Source-checked, what remains Draft, and what is explicitly unknown — is
recorded in [`docs/SCIENTIFIC_REVIEW.md`](./SCIENTIFIC_REVIEW.md), added
2026-07-31. As of that record: no question, exercise, flashcard, or case
content has an independent scientific review recorded; only the exam
blueprint's domain names and published target ranges are source-checked
against the dated ASCP BOC content guideline. The current question
distribution against those ranges is a separate, mechanically measured
fact — only the specimen domain currently falls within its published
range (analysis, molecular, and operations do not; see `README.md`
"Course coverage"). `docs/SCIENTIFIC_REVIEW.md` also reconciles its
"SME-reviewed" usage with `docs/CONTENT_GOVERNANCE.md`'s existing
definition (review by Austin specifically) and carries the reusable
review-log format and per-item checklist to use once a real review begins.
Passing the automated suites documented above establishes structural and
behavioral consistency — it does not and cannot establish scientific
correctness; `docs/SCIENTIFIC_REVIEW.md` states this distinction explicitly
so it cannot be inferred from a green CI run.

### Rights review

Required per image or other third-party asset:

- source and creator
- exact license or public-domain basis
- verification date
- attribution
- modification status
- redistribution decision

## Release language

Use:

> Structurally validated beta; full scientific and accessibility review is in
> progress.

Do not use:

> Validated CG(ASCP) course

unless the validation scope is immediately and unambiguously qualified.
