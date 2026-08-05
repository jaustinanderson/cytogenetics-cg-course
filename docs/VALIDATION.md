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

## Figure 9.1 label-layout fix and Figure 10.1 karyogram replacement — added 2026-08-01

Direct review of the live course confirmed two figure-quality defects, fixed
on a new, separately scoped issue (see `docs/QUALITY_LOG.md`; this does not
reopen Issue #11).

### Figure 9.1: centromere-morphology label overlap

**Confirmed defect:** the three morphology labels ("Metacentric",
"Submetacentric", "Acrocentric + satellite") were rendered as embedded SVG
`<text>` elements inside one shared `<svg>` whose `viewBox` was computed
from the chromosome drawings' geometry only (`rowCard()`'s `x`/`W`
accumulation), never from the labels' own rendered width. At real font
sizes, "Metacentric" overlapped "Submetacentric" and "Acrocentric +
satellite" extended past the `viewBox`'s right edge and the figure's own
boundary — confirmed directly against the live page before any change, not
assumed from the acceptance-criteria description alone.

**Fix:** `index.html`'s `chromoOnlySVG()`/`morphGrid()` (new) separate each
chromosome drawing from its label entirely. Each morphology is now its own
`.morph-item` in a responsive CSS grid (`.fig-morph-grid`,
`display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))`),
with the label as ordinary wrapping HTML text (`.morph-label`) below a
small, label-free SVG drawing — not embedded SVG `<text>`, so a long label
can wrap onto a second line instead of overlapping a neighbor or escaping a
fixed viewBox. `auto-fit`/`minmax` collapses to a single column once three
150px-minimum tracks no longer fit the available width, without a hard
media-query breakpoint, so it stacks at the narrow viewports without
needing to duplicate the product's existing 560px/980px breakpoints. The
figure's "(schematic)" title and caption badge are unchanged; the three
small SVGs are marked `aria-hidden` (the visible HTML label next to each
one is a strictly better accessible name than a synthesized `aria-label`
would have been).

**Verification, measured directly, not assumed:**

- A standalone Playwright script (not committed) checked real bounding
  boxes at all five acceptance-criteria viewports (1440×900, 1280×900,
  768×1024, 390×844, 360×800) before the committed test file was written:
  every label fully contained within the figure, zero pairwise label-box
  intersections, and `document.documentElement.scrollWidth <= clientWidth`
  at every viewport. At 1280/1440/768px the three cards render in one row;
  at 390/360px they stack into a single column, confirmed by each label's
  y-coordinate diverging by hundreds of pixels between items rather than
  sharing a row.
- `tests/e2e/figure-9-1-morphology.spec.mjs` (new, both Playwright
  projects plus the three extra viewports via `test.use({ viewport })`
  inside the file, matching the existing convention in
  `tests/e2e/visual-polish.spec.mjs`) commits this as a permanent
  regression check: exact label text (uncut), per-label containment within
  both the figure and its own card, zero pairwise label-bounding-box
  intersection, no label-element internal clipping
  (`scrollWidth <= clientWidth`), no page-level horizontal overflow, and
  that the figure still says "(schematic)" in both its title and caption.
- **Mutation-tested**: with the fix stashed (reverting to the pre-fix
  embedded-SVG-`<text>` markup, via `git stash` — the new test file itself
  is untracked and unaffected by the stash), 10 of the 12 test runs failed,
  each for the correct underlying reason (`.morph-label`/`.morph-item`
  never exist in the old markup, so the containment/overlap assertions
  cannot even locate their targets) — confirming the suite actually depends
  on the fix rather than passing vacuously. Restoring the fix (`git stash
  pop`) returned all 12 runs to passing.

### Figure 10.1: trisomy-21 karyogram replaced

**Confirmed defect:** the embedded CDC PHIL image (`image #12504`) had
chromosome morphology and band detail below the bar for a professional
cytogenetics study guide: heavily thresholded/low-contrast, chromosomes
grouped (e.g. "C 6-12 + XX") rather than individually numbered, and — found
by decoding and reading the plate's own printed group label directly,
not assumed — the depicted karyotype is actually **female**
(46,XX-derived, i.e. 47,XX,+21), which did not match the course's own
primary worked ISCN example immediately below it in the lesson text
(`47,XY,+21`).

**Replacement search, and what was rejected first:** per the acceptance
criteria, the commonly available Wikimedia/DOE "21 trisomy - Down
syndrome.png" was not considered — it is also heavily thresholded and would
not have been a material improvement. A Wikimedia Commons file from the
Josef Reischig CC BY-SA archive, titled "Human karyotype (263 15) ... 47,
XY, +21 (Down syndrome).jpg" (3,749×2,399px), looked promising by its
title, resolution, and license alone — but decoding and visually inspecting
the actual image (not trusting the filename or an automated page-text
summary) showed it is a **raw, unsorted metaphase spread**: overlapping,
unpaired chromosomes scattered across the field, with intact interphase
nuclei still visible on the same slide, not an arranged karyogram. It was
rejected on that basis alone, despite its higher pixel count and permissive
license — confirming this course's own prior note (see `docs/ROADMAP.md`
Milestone 2B) that this collection's metaphase images "are not direct
replacements for a properly arranged karyogram."

**Selected replacement:** Wellcome Collection work `wmcdanw6`, "Down
syndrome human karyotype 47,XY,+21" (Miro image `B0000249`, credit "Wessex
Reg. Genetics Centre"), fetched at its full native resolution
(1176×1158px) via the IIIF Image API. Verified directly against
`api.wellcomecollection.org`'s catalogue record (not only the human-readable
page) as `license.id: "cc-by"` / `"Attribution 4.0 International (CC BY
4.0)"` with `accessConditions[].status.id: "open"`. Visual inspection
confirmed a genuinely arranged G-banded karyogram: chromosomes cut, paired,
and laid out in numbered rows 1–22 plus X/Y, the title "47,XY,+21 TRISOMY
21 (DOWN'S SYNDROME)" printed directly on the plate, and an arrow marking
the third chromosome-21 copy. No patient name, date of birth, or
accession/specimen number is visible anywhere on the plate. Full
before/after image comparison, exact hashes, and the rejected candidate's
record are in `THIRD_PARTY_NOTICES.md`.

**Structural/behavioral verification:**

- `tests/validate-course.mjs`'s asset-localization check (`assets/` path
  resolution, no-remote-host check, on-disk existence/nonzero-size check,
  and the external source-page-link check) was updated to the new filename
  and Wellcome Collection URL and continues to pass — see "Asset
  localization" above for what this check covers
- `tests/e2e/local-images.spec.mjs` and `tests/e2e-deployed/
  local-images.spec.mjs` were updated to check the new filename;
  `npm run test:e2e`'s local run confirms nonzero natural dimensions and
  same-origin delivery from the local static server exactly as before
- `tests/e2e/visual-polish.spec.mjs`'s figure-sizing and caption-attachment
  checks (which iterate the embedded figures generically, not by
  filename) pass unchanged against the new, differently proportioned
  (near-square vs. the old 700×563) image
- A full local run of `npm test` (55 dependency-free checks) and
  `npm run test:e2e` (both Playwright projects, including the new
  `figure-9-1-morphology.spec.mjs` and the updated `local-images.spec.mjs`
  and `accessibility.spec.mjs`) passed with zero axe-core violations and
  zero page-origin console errors/warnings after both figure changes — see
  the completion report on this branch's pull request for the exact command
  output

## Stable exercise-item identity — added 2026-08-02, corrected 2026-08-02

`tests/dom-behavior.mjs` (Issue #2, `docs/QUALITY_LOG.md` QL-005) adds 17
dependency-free checks covering the exercise-progress identity migration,
plus a structural completeness check in `tests/validate-course.mjs`. Every
exercise item now carries two literal fields: an explicit stable `id`
(replacing the position-derived `"<key>-<n>"` string previously recomputed
on every render) and a frozen `legacyId` recording the exact
position-derived key that item held before this change. `migrateExerciseIds()`
normalizes any surviving legacy-format key — read from each item's own
`legacyId`, never recomputed from its current array position — on load and
on import. Covers:

- every one of the 30 exercise items has an explicit, unique, non-blank
  `id` **and** a unique, non-blank `legacyId`, with no accidental
  `id`/`legacyId` collision, **and** the complete live `id → legacyId`
  mapping matches an independently hard-coded, frozen historical table
  exactly — key-for-key and value-for-value, not merely "every value
  happens to be unique" (`tests/validate-course.mjs`). Uniqueness alone
  cannot catch two items' `legacyId` values being swapped with each
  other: both values would still be present, still unique, and still
  non-colliding with any stable id, while migration would silently
  attach one item's saved history to a different item. The expected
  table is written directly into the test, never computed from
  `EXERCISES`, an item's current array position, or `item.legacyId`
  itself — computing "expected" from the data under test cannot detect a
  mistake in that same data
- an item's id is a literal property of the item, not derived from array
  position (reversing a cloned items array moves each id with its item)
- a legacy-format record migrates to its item's stable id on load, with
  the legacy key gone from both memory and the persisted `localStorage`
  record
- migration is idempotent: a second load against already-migrated state
  performs **zero** additional `localStorage` writes, verified by exact
  string equality of the stored record before and after, not merely an
  equivalent-value check — covered both in the simple case and after a
  conflict was resolved
- a freshly answered exercise item is recorded only under its stable id,
  never a position-derived key
- exercise progress survives a real reload, an `exportJSON`/`importJSON`
  round-trip, and importing a legacy-format export, all under the item's
  stable id

**Conflict resolution** (both a legacy key and its item's stable key hold
a record) is covered by five tests, all exercising a conservative
deterministic **snapshot** policy — never an arithmetic merge — because
these records carry no attempt-level provenance and their histories
cannot be assumed disjoint:

- the mixed-version-tab overlap example: one tab migrates an early
  5-attempt snapshot to the stable key while another tab, still on the
  legacy key, later records a 6th attempt that already includes the
  first 5 — proving the resolved record's `n` stays **6**, the true
  attempt count, not an inflated **11** a sum would have produced
- a newer stable record wins outright over an older legacy record
- a newer legacy record wins outright over an older stable record
- an equal-timestamp tie deterministically keeps the canonical
  stable-key record
- idempotency holds after a conflict was resolved (a second load performs
  zero further writes)

Three tests do not merely assert a data-shape contract — they run the
real, unmodified product script (not a stub) inside a fresh `vm` context
with one line — `EXERCISES.ex7.items.reverse();` — injected into a copy
of the exact extracted inline script text at a fixed anchor comment, so
the injection is confirmed to have actually changed the executed script
before each test proceeds:

- `"reordering exercise items in source cannot attach stored history to a
  different item"`: two items are answered (with deliberately different
  correct/incorrect outcomes, so a mix-up would flip a recorded
  correctness value, not just a count) *before* the array is reordered,
  proving the runtime lookup stays correctly attached to each item's own
  stable id regardless of its current position
- `"a legacy-format record migrates to its ORIGINAL item's stable id even
  if EXERCISES has since been reordered..."` and its import-path
  counterpart: a legacy-format record is seeded and the array is reordered
  *before* migration ever runs, proving the migrated record follows the
  item `legacyId` actually identifies, never whichever item now occupies
  that array position — the specific gap an array-index-based legacy-key
  computation would reintroduce (see QL-005's addendum)

**Mutation-tested**, per the standing discipline this log already
establishes elsewhere, across five separate mutations, each reverted and
confirmed byte-identical to the pre-mutation file via `diff` before
committing: (1) disabling the `migrateExerciseIds()` call in
`loadProgress()` failed exactly the migration/conflict/idempotency/export
tests; (2) reverting the `choose()` handler's stable-id lookup back to a
position-derived computation failed exactly the "answered only under the
stable id" and reordering tests; (3) reverting `migrateExerciseIds()` to
compute the legacy key from the item's current array index instead of
reading its frozen `legacyId` failed exactly the two reorder-before-
migration tests; (4) reverting the snapshot conflict policy back to
summing `n` failed exactly the five conflict-resolution tests, including
the mixed-tab overlap example; (5) swapping two items' `legacyId` values
in `index.html` (`ex7-i1`↔`ex7-i2`) — a mistake that leaves every count,
uniqueness, and collision check still satisfied, confirmed directly by
isolating and re-running just those checks against the mutated data —
failed the `tests/validate-course.mjs` exact-mapping assertion with a
diff naming exactly the two swapped entries. All checks passed again
after each revert.

`tests/e2e/progressive-disclosure.spec.mjs`'s existing seeded-record test
(`"loading a page with existing persisted answer/exercise records writes
nothing new and fires no progress event"`) was updated to seed its
exercise record under `"ex7-i1"` (the real stable id) instead of the
legacy `"ex7-1"`, so it keeps proving its original claim — an
already-current-format record needs no migration, so loading it performs
no write and fires no `progress` event — rather than incidentally
exercising migration itself, which has its own dedicated coverage above.

**Schema-version decision:** `SCHEMA_V` stays `2`. See
`docs/QUALITY_LOG.md` QL-005 for the full reasoning: the stored record's
shape is unchanged, and the migration is unconditional, deterministic, and
cheap enough to always run rather than gate behind a version number.

No question, answer, rationale, scoring, quiz progress, analytics
semantics, image, styling, layout, or accessibility presentation changed.

## Progress-import validation and cloning — added 2026-08-02, corrected 2026-08-02 (twice)

`tests/dom-behavior.mjs` (Issue #2, `docs/QUALITY_LOG.md` QL-006 and its
addenda) adds 49 dependency-free checks covering `importJSON()`'s full
validation and atomicity contract — 27 from the initial hardening pass, 13
more from a first correction pass after independent review found three
further gaps (persistence-failure atomicity, own-property vs.
inherited-property validation, and export-wrapper shape), and 9 more from
a second correction pass closing a record-object gap (exotic built-ins
like `Date`/`Map` accepted as empty record objects; symbol keys,
non-enumerable properties, and accessor properties invisible to the
`Object.keys()`-based exact-shape checks). See `docs/ARCHITECTURE.md`
"Import validation" for the exact accepted bare-state and wrapper schemas,
the record-object requirement, and the transaction order. Covers:

- **round-trip:** a current `exportJSON()` output (now including an
  exercise outcome, not only a module and a quiz answer) imports correctly
  into a fresh instance
- **detachment:** importing a plain JS object (not a JSON string) and then
  mutating that object afterward — at the top level, inside a nested
  outcome record, and by adding a brand-new key — never changes live
  `getProgress()`, proving the accepted state is a full deep clone with no
  shared references anywhere in the graph
- **schema version:** both a wrong version and a version field missing
  entirely are rejected
- **size, checked before parsing:** an oversized (300,000-character),
  deliberately-not-valid-JSON string is rejected with a size-specific
  error — proving the length check runs *before* `JSON.parse` is ever
  attempted, not after a parse failure or a schema check
- **entry-count cap:** a payload with 2,001 module entries (well past the
  documented 2,000 cap) is rejected before the more expensive per-entry
  structural pass
- **nested-type rejections**, each its own test: `modules`/`answers` as an
  array, as `null`, or as a string; a `modules` entry that isn't the
  literal `true`; an outcome record that is `null` or an array; a
  non-boolean `c`; a zero, negative, non-integer, or string `n`; a
  negative or string `ts`; an outcome record with an extra unexpected
  key; an exercises entry validated the same way as answers; an
  unrecognized top-level field; a non-numeric `started`
- **dangerous keys:** `constructor` in `modules` and `prototype` in
  `exercises` are rejected as ordinary malformed-key cases; a dedicated
  test additionally proves a `__proto__` key never actually pollutes
  `Object.prototype` **in the course's own realm** (`vm.runInContext("({}).polluted", env.sandbox)`,
  not this test file's own `Object`, which is a different JavaScript realm
  entirely) — see QL-006 for a self-caught bug in the first version of
  this specific defense, found by actually running this test rather than
  assuming a `{'__proto__':true}`-shaped key list worked
- **atomicity for every rejection above:** a single shared helper,
  `assertImportRejectedAtomically()`, asserts `getProgress()`,
  `localStorage`, the rendered module-count label, and the count of fired
  `progress` API events are all byte-for-byte unchanged after every one of
  the rejection cases above — not spot-checked on a few of them
- **no partial writes:** an import with valid `modules`/`answers` fields
  but one malformed `exercises` entry leaves `getProgress()` completely
  unchanged, proving earlier-validated fields never leak into live state
  before a later field fails
- **missing required own fields:** each of `modules`/`answers`/`exercises`/
  `started` individually absent as an own property is rejected (`v` absent
  is covered by the dedicated missing-schema-version test above)
- **persistence-failure atomicity (correction pass):** with the test
  harness's storage object monkey-patched so `setItem()` throws mid-import,
  an otherwise fully valid import returns `{ok:false}`, and `getProgress()`,
  `localStorage`, the rendered module-count label, and the fired-`progress`-
  event count are all unchanged — then, with storage restored, confirms the
  identical import now succeeds, proving the earlier failure was
  specifically about persistence, not an unrelated rejection
- **own-property vs. inherited-property (correction pass):** a state object
  built via `Object.create()` with every required field only on its
  prototype (zero own keys) is rejected; an outcome record with three own
  keys that are none of `c`/`n`/`ts`, plus genuine `c`/`n`/`ts` values
  inherited from its prototype, is rejected
- **export-wrapper contract (correction pass):** an unknown wrapper field,
  a dangerous own key on the wrapper itself (a genuine own `__proto__` via
  `JSON.parse`), a wrapper whose `state` is only prototype-inherited (not
  own — falls through to bare-state validation and is rejected there, not
  silently unwrapped), a wrapper missing `exported`, and wrong types for
  `exported`/`stats` are each rejected; a full current `exportJSON()` →
  `importJSON()` round trip confirms the accepted wrapper shape still
  matches what this app actually produces
- **record-object requirement (second correction pass):** a state whose
  `modules`/`answers` are exotic built-ins (`new Date(0)`, `new Map()`,
  both of which have zero own enumerable-or-not properties, so the
  previous `typeof x === 'object'` check accepted them as silently empty
  maps); a state whose `exercises` is a `Set` and, separately, whose
  `modules` is a `RegExp` (a `RegExp` instance owns a non-enumerable
  `lastIndex` property, so it is independently caught by the
  own-data-property check too — confirming the two defenses are not
  redundant with each other); a `Map` subclass overriding
  `Symbol.toStringTag` to read as `"[object Object]"`, confirming the
  record-object check inspects prototype-chain shape rather than
  `Object.prototype.toString`; an outcome record with a genuine fourth own
  property marked non-enumerable (invisible to `Object.keys()`); an
  outcome record whose `c` field is an accessor (getter) rather than a
  data property; a state with an own **symbol** key; a wrapper `stats`
  field that is a `Date`. A dedicated positive test confirms
  null-prototype objects (`Object.create(null)`) are accepted as valid
  records at every level (state, containers, and outcome records) — the
  deliberate design decision documented in `docs/ARCHITECTURE.md`. All
  eight adversarial counterexamples above were confirmed as real, working
  exploits by direct execution against the pre-fix validator (via the same
  `vm`-sandboxed `importJSON()` this test file exercises) before any fix
  was written, not assumed from reading the code.

**Mutation-tested**, three separate mutations from the initial hardening
pass, each reverted and confirmed byte-identical to the pre-mutation file
via `diff`: (1) weakening `isValidCount()` to accept any number (removing
the integer/range checks) failed exactly the counter-related rejection
tests plus the partial-write test; (2) reverting `DANGEROUS_KEYS` to the
broken `{'__proto__':true, ...}` object-literal form failed exactly the
`__proto__`-pollution test; (3) writing `candidate.modules` into live
`state` *before* `validateImportedState()` completes failed exactly the
tests whose rejection depends on atomicity (wrong schema version, too many
entries, the mixed valid/invalid payload, a bad `modules` entry, and a
dangerous key in `modules`) — each of these mutations left a real,
observable partial write that the shared atomicity assertion caught
immediately.

**Mutation-tested, correction pass**, four further mutations, each
reverted and confirmed byte-identical via `diff`: (1) committing `state =
candidate` before (rather than after) the `localStorage.setItem()` attempt
failed exactly the new persistence-failure test; (2) removing the
`hasOwn` ownership check inside `isValidOutcomeRecord()` failed exactly
the inherited-outcome-record test; (3) removing the `REQUIRED_STATE_KEYS`
ownership loop in `validateImportedState()` failed exactly the six tests
that depend on it (the prototype-only state test, the four individually-
missing-field tests, and the pre-existing missing-`v` test); (4) reverting
`validateImportEnvelope()` to the original `isPlainObject(o.state) ?
o.state : o` logic failed exactly the five wrapper-rejection tests (the
valid-wrapper round-trip test correctly continued to pass, since a
genuinely valid wrapper is accepted by both versions).

**Mutation-tested, second correction pass**, two further mutations, each
reverted and confirmed byte-identical via `diff`: (1) weakening
`isRecordObject()` to accept any non-array object (reverting to the
original weak check) failed exactly the four exotic-built-in tests (the
`Date`/`Map` state test, the `Set`/`RegExp` state test, the spoofed-tag
test, and the wrapper-`stats`-is-a-`Date` test) and none of the
own-data-property tests, confirming the `RegExp` half of the `Set`/
`RegExp` test really is independently caught by the other defense, as
claimed above; (2) weakening `hasOnlyOwnDataProperties()` to always return
`true` failed exactly the three own-property-shape tests (the
non-enumerable extra, the accessor `c`, and the symbol key) and none of
the exotic-built-in tests — together proving neither check subsumes the
other, exactly as the "both checks are necessary together" reasoning in
`docs/ARCHITECTURE.md` claims.

**Schema-version decision:** `SCHEMA_V` stays `2`. The accepted record
shape is completely unchanged from before this work — every field that
was ever legitimately written by this app already satisfies the new
validator — only what was previously silently trusted is now checked.
Gating stricter validation behind a version bump would need a real
compatibility break to justify (there is none here; see
`docs/QUALITY_LOG.md` QL-006 for the full reasoning and the measured
real-export evidence behind the two documented size limits).

No question, answer, rationale, scoring, quiz progress, analytics
semantics, image, styling, layout, or accessibility presentation changed.

## Stale question/exercise/module ID policy — added 2026-08-02, corrected 2026-08-02

`tests/dom-behavior.mjs` (Issue #2, `docs/QUALITY_LOG.md` QL-024 and its
addendum) adds 14 dependency-free checks (101 → 115) covering what
happens when a
`modules`/`answers`/`exercises` key no longer corresponds to anything in
the current `MODULES`/`QUIZZES`/`EXERCISES` data. See
`docs/ARCHITECTURE.md` "Stale question/exercise/module ID policy" for the
full decision record, rejected alternatives, and the exact guarantee
list. Policy in one line: a stale record is preserved under its original
id and simply excluded from every current-facing figure at read time —
never deleted, moved, or quarantined. Covers:

- **mixed current/stale in one state:** a real, currently-known question
  answer alongside a fabricated question id — `getStats()` counts only
  the real one (`questionsAnswered`, `questionsCorrect`, `overallPct`),
  and the stale record itself is preserved value-for-value in
  `getProgress()`; the same for a real exercise-item outcome alongside a
  fabricated exercise id, checked via a fresh boot's rendered
  `.eh-score` (`importJSON()` does not re-render exercise widgets on
  success — a separate, still-open Milestone 1 item this correction does
  not implement, so exercise-rendering coverage here deliberately goes
  through a fresh boot from seeded storage, not through `importJSON()`
  directly)
- **stale-only state:** modules/answers/exercises all holding only
  fabricated ids produces zero `modulesComplete`/`questionsAnswered`/
  `questionsCorrect` and a `null` `overallPct`, empty `byDomain`/
  `byTopic`/`byDifficulty`, and every current question reported
  unmastered with zero attempts — no throw, no miscounting
- **orphaned legacy exercise key vs. a real migration in the same
  state:** a legacy key matching a current item's own frozen `legacyId`
  migrates normally; a legacy-*shaped* key matching no current item's
  `legacyId` is preserved completely untouched, in both `getProgress()`
  and the persisted `localStorage` record, and never reaches any current
  item's rendered score
- **reordering with a stale record present:** the live `QUIZZES.m1`
  array reversed via the same script-injection technique QL-005
  established, and separately `EXERCISES.ex7.items` reversed the same
  way, each with a fabricated stale record present — in both cases the
  stale record survives the reorder untouched under its own id, and does
  not attach to whatever item now occupies its former array position
- **reload idempotency:** a state seeded with both a real
  legacy-to-stable migration and an orphaned legacy key, loaded twice in
  succession — the second load performs zero further writes (byte-identical
  persisted record) and `getStats()` agrees across both loads
- **export/import round trip:** a stale record round-trips
  value-for-value through `exportJSON()` → `importJSON()`, present in the
  raw exported `state` on both sides, while the exported `stats` block
  (and the fresh instance's `getStats()` after re-import) exclude it
  throughout
- **event correctness:** loading/importing a stale-only state fires no
  `answer`/`exercise` events (nothing about accepting a stale record
  should look like the learner just interacted with something), only the
  ordinary `progress` event a genuinely persisted change already fires
- **atomicity unaffected:** a stale-but-structurally-valid record sitting
  next to a genuinely malformed one still causes full atomic rejection
  (the existing QL-006 guarantee, unaffected by this policy); a
  persistence failure during a stale-record-containing import still
  leaves state/storage/events completely unchanged
- **public-API/`markModule()` distinction:** `getProgress()`/
  `exportJSON()` preserve a stale module record raw, `getStats()`
  excludes it from `modulesComplete`, and `markModule()` still rejects an
  *unknown* module id outright — a dedicated test proves this is a
  different, write-time guard (never create a new record for an id that
  was never valid) from the read-time policy above (an existing record
  for an id that used to be valid), not a contradiction
- **runtime-injected-question boundary:** a question added via
  `addQuestions()` and answered within one session becomes stale the
  moment a second session boots from the same storage without
  re-injecting it (`getStats()` excludes it, `getProgress()` still shows
  it), and reviving it (calling `addQuestions()` again with the same id,
  standing in for any future reintroduction mechanism) picks the exact
  preserved record back up automatically — proving the boundary without
  resolving the separate, still-open content-pack format decision
- **the Reset exception, correction added 2026-08-02:** an explicit,
  user-confirmed Reset is the one deliberate exception to
  "preserve, filter at read." Through the real `#resetBtn` UI click path
  (`window.confirm` simulated via the harness's `confirmResponses` queue,
  never by directly mutating internal state), a state seeded with both
  current and stale records at every level — module, answer, and exercise
  — across *both* the v2 and legacy v1 storage keys at once confirms Reset
  removes all of it: both storage keys are fully cleared, and a simulated
  reload afterward (a fresh `boot()` from whatever remains) shows a blank
  `getProgress()`, zeroed `getStats()`, and a zeroed rendered progress
  label/module-complete state — stale records included, not just current
  ones, which none of the pre-existing per-scenario Reset tests combined
  in one seed

**A test-authoring pitfall caught while writing this suite:**
`assert.deepEqual`/`deepStrictEqual` checks prototype identity, not only
structural equality. `getStats()`'s `byDomain`/`byTopic`/`byDifficulty`
(and `tally()` generally) are built via raw object-literal syntax inside
the app's own `vm` sandbox realm, which has a genuinely different
intrinsic `Object.prototype` from this test file's realm (and, since each
`boot()` creates a fresh `vm.createContext()`, from a second `boot()`'s
realm too) — `assert.deepEqual(stats.byDomain, {})` and comparing two
different boots' full `getStats()` output both failed with "Values have
same structure but are not reference-equal," confirmed with a minimal
`vm` reproduction before concluding this was a test-authoring issue, not
a product defect. Fixed by comparing via `JSON.stringify(...)` instead —
this codebase's established pattern for exactly this comparison class
(see QL-006's atomicity helper). Values that pass through `clone()`
(`getProgress()`/`exportJSON()`, which round-trip through the *shared*
`JSON` object `tests/dom-harness.mjs` injects into the sandbox) do not
hit this, since `JSON.parse` always builds its result using the calling
script's own realm intrinsics regardless of which `vm` context invoked
it — confirmed directly before relying on the distinction.

**Mutation-tested**, three mutations, each reverted and confirmed
byte-identical via `diff`: (1) reverting `getStats()`'s fixed computation
to the original `Object.keys(state.answers).length`-based one failed
exactly the five tests that depend on the fix; (2) introducing an
accidental "strip every exercise key that isn't a current stable id"
cleanup pass into `migrateExerciseIds()` — the rejected "strip stale
records" alternative, reintroduced by mistake — failed exactly the six
tests that depend on preservation; (3) removing either storage-key
deletion from the `#resetBtn` handler (tried separately for `PKEY` and
for `PKEY_V1`) each failed the new Reset-exception test, plus whichever
pre-existing per-scenario Reset test already covered that specific key.

**Schema-version decision:** `SCHEMA_V` stays `2`. No stored field's
shape or meaning changes and nothing previously accepted becomes
rejected; only which records count toward current-facing figures
changes, correcting a silent inconsistency (see the `getStats()` bug
above) rather than imposing a new restriction.

No question, answer, rationale, scoring, image, styling, layout, or
accessibility presentation changed.

## Exercise widget re-render after import and Reset — added 2026-08-03

`tests/dom-behavior.mjs` (Issue #2, `docs/QUALITY_LOG.md` QL-025) adds 9
dependency-free checks (115 → 124), and
`tests/e2e/progress-and-reset.spec.mjs` adds 5 real-browser Playwright
checks, covering `importJSON()`/`reset()` correctly rebuilding `.exer`
(exercise) widgets, which they previously did not — a real, confirmed
defect reproduced through the real public API and rendered DOM before
any fix was written. See `docs/ARCHITECTURE.md` "Content-widget rebuild
after import and Reset" for the full decision record, including a
resume-to-first-unanswered-item positioning change that was tried while
investigating this, caught as a real regression by the pre-existing
`tests/e2e/progressive-disclosure.spec.mjs` reattempt test when the
*complete* local suite was run (not only the new tests), and reverted
before committing — `buildExercise()`'s rendering logic ends this branch
byte-for-byte unchanged from `main`. Covers:

- **partial import restores exact rendered state:** an exercise imported
  with one correct and one incorrect item shows the right summary score
  (`1 / 4`) and status (`In progress`); the widget starts at item 0 (its
  established, unchanged behavior) with fresh/enabled controls even
  though item 0 already has a persisted record — reattempt remains
  possible — no stale feedback, and Next correctly disabled until item 0
  is itself (re)answered in this render
- **completed import shows completed state accurately in the summary:**
  an exercise imported with every item answered shows the correct
  summary (`4 / 4`, `Completed`); the widget still starts at item 0,
  labeled `Next` (not `Finish`, since item 0 isn't the last item), with
  controls enabled for reattempt
- **answering live then importing blank progress removes every stale
  visual/interactive trace:** score, disabled controls, and feedback all
  reset to their fresh, unanswered state
- **the public `reset()` API clears exercise progress, both storage
  keys, statistics, and the rendered widget** — extended from the
  existing quiz-only `reset()` test to also seed and verify an answered
  exercise item and the legacy v1 key
- **no duplicate controls, listeners, or scoring across repeated
  import/reset operations:** five back-to-back import/reset calls leave
  exactly one exercise widget, exactly the expected number of option
  buttons, and exactly one `exercise` event per click afterward (proving
  no listener stacking)
- **reattempting an already-recorded item after a rebuild replaces its
  prior outcome without double-counting:** an item pre-recorded via
  import, then re-answered through the real UI once the widget actually
  rebuilds and surfaces it, updates `c`/increments `n` in place rather
  than creating a second record or inflating the answered count — the
  dependency-free counterpart to the pre-existing
  `tests/e2e/progressive-disclosure.spec.mjs` reattempt test that caught
  the reverted positioning regression described above
- **stable-ID migration and stale-exercise-ID handling remain intact:**
  an orphaned legacy key stays inert alongside a real legacy→stable
  migration, and the rendered widget agrees (QL-005/QL-024 unaffected)
- **the documented event contract holds:** `importJSON()` and `reset()`
  each fire exactly one `progress` event as already documented, and
  rebuilding widgets never manufactures an `answer` or `exercise` event
- **disclosure state survives a rebuild:** an exercise widget left open
  before an import stays open afterward, verified structurally (a
  `.exer` element IS the `<details>` itself, so `buildExercise()`'s
  `host.innerHTML`-only replacement never touches `host`'s own `open`
  attribute)

Real-browser coverage in `tests/e2e/progress-and-reset.spec.mjs` repeats
the partial-import, completed-import, blank-import, confirmed-Reset, and
reattempt scenarios above against actual Chromium rendering, each
asserting a clean page-origin console alongside the rendered-state
checks. The full local suite, including the pre-existing
`tests/e2e/progressive-disclosure.spec.mjs`/`tests/e2e/quiz-and-exercise.spec.mjs`
files this branch did not intentionally modify, was run and passed
before committing — the same run that originally caught the reverted
positioning regression.

**Mutation-tested:** reverting `importJSON()`/`reset()`'s calls to
`rebuildContentWidgets()` back to the original
`$all('.quiz-mount').forEach(buildQuiz)` line (leaving `init()` and the
helper itself untouched, isolating exactly the two broken connections)
failed exactly the five tests that depend on either call site rebuilding
an exercise widget, and no others.

No question, answer, rationale, scoring, mastery/accuracy semantics,
stable-ID format, migration policy, `SCHEMA_V`, image, provenance, or
content-pack decision changed.

### Correction — direct public API coverage for `reset()`, added 2026-08-03

Independent review found that the "confirmed Reset path" real-browser
test above drives Reset through `#resetBtn`, whose handler ends in
`location.reload()` — a full page re-execution that would rebuild every
widget from scratch via `init()` regardless of whether the public
`CytoCourse.reset()` method itself ever rebuilt exercise widgets. That
test therefore could not, by itself, prove `reset()`'s own effect — only
that the page looks right after a reload masks it.

Added one new test to `tests/e2e/progress-and-reset.spec.mjs`: answers an
exercise item live (score, status, disabled controls, and feedback all
visibly non-default), installs `progress`/`answer`/`exercise` event
counters, then calls `window.CytoCourse.reset()` **directly** via
`page.evaluate()` — no `#resetBtn` click, no `location.reload()`, no
navigation — and checks the rendered exercise widget, `getProgress()`,
`getStats()`, and both storage keys immediately afterward. Proves no
navigation occurred via a `window`-scoped sentinel property set
immediately before calling `reset()`: a real navigation replaces `window`
entirely, silently wiping the sentinel, so its survival is direct,
checked evidence, not an assumption from the absence of a `page.reload()`
call in the test source. Confirms exactly one `progress` event and zero
`answer`/`exercise` events, matching this course's standing
measured-not-assumed event-contract discipline.

**Mutation-tested:** reverted `reset()`'s call to
`rebuildContentWidgets()` back to the original quiz-only
`$all('.quiz-mount').forEach(buildQuiz)` line — deliberately leaving
`importJSON()` and `init()` untouched, isolating exactly the one
connection this correction targets. The new direct-call test failed for
the expected reason (the exercise widget's score still read the stale
`"1 / 4"`); the pre-existing `#resetBtn`-driven UI-Reset test and the
`importJSON()` tests both continued to pass under the same mutation,
directly confirming the reload-based test cannot detect this specific
defect. One unrelated test (`importJSON()` with a fully completed
exercise) failed intermittently in the same run; confirmed as the
pre-existing cross-file flake already documented for this branch by
rerunning it in isolation with the mutation still applied, where it
passed. Reverted and confirmed `index.html` byte-identical via `diff`.

Full record: `docs/QUALITY_LOG.md` QL-025's addendum.

## Storage-failure detection and session-only progress — added 2026-08-03

`tests/dom-behavior.mjs` (Issue #2, `docs/QUALITY_LOG.md` QL-026) adds 15
dependency-free checks (124 → 139), and a new
`tests/e2e/storage-failure-warning.spec.mjs` adds 6 real-browser
Playwright checks (run under both configured projects — desktop-chromium
at 1280×900 and mobile-chromium at 390×844 — satisfying the desktop/
narrow-width requirement without a per-test viewport override). See
`docs/ARCHITECTURE.md` "Storage-failure detection and session-only mode"
for the full state-machine/policy record. Covers:

- **ordinary actions under a forced write failure** (quiz answer,
  exercise answer, module-completion UI click, public `markModule()`):
  in-memory progress and rendered UI still advance; durable storage stays
  at its last-saved state; the `#storageWarning` banner appears; the
  per-module "Saved — nice work." text does not; `getPersistenceStatus()`
  reports `{persistent:false, reason:'write-failed'}`; existing
  `answer`/`exercise`/`progress` event counts are unchanged
- **initialization read-failure vs. corrupt JSON, kept distinct:** a
  genuine `localStorage.getItem()` failure (new `failStorageReads`
  harness option) initializes safely with a blank state and shows the
  warning immediately, before any user action, reporting
  `reason:'unavailable'`; corrupt-but-readable stored JSON still falls
  through to a blank v2 state exactly as before this change, with no
  warning and `persistent:true`
- **no silent overwrite of unseen prior progress:** storage is seeded
  with genuine prior progress the app cannot see this session (its read
  is broken), and a later action is proven to never even call
  `setItem()` while `reason:'unavailable'` holds — the seeded value is
  read back byte-for-byte untouched, not merely "unobserved to change"
- **repeated-failure deduplication:** three failed actions in a row fire
  exactly one `persistence` event and produce exactly one warning
  element, with progress still correctly recorded for each action (no
  corruption or double-counting)
- **full-state recovery after a write-only failure:** two actions fail to
  persist; once storage becomes writable again, the next action's save
  persists the entire accumulated state (all three changes, not just the
  one that happened to succeed), the warning/status clears only at that
  point, and every accumulated change survives a real reload
  (`tests/dom-behavior.mjs`) or the Playwright equivalent
  (`tests/e2e/storage-failure-warning.spec.mjs`)
- **Reset failure honesty, both paths:** the public `reset()` API returns
  `{ok:false}` (never a false `{ok:true}`) on a full or partial storage
  failure, still applies the blank state in memory; the UI `#resetBtn`
  path does not call `location.reload()` on a storage-removal failure
  (proven with no navigation occurring, via a `window`-scoped sentinel in
  both the dependency-free and Playwright suites) and instead applies and
  renders the blank state in place, honestly flagged session-only
- **`importJSON()`'s narrow status-only exception:** a storage-write
  failure during import still returns `{ok:false}`, still leaves live
  state/storage/every progress-bearing event untouched (re-confirmed via
  the existing atomicity assertion helper), and only the separate
  `persistence` status/event reflects the genuinely observed failure; a
  subsequent successful import clears session-only mode
- **the warning's accessibility contract, real-browser only:**
  `role="status"`, correct wording, and — checked directly via
  `document.activeElement`, not inferred — that answering a question
  while the warning is visible never moves focus onto the banner itself

**Mutation-tested** (4 reversions in `index.html`, each run against the
full `npm test` suite, each confirmed to fail only the tests that depend
on the guard it removed, then reverted and confirmed byte-identical via
`diff` before committing):

1. Restored the pre-fix `saveProgress()` (unconditional silent
   `try{setItem}catch(e){}`, no `persistState` involvement) — failed
   exactly the 8 tests that depend on write-failure detection existing at
   all (write-failure warning/status tests, the no-silent-overwrite test,
   the dedup test, the recovery test, and the import status-exception
   test), and no others.
2. Removed the `persistState.persistent` check from the `.mark-status`
   text condition (`state.modules[id] ? 'Saved...' : ''`) — failed
   exactly the 2 tests that directly assert no false "Saved" text appears
   under a write failure, and no others.
3. Moved `markPersistent()` ahead of the `localStorage.setItem()` call in
   `saveProgress()` (clearing session-only status before the write is
   confirmed to succeed) — failed exactly the repeated-failure dedup
   test, which is the one assertion sensitive to a spurious
   persistent→session-only→persistent flicker within a single failed
   save; the recovery test's own assertions still converge to the same
   correct final values, so it does not independently catch this
   mutation.
4. Changed the UI `#resetBtn` handler to call `performReset(true)` then
   unconditionally `location.reload()`, ignoring the returned result —
   failed exactly the one test asserting the UI Reset path does not
   reload on a storage-removal failure, and no others.

Full local validation for this task: `npm test` (139/139), targeted
`npx playwright test tests/e2e/storage-failure-warning.spec.mjs`
(12/12 across both projects), and the complete
`npx playwright test` suite (all existing + new specs).

No question, answer, exercise, scoring, mastery/accuracy semantics,
stable-ID format, migration policy, `SCHEMA_V`, stale-ID policy, import
schema, or content-pack decision changed. `markModule()`/`addQuestions()`
return-value semantics are unchanged.

### Correction — sticky `'unavailable'` clobber and warning viewport visibility, added 2026-08-03

Independent review of PR #20 (the entry above) at head `cf0a815`
confirmed CI green, `npm test` passing 139/139, and the general
read-failure/write-failure model coherent, but reproduced three real
defects, all fixed on the same branch without merging:

1. **A failed `importJSON()` could clobber unseen prior progress.**
   Reproduced exactly: seed genuine prior v2 progress → make reads fail
   at init (`reason:'unavailable'`, correctly never having read that
   seeded record) → attempt an otherwise-valid import while writes also
   fail → the reason was incorrectly downgraded to the non-sticky
   `'write-failed'` → restore write access while reads remain broken →
   an ordinary action (`markModule()`) then successfully wrote the
   session's blank/partial state over the seeded record, since
   `'write-failed'` (unlike `'unavailable'`) does not block
   `saveProgress()`. This defeated the primary safety guarantee of the
   state machine described above. Fixed in `importJSON()`'s catch: only
   call `markSessionOnly('write-failed')` when the reason was not
   already `'unavailable'`. A failed import beginning from
   `persistent:true` or `'write-failed'` still transitions to
   `'write-failed'`, unchanged. A successful import still clears
   `'unavailable'` as before (unaffected by this correction).
2. **The warning banner could be off-screen while "visible."** The
   original `#storageWarning` sat in normal document flow directly under
   `<header>`, at the top of a page that can run tens of thousands of
   pixels tall. `toBeVisible()` (used throughout the entry above) proves
   only that an element renders and has non-zero size — not that it
   intersects the viewport a scrolled-down learner is actually looking
   at. Fixed by making `.storage-warning` `position:fixed` to the
   viewport's bottom edge (see `docs/ARCHITECTURE.md`'s "User-visible
   warning" for the full CSS rationale, including why the bottom edge
   was chosen over the top to avoid the sticky header/sidebar). New
   tests use Playwright's `toBeInViewport()` specifically because
   `toBeVisible()` cannot detect this class of defect.
3. **API `reset()`'s partial-failure status was inaccurate.** When only
   the legacy `PKEY_V1` removal failed but the canonical v2 blank-state
   write succeeded, the API path reported `{persistent:false,
   reason:'write-failed'}` and showed `#storageWarning` — even though
   the current live state genuinely was durably saved, and
   `loadProgress()` always prefers a valid v2 record over ever reading
   `PKEY_V1` at all, so the surviving legacy key is provably inert. Fixed:
   the API path's (`usePkeyRemoval:false`) persistence status now
   depends on `v2Cleared` alone; the UI path (`usePkeyRemoval:true`,
   which clears `PKEY` by *removing* it rather than overwriting it)
   still correctly depends on both operations, since either failing
   there risks a real v1-migration resurrection of old progress on
   reload. `reset()`'s returned `{ok: v1Removed && v2Cleared}` is
   unchanged in both paths — the legacy-key cleanup failure is still
   honestly reported there; only the separate persistence status no
   longer conflates it with current-state durability on the API path.

See `docs/ARCHITECTURE.md` "Storage-failure detection and session-only
mode" for the corrected transition table and full account, and
`docs/QUALITY_LOG.md` QL-026's addendum for the finding-by-finding
record.

**6 new dependency-free tests** in `tests/dom-behavior.mjs` (139 → 145)
add: the full clobber-reproduction sequence (seed → read-failure init →
failed import → status stays `'unavailable'` → write access restored →
ordinary action still skips the write → seeded record still
byte-for-byte intact), a regression guard that a failed import from
`persistent:true` still transitions normally, API `reset()` with
only-legacy-key failure (status stays persistent, no warning, legacy key
honestly still reported present, reload proves the durable v2 state
authoritative over it), API `reset()` with a genuine v2-write failure
(status correctly session-only), a fully successful API `reset()`
regression guard, and the UI path's only-legacy-key failure (correctly
remains session-only, unlike the API path).

**3 new real-browser Playwright tests** in
`tests/e2e/storage-failure-warning.spec.mjs` (6 → 9, all under both
configured projects) add: the full clobber-reproduction sequence against
real `localStorage` (seeding via `page.addInitScript` before the
read-failure patch, inspecting the raw store through a captured
pre-override `getItem` reference so the test's own inspection isn't
blocked by the same patch the app experiences); the warning's
`toBeInViewport()` proof after scrolling to module 15 and triggering a
failure from there, including that it still does not receive focus and
does not duplicate on a second failure from the same scroll position;
and a recovery test proving the warning clears and the page layout was
never disturbed (checked via a document-relative — not viewport-relative
— position, since clicking a later module in the same test legitimately
scrolls the page and would otherwise produce a false layout-shift
signal).

**Mutation-tested** (3 additional targeted reversions in `index.html`,
each reverted and confirmed byte-identical via `diff` before
committing):

5. Restored the unconditional `markSessionOnly('write-failed')` in
   `importJSON()`'s catch (removing the `reason !== 'unavailable'`
   guard) — failed exactly the new dependency-free clobber-sequence test
   *and* the new real-browser clobber-sequence test, and no others,
   confirming both layers genuinely exercise this guard.
6. Restored the API Reset path's status gate to `v1Removed && v2Cleared`
   (removing the `usePkeyRemoval`-conditional `currentStateDurable`
   logic) — failed exactly the new "only legacy-key removal fails"
   dependency-free test, and no others.
7. Restored the original in-flow, non-`position:fixed` `.storage-warning`
   CSS — failed both new deep-scroll Playwright tests, under both
   configured projects (4 failures total: 2 tests × 2 projects), and no
   others.

Full local validation after this correction: `npm test` (145/145),
`npx playwright test tests/e2e/storage-failure-warning.spec.mjs` (18/18
across both projects), and the complete `npx playwright test` suite.

No question, answer, exercise, scoring, mastery/accuracy semantics,
stable-ID format, migration policy, `SCHEMA_V`, stale-ID policy, import
schema, or content-pack decision changed by this correction either.

### Correction — the fixed warning could obstruct content and navigation, added 2026-08-03

Independent review of the correction above (head `e84cf6b`) confirmed
the three prior fixes correct — CI green, the sticky-`'unavailable'`
clobber genuinely prevented, the API Reset path's status genuinely
path-dependent — but found one further real defect: making
`#storageWarning` `position:fixed` (to guarantee viewport visibility at
any scroll depth) removed it from normal document flow, so nothing
downstream reserved room for it. While shown, it could sit visually on
top of the page's own bottom-most course content and, at narrow widths,
on top of the mobile sidebar's own bottom-most nav links — both still
fully hit-testable underneath it, since `position:fixed` does not
disable pointer events. The prior "document position unchanged" test
proved the banner didn't shift *earlier* content, which is necessary but
not sufficient: it says nothing about whether anything ended up
underneath the banner's own rectangle.

**Fix:** a `--storage-warning-h` custom property (declared on `:root`,
default `0px`) is kept in sync with the banner's actual live rendered
height by a new `setStorageWarningReservedHeight()` — called
synchronously inside `updateStorageWarning()` whenever it shows/hides
the banner, and reactively by a new `ResizeObserver`
(`wireStorageWarningReservedSpace()`, wired once from `init()`) for any
later size change with no accompanying `persistState` transition (text
rewrapping at a new width, browser zoom, a web font finishing load, a
longer localized message). `.content`'s bottom padding and `.sidebar`'s
own `height` (both the desktop sticky version and the mobile
fixed/off-canvas version) each add or subtract this same variable, so
real layout space is reserved for the banner in every affected scroll
region whenever it is shown. `pointer-events:none` on the banner alone
was considered and rejected: it would let clicks pass through but the
banner would still visually cover whatever was underneath it — the fix
had to remove the obstruction itself, not merely its side effect on
clicks. See `docs/ARCHITECTURE.md`'s "Non-obstruction" paragraph for the
full mechanism.

**3 new dependency-free tests** in `tests/dom-behavior.mjs` (145 → 148)
cover what is meaningfully checkable without a real layout engine: that
`document.documentElement.style.getPropertyValue('--storage-warning-h')`
tracks shown (a non-zero `NNpx` value, read via the harness's new
`Node.getBoundingClientRect()` stub — zero when `[hidden]`, a plausible
non-zero height otherwise) vs. hidden (`'0px'`) state; that recovery
clears it back to `'0px'` alongside the banner; and that repeated
failures keep it stable rather than drifting. `tests/dom-harness.mjs`
gained a `getBoundingClientRect()` stub on `Node`, a `style.setProperty`/
`getPropertyValue`/`removeProperty` stub (course code sets the custom
property via the standard `setProperty()` API, not direct assignment),
and a `ResizeObserver` stub mirroring the existing `IntersectionObserver`
one.

**6 new real-browser Playwright tests** in
`tests/e2e/storage-failure-warning.spec.mjs` (9 → 15, all under both
configured projects except two narrow-width-specific ones gated with
`test.skip` below 980px, matching this suite's established convention)
replace the prior "document position unchanged" assertion with direct
non-obstruction proofs:

- a course control at the very end of the page sits fully outside the
  banner's rectangle (`boundingBox()` intersection check) and — proven
  via real `document.elementFromPoint()` hit-testing at its center, not
  rectangle math alone — is not intercepted by the banner, and remains
  clickable
- the banner never overlaps the sticky header's rectangle
- at 390×844 with the mobile sidebar open, the final nav link becomes
  fully visible strictly above the banner's top edge, does not overlap
  it, hit-tests correctly, and activating it still closes the sidebar
  normally
- repeated failures keep the reserved space (`--storage-warning-h`, read
  via `getComputedStyle`) at a single stable value rather than
  accumulating
- recovery collapses the reservation cleanly: `document.documentElement.scrollHeight`
  returns exactly to its pre-failure baseline (not merely "close to,"
  and specifically isolated from two confounds found while writing this
  test — a lazy-loaded figure that only fetches once scrolled near,
  settled via a targeted `waitForFunction` before measuring baseline
  rather than the racier `networkidle`; and marking a *different* module
  complete for the recovery action than for the initial failure, which
  itself changes page height independent of the reservation, fixed by
  toggling the *same* module's control on then off instead — matching
  this course's standing discipline of isolating exactly one variable
  per assertion) and `window.scrollY` is unchanged
- at 390px width the message is confirmed to actually wrap to multiple
  lines (checked against computed `line-height`, not assumed from
  message length) and the reservation still exactly covers the taller,
  wrapped banner with no overlap
- no CSS transition applies to the banner or `.content` regardless of
  motion preference, and `.sidebar`'s own (legitimate, unrelated,
  pre-existing) open/close slide transition is still correctly
  suppressed under an explicit `prefers-reduced-motion: reduce`
  emulation

**Mutation-tested:**

8. Removed only the `var(--storage-warning-h)` terms from `.content`'s
   padding and both `.sidebar` height rules, leaving the fixed banner
   and its measurement JS completely intact — failed the mobile-sidebar
   final-link test (rectangle overlap correctly detected) and both
   recovery/scroll-extent tests (the page no longer grows while the
   banner is shown), across both projects where applicable. The
   course-control-near-the-bottom, sticky-header, repeated-failure, and
   multi-line-wrap tests did not fail under this specific mutation in
   this content's current layout (existing incidental spacing already
   happened to leave enough clearance in those particular cases) —
   reverted and confirmed `index.html` byte-identical via `diff` before
   committing regardless, since the mutation's purpose is proving the
   guard is load-bearing somewhere, which it clearly is.

Full local validation after this correction: `npm test` (148/148),
`npx playwright test tests/e2e/storage-failure-warning.spec.mjs`
(consistently passing across repeated runs; two pre-existing,
already-documented `networkidle`-based flakes in tests unrelated to this
correction — "a failed write shows the accessible warning..." and the
sticky-`'unavailable'` real-browser test — each independently confirmed
to pass in isolation, matching this repository's standing
parallel-worker-contention flake pattern), and the complete
`npx playwright test` suite.

No question, answer, exercise, scoring, mastery/accuracy semantics,
stable-ID format, migration policy, `SCHEMA_V`, stale-ID policy, import
schema, or content-pack decision changed by this correction either.

## Analytics semantics: last-attempt mastery — added 2026-08-03

`tests/dom-behavior.mjs` (Issue #2, `docs/QUALITY_LOG.md` QL-027) adds
12 dependency-free checks, and a new
`tests/e2e/analytics-semantics.spec.mjs` adds 4 real-browser Playwright
checks (both configured projects). See `docs/ARCHITECTURE.md`
"Analytics semantics: last-attempt mastery" for the full model and
public-API record. Covers:

- **fresh state:** zero answered, zero mastered, `lastAttemptMasteryPct`
  is `null` (not `0`), and `questionsCorrect`/`overallPct` agree exactly
  with the new explicit fields
- **one question answered correctly:** one distinct answered, one
  mastered, 100% last-attempt mastery
- **correct→incorrect reattempt through the real reload/rebuild path**
  (re-answering a locked item is only reachable across a reload — the
  clicked option is otherwise permanently disabled): still exactly one
  distinct answered question, `n` becomes 2, mastered drops from one to
  zero, mastery becomes **0%, not 50%**, and `getUnmastered()` picks up
  the question
- **incorrect→correct reattempt**, same path: still one distinct
  answered question, `n` becomes 2, mastered becomes one, mastery
  becomes **100%, not 50%**, and `getUnmastered()` drops the question
- **multiple questions across different domains/topics/difficulties:**
  every aggregate (`questionsAnswered`, `questionsMastered`,
  `lastAttemptMasteryPct`), every `byDomain`/`byTopic`/`byDifficulty`
  row's explicit fields, and every compatibility alias checked exactly
- **unanswered questions:** counted in `questionsTotal` (coverage) but
  never enter the answered-question mastery denominator
- **stale question records:** remain in `getProgress()`/`exportJSON()`,
  confirmed excluded from `questionsAnswered`/`questionsMastered`/
  `lastAttemptMasteryPct`/`byDomain`/`getWeakAreas()`/`getUnmastered()`
- **exercise records and module-completion records:** confirmed to never
  enter question-mastery/coverage analytics, while continuing to behave
  normally through their own separate signals (`state.exercises`,
  `modulesComplete`)
- **a runtime-injected question:** participates in analytics while
  registered this session, becomes inert (preserved, not fabricated or
  deleted) under the existing stale-ID policy in a fresh session with no
  re-injection — this test does not decide or implement content-pack
  persistence
- **`getWeakAreas()`:** distinct-answered-question `minAnswered`
  threshold (not an attempt-count threshold — a 3-distinct-question
  topic passes `minAnswered:3` but not `minAnswered:4` regardless of how
  many times any single question was attempted), sort order by latest
  mastery, and explicit/compatible field agreement, including after a
  real reload/rebuild reattempt changes the sort order
- **`exportJSON()`:** its embedded `stats` snapshot agrees field-for-field
  with a live `getStats()` call; a malformed import still leaves live
  state/stats untouched (existing atomicity re-confirmed, unchanged)
- **analytics/event separation:** `getStats()`/`getWeakAreas()`/
  `getUnmastered()`/`exportJSON()` fire zero events; a real answer and a
  real reattempt each still fire exactly one `answer` and one `progress`
  event, and no new `persistence`-like event was introduced for
  analytics

**Mutation-tested** (4 reversions in `index.html`, each run against the
full `npm test` suite, each confirmed to fail only the tests that
depend on the guard it removed, then reverted and confirmed
byte-identical via `diff` before committing):

1. Summed attempt count `n` into `getStats()`'s `answered` denominator
   instead of counting distinct questions — failed exactly the two
   reattempt tests (which depend on the distinct-question count staying
   at 1 across a reattempt), and no others.
2. Made mastery sticky ("ever answered correctly") by changing
   `recordAnswer()` to `c:(prev && prev.c) || !!correct` instead of
   tracking only the latest outcome — failed exactly the
   correct→incorrect reattempt test (the one assertion that depends on
   mastery being able to *drop*), and no others.
3. Made `questionsCorrect` disagree with `questionsMastered` by a
   constant offset — failed the new alias-agreement tests *and* several
   pre-existing tests that independently assert `questionsCorrect`
   against a directly-computed expected value (confirming the
   alias-agreement guarantee is load-bearing for old and new tests
   alike), and no others.
4. Removed the stale-id exclusion guard in `getStats()` — failed the new
   stale-record analytics-exclusion test *and* every pre-existing
   QL-024 stale-ID test that depends on the same guard, and no others.

Full local validation: `npm test` (160/160), targeted
`npx playwright test tests/e2e/analytics-semantics.spec.mjs` (8/8 across
both projects), and the complete `npx playwright test` suite.

No question, answer, rationale, exercise, case, flashcard, or scientific
content changed. No image added or replaced. `SCHEMA_V`, stable-ID
format, migration policy, stale-ID policy, import schema, scoring, or
existing `progress`/`answer`/`exercise`/`persistence` event semantics
are unchanged. The content-pack decision for runtime-injected questions
remains undecided and unimplemented.

### Correction — three test-coverage claims were stronger than the tests actually proved, added 2026-08-03

Independent review of draft PR #21 (head `98b8d85`) confirmed the
implementation and analytics decision sound and CI green, but found
three test-claim mismatches, all corrected on the same branch before
merge:

1. **The multi-group aggregate test's title claimed different
   difficulties, but all three chosen questions were difficulty `x:1`.**
   It could not have detected a difficulty-grouping regression. Corrected
   to use six questions deliberately spanning multiple domains, multiple
   topics, and all three difficulty levels (`x:1`/`x:2`/`x:3`), with a
   mix of mastered and unmastered latest outcomes, asserting
   `answered`/`mastered`/`masteryPct`/`correct`/`pct` exactly for every
   affected `byDomain`/`byTopic`/`byDifficulty` row and confirming no
   unexpected aggregate key is introduced (via an exact `Set` comparison
   against the affected keys).
2. **The `getWeakAreas()` sort-order test created only one qualifying
   topic.** A one-row array cannot prove rows are sorted weakest-first;
   the later reattempt changed that single row's value but still never
   exercised ordering. Corrected to create two independently qualifying
   topics (each with 3 distinct answered questions, clearing
   `minAnswered:3`) with different last-attempt mastery percentages (33%
   and 67%), asserting the weaker topic sorts first, then reattempting
   enough questions across a real reload to invert which topic is
   weaker (100% and 0%) and confirming the returned order genuinely
   reverses.
3. **The Playwright event-contract test never performed a reattempt
   despite its own title.** It answered one fresh question once and
   asserted event counts from that single answer — the "reattempt"
   claim was untested. Corrected to: answer a question on first load,
   reload the page, install fresh event counters and a navigation
   sentinel, prove reading analytics emits zero events, then answer the
   SAME question again with the OPPOSITE correctness. Now asserts the
   sentinel survived (proving the reattempt was an in-place interaction,
   not an unexpected second navigation), `n===2`, `c` reflects the
   latest outcome, mastery changed immediately, exactly one `answer`
   event, exactly one `progress` event, zero `exercise` events, zero
   `persistence`-transition events, and the wildcard event count
   agreeing with exactly those two events (no invented analytics
   event).

Additionally, an unnecessary `waitForLoadState("networkidle")` at the
end of the first Playwright test (after every assertion had already
completed, providing no further proof) was removed — this repository has
repeatedly documented `networkidle`-based flakes under parallel-worker
contention, and a wait with no corresponding proof obligation is pure
risk. Console cleanliness is instead asserted directly from the
already-listening `consoleIssues` fixture.

**Mutation-tested**, each reverted and confirmed `index.html`
byte-identical via `diff` before committing:

5. Collapsed `tally()`'s difficulty grouping into a single bucket
   (`groupBy === 'x' ? '1' : String(q[groupBy])`) — failed exactly the
   corrected multi-group aggregate test, and no others.
6. Reversed `getWeakAreas()`'s sort comparator
   (`b.masteryPct - a.masteryPct`) — failed exactly the corrected
   `getWeakAreas()` test, specifically on row order, and no others.

Full local validation after this correction: `npm test` (160/160,
unchanged test count — both corrections rewrote existing tests rather
than adding new ones), `npx playwright test
tests/e2e/analytics-semantics.spec.mjs` (8/8 across both projects), and
the complete `npx playwright test` suite.

No product behavior changed by this correction — `index.html`'s only
changes were the two temporary, reverted mutations above; the shipped
analytics implementation is identical to the previously reviewed head.

## Runtime-injected content lifecycle — added 2026-08-04

`tests/dom-behavior.mjs` (Issue #2, `docs/QUALITY_LOG.md` QL-028) adds
11 dependency-free checks, and a new
`tests/e2e/runtime-content-lifecycle.spec.mjs` adds 6 real-browser
Playwright checks (both configured projects). See
`docs/ARCHITECTURE.md` "Runtime-injected content lifecycle" for the
full policy and public-API record. Independently reproduced before any
change, via direct execution: a question added through `addQuestions()`
exists only in the current session; reloading without reinjection
removes its definition from the live quiz; an answered question's
outcome remains an inert stale v2 record after that reload;
`exportJSON()` includes the outcome but never the definition;
`importJSON()` of that export does not recreate the definition;
reintroducing the same id revives the preserved outcome; and — a real,
confirmed defect — mutating the caller's source object, its options
array, or its wrong-answer-feedback object *after* a successful
`addQuestions()` call changed the live, accepted question, because the
caller's own object references were pushed directly into `QUIZZES`.
Covers:

- **`getRuntimeContentPolicy()`:** the exact 7-field shape (checked via
  an exact sorted-key-set comparison, so an unexpected field is caught),
  every field's exact value, and that mutating a returned object never
  affects a later call.
- **valid injection → render → answer → single content event:** the
  existing `content` event still fires exactly once per batch with its
  documented `{quiz, added}` payload; answering the injected question
  does not fire a second one.
- **the caller-reference defect, corrected:** mutating the source
  object's prompt/rationale, pushing an extra option onto its array
  post-call, flipping its answer index, and mutating its
  wrong-answer-feedback object are all confirmed to leave the live
  question completely unchanged — proven both by reading the question
  back (`getQuestions()`) and, more directly, by answering the
  *original* correct option and confirming it still scores correct
  (which a flipped `a` would not).
- **eight adversarial input shapes, each rejected atomically** with
  nothing added, no widget rebuild, and no `content` event: an accessor
  `id` property (with direct proof, via a boolean flag set inside the
  getter, that it is never invoked), a symbol-keyed extra property, a
  non-enumerable `id` property, a dangerous own key (`__proto__` via
  `defineProperty`), a sparse options array, an unrecognized extra
  top-level field, a non-record object (`Date`), and an inherited
  (prototype-chain, not own) `id`.
- **atomic batch rejection:** one valid and one invalid question in the
  same `addQuestions()` call rejects the entire batch — the valid
  question is not partially committed.
- **reload without reinjection:** only authored questions remain
  (`questionsTotal` returns to its pre-injection value); the injected
  definition's prompt/options/rationale text is confirmed absent from
  both raw `localStorage` and `exportJSON()`'s output via direct
  substring search, while the outcome (keyed by id) is confirmed present
  in the export.
- **the preserved stale outcome's analytics exclusion:** confirmed
  zero contribution to `questionsAnswered`, `questionsMastered`,
  `byDomain`, `getWeakAreas()`, `getUnmastered()`, and the rendered quiz
  widget (item count matches only currently-known questions) after a
  reload with no reinjection.
- **`importJSON()` does not install a definition:** importing an
  exported state containing only the injected question's outcome
  imports the outcome (as an ordinary, currently-stale record) but never
  reintroduces the definition.
- **reinjection revives the same record, and a reattempt does not
  duplicate it:** reintroducing the identical definition/id after a
  stale reload picks the preserved outcome back up with its original
  attempt count intact (not a fresh record); a subsequent real
  reload/rebuild reattempt with the opposite answer updates that *same*
  record's `n`/`c` and leaves exactly one record for that id, both in
  the dependency-free suite and, separately, across three real page
  reloads in the Playwright suite.
- **Reset removes the durable outcome** exactly like any other current
  or stale progress record, confirmed absent again after a subsequent
  reload, in both the dependency-free suite and the real-browser
  `#resetBtn` UI path (checked against both storage keys).
- **no regression to unrelated content:** an authored module's
  `getQuestions()` output is confirmed byte-for-byte unchanged
  (`JSON.stringify` equality) after an unrelated `addQuestions()` call
  into a different module.

**Mutation-tested** (4 reversions in `index.html`, each confirmed to
fail exactly the tests that depend on the guard it removed — or, where
the guard is shared infrastructure, exactly the expected broader set —
then reverted and confirmed byte-identical via `diff` before
committing):

1. Reverted `addQuestions()` to push the caller's original object
   (`arr.forEach(...QUIZZES[key].push(q)...)`) instead of the canonical
   detached snapshot — failed exactly the caller-reference-mutation
   test, and no others.
2. Added `QUIZZES` to `exportJSON()`'s output object, simulating
   definitions leaking into export — failed the new
   "reload without reinjection..." test (which searches the export text
   for the injected definition) *and* five pre-existing round-trip
   import tests, because the added, unrecognized `quizzes` wrapper key
   is also rejected by the existing, independently strict
   `validateImportEnvelope()` key whitelist — a legitimate, explainable
   side effect of this specific mutation, not a coincidental flake.
3. Removed the stale-id exclusion guard in `getStats()` — failed the
   new "that stale outcome contributes nothing..." test, the new
   `importJSON()`/reinjection tests (both of which check
   `questionsAnswered` after a reload), *and* every pre-existing QL-024
   stale-ID test that depends on the same shared guard.
4. Weakened `validateRuntimeQuestion()`'s entry check from `isPlainObject(q)`
   to `!q || typeof q !== 'object'` — failed exactly the new
   adversarial-inputs test (and would have let the accessor `id` getter
   be invoked, which that test also directly checks), and no others.

Full local validation: `npm test` (171/171), targeted
`npx playwright test tests/e2e/runtime-content-lifecycle.spec.mjs`
(12/12 across both projects), and the complete `npx playwright test`
suite.

No question, answer, rationale, image, or scientific claim changed. No
image added or replaced. `SCHEMA_V`, stable-ID format, migration
policy, stale-ID policy, import schema, scoring, analytics semantics,
storage-failure behavior, Reset behavior, and existing
`progress`/`answer`/`exercise`/`content`/`persistence` event semantics
are unchanged. No persistent content-pack format was built.

### Correction — an explicit own `w: undefined` crashed `addQuestions()` instead of returning a structured rejection, added 2026-08-04

Independent review of draft PR #22 (head `c78761c`) confirmed the split
lifecycle, detached canonical snapshots, public policy API,
documentation, and general adversarial validation sound, but found one
further real defect: a question with an explicitly present own property
`w: undefined` passed `isValidWrongAnswerFeedback()` (which conflated
"absent" with "present but undefined," both of which read as `undefined`
from a bare value check), then crashed `validateRuntimeQuestion()`'s
canonical-snapshot step with `TypeError: Cannot convert undefined or
null to object` when it executed `Object.keys(q.w)` — an uncaught
exception escaping the public `addQuestions()` API, reproduced through
both the dependency-free harness and a real Chromium page before any fix
was written. Fixed by deciding absent-vs-present once, explicitly, via
`hasOwn.call(q, 'w')`, and only calling the value-validity check once
presence is confirmed — see `docs/QUALITY_LOG.md` QL-029 for the full
record.

**1 new dependency-free test** in `tests/dom-behavior.mjs` (145 → 172
total for this task's tests, one new focused validation matrix) covers:
`w` absent (accepted), a valid empty `w` record (accepted), a valid
populated `w` record (accepted, with a detachment proof — mutating the
caller's `w` object after the call does not affect the live question),
and eight distinct rejected-without-throwing cases, each proven via
`assert.doesNotThrow` and confirmed to leave nothing added, no widget
rebuild, and no `content` event: an explicit own `w: undefined` (the
exact reported counterexample), `w: null`, `w` as an array, `w` as a
number primitive, `w` as a string primitive, an out-of-range option
index inside `w`, an empty-string feedback value, and a non-string
feedback value.

**1 new real-browser Playwright test** in
`tests/e2e/runtime-content-lifecycle.spec.mjs` (12 → 14) reproduces the
exact `w: undefined` counterexample inside `page.evaluate()` with a
try/catch boundary, confirms `addQuestions()` does not throw and returns
a structured `{ok:false, added:0, ...}` result, confirms the quiz
widget's item count is unchanged, and then proves the page remains
fully operational afterward: a genuinely valid question is successfully
injected and answered in the SAME page context, with no reload, scoring
correctly.

**Mutation-tested:** restored the original conflated
`if(w === undefined){ return true; }` check inside
`isValidWrongAnswerFeedback()` — failed exactly the new focused
validation-matrix test, for the precise original reason (`TypeError:
Cannot convert undefined or null to object`, confirmed by inspecting the
thrown message directly), and no others. Reverted and confirmed
`index.html` byte-identical via `diff` before committing.

Full local validation after this correction: `npm test` (172/172),
`npx playwright test tests/e2e/runtime-content-lifecycle.spec.mjs`
(14/14 across both projects), and the complete `npx playwright test`
suite.

No product behavior changed beyond this specific fix — the split
lifecycle, canonical-snapshot detachment, public policy API, and every
other adversarial-input rejection from the original PR are unchanged.
`SCHEMA_V` stays `2`.

## Question provenance and scientific-review governance — added 2026-08-04

Adds a `QUESTION_GOVERNANCE` registry (`index.html`), a load-time integrity
gate (`assertGovernanceRegistryIntegrity()`), a read-only
`CytoCourse.getQuestionGovernance()` public API method, and a persistent
in-course review disclosure (`#reviewDisclosure`). See
`docs/ARCHITECTURE.md` "Question provenance and scientific-review
governance" for the full schema and design decision, and
`docs/QUALITY_LOG.md` QL-030 for this task's record.

**25 new dependency-free tests** in `tests/question-governance.mjs` (run
via `npm run test:governance`, included in `npm test`) cover:

1. Registry completeness — the exact 153-id key set matches every
   authored question id, with no missing, stale, or duplicate id.
2. Every current record's exact own-property shape, allowed types, and
   lifecycle enum.
3. All 153 current questions are `draft`, and none is release-qualified.
4. No current record fabricates a drafter, source, source-checker,
   reviewer, review date, review scope, independent review, or release
   qualification.
5. Fixture-based lifecycle-transition tests, built by PATCHING one
   `QUESTION_GOVERNANCE` entry's source text (replacing
   `DRAFT_GOVERNANCE_RECORD()` with a literal record) and re-running the
   patched script in a fresh sandbox — the only way to exercise
   `isValidGovernanceRecord()`'s internal prerequisite logic, since it is
   deliberately not exposed on the public, read-only API (there is no
   public write method for governance data):
   - a correctly complete record satisfies each of the `source-checked`,
     `sme-reviewed`, and `release-qualified` transitions (the last with
     zero blockers);
   - a `sme-reviewed` record with no reviewer is rejected at load time
     (missing prerequisites prevent promotion);
   - a bare `release-qualified` label with otherwise-default (nothing
     recorded) fields is rejected (a state label alone cannot bypass the
     gate);
   - an empty source citation, an impossible calendar date
     (`2024-02-30`), a vague review scope (`"reviewed"`), an
     `independentReviewDocumented:true` claim with no supporting
     evidence, an invented lifecycle value, and a record missing a
     required own property are each independently rejected.
6. Public-API tests: a known id returns the exact documented shape; an
   unknown id (including a non-string or empty-string id) returns `null`,
   never a default record; the no-argument complete-registry read returns
   every id in the same shape; `blockers` is always freshly computed, not
   stored; both the single-id and complete-registry reads are fully
   detached (mutating a returned record, including deleting a key from
   the registry read, cannot affect a later call); reading governance
   emits no `progress`/`answer`/`exercise`/`content`/`persistence` event
   and does not change `getProgress()`; `SCHEMA_V` stays `2` and
   `exportJSON()` carries no governance-shaped data.
7. A runtime-injected question's id is never entered into
   `QUESTION_GOVERNANCE` (treated exactly like any unknown id), and a
   caller cannot self-certify a governance status — governance-shaped
   fields (`lifecycle`, `reviewer`, `reviewScope`, ...) on an injected
   question are rejected outright as unrecognized fields, same as any
   other unsupported key. `getRuntimeContentPolicy()` and the runtime
   lifecycle itself are confirmed unchanged.

**10 new real-browser Playwright tests** in
`tests/e2e/review-disclosure.spec.mjs`, run under both the desktop
(1280×900) and narrow/mobile (390×844) configured projects, cover: the
disclosure is visible and states the structural-vs-scientific-review
distinction with a clean console; it sits inside the hero, immediately
after the hero stats; it links to exactly `./docs/SCIENTIFIC_REVIEW.md`
with an accessible name; it does not sit under the fixed header and a
hit-test at its own link resolves to the disclosure itself (nothing
layered on top intercepting pointer events); and it does not steal focus,
has no dismiss control or `aria-modal`, and the rest of the page (a
stubbed Print click) remains fully interactive.

**Mutation-tested** (reverted after each, confirmed byte-identical via
`diff` before committing): removing an authored governance entry from
`QUESTION_GOVERNANCE` — failed
`assertGovernanceRegistryIntegrity()`'s missing-record check, caught at
script load by every test file; adding a stale governance entry for a
non-existent id — failed the same integrity check's stale-record branch;
marking an incomplete record `release-qualified` (via the same
source-patching fixture technique) — failed
`isValidGovernanceRecord()`'s cross-field lifecycle check; weakening
`meetsSourceChecked()`/`meetsSmeReviewed()`/`meetsReleaseQualified()` to
skip one required check — failed exactly the fixture test(s) depending on
that specific prerequisite; returning `QUESTION_GOVERNANCE` (or one of
its records) by reference instead of through `clone()` — failed the
detachment test; and removing/hiding `#reviewDisclosure` — failed the
Playwright visibility test. Each mutation failed exactly its intended
test and no others; the source was reverted and confirmed byte-identical
before committing.

Full local validation: `npm test` (172 dependency-free DOM-behavior
checks + 25 new governance checks), targeted
`npx playwright test tests/e2e/review-disclosure.spec.mjs` (10/10 across
both projects), and the complete `npx playwright test` suite.

No question, answer, rationale, image, or scientific claim changed —
this task adds governance metadata and a truthful disclosure; it performs
no scientific review or correction. `SCHEMA_V` stays `2`. The existing
`README.md` beta warning is unchanged.

### Correction — the mechanism did not yet fully implement the stated policy, added 2026-08-04

Independent review of the original implementation (head `fd9b897`) found
the separate-registry design and truthful current-data claims sound, but
found nine distinct ways the mechanism could certify incomplete or
contradictory records. Each was independently reproduced against the
actual PR head before any fix was written:

1. **Duplicate governance IDs undetected.** A second `"m1-q1"` entry
   silently collapsed into `QUESTION_GOVERNANCE` (a repeated object-literal
   key overwrites the earlier value with no error); the runtime integrity
   check and every committed test still passed, because the resulting key
   SET was still exactly correct even though a real record had been
   discarded.
2. **Inexact citation accepted.** `{citation:"ASCP", edition:null,
   date:null, url:null}` satisfied `source-checked`.
3. **Arbitrary reviewer accepted.** `reviewer:"Nobody"` satisfied
   `sme-reviewed`.
4. **Review-scope length heuristic.** `reviewScope:"rationale checked
   carefully"` (omitting distractor quality, domain/difficulty,
   originality, exam integrity, and privacy) satisfied `sme-reviewed`.
5. **Lifecycle/blocker inconsistency.** A record with every evidence
   field fully populated but `lifecycle:'draft'` reported `blockers:[]`.
6. **Independent-review evidence not bidirectionally checked.**
   `independentReviewDocumented:false` with `independentReviewer`/
   `independentReviewDate` still populated was accepted; a same-person
   (case/whitespace-variant) independent reviewer was accepted.

**Corrections** (see `docs/ARCHITECTURE.md` "Question provenance and
scientific-review governance" for the full schema):

- `QUESTION_GOVERNANCE_ENTRIES` (an ordered `[id, record]` array) plus
  `buildGovernanceRegistry()`, which throws on a repeated id before the
  registry object is ever constructed, replaces the object-literal
  registry.
- A source record gained a `locator` field; `isSufficientGovernanceSource()`
  now additionally requires a ≥20-character citation, an exact
  edition-or-date, and a locator-or-url — a bare organization name can no
  longer satisfy `source-checked`.
- `APPROVED_SME_REVIEWERS` (currently `["Jerad Austin Anderson"]`, matching
  `README.md`'s documented author) plus case/whitespace-normalized
  comparison (`isApprovedSmeReviewer()`) gates `sme-reviewed`.
- A new `reviewChecks` field (closed 7-value enum matching
  `docs/CONTENT_GOVERNANCE.md`'s "Review must verify" list exactly) must
  be complete for `sme-reviewed`/`release-qualified`; `reviewScope` remains
  as required narrative documentation but is no longer the completeness
  gate.
- `isReleaseQualified(rec)` and a `release-approval-pending` blocker
  guarantee `blockers.length === 0` if and only if `releaseQualified ===
  true`, exposed as a new `releaseQualified` field on every
  `getQuestionGovernance()` result.
- `independentReviewDocumented:false` now requires both
  `independentReviewer`/`independentReviewDate` to be `null`; `:true`
  requires `drafter` to be known and the independent reviewer's
  normalized identity to differ from both `drafter` and `reviewer`.
  Independent review remains explicitly NOT a `release-qualified`
  prerequisite, matching `docs/CONTENT_GOVERNANCE.md`.
- The disclosure's wording changed from "Automated tests confirm this
  course is built and behaves correctly" (read as a broader
  positive-correctness claim) to "Automated checks validate documented
  structural and behavioral contracts," and its link now points to
  GitHub's rendered blob view of `docs/SCIENTIFIC_REVIEW.md` (the prior
  relative link served raw `text/markdown` on GitHub Pages — confirmed by
  direct request — an unrendered document in a browser). The
  "first-screen introduction" documentation claim was softened to "near
  the course introduction," since the disclosure's fit within the initial
  viewport at a real mobile viewport was confirmed only by a ~2px margin
  against Playwright's viewport emulation, not a guarantee against real
  device browser chrome.
- `docs/ARCHITECTURE.md` gained a release-gate reconciliation table
  mapping every `docs/CONTENT_GOVERNANCE.md` Release-qualified
  prerequisite to either a direct `QUESTION_GOVERNANCE` check or a named
  separate repository-level validation.

`tests/question-governance.mjs` was substantially rewritten: **46
dependency-free tests** (up from 25), covering registry completeness,
per-record structural shape, current-data truthfulness, fixture-based
lifecycle-transition tests for every corrected rule (source sufficiency,
approved reviewer, structured review checks, lifecycle/blocker/
releaseQualified invariants, independent-review bidirectional
consistency), public-API tests, and runtime-injection isolation. Two of
these are isolated single-check fixtures added specifically so the
citation-length and citation-locator/date rules can each be mutation-
tested independently rather than only in combination.
`tests/e2e/review-disclosure.spec.mjs` was updated (still 10 tests): the
link-destination test now performs a real `request.get()` against the
live GitHub URL (with short retries tolerating GitHub's own transient
429 rate-limiting) and asserts both the response status/content-type and
that the rendered body contains the expected current-review statement —
not merely the href string.

**Mutation-tested** (10 required scenarios, each reverted to
byte-identical via `diff` before committing, run individually so each
result is unambiguous):

| Mutation | Result |
| --- | --- |
| Removed the duplicate-id check from `buildGovernanceRegistry()` | Failed exactly the duplicate-id test |
| Removed the citation-length check from `isSufficientGovernanceSource()` | Failed exactly the isolated short-citation fixture (the compound "org-name-only" fixture alone did not isolate this — a dedicated fixture was added) |
| Removed the edition-or-date check | Failed exactly the missing-date test |
| Removed the locator-or-url check | Failed exactly the missing-locator test |
| Replaced `isApprovedSmeReviewer()` with a bare non-empty-string check in `meetsSmeReviewed()` | Failed exactly the `"Nobody"` rejection test |
| Removed the exact-count check from `hasAllRequiredReviewChecks()` | Failed the missing-check and notes-cannot-substitute tests |
| Removed the `release-approval-pending` block from `computeGovernanceBlockers()` | Failed all three complete-evidence-but-not-promoted invariant tests |
| Removed the `independentReviewDocumented:false`-requires-null check | Failed exactly the false-with-evidence test |
| Removed the same-person (drafter/reviewer) distinct-identity checks | Failed all three same-person tests |
| Hid `#reviewDisclosure` (`hidden` attribute) | Failed all 8 visibility-dependent Playwright tests across both projects |

Also re-verified against the corrected schema: removing an authored
governance entry still fails every test that boots the script (script
load throws); returning a single-id `getQuestionGovernance()` result
without `clone()` still fails the detachment test (plus cross-realm
comparison artifacts on other single-id fixtures, a legitimate collateral
consequence of the same missing `clone()` call, not a false positive).

Full local validation after this correction: `npm test` (172
dependency-free DOM-behavior checks + 46 governance checks), targeted
`npx playwright test tests/e2e/review-disclosure.spec.mjs` (10/10 across
both projects), targeted
`npx playwright test tests/e2e/runtime-content-lifecycle.spec.mjs`
(14/14, confirming no regression in unrelated, unchanged runtime-content
coverage), and the complete `npx playwright test` suite.

No question, answer, rationale, image, or scientific claim changed. No
source was added to any current question, no drafter or reviewer was
asserted, and no question was marked release-qualified. `SCHEMA_V` stays
`2`. The existing `README.md` beta warning is unchanged.

### Correction — a second independent review found remaining evidence-precision gaps and tightened the independent-review policy, added 2026-08-04

A third-round independent review of the same head (`eaf18c9`, itself the
QL-031 correction) confirmed the overall design sound but found six
further ways the mechanism could still certify incomplete records, plus
a deliberate human-policy tightening. Each was independently reproduced
before any fix:

1. A duplicate AUTHORED question id (in `QUIZZES`, not the governance
   registry) still went undetected — `assertGovernanceRegistryIntegrity()`
   built its own `authoredIds` set via the same silently-collapsing
   object-literal pattern QL-031 had only fixed for the governance
   registry itself.
2. The `≥20`-character citation-length floor from QL-031 was itself an
   arbitrary proxy for source identity, not a structural check of it.
3. The approved-SME-reviewer set was a flat array, not structured for
   future extensibility to a different subject pack.
4. The review-checklist enum had no version identifier.
5. (Policy decision, not a defect) `release-qualified` should require a
   documented independent second-person review for a public, potentially
   commercial product — the prior design left it optional.
6. `computeGovernanceBlockers()` had no blocker code for missing
   independent review, a gap that would have become real once (5) took
   effect.

**Corrections:**

- `assertGovernanceRegistryIntegrity()` now counts the flat authored-
  question list and separately counts the unique id set, throwing on any
  disagreement — independent of any keyed set.
- Source schema gained `publisher` (6 fields:
  `{citation, publisher, edition, date, locator, url}`).
  `isSufficientGovernanceSource()` requires both `citation` and
  `publisher` to be genuine, non-placeholder strings (exact-token
  denylist, never a substring match), replacing the length heuristic.
- `APPROVED_SME_REVIEWERS_BY_PACK`, keyed by `GOVERNANCE_SUBJECT_PACK`,
  replaces the flat reviewer array.
- `GOVERNANCE_REVIEW_CHECKS_V1` names the checklist's version explicitly.
- `meetsIndependentReview()` + a new `missing-independent-review`
  blocker; `release-qualified` now requires it.
  `docs/CONTENT_GOVERNANCE.md` and `docs/SCIENTIFIC_REVIEW.md` updated to
  state the policy explicitly.

**8 new dependency-free tests** (`tests/question-governance.mjs`, 46 → 54):
a dedicated duplicate-authored-question-id test (patching `QUIZZES`
source text directly); isolated placeholder-citation and
placeholder-publisher fixtures; a missing-publisher fixture; a genuine-
title-containing-a-placeholder-word fixture (proving exact-token, not
substring, matching); release-qualified-without-independent-review
rejection; an sme-reviewed-with-complete-evidence-but-no-independent-
review blocker-exactness test; a malformed (non-string) `reviewChecks`
entry test; and a zero-blockers-vs-`releaseQualified` equivalence matrix
test across 6 fixtures.

**Mutation-tested:** 7 targeted reversions — removing the duplicate-
authored-id count check, removing the citation-placeholder check,
removing the publisher-non-null requirement, removing
`isApprovedSmeReviewer()` from `meetsSmeReviewed()`, removing
`meetsIndependentReview()` from `meetsReleaseQualified()`, removing the
`missing-independent-review` blocker, and weakening the reviewChecks
type check — each failed exactly its intended test(s) and no others,
reverted to byte-identical via `diff` before committing.

Also added, as a SEPARATE, bank-level (not per-question) confirmed known
risk: independently reproduced answer-choice cueing statistics across
all 153 authored questions — answer index 1/B is correct in 139/153
(90.8%); the correct choice is the uniquely longest option in 114/153
(74.5%), longest-or-tied in 133/153 (86.9%). Recorded in
`docs/QUALITY_LOG.md` QL-033 and `docs/ROADMAP.md` as a tracked,
unresolved risk — no content was rewritten, shuffled, or rebalanced in
this PR, and no psychometric pass threshold was invented.

Full local validation: `npm test` (172 dependency-free DOM-behavior
checks + 54 governance checks), targeted
`npx playwright test tests/e2e/review-disclosure.spec.mjs` (10/10 across
both projects, unaffected by this round's code changes), and the
complete `npx playwright test` suite.

No question, answer, rationale, image, or scientific claim changed.
`SCHEMA_V` stays `2`.

### Correction — the independent-review requirement did not actually enforce its own documented evidence contract, added 2026-08-05

A fourth-round independent review of the same head (`d4eabb6`, itself the
QL-032 correction) confirmed the prior corrections present and materially
improving, but found one remaining release-gate blocker, reproduced
before any fix:

`docs/CONTENT_GOVERNANCE.md` requires an independent reviewer to have a
stable identity, a recorded date, a defined scope/checklist, and be
distinct from the drafter and SME reviewer. The implementation
(`meetsIndependentReview()`) checked only
`independentReviewDocumented === true` plus the pre-existing distinct-
identity checks — a release-qualified fixture with
`independentReviewer: "A Distinct Reviewer"` (an arbitrary, unqualified,
unapproved name, only a flag and a date, no scope, no checklist, no
conflict declaration) loaded cleanly, reported `releaseQualified:true`,
and had `blockers:[]`. The existing test suite's own "valid, genuinely
distinct future independent-review fixture" test explicitly blessed this
exact inadequate record.

**Correction:** three new record fields —
`independentReviewScope` (narrative, a separate instance from the SME
`reviewScope`), `independentReviewChecks` (structured array, a separate
instance of the same versioned `GOVERNANCE_REVIEW_CHECKS_V1` enum),
`independentReviewNoConflictDeclared` (`null`/`true`/`false`, only `true`
satisfies release-qualified) — and `APPROVED_INDEPENDENT_REVIEWERS_BY_PACK`,
a separate approved-identity registry from the SME one, **deliberately
empty for the current production pack** (no real independent reviewer or
credential is invented). `meetsIndependentReview()` now requires approval,
scope, a complete separate checklist, and an explicit no-conflict
declaration. The bidirectional `false`-requires-blank-state rule was
extended to the three new fields. Blocker codes: kept
`missing-independent-review` as the aggregate code for
`independentReviewDocumented === false`; added four granular codes for
when `true` but still insufficient, matching the granular style already
used for the primary SME review. Also corrected a stale in-source comment
that claimed independent review was "intentionally NOT required for any
lifecycle state" — true when written, false since QL-032 changed
`meetsReleaseQualified()`, and never updated to match.

**14 new dependency-free tests** (`tests/question-governance.mjs`,
54 → 68): a `bootWithApprovedTestReviewerAndPatchedRecord()` helper that
patches a test-only entry into the approved-independent-reviewer list
and a governance record in one script mutation; the exact reported
loophole, now confirmed rejected; unapproved-reviewer,
missing/empty/partial-checklist, missing/false/malformed-conflict-
declaration rejections; a proof the SME reviewer's own complete checklist
cannot substitute for an empty independent one; stray-evidence rejections
for the three new fields when documented is `false`; a same-person-as-
primary-reviewer whitespace/case-variant rejection (the drafter case
already existed); a fully populated approved fixture proven to satisfy
release-qualified with a dedicated detachment proof; and an exact-
granular-blocker-set test.

**Mutation-tested:** 5 targeted reversions — removing the approved-
independent-reviewer gate, reusing the SME checklist instead of the
independent one, removing the scope requirement, removing the conflict-
declaration requirement, and weakening the `false`-blank-state rule to
omit the three new fields — each failed exactly its intended test(s) and
no others, reverted to byte-identical via `diff` before committing.

Full local validation: `npm test` (172 dependency-free DOM-behavior
checks + 68 governance checks), targeted
`npx playwright test tests/e2e/review-disclosure.spec.mjs` (10/10 across
both projects, unaffected by this round's code changes), and the complete
`npx playwright test` suite.

No question, answer, rationale, image, or scientific claim changed. No
independent reviewer, credential, or approval record was fabricated.
`SCHEMA_V` stays `2`.

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
