import { test, expect, V2_KEY, openDisclosure } from "./fixtures.mjs";

/* ============================ storage-failure detection / session-only mode (Issue #2) ============================
   Real-browser counterpart to the dependency-free coverage in
   tests/dom-behavior.mjs. This suite runs under both configured Playwright
   projects (desktop-chromium at 1280x900, mobile-chromium at 390x844 --
   see playwright.config.mjs), which satisfies the "warning must work at
   desktop and narrow/mobile widths" requirement without a per-test
   viewport override.

   localStorage failures are simulated via an init script that patches
   Storage.prototype BEFORE index.html's own inline script ever runs --
   the same technique tests/dom-harness.mjs uses for the dependency-free
   suite, just at the real-browser layer. */

async function failStorageWrites(page) {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); };
  });
}

test.describe("session-only storage warning", () => {
  test("a failed write shows the accessible warning with correct role and text, keeps the module change visible, and produces a clean console", async ({
    page,
    consoleIssues,
  }) => {
    await failStorageWrites(page);
    await page.goto("/");

    const warning = page.locator("#storageWarning");
    await expect(warning).toBeHidden();

    await page.locator('.mark-complete[data-mod="m1"]').click();

    await expect(warning).toBeVisible();
    await expect(warning).toHaveAttribute("role", "status");
    await expect(warning).toContainText("browser storage is unavailable");
    await expect(warning).toContainText("this session");

    // In-memory/rendered progress still advances despite the failed write.
    await expect(page.locator('.mark-complete[data-mod="m1"]')).toHaveClass(/done/);
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");

    // No false "Saved" claim next to the module that failed to persist.
    await expect(page.locator('.mark-status[data-status="m1"]')).toHaveText("");

    const status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: false, reason: "write-failed" });

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("the warning does not steal focus while answering a question", async ({ page }) => {
    await failStorageWrites(page);
    await page.goto("/");

    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    await openDisclosure(mount.locator(".quiz"));
    const questions = await page.evaluate(() => window.CytoCourse.getQuestions("m1"));
    const firstOption = mount.locator(".qitem").first().locator(".qopt").nth(questions[0].a);

    await firstOption.click();

    await expect(page.locator("#storageWarning")).toBeVisible();
    // The clicked option itself gets disabled once answered (pre-existing
    // quiz behavior, unrelated to Issue #2), which normally blurs it back
    // to the document -- so the real proof that role="status" (not
    // role="alert") never steals focus is that the warning banner itself
    // never becomes the active element.
    const activeElementIsWarning = await page.evaluate(
      () => document.activeElement && document.activeElement.id === "storageWarning",
    );
    expect(activeElementIsWarning).toBe(false);
  });

  test("repeated failures across several actions show only one warning, never duplicated", async ({ page }) => {
    await failStorageWrites(page);
    await page.goto("/");

    await page.locator('.mark-complete[data-mod="m1"]').click();
    await page.locator('.mark-complete[data-mod="m2"]').click();
    await page.locator('.mark-complete[data-mod="m3"]').click();

    await expect(page.locator("#storageWarning")).toHaveCount(1);
    await expect(page.locator("#storageWarning")).toBeVisible();
  });

  test("recovery: once storage becomes writable again, the next save persists the full accumulated state and the warning clears", async ({
    page,
    consoleIssues,
  }) => {
    await page.addInitScript(() => {
      window.__failWrites = true;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) {
        if (window.__failWrites) throw new Error("QuotaExceededError");
        return original.apply(this, args);
      };
    });
    await page.goto("/");

    await page.locator('.mark-complete[data-mod="m1"]').click();
    await page.locator('.mark-complete[data-mod="m2"]').click();
    await expect(page.locator("#storageWarning")).toBeVisible();
    let stored = await page.evaluate((key) => localStorage.getItem(key), V2_KEY);
    expect(stored).toBeNull();

    await page.evaluate(() => { window.__failWrites = false; });
    await page.locator('.mark-complete[data-mod="m3"]').click();

    await expect(page.locator("#storageWarning")).toBeHidden();
    stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), V2_KEY);
    expect(stored.modules).toEqual({ m1: true, m2: true, m3: true });

    const status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: true, reason: null });

    await page.reload();
    await expect(page.locator("#tpLabel")).toHaveText("3 of 17 modules complete");
    await expect(page.locator("#storageWarning")).toBeHidden();

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("the UI Reset path does not reload when storage removal fails, and honestly reports session-only afterward", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");

    await page.evaluate(() => {
      window.__noReloadSentinel = "still-here";
      Storage.prototype.removeItem = function () { throw new Error("removal blocked"); };
    });

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#resetBtn").click();

    // Give the click handler a moment to run; a real reload would wipe the
    // sentinel and navigate away, so this also proves no navigation happened.
    await page.waitForTimeout(200);
    const sentinelSurvived = await page.evaluate(() => window.__noReloadSentinel);
    expect(sentinelSurvived).toBe("still-here");

    // The blank state is still applied honestly, in place.
    await expect(page.locator("#tpLabel")).toHaveText("0 of 17 modules complete");
    await expect(page.locator('.mark-complete[data-mod="m1"]')).not.toHaveClass(/done/);
    await expect(page.locator("#storageWarning")).toBeVisible();

    const status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: false, reason: "write-failed" });

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("a genuine read failure at initialization shows the warning immediately, before any user action", async ({
    page,
    consoleIssues,
  }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = function () { throw new Error("SecurityError: storage access denied"); };
    });
    await page.goto("/");

    await expect(page.locator("#storageWarning")).toBeVisible();
    const status = await page.evaluate(() => window.CytoCourse.getPersistenceStatus());
    expect(status).toEqual({ persistent: false, reason: "unavailable" });
    // The course still renders and is usable despite the read failure.
    await expect(page.locator("#tpLabel")).toHaveText("0 of 17 modules complete");

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });
});
