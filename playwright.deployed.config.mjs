import { defineConfig, devices } from "@playwright/test";

/**
 * Deployed-site smoke coverage against the real HTTPS GitHub Pages
 * deployment, not a local static server. This is intentionally a separate
 * config/testDir from playwright.config.mjs:
 *
 * - it has no `webServer` block and requires outbound internet access, so it
 *   must never run as part of `npm test` or the default `npm run test:e2e`
 * - its target URL is configurable via DEPLOYED_BASE_URL so it can be pointed
 *   at a fork's Pages URL or re-run against the same URL after a new deploy
 *
 * Default target (documented in README.md/docs/VALIDATION.md):
 * https://jaustinanderson.github.io/cytogenetics-cg-course/
 */
const DEFAULT_DEPLOYED_URL = "https://jaustinanderson.github.io/cytogenetics-cg-course/";
const baseURL = process.env.DEPLOYED_BASE_URL || DEFAULT_DEPLOYED_URL;

export default defineConfig({
  testDir: "./tests/e2e-deployed",
  // Serial by default: this suite is a handful of smoke checks against a
  // shared live host, not a large parallel matrix, and serial execution keeps
  // console/overflow assertions and image-loading timing easier to reason
  // about against real network latency.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-deployed-report", open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "deployed-desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "deployed-mobile-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
