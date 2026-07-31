import { test, expect, V1_KEY, V2_KEY } from "./fixtures.mjs";

test.describe("progress, migration, persistence, and reset", () => {
  test("marking a module complete updates the UI and persists across a real reload", async ({ page }) => {
    await page.goto("/");
    const button = page.locator('.mark-complete[data-mod="m1"]');
    await button.click();

    await expect(button).toHaveClass(/done/);
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");
    await expect(page.locator("#sideNum")).toHaveText("6%");

    await page.reload();

    await expect(page.locator('.mark-complete[data-mod="m1"]')).toHaveClass(/done/);
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), V2_KEY);
    expect(stored.v).toBe(2);
    expect(stored.modules.m1).toBe(true);
  });

  test("legacy v1 progress migrates to the v2 schema on first real-browser load", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [V1_KEY, JSON.stringify({ m1: true, m2: true, m5: true })],
    );
    await page.goto("/");

    await expect(page.locator("#tpLabel")).toHaveText("3 of 17 modules complete");
    const state = await page.evaluate(() => window.CytoCourse.getProgress());
    expect(state.v).toBe(2);
    expect(state.migratedFrom).toBe(1);
    expect(Object.keys(state.modules).sort()).toEqual(["m1", "m2", "m5"]);

    const migratedV2 = await page.evaluate((key) => localStorage.getItem(key), V2_KEY);
    expect(migratedV2).not.toBeNull();
  });

  test("Reset clears both storage keys and reloads with a clean course", async ({ page }) => {
    // Seed via evaluate + a single reload rather than addInitScript: an
    // addInitScript re-runs on every navigation in this page, including the
    // reload Reset itself triggers, which would silently re-seed the very
    // keys Reset just cleared and mask the behavior under test.
    await page.goto("/");
    await page.evaluate(
      ([v1Key, v1Value, v2Key, v2Value]) => {
        window.localStorage.setItem(v1Key, v1Value);
        window.localStorage.setItem(v2Key, v2Value);
      },
      [
        V1_KEY,
        JSON.stringify({ m1: true, m2: true }),
        V2_KEY,
        JSON.stringify({ v: 2, modules: { m1: true, m2: true }, answers: {}, exercises: {} }),
      ],
    );
    await page.reload();
    await expect(page.locator("#tpLabel")).toHaveText("2 of 17 modules complete");

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#resetBtn").click();
    await page.waitForLoadState("load");

    await expect(page.locator("#tpLabel")).toHaveText("0 of 17 modules complete");
    const [v1After, v2After] = await page.evaluate(
      ([k1, k2]) => [localStorage.getItem(k1), localStorage.getItem(k2)],
      [V1_KEY, V2_KEY],
    );
    expect(v1After).toBeNull();
    expect(v2After).toBeNull();
  });

  test("declining the Reset confirmation leaves progress untouched", async ({ page }) => {
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.locator("#resetBtn").click();

    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");
    const stored = await page.evaluate((key) => localStorage.getItem(key), V2_KEY);
    expect(stored).not.toBeNull();
  });
});
