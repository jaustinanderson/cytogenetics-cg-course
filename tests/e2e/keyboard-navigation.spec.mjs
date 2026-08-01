import { test, expect } from "./fixtures.mjs";

/**
 * Real-browser, keyboard-only interaction coverage. This is representative,
 * not exhaustive: it exercises the controls named in Issue #1 (visible nav,
 * mobile menu, quizzes, exercises, module completion, Print, Reset) plus
 * focus visibility, accessible names, and the absence of keyboard traps on
 * those same controls. It does not simulate a screen reader and is not a
 * substitute for one -- see docs/VALIDATION.md.
 *
 * No test in this file uses locator.focus() to establish that a control is
 * Tab-reachable. Programmatic focus succeeds even on an element with
 * tabindex="-1" that a real keyboard user could never reach, so it cannot
 * prove natural Tab-order reachability -- only pressing real Tab keys and
 * checking document.activeElement can. Every "reachable by Tab" claim below
 * is proven by tabUntilFocused() driving actual page.keyboard.press("Tab")
 * input from wherever focus currently is.
 *
 * Every control this suite (and docs/VALIDATION.md) claims receives a
 * "visible focus" check is verified immediately after that real Tab arrival
 * by the shared assertVisibleFocus() helper below -- not just an isolated
 * outline-style check on some controls and a bare toBeFocused() on others.
 */

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Asserts `target` is genuinely keyboard-focused (document.activeElement,
 * checked by DOM node identity, the same way tabUntilFocused() checks it --
 * not Playwright's toBeFocused(), so both helpers agree on what "focused"
 * means) and that its computed :focus-visible outline would actually be
 * visible to a sighted keyboard user: a non-"none" outline-style, a
 * greater-than-zero outline-width, and -- where the computed value makes
 * this checkable -- a non-transparent outline-color.
 */
async function assertVisibleFocus(page, target, { label = "target" } = {}) {
  const handle = await target.elementHandle();
  if (!handle) {
    throw new Error(`assertVisibleFocus: "${label}" did not resolve to an element in the DOM`);
  }
  const isFocused = await page.evaluate((el) => el === document.activeElement, handle);
  expect(isFocused, `assertVisibleFocus: "${label}" is not document.activeElement`).toBe(true);

  const style = await page.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineColor: cs.outlineColor,
    };
  }, handle);

  expect(style.outlineStyle, `${label}: outline-style`).not.toBe("none");
  expect(parseFloat(style.outlineWidth), `${label}: outline-width`).toBeGreaterThan(0);

  // Non-transparent color, where practical: getComputedStyle normally
  // resolves outline-color to an rgb()/rgba() string (or occasionally the
  // literal keyword "transparent"). Treat the keyword, or an rgba() alpha
  // of 0, as a failure -- either would make an otherwise-present outline
  // invisible. An unresolvable format (e.g. a browser returning something
  // else entirely) is not asserted against, since it cannot be reliably
  // checked here rather than because it is assumed fine.
  expect(style.outlineColor, `${label}: outline-color`).not.toBe("transparent");
  const alphaMatch = style.outlineColor.match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/);
  if (alphaMatch) {
    expect(parseFloat(alphaMatch[1]), `${label}: outline-color alpha`).toBeGreaterThan(0);
  }

  return style;
}

/**
 * Presses real Tab keys -- never locator.focus() -- until `target` becomes
 * document.activeElement, or throws a descriptive error after `max`
 * presses. Bounded so a genuinely broken or looping tab order fails fast
 * with a clear message instead of hanging the test until Playwright's
 * per-test timeout.
 */
async function tabUntilFocused(page, target, { max = 100, label = "target" } = {}) {
  const handle = await target.elementHandle();
  if (!handle) {
    throw new Error(`tabUntilFocused: "${label}" did not resolve to an element in the DOM`);
  }
  const alreadyFocused = await page.evaluate((el) => el === document.activeElement, handle);
  if (alreadyFocused) return 0;
  for (let presses = 1; presses <= max; presses += 1) {
    await page.keyboard.press("Tab");
    const isFocused = await page.evaluate((el) => el === document.activeElement, handle);
    if (isFocused) return presses;
  }
  const stuckOn = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return "(none)";
    const cls = el.className ? `.${String(el.className).trim().replace(/\s+/g, ".")}` : "";
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls}`;
  });
  throw new Error(
    `tabUntilFocused: "${label}" was not reached by natural Tab order within ${max} presses ` +
      `(bounded so a broken tab order fails with a clear message instead of hanging the suite). ` +
      `Focus ended on ${stuckOn}.`,
  );
}

test.describe("keyboard: skip link and visible navigation", () => {
  test("the skip link is the first tab stop, has a meaningful name, is visibly focused, and keyboard-activating it moves focus into the content", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".skip-link")).toHaveAccessibleName("Skip to content");

    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => ({
      tag: document.activeElement.tagName,
      cls: document.activeElement.className,
    }));
    expect(first.cls).toContain("skip-link");

    await assertVisibleFocus(page, page.locator(".skip-link"), { label: "skip link" });

    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("a desktop sidebar nav link is keyboard-reachable by real Tab order, has a meaningful name, is visibly focused, and Enter activates it", async ({
    page,
  }) => {
    await page.goto("/");
    test.skip((page.viewportSize()?.width ?? 0) < 980, "sidebar is on-canvas only at desktop widths");

    const link = page.locator('#sidebarNav .nav-link[data-target="m5"]');
    const modules = await page.evaluate(() => window.CytoCourse.getModules());
    const m5 = modules.find((m) => m.id === "m5");
    await expect(link).toHaveAccessibleName(new RegExp(escapeRegExp(m5.short)));

    await tabUntilFocused(page, link, { max: 20, label: "m5 sidebar nav link" });
    await assertVisibleFocus(page, link, { label: "m5 sidebar nav link" });

    await page.keyboard.press("Enter");
    await expect(link).toHaveClass(/active/);
  });
});

test.describe("keyboard: mobile menu", () => {
  test("the hamburger toggle is keyboard-reachable by real Tab order, has a meaningful name, is visibly focused, Enter/Space activate it, and there is no keyboard trap", async ({
    page,
  }) => {
    await page.goto("/");
    const toggle = page.locator("#navToggle");
    test.skip(!(await toggle.isVisible()), "hamburger nav is desktop-hidden above 980px");

    await expect(toggle).toHaveAccessibleName("Open module navigation");

    await tabUntilFocused(page, toggle, { max: 10, label: "mobile hamburger toggle" });
    await assertVisibleFocus(page, toggle, { label: "mobile hamburger toggle" });

    await page.keyboard.press("Enter");
    await expect(page.locator("#sidebar")).toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    // The toggle's click handler only mutates classes/attributes on other
    // elements (the sidebar, the backdrop, itself), never removes or
    // disables the toggle, so it keeps genuine keyboard focus after
    // activation -- verified explicitly, not assumed -- before each further
    // key press below.
    await expect(toggle).toBeFocused();
    await page.keyboard.press(" ");
    await expect(page.locator("#sidebar")).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#sidebar")).toHaveClass(/open/);

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
  });
});

test.describe("keyboard: quiz disclosure and interaction", () => {
  test("the quiz disclosure is keyboard-reachable, has a meaningful name reflecting its collapsed state, and Enter opens it; the option inside is then keyboard-reachable, visibly focused, and Enter answers the item", async ({
    page,
  }) => {
    test.slow(); // reaching a module-1 quiz option takes ~50 real Tab presses
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m1")[0]);
    const quiz = mount.locator(".quiz");
    const summary = quiz.locator("> summary");

    await expect(summary).toHaveAccessibleName(/Quick check/);
    await expect(summary).toHaveAccessibleName(/Not started/);

    await tabUntilFocused(page, summary, { max: 60, label: "m1 quiz disclosure summary" });
    await assertVisibleFocus(page, summary, { label: "m1 quiz disclosure summary" });

    await expect(quiz).toHaveJSProperty("open", false);
    await page.keyboard.press("Enter");
    await expect(quiz).toHaveJSProperty("open", true);

    const item = mount.locator(".qitem").first();
    const options = item.locator(".qopt");
    const target = options.nth(question.a);

    await expect(target).toHaveAccessibleName(new RegExp(escapeRegExp(question.o[question.a])));

    // A fresh bounded search from wherever focus landed after the summary
    // toggled open -- native <details> keeps focus on the summary itself
    // after Enter, so this continues forward from there, not from the top.
    await tabUntilFocused(page, target, { max: 30, label: "m1 first question, correct option" });
    await assertVisibleFocus(page, target, { label: "m1 first question, correct option" });

    await page.keyboard.press("Enter");
    await expect(target).toHaveClass(/correct/);
    await expect(mount.locator(".qh-score")).toHaveText("1 / 5");
    // Only 1 of 5 questions is answered at this point, so the disclosure's
    // status reads "In progress", not "Completed" -- that requires all 5.
    await expect(summary).toHaveAccessibleName(/In progress/);

    // Answered options are disabled and therefore removed from the tab
    // order -- confirm that is really true rather than merely styled, so a
    // keyboard user cannot re-trigger a locked item.
    for (let i = 0; i < (await options.count()); i += 1) {
      await expect(options.nth(i)).toBeDisabled();
    }
  });
});

test.describe("keyboard: exercise disclosure and interaction", () => {
  test("the exercise disclosure is keyboard-reachable, has a meaningful name reflecting its collapsed state, and Enter opens it; the option and Next control inside are then each keyboard-reachable, visibly focused, and keyboard-operable in sequence", async ({
    page,
  }) => {
    test.slow(); // the first exercise sits well into the document; ~200+ real Tab presses
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    const summary = host.locator("> summary");

    await expect(summary).toHaveAccessibleName(/Exercise/);
    await expect(summary).toHaveAccessibleName(/Not started/);

    await tabUntilFocused(page, summary, { max: 220, label: "first exercise disclosure summary" });
    await assertVisibleFocus(page, summary, { label: "first exercise disclosure summary" });

    await expect(host).toHaveJSProperty("open", false);
    await page.keyboard.press("Enter");
    await expect(host).toHaveJSProperty("open", true);

    const opt = host.locator(".eopt").nth(items[0].answer);
    await expect(opt).toHaveAccessibleName(items[0].options[items[0].answer]);

    await tabUntilFocused(page, opt, { max: 20, label: "first exercise, correct option" });
    await assertVisibleFocus(page, opt, { label: "first exercise, correct option" });

    await page.keyboard.press("Enter");
    await expect(host.locator(".eh-score")).toHaveText(`1 / ${items.length}`);

    const next = host.locator(".exer-next");
    await expect(next).toBeEnabled();
    await expect(next).toHaveAccessibleName("Next");

    // Answering disables every .eopt button, including whichever one was
    // just activated; a disabled focused element loses focus, so Next is
    // reached with a fresh bounded Tab search rather than assumed residual
    // focus. (Empirically this only takes 1-2 presses -- Chromium resumes
    // sequential navigation from the removed element's former DOM position,
    // not from the top of the document -- but the search does not assume
    // that and is bounded generously in case that behavior ever changes.)
    await tabUntilFocused(page, next, { max: 20, label: "exercise Next control" });
    await assertVisibleFocus(page, next, { label: "exercise Next control" });

    await page.keyboard.press("Enter");
    await expect(host.locator(".exer-prompt")).toHaveText(items[1].prompt);
  });
});

test.describe("keyboard: module completion, print, and reset", () => {
  test("a mark-complete button is keyboard-reachable by real Tab order, visibly focused, and Space/Enter toggle it with its accessible name reflecting each state", async ({
    page,
  }) => {
    test.slow(); // reaching module 1's mark-complete button takes ~70 real Tab presses
    await page.goto("/");
    const button = page.locator('.mark-complete[data-mod="m1"]');
    await expect(button).toHaveAccessibleName("Mark module complete");

    await tabUntilFocused(page, button, { max: 120, label: "module 1 mark-complete button" });
    await assertVisibleFocus(page, button, { label: "module 1 mark-complete button" });

    await page.keyboard.press(" ");
    await expect(button).toHaveClass(/done/);
    await expect(button).toHaveAccessibleName("Module complete");

    // refreshProgressUI() mutates this same button's class/text in place
    // rather than replacing the element, so it keeps genuine keyboard focus
    // -- verified explicitly -- and Enter can toggle it back without any
    // re-focus step.
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(button).not.toHaveClass(/done/);
    await expect(button).toHaveAccessibleName("Mark module complete");
  });

  test("Enter on the Print control, reached by real Tab order and visibly focused, invokes window.print without a mouse", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__printCalls = 0;
      window.print = () => {
        window.__printCalls += 1;
      };
    });
    await page.goto("/");
    const printBtn = page.locator("#printBtn");
    await expect(printBtn).toHaveAccessibleName("Print");

    await tabUntilFocused(page, printBtn, { max: 15, label: "Print control" });
    await assertVisibleFocus(page, printBtn, { label: "Print control" });

    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => window.__printCalls)).toBe(1);
  });

  test("Enter on the Reset control, reached by real Tab order and visibly focused, opens the confirmation and, once accepted, clears progress", async ({
    page,
  }) => {
    await page.goto("/");
    // Seeding progress via a mouse click is not the control under keyboard
    // test here; only Reset itself needs to be proven Tab-reachable below.
    // The click leaves focus deep in the page (wherever the mark-complete
    // button sits in tab order), and Tab only moves forward, so it would
    // never reach Reset near the top from there. Reload -- progress persists
    // via localStorage, focus does not -- so the Reset search below starts
    // from a genuinely fresh, focus-less state like every other test here.
    await page.locator('.mark-complete[data-mod="m1"]').click();
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");
    await page.reload();
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");

    const resetBtn = page.locator("#resetBtn");
    await expect(resetBtn).toHaveAccessibleName("Reset");

    await tabUntilFocused(page, resetBtn, { max: 15, label: "Reset control" });
    await assertVisibleFocus(page, resetBtn, { label: "Reset control" });

    page.once("dialog", (dialog) => dialog.accept());
    await page.keyboard.press("Enter");
    await page.waitForLoadState("load");

    await expect(page.locator("#tpLabel")).toHaveText("0 of 17 modules complete");
  });
});
