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

export { expect };
