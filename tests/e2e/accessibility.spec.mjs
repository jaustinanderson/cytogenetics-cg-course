import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures.mjs";

/**
 * Automated WCAG scanning via axe-core, run against the real, fully rendered
 * course at both the desktop and narrow/mobile viewports already defined in
 * playwright.config.mjs (each test below runs once per project).
 *
 * Scope and limits, stated plainly so this suite is not overclaimed:
 * - axe-core finds a documented subset of WCAG 2.x success criteria that are
 *   mechanically detectable (missing accessible names, contrast ratios,
 *   heading order, landmark structure, etc.). It cannot judge whether an
 *   experience genuinely makes sense to someone using a screen reader.
 * - Passing these scans is evidence of the absence of the violations axe-core
 *   checks for, not a substitute for a representative screen-reader review.
 *   That review remains a separate, unchecked item in Issue #1 and in
 *   docs/VALIDATION.md until it is actually performed with real assistive
 *   technology.
 *
 * No rule is disabled and no violation is filtered out here. If axe-core ever
 * reports a new violation, the correct response is to independently confirm
 * it against the real page and either fix it or document a specific,
 * justified exception in docs/QUALITY_LOG.md -- not to loosen this suite to
 * force it green.
 */

// A full-document axe-core scan against this single-file, 4000+ line course
// consistently takes 20-27s -- close to Playwright's 30s default per-test
// timeout under load. test.slow() (3x timeout) gives real headroom instead
// of relying on the test runner's worker count/CPU contention at scan time.
test.describe("automated WCAG scanning (axe-core)", () => {
  test.beforeEach(() => {
    test.slow();
  });

  test("the freshly loaded course has no detectable axe-core violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("the mobile navigation, once opened, has no detectable axe-core violations", async ({
    page,
  }) => {
    await page.goto("/");
    const toggle = page.locator("#navToggle");
    test.skip(!(await toggle.isVisible()), "hamburger nav is desktop-hidden above 980px");
    await toggle.click();
    await expect(page.locator("#sidebar")).toHaveClass(/open/);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("an answered quiz item has no detectable axe-core violations", async ({ page }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m1")[0]);
    await mount.locator(".qitem").first().locator(".qopt").nth(question.a).click();
    await expect(mount.locator(".qh-score")).toHaveText("1 / 5");

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("an answered exercise has no detectable axe-core violations", async ({ page }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    await host.locator(".eopt").nth(items[0].answer).click();
    await expect(host.locator(".exer-fb")).toHaveClass(/show/);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("a completed module and a flipped flashcard have no detectable axe-core violations", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();
    await expect(page.locator('.mark-complete[data-mod="m1"]')).toHaveClass(/done/);
    await page.locator(".flash-card").first().click();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
