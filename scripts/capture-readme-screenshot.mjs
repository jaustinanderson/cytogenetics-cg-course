#!/usr/bin/env node
// Regenerates docs/assets/course-overview.png: a deterministic, course-only
// screenshot for the README. Not part of `npm test` or `npm run test:e2e` —
// this is a one-off/occasional dev tool, not a pixel-comparison test (per
// docs/QUALITY_LOG.md's standing caution against brittle visual assertions,
// this script produces an artifact for a human to review, it does not assert
// anything about its visual appearance — only about the real content it
// depends on actually having rendered before the shutter fires).
//
// Determinism and correctness measures:
// - an OS-assigned ephemeral port (`python3 -m http.server 0`), not a fixed
//   port that could already be in use by another process; the server's own
//   stdout announces the assigned port, and an early process exit (bind
//   failure, missing interpreter, etc.) is treated as a conclusive startup
//   failure and reported with the captured stderr, not retried into a
//   generic timeout
// - fresh localStorage (both progress keys cleared) so the course always
//   renders its pristine "0 of 17 modules complete" state
// - `reducedMotion: "reduce"` context option, which the page's own
//   `@media (prefers-reduced-motion: reduce)` rule responds to by disabling
//   CSS transitions/animations — no extra injected CSS needed
// - waits for Playwright's `networkidle` after a reload, then explicitly
//   confirms the expected page title, hero heading, and exactly 17 dashboard
//   cards are present BEFORE capturing — if the page failed to boot
//   correctly (or a future change breaks the dashboard), this script fails
//   loudly instead of silently capturing broken content
// - confirms the IBM Plex Sans/Mono webfonts actually reached `status:
//   "loaded"` in `document.fonts`, not merely that `document.fonts.ready`
//   resolved. `document.fonts.ready` resolves once font loading has
//   *settled* — including a failed request — so on its own it cannot
//   distinguish "the font loaded" from "the font failed to load and the
//   browser gave up." As of 2026-07-31 the fonts are self-hosted
//   (`assets/fonts/`, see docs/VALIDATION.md "Asset localization"), so this
//   check now only depends on the local static server this script itself
//   starts, not on outbound network access to a third-party font host —
//   it still fails with a clear message rather than silently capturing a
//   system-font fallback and calling it done.
// - explicit `window.scrollTo(0, 0)` so the page is always captured from
//   the very top, regardless of any prior scroll state
// - a fixed viewport, not a full-page capture — the rendered document is
//   over 100,000px tall across all 17 modules; capturing the whole thing
//   would be neither useful nor "clean." The viewport height is chosen
//   deliberately (see VIEWPORT below) to end just past the bottom of the
//   progress dashboard grid, so no module card is cut mid-row.
// - the local server is terminated and its exit is awaited before this
//   script exits, in both the success and failure paths
//
// Usage: node scripts/capture-readme-screenshot.mjs
//
// Reproducibility note: running this script twice in the *same* environment
// (same OS, same installed Chromium build, same installed/system fonts)
// reliably produces the same rendered content — this has been verified by
// comparing SHA-256 hashes of two same-environment raw captures, not by
// file size alone (identical file size does not prove identical bytes, and
// identical bytes across *different* environments is not a claim this
// script makes: font hinting, subpixel rendering, and Chromium version can
// all legitimately change output on another OS/Chromium/font environment).
//
// Optional lossless size optimization (not required, not run automatically):
// Playwright's own PNG encoder is already deflate-compressed but not at
// maximum effort. A re-encode at a higher compression level can shrink the
// file further, but ONLY if verified pixel-identical first — `sharp-cli`
// (fetched on demand via npx, not a project dependency; the same one-off
// pattern docs/VALIDATION.md documents for `html-validate`) defaults to
// palette (color-quantized) PNG output, which is lossy, not a size-only
// re-encode. Always pass `--palette=false`.
//
//   export OPT_TMP=$(mktemp -d)
//   npx --yes --package=sharp-cli -- sharp \
//     -i docs/assets/course-overview.png -o "$OPT_TMP" \
//     --compressionLevel 9 --effort 6 --palette=false
//
// (`mktemp -d` matters here, not just style: `-o` writes to
// "$OPT_TMP/course-overview.png" only when that directory already exists
// on disk — pointing `-o` at a path that does not yet exist, e.g. a bare
// `/tmp/png-opt` on a clean environment where nothing created it first,
// makes sharp-cli write a single literal *file* at that exact path
// instead, silently producing something other than what later steps
// expect. `mktemp -d` guarantees the directory exists before sharp-cli
// runs, on any machine, every time.)
//
// Then verify losslessness (decodes both files to raw pixel buffers and
// compares them byte-for-byte — file size or visual similarity alone is
// NOT proof of losslessness) before replacing the committed asset. This
// needs the `sharp` *library* (not the `sharp-cli` binary used above,
// which does not expose an equivalent `cmp`-friendly raw-file output in
// this version); `sharp` is not a project dependency, so a plain
// `node -e '...require("sharp")...'` fails on a clean clone with "Cannot
// find module 'sharp'" (reproduced and documented in
// docs/QUALITY_LOG.md — the standalone `npx --package=sharp-cli` step
// above only makes the `sharp-cli` binary available, not the separate
// `sharp` module a differently-invoked `node -e` could `require()`).
// Install it into an isolated temporary directory instead, and point
// `NODE_PATH` at it so `require()` resolves there without ever adding
// `sharp` to this repository's `package.json`:
//
//   SHARP_TMP=$(mktemp -d)
//   npm install --no-save --prefix "$SHARP_TMP" sharp
//   NODE_PATH="$SHARP_TMP/node_modules" node -e '
//     const sharp = require("sharp");
//     (async () => {
//       const a = await sharp("docs/assets/course-overview.png").raw().toBuffer();
//       const b = await sharp(process.env.OPT_TMP + "/course-overview.png").raw().toBuffer();
//       console.log("pixel-identical:", Buffer.compare(a, b) === 0);
//     })();
//   '
//
// Only if the above printed "pixel-identical: true":
//
//   cp "$OPT_TMP/course-overview.png" docs/assets/course-overview.png
//
// Either way, clean up both temporary directories:
//
//   rm -rf "$SHARP_TMP" "$OPT_TMP"

import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "docs", "assets", "course-overview.png");

// 1440 wide keeps the layout solidly in the desktop CSS path (the product's
// only responsive breakpoints are 980px and 560px). 1430 tall is chosen,
// not guessed, from the real rendered layout: the topbar, hero, weighting
// chart, and the full 17-card progress dashboard grid together measure
// ~1415.8px at this width after the dashboard-card layout fix (re-measured
// post-fix; the pre-fix concatenated/wrapped card text had actually made
// rows taller, at ~1477.4px, so the fix left more headroom here, not less).
// Module 1's own section begins only ~25.6px after that (at ~1441.4px), so
// 1430 includes the full dashboard with a small margin and stops cleanly
// before any module content — a taller capture (e.g. 1500, used before this
// re-measurement) cuts into module 1's header mid-way, which looks like a
// cut-off rather than an intentional edge.
const VIEWPORT = { width: 1440, height: 1430 };

const EXPECTED_TITLE = "Cytogenetics CG(ASCP) Mini-Course";
const EXPECTED_HERO_HEADING = "Read the slide. Name every chromosome. Write the nomenclature.";
const EXPECTED_DASHBOARD_CARD_COUNT = 17;
const EXPECTED_FONT_FAMILIES = ["IBM Plex Sans", "IBM Plex Mono"];
const SERVER_START_TIMEOUT_MS = 5_000;

function startServer() {
  return new Promise((resolve, reject) => {
    const server = spawn("python3", ["-u", "-m", "http.server", "0", "--bind", "127.0.0.1"], {
      cwd: REPO_ROOT,
    });

    let settled = false;
    let stderr = "";
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      server.kill();
      reject(new Error(`Local server did not report a listening port within ${SERVER_START_TIMEOUT_MS}ms`));
    }, SERVER_START_TIMEOUT_MS);

    server.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    server.stdout.on("data", (chunk) => {
      const match = chunk.toString().match(/Serving HTTP on [^\s]+ port (\d+)/);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ server, port: Number(match[1]) });
      }
    });

    server.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Failed to start the local server: ${error.message}`));
    });

    // A conclusive bind/start failure (port in use, missing interpreter,
    // permission error, etc.) exits the process immediately with the reason
    // on stderr — treat that as definitive rather than waiting out the full
    // startup timeout for no reason.
    server.on("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          `Local server exited before it started serving (code ${code}, signal ${signal}): ${
            stderr.trim() || "(no stderr output)"
          }`,
        ),
      );
    });
  });
}

function stopServer(server) {
  return new Promise((resolve) => {
    if (server.exitCode !== null) {
      resolve();
      return;
    }
    server.once("exit", () => resolve());
    server.kill();
  });
}

async function assertPageReady(page) {
  const title = await page.title();
  if (title !== EXPECTED_TITLE) {
    throw new Error(`Expected page title "${EXPECTED_TITLE}", got "${title}" — refusing to capture.`);
  }

  const heading = (await page.locator("#heroTitle").textContent())?.trim();
  if (heading !== EXPECTED_HERO_HEADING) {
    throw new Error(`Expected hero heading "${EXPECTED_HERO_HEADING}", got "${heading}" — refusing to capture.`);
  }

  const cardCount = await page.locator("#dashboardGrid .dash-cell").count();
  if (cardCount !== EXPECTED_DASHBOARD_CARD_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_DASHBOARD_CARD_COUNT} dashboard cards, found ${cardCount} — refusing to capture.`,
    );
  }
}

async function assertFontsLoaded(page) {
  // document.fonts.ready resolves once font loading has settled — including
  // a *failed* request — so it alone cannot prove a font actually loaded.
  // Check each expected family's real status afterward.
  await page.evaluate(() => document.fonts.ready);

  const statusesByFamily = await page.evaluate((families) => {
    const result = {};
    for (const family of families) {
      const matches = Array.from(document.fonts).filter(
        (face) => face.family.replace(/^["']|["']$/g, "").toLowerCase() === family.toLowerCase(),
      );
      result[family] = matches.map((face) => face.status);
    }
    return result;
  }, EXPECTED_FONT_FAMILIES);

  for (const family of EXPECTED_FONT_FAMILIES) {
    const statuses = statusesByFamily[family] || [];
    if (statuses.length === 0) {
      throw new Error(
        `Font family "${family}" was never registered in document.fonts. The Google Fonts stylesheet may not ` +
          "have loaded (this capture requires normal network access) — refusing to capture with an unconfirmed font.",
      );
    }
    if (!statuses.includes("loaded")) {
      throw new Error(
        `Font family "${family}" did not reach status "loaded" (statuses seen: ${statuses.join(", ")}). ` +
          'document.fonts.ready resolving does not by itself mean this font loaded successfully — refusing to ' +
          "capture with an unconfirmed font.",
      );
    }
  }
}

async function main() {
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}/`;

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.removeItem("cyto_cg_progress_v1");
      localStorage.removeItem("cyto_cg_progress_v2");
    });
    await page.reload({ waitUntil: "networkidle" });

    await assertPageReady(page);
    await assertFontsLoaded(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: OUTPUT_PATH });

    await context.close();
    await browser.close();
    browser = undefined;
  } finally {
    if (browser) await browser.close();
    await stopServer(server);
  }

  console.log(`Saved ${path.relative(REPO_ROOT, OUTPUT_PATH)} (${VIEWPORT.width}x${VIEWPORT.height} viewport).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
