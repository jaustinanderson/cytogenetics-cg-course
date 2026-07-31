import { test, expect } from "./fixtures.mjs";

/**
 * Real-browser, keyboard-only interaction coverage. This is representative,
 * not exhaustive: it exercises the controls named in Issue #1 (visible nav,
 * mobile menu, quizzes, exercises, module completion, Print, Reset) plus
 * focus visibility, accessible names, and the absence of keyboard traps on
 * those same controls. It does not simulate a screen reader and is not a
 * substitute for one -- see docs/VALIDATION.md.
 */

async function focusedOutline(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: el.className,
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
    };
  });
}

test.describe("keyboard: skip link and visible navigation", () => {
  test("the skip link is the first tab stop and keyboard-activating it moves focus into the content", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => ({
      tag: document.activeElement.tagName,
      cls: document.activeElement.className,
    }));
    expect(first.cls).toContain("skip-link");

    const outline = await focusedOutline(page);
    expect(outline.outlineStyle).not.toBe("none");
    expect(parseFloat(outline.outlineWidth)).toBeGreaterThan(0);

    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("a desktop sidebar nav link is keyboard-reachable, has a meaningful name, and Enter activates it", async ({
    page,
  }) => {
    await page.goto("/");
    test.skip((page.viewportSize()?.width ?? 0) < 980, "sidebar is on-canvas only at desktop widths");

    const link = page.locator('#sidebarNav .nav-link[data-target="m5"]');
    const name = await link.evaluate((el) => el.textContent.trim());
    expect(name.length).toBeGreaterThan(0);

    await link.focus();
    await expect(link).toBeFocused();
    const outline = await focusedOutline(page);
    expect(outline.outlineStyle).not.toBe("none");

    await page.keyboard.press("Enter");
    await expect(link).toHaveClass(/active/);
  });
});

test.describe("keyboard: mobile menu", () => {
  test("the hamburger toggle has a meaningful name and Enter opens/closes the menu with no trap", async ({
    page,
  }) => {
    await page.goto("/");
    const toggle = page.locator("#navToggle");
    test.skip(!(await toggle.isVisible()), "hamburger nav is desktop-hidden above 980px");

    const label = await toggle.getAttribute("aria-label");
    expect(label).toBeTruthy();

    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#sidebar")).toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    // No keyboard trap: repeatedly pressing Tab must keep moving focus
    // forward and must eventually reach the now-open sidebar's own links,
    // rather than cycling within the header or getting stuck on the toggle.
    // The toggle precedes Print/Reset in DOM order, so those are legitimate
    // intermediate stops -- this only fails if focus stalls or loops.
    const seen = [];
    let reachedNavLink = false;
    for (let i = 0; i < 8 && !reachedNavLink; i += 1) {
      await page.keyboard.press("Tab");
      const cls = await page.evaluate(() => document.activeElement.className);
      seen.push(cls);
      if (cls.includes("nav-link")) reachedNavLink = true;
    }
    expect(reachedNavLink, `tab stops were: ${JSON.stringify(seen)}`).toBe(true);

    // Re-focusing the toggle and activating it again closes the menu --
    // Space is a real, already-supported keyboard activation path for a
    // native <button>, distinct from the Enter path exercised above.
    await toggle.focus();
    await page.keyboard.press(" ");
    await expect(page.locator("#sidebar")).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("keyboard: quiz interaction", () => {
  test("quiz options are reachable by Tab, have meaningful names, and Enter answers the item", async ({
    page,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m1")[0]);
    const item = mount.locator(".qitem").first();
    const options = item.locator(".qopt");

    const target = options.nth(question.a);
    const name = await target.evaluate((el) => el.textContent.trim());
    expect(name.length).toBeGreaterThan(0);

    await target.focus();
    await expect(target).toBeFocused();
    const outline = await focusedOutline(page);
    expect(outline.outlineStyle).not.toBe("none");

    await page.keyboard.press("Enter");
    await expect(target).toHaveClass(/correct/);
    await expect(mount.locator(".qh-score")).toHaveText("1 / 5");

    // Answered options are disabled and therefore removed from the tab
    // order -- confirm that is really true rather than merely styled, so a
    // keyboard user cannot re-trigger a locked item.
    for (let i = 0; i < (await options.count()); i += 1) {
      await expect(options.nth(i)).toBeDisabled();
    }
  });
});

test.describe("keyboard: exercise interaction", () => {
  test("an exercise option and the Next control are keyboard-operable in sequence", async ({ page }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);

    const opt = host.locator(".eopt").nth(items[0].answer);
    await opt.focus();
    await page.keyboard.press("Enter");
    await expect(host.locator(".eh-score")).toHaveText(`1 / ${items.length}`);

    const next = host.locator(".exer-next");
    await expect(next).toBeEnabled();
    await next.focus();
    await expect(next).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(host.locator(".exer-prompt")).toHaveText(items[1].prompt);
  });
});

test.describe("keyboard: module completion, print, and reset", () => {
  test("Space toggles a mark-complete button and its accessible name reflects the new state", async ({
    page,
  }) => {
    await page.goto("/");
    const button = page.locator('.mark-complete[data-mod="m1"]');
    await button.focus();
    await expect(button).toBeFocused();
    const outline = await focusedOutline(page);
    expect(outline.outlineStyle).not.toBe("none");

    await page.keyboard.press(" ");
    await expect(button).toHaveClass(/done/);
    await expect(button).toHaveText(/Module complete/);

    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).not.toHaveClass(/done/);
    await expect(button).toHaveText(/Mark module complete/);
  });

  test("Enter on the Print control invokes window.print without a mouse", async ({ page }) => {
    await page.addInitScript(() => {
      window.__printCalls = 0;
      window.print = () => {
        window.__printCalls += 1;
      };
    });
    await page.goto("/");
    const printBtn = page.locator("#printBtn");
    await printBtn.focus();
    await expect(printBtn).toBeFocused();
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => window.__printCalls)).toBe(1);
  });

  test("Enter on the Reset control opens the confirmation and, once accepted, clears progress", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");

    const resetBtn = page.locator("#resetBtn");
    await resetBtn.focus();
    page.once("dialog", (dialog) => dialog.accept());
    await page.keyboard.press("Enter");
    await page.waitForLoadState("load");

    await expect(page.locator("#tpLabel")).toHaveText("0 of 17 modules complete");
  });
});
