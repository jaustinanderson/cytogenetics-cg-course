import { test, expect, V2_KEY } from "./fixtures.mjs";

test.describe("deployed quiz interaction and reload persistence", () => {
  test("a representative quiz interaction works through emulated touch", async ({ page }) => {
    // `.tap()` requires the hasTouch context option; only the narrow/mobile
    // project (390x844) enables it, matching the local suite's convention of
    // gating touch-specific assertions on viewport width.
    test.skip((page.viewportSize()?.width ?? 0) >= 980, "runs on the hasTouch-emulated narrow/mobile project only");

    await page.goto("./");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m1")[0]);
    const item = mount.locator(".qitem").first();
    const options = item.locator(".qopt");

    await options.nth(question.a).tap();

    await expect(options.nth(question.a)).toHaveClass(/correct/);
    const feedback = item.locator(".qfb");
    await expect(feedback).toHaveClass(/show/);
    for (let i = 0; i < (await options.count()); i += 1) {
      await expect(options.nth(i)).toBeDisabled();
    }
  });

  test("module-completion persistence survives a live-page reload in an isolated context", async ({
    browser,
    baseURL,
  }) => {
    // A dedicated incognito-style context, not the ambient per-test context,
    // so this test cannot be affected by (or leak into) storage any other
    // test or concurrent run left on the live host's origin.
    //
    // Playwright Test's instrumentation merges `use`-configured context
    // options (baseURL, viewport, hasTouch, etc.) into ANY context created
    // during a test, including one created manually here via
    // `browser.newContext()` — verified against this exact suite by tracing
    // `runBeforeCreateBrowserContext` in @playwright/test and confirming
    // empirically that an unqualified `browser.newContext()` still resolved
    // `page.goto("./")` to the configured baseURL. `baseURL` is passed
    // explicitly anyway so this test's correctness does not rely on that
    // implicit merge being understood or remaining unchanged, and the
    // assertion below independently confirms navigation actually reached the
    // intended deployed origin/path rather than trusting either mechanism.
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    try {
      await page.goto("./");

      const expected = new URL(baseURL);
      const actual = new URL(page.url());
      expect(
        actual.origin + actual.pathname,
        `expected navigation to reach ${expected.origin}${expected.pathname}, got ${actual.origin}${actual.pathname}`,
      ).toBe(expected.origin + expected.pathname);

      const initialLabel = await page.locator("#tpLabel").textContent();
      expect(initialLabel, "expected a freshly isolated context to start with zero completed modules").toBe(
        "0 of 17 modules complete",
      );

      const button = page.locator('.mark-complete[data-mod="m1"]');
      await button.click();
      await expect(button).toHaveClass(/done/);
      await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");

      await page.reload();

      await expect(page.locator('.mark-complete[data-mod="m1"]')).toHaveClass(/done/);
      await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");
      const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), V2_KEY);
      expect(stored.v).toBe(2);
      expect(stored.modules.m1).toBe(true);
    } finally {
      await context.close();
    }
  });
});
