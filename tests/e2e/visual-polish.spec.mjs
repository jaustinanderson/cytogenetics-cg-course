import { test, expect } from "./fixtures.mjs";

/**
 * Regression coverage for the visual-polish pass (Issue #11): removed
 * "Image needed" placeholders, capped figure sizing with attached captions,
 * readable caption/source text, a constrained prose measure, and a
 * non-overlapping mobile header at narrow widths. Viewports beyond the two
 * project-level ones (1280x900, 390x844) are covered here directly via
 * `test.use({ viewport })` per describe block, per the acceptance criteria's
 * explicit 1440x900 / 1280x900 / 768x1024 / 390x844 / 360x800 matrix.
 *
 * The header-accessibility tests below deliberately duplicate the small
 * tabUntilFocused()/assertVisibleFocus() helpers from
 * tests/e2e/keyboard-navigation.spec.mjs rather than importing them, the
 * same independence convention tests/e2e-deployed/ already uses relative to
 * tests/e2e/ (see docs/VALIDATION.md) — this file's claims about the header
 * controls stay provable on their own, not contingent on another suite file.
 */

const EXTRA_VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "360x800", width: 360, height: 800 },
];

/**
 * Presses real Tab keys -- never locator.focus(), which succeeds even on a
 * tabindex="-1" element a real keyboard user could never reach -- until
 * `target` becomes document.activeElement, or throws a descriptive error
 * after `max` presses.
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
    `tabUntilFocused: "${label}" was not reached by natural Tab order within ${max} presses. Focus ended on ${stuckOn}.`,
  );
}

/** Confirms `target` is genuinely document.activeElement with a real, visible :focus-visible outline. */
async function assertVisibleFocus(page, target, { label = "target" } = {}) {
  const handle = await target.elementHandle();
  if (!handle) {
    throw new Error(`assertVisibleFocus: "${label}" did not resolve to an element in the DOM`);
  }
  const isFocused = await page.evaluate((el) => el === document.activeElement, handle);
  expect(isFocused, `assertVisibleFocus: "${label}" is not document.activeElement`).toBe(true);

  const style = await page.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor };
  }, handle);

  expect(style.outlineStyle, `${label}: outline-style`).not.toBe("none");
  expect(parseFloat(style.outlineWidth), `${label}: outline-width`).toBeGreaterThan(0);
  expect(style.outlineColor, `${label}: outline-color`).not.toBe("transparent");
  const alphaMatch = style.outlineColor.match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/);
  if (alphaMatch) {
    expect(parseFloat(alphaMatch[1]), `${label}: outline-color alpha`).toBeGreaterThan(0);
  }
}

async function assertNoHorizontalOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `document.scrollWidth (${scrollWidth}) exceeds clientWidth (${clientWidth})`).toBeLessThanOrEqual(
    clientWidth + 1,
  );
}

test.describe("no page-level horizontal overflow", () => {
  test("at the ambient project viewport", async ({ page }) => {
    await page.goto("/");
    await assertNoHorizontalOverflow(page);
  });

  for (const vp of EXTRA_VIEWPORTS) {
    test(`at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await assertNoHorizontalOverflow(page);
    });
  }
});

test.describe("mobile header: no control overlap or clipping", () => {
  for (const vp of [{ name: "768x1024", width: 768, height: 1024 }, { name: "390x844", width: 390, height: 844 }, { name: "360x800", width: 360, height: 800 }]) {
    test(`hamburger, brand, Print, and Reset stay within bounds and do not overlap at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      const boxes = await page.evaluate(() => {
        const rect = (sel) => document.querySelector(sel).getBoundingClientRect();
        return {
          hamburger: rect("#navToggle"),
          brand: rect(".brand"),
          printBtn: rect("#printBtn"),
          resetBtn: rect("#resetBtn"),
          topbarActions: rect(".topbar-actions"),
        };
      });

      expect(boxes.hamburger.right, "hamburger overlaps the brand").toBeLessThanOrEqual(boxes.brand.x + 1);
      expect(boxes.brand.right, "brand text overlaps the topbar actions (Print/Reset)").toBeLessThanOrEqual(
        boxes.topbarActions.x + 1,
      );
      expect(boxes.printBtn.right, "Print button overlaps Reset").toBeLessThanOrEqual(boxes.resetBtn.x + 1);
      expect(boxes.resetBtn.right, "Reset button is clipped past the viewport edge").toBeLessThanOrEqual(vp.width + 1);
      expect(boxes.hamburger.x, "hamburger is clipped before the viewport's left edge").toBeGreaterThanOrEqual(-1);
    });
  }
});

test.describe("mobile header: essential controls are keyboard- and touch-accessible", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("hamburger: real-Tab reachable, visibly focused, keyboard-operable, and touch-operable", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("#navToggle");
    await expect(toggle).toHaveAccessibleName("Open module navigation");

    await tabUntilFocused(page, toggle, { max: 10, label: "hamburger toggle" });
    await assertVisibleFocus(page, toggle, { label: "hamburger toggle" });

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).not.toHaveClass(/open/);
    await page.keyboard.press("Enter");
    await expect(sidebar).toHaveClass(/open/);
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(sidebar).not.toHaveClass(/open/);

    await toggle.tap();
    await expect(sidebar).toHaveClass(/open/);
    await toggle.tap();
    await expect(sidebar).not.toHaveClass(/open/);
  });

  test("Print: real-Tab reachable, visibly focused, keyboard-operable, and touch-operable", async ({ page }) => {
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
    expect(await page.evaluate(() => window.__printCalls), "keyboard Enter did not invoke window.print").toBe(1);

    await printBtn.tap();
    expect(await page.evaluate(() => window.__printCalls), "touch tap did not invoke window.print").toBe(2);
  });

  test("Reset: real-Tab reachable, visibly focused, keyboard-operable, clears seeded progress, and is touch-operable", async ({
    page,
  }) => {
    await page.goto("/");

    // Seed disposable state (mark module 1 complete) so Reset has something
    // real to clear, then reload -- progress persists via localStorage,
    // focus does not, so this leaves a genuinely fresh, focus-less start for
    // the Tab search below, same discipline as
    // tests/e2e/keyboard-navigation.spec.mjs's Reset test.
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

    // Seed again and repeat via touch, so Reset's touch path is proven to
    // actually clear state too, not just dispatch a tap event.
    await page.locator('.mark-complete[data-mod="m1"]').click();
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");
    await page.reload();
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#resetBtn").tap();
    await page.waitForLoadState("load");
    await expect(page.locator("#tpLabel")).toHaveText("0 of 17 modules complete");
  });
});

test.describe("no learner-facing \"Image needed\" placeholder text remains", () => {
  test("at the ambient project viewport", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".imgneeded")).toHaveCount(0);
    await expect(page.getByText("Image needed", { exact: false })).toHaveCount(0);
  });

  for (const vp of EXTRA_VIEWPORTS) {
    test(`at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await expect(page.locator(".imgneeded")).toHaveCount(0);
      await expect(page.getByText("Image needed", { exact: false })).toHaveCount(0);
    });
  }
});

const EMBEDDED_FIGURE_IMAGES = [
  { moduleId: "#m8", label: "Figure 8.1 (normal male karyotype)" },
  { moduleId: "#m10", label: "Figure 10.1 (trisomy 21 karyotype)" },
];

test.describe("figures stay within the content column and viewport", () => {
  for (const vp of [{ name: "1280x900 (project)", width: null, height: null }, ...EXTRA_VIEWPORTS]) {
    test(`embedded figures do not exceed the viewport at ${vp.name}`, async ({ page }) => {
      if (vp.width) await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      const viewport = page.viewportSize();

      for (const { moduleId, label } of EMBEDDED_FIGURE_IMAGES) {
        const img = page.locator(`${moduleId} figure.fig img`).first();
        await img.scrollIntoViewIfNeeded();
        await expect(img).toBeVisible();
        const box = await img.boundingBox();

        expect(box.width, `${label}: image wider than viewport`).toBeLessThanOrEqual(viewport.width + 1);
        expect(
          box.height,
          `${label}: image taller than 60% of the viewport height (${viewport.height}px) — figures must stay proportionate to surrounding content`,
        ).toBeLessThanOrEqual(viewport.height * 0.6 + 1);
      }
    });
  }
});

test.describe("figure captions stay attached and remain readable", () => {
  for (const { moduleId, label } of EMBEDDED_FIGURE_IMAGES) {
    test(`${label}: caption sits directly below the image with a small gap`, async ({ page }) => {
      await page.goto("/");
      const fig = page.locator(`${moduleId} figure.fig`).filter({ has: page.locator("img") }).first();
      await fig.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (sel) => {
          const img = document.querySelector(sel);
          return img && img.complete && img.naturalWidth > 0;
        },
        `${moduleId} figure.fig img`,
      );

      const gap = await fig.evaluate((el) => {
        const img = el.querySelector("img");
        const caption = el.querySelector("figcaption");
        return caption.getBoundingClientRect().top - img.getBoundingClientRect().bottom;
      });

      // A small, fixed padding gap is expected (the figure's own CSS padding
      // between .fig-media and figcaption); anything large would mean the
      // caption is no longer visually attached to its image.
      expect(gap, `${label}: caption is ${gap}px away from the image, not visually attached`).toBeLessThan(40);
    });
  }

  test("caption and source text meet the minimum comfortable-reading font size", async ({ page }) => {
    await page.goto("/");
    const fig = page.locator("#m8 figure.fig").filter({ has: page.locator("img") }).first();
    await fig.scrollIntoViewIfNeeded();

    const sizes = await fig.evaluate((el) => {
      const caption = el.querySelector("figcaption");
      const src = el.querySelector("figcaption .src");
      return {
        captionPx: parseFloat(getComputedStyle(caption).fontSize),
        srcPx: parseFloat(getComputedStyle(src).fontSize),
      };
    });

    // Minimum readable-size rule adopted for this fix: figcaption body text
    // at least 14px, and the smaller/fainter source line at least 13px
    // (previously 13.12px / 11.84px at a 16px root, which read as too small).
    expect(sizes.captionPx, `figcaption font-size ${sizes.captionPx}px is below the 14px comfortable-reading floor`).toBeGreaterThanOrEqual(14);
    expect(sizes.srcPx, `.src font-size ${sizes.srcPx}px is below the 13px comfortable-reading floor`).toBeGreaterThanOrEqual(13);
  });
});

test.describe("the reading-measure cap is scoped to genuine lesson prose only", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Module 5 has a genuine narrative paragraph outside any callout/case/card,
  // plus a table and a quiz, in the same module — a representative real
  // section to check the cap against its neighbors directly.
  test("a genuine module paragraph is narrowed to the reading measure, while its sibling table and quiz keep full content width", async ({
    page,
  }) => {
    await page.goto("/");

    const contentWidth = await page.locator(".content").first().evaluate((el) => el.getBoundingClientRect().width);
    const proseWidth = await page
      .locator("#m5 p:not(.callout p):not(.case-body p):not(.grid-card p):not(.source-note)")
      .first()
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(proseWidth, `paragraph width ${proseWidth}px exceeds the intended ~70ch reading measure`).toBeLessThan(
      contentWidth * 0.85,
    );

    const tableWidth = await page.locator("#m5 .tbl-wrap").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(
      tableWidth,
      `table width ${tableWidth}px was narrowed along with prose — tables must keep full content width`,
    ).toBeGreaterThan(proseWidth);

    const quizWidth = await page.locator("#m5 .quiz").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(
      quizWidth,
      `quiz width ${quizWidth}px was narrowed along with prose — quizzes must keep full content width`,
    ).toBeGreaterThan(proseWidth);
  });

  // Representative regression coverage for every other paragraph-bearing
  // component the reading-measure rule must NOT reach into. Checked via
  // computed max-width directly (must resolve to "none"), not by comparing
  // rendered widths across components -- a card's own narrower column width
  // (from its own layout, not the reading-measure rule) would otherwise
  // produce a false failure, exactly as first happened authoring this test:
  // #m1 .grid-card p legitimately renders at 373px (its own two-column card
  // width) even though the rule correctly does not apply to it at all.
  test("callouts, case studies, quick-reference cards, disclaimers, and the exam-weighting source note keep an unconstrained max-width", async ({
    page,
  }) => {
    await page.goto("/");

    const genuineProseMaxWidth = await page
      .locator("#m5 p:not(.callout p):not(.case-body p):not(.grid-card p):not(.source-note)")
      .first()
      .evaluate((el) => getComputedStyle(el).maxWidth);
    expect(
      genuineProseMaxWidth,
      "sanity check: the genuine module paragraph should itself be capped (not \"none\") for this test to be meaningful",
    ).not.toBe("none");

    const others = {
      "callout paragraph (#m9 .callout p)": "#m9 .callout p",
      "case-study paragraph (.case-body p)": ".case-body p",
      "quick-reference card paragraph (#m1 .grid-card p)": "#m1 .grid-card p",
      "disclaimer paragraph (.disclaimer p)": ".disclaimer p",
      "exam-weighting source note (.source-note)": ".source-note",
    };

    for (const [label, selector] of Object.entries(others)) {
      const locator = page.locator(selector).first();
      await expect(locator, `${label}: selector matched nothing`).toBeVisible();
      const maxWidth = await locator.evaluate((el) => getComputedStyle(el).maxWidth);
      expect(
        maxWidth,
        `${label} has computed max-width "${maxWidth}" — the reading-measure rule must not apply to it`,
      ).toBe("none");
    }
  });
});
