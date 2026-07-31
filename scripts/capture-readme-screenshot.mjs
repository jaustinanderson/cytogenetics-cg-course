#!/usr/bin/env node
// Regenerates docs/assets/course-overview.png: a deterministic, course-only
// screenshot for the README. Not part of `npm test` or `npm run test:e2e` —
// this is a one-off/occasional dev tool, not a pixel-comparison test (per
// docs/QUALITY_LOG.md's standing caution against brittle visual assertions,
// this script produces an artifact for a human to review, it does not assert
// anything about it).
//
// Determinism measures:
// - fresh localStorage (both progress keys cleared) so the course always
//   renders its pristine "0 of 17 modules complete" state
// - `reducedMotion: "reduce"` context option, which the page's own
//   `@media (prefers-reduced-motion: reduce)` rule responds to by disabling
//   CSS transitions/animations — no extra injected CSS needed
// - waits for `document.fonts.ready` and Playwright's `networkidle` after a
//   reload, so the IBM Plex Sans/Mono webfonts (loaded from Google Fonts;
//   this step requires normal network access) have finished swapping in
//   before the capture
// - explicit `window.scrollTo(0, 0)` so the page is always captured from
//   the very top, regardless of any prior scroll state
// - a fixed viewport, not a full-page capture — the rendered document is
//   over 100,000px tall across all 17 modules; capturing the whole thing
//   would be neither useful nor "clean." The viewport height (1500px) is
//   chosen deliberately to end exactly at the bottom of the progress
//   dashboard grid, so no module card is cut mid-row.
//
// Usage: node scripts/capture-readme-screenshot.mjs
//
// Optional lossless size optimization (not required, not run automatically):
// Playwright's own PNG encoder is already deflate-compressed but not at
// maximum effort. A verified-pixel-identical re-encode at a higher
// compression level can shrink the file further with no quality loss.
// `sharp-cli` is not a project dependency; it is fetched on demand via npx,
// the same one-off pattern docs/VALIDATION.md already documents for
// `html-validate`. Explicitly disable `--palette` — sharp-cli defaults to
// palette (color-quantized, lossy) PNG output, which is NOT lossless and
// visibly shifts pixel values; confirmed by comparing raw decoded buffers
// before trusting this step (see docs/QUALITY_LOG.md).
//
//   npx --yes --package=sharp-cli -- sharp \
//     -i docs/assets/course-overview.png -o /tmp/png-opt \
//     --compressionLevel 9 --effort 6 --palette=false
//   cp /tmp/png-opt/course-overview.png docs/assets/course-overview.png

import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "docs", "assets", "course-overview.png");
const PORT = 4183;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

// 1440 wide keeps the layout solidly in the desktop CSS path (the product's
// only responsive breakpoints are 980px and 560px). 1500 tall is chosen, not
// guessed, from the real rendered layout: the topbar, hero, weighting chart,
// and the full 17-card progress dashboard grid together measure ~1477px at
// this width, so 1500 includes all of it with a small margin and stops
// before module 1's own content begins.
const VIEWPORT = { width: 1440, height: 1500 };

function waitForServer(url, { attempts = 40, intervalMs = 100 } = {}) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const attempt = async () => {
      count += 1;
      try {
        const res = await fetch(url);
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        // server not up yet
      }
      if (count >= attempts) {
        reject(new Error(`Local server at ${url} did not respond after ${attempts} attempts`));
        return;
      }
      setTimeout(attempt, intervalMs);
    };
    attempt();
  });
}

async function main() {
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: REPO_ROOT,
    stdio: "ignore",
  });

  let browser;
  try {
    await waitForServer(BASE_URL);

    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.removeItem("cyto_cg_progress_v1");
      localStorage.removeItem("cyto_cg_progress_v2");
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.screenshot({ path: OUTPUT_PATH });

    await context.close();
    await browser.close();
  } finally {
    server.kill();
  }

  console.log(`Saved ${path.relative(REPO_ROOT, OUTPUT_PATH)} (${VIEWPORT.width}x${VIEWPORT.height} viewport).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
