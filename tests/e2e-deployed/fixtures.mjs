import { test as base, expect } from "@playwright/test";

/**
 * Fixtures for the deployed-site smoke suite (tests/e2e-deployed/). This is
 * deliberately a separate, small copy of tests/e2e/fixtures.mjs rather than a
 * shared import: the two suites target different origins (a real HTTPS
 * GitHub Pages deployment here, a local static server there) and must stay
 * independently runnable so a change aimed at one cannot silently affect the
 * other's coverage or its network dependency.
 */

export const V1_KEY = "cyto_cg_progress_v1";
export const V2_KEY = "cyto_cg_progress_v2";

export const test = base.extend({
  // Collects page-origin console errors/warnings and uncaught page errors for
  // the lifetime of the test, exactly as the local suite does.
  consoleIssues: async ({ page }, use) => {
    const issues = [];
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        issues.push({ type, text: msg.text(), url: msg.location().url });
      }
    });
    page.on("pageerror", (error) => {
      issues.push({ type: "pageerror", text: error.message, url: "" });
    });
    await use(issues);
  },
});

/**
 * Quiz and exercise widgets (`.quiz`, `.exer`) are native `<details>`
 * elements, collapsed by default (Issue #11 progressive-disclosure). A
 * deliberate independent copy of the same helper in tests/e2e/fixtures.mjs,
 * for the same reasons the rest of this file is a separate copy.
 */
export async function openDisclosure(locator) {
  await locator.evaluate((el) => { el.open = true; });
}

export { expect };
