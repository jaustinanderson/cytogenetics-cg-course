import { test as base, expect } from "@playwright/test";

/**
 * Shared real-browser fixtures for the Playwright smoke suite. This suite is
 * the real-browser counterpart to tests/dom-behavior.mjs — it exercises the
 * same product surface through an actual Chromium engine (real layout,
 * scrolling, IntersectionObserver, localStorage, and window.print), which the
 * dependency-free DOM harness explicitly cannot do.
 */

export const V1_KEY = "cyto_cg_progress_v1";
export const V2_KEY = "cyto_cg_progress_v2";

export const test = base.extend({
  // Collects page-origin console errors/warnings and uncaught page errors for
  // the lifetime of the test. Tests that care about a clean console read this
  // fixture directly instead of re-wiring listeners per test.
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
 * elements, collapsed by default (Issue #11 progressive-disclosure). Content
 * inside a closed `<details>` is not visible/actionable, so any test that
 * only needs the content open as setup -- not testing the toggle itself --
 * should open it this way rather than duplicating a click-the-summary step.
 * Tests that specifically verify the disclosure control (keyboard/touch
 * activation, accessible state) open it through a real interaction instead.
 */
export async function openDisclosure(locator) {
  await locator.evaluate((el) => { el.open = true; });
}

export { expect };
