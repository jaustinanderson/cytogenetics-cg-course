import { test, expect } from "./fixtures.mjs";

/**
 * Regression coverage for the visual-polish pass (Issue #11): removed
 * "Image needed" placeholders, capped figure sizing with attached captions,
 * readable caption/source text, a constrained prose measure, and a
 * non-overlapping mobile header at narrow widths. Viewports beyond the two
 * project-level ones (1280x900, 390x844) are covered here directly via
 * `test.use({ viewport })` per describe block, per the acceptance criteria's
 * explicit 1440x900 / 1280x900 / 768x1024 / 390x844 / 360x800 matrix.
 */

const EXTRA_VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "360x800", width: 360, height: 800 },
];

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

test.describe("mobile header: essential controls stay accessible", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("hamburger, Print, and Reset are reachable by keyboard with a visible name, and operable by touch", async ({
    page,
  }) => {
    await page.goto("/");

    for (const [id, expectedName] of [
      ["#navToggle", "Open module navigation"],
      ["#printBtn", "Print"],
      ["#resetBtn", "Reset"],
    ]) {
      const locator = page.locator(id);
      await expect(locator).toBeVisible();
      await expect(locator).toHaveAccessibleName(expectedName);
    }

    // Bounded real Tab-key walk (never .focus(), which would pass even on an
    // unreachable control) confirming the hamburger is in the natural tab
    // order and touch-operable.
    let reachedToggle = false;
    for (let i = 0; i < 10 && !reachedToggle; i += 1) {
      await page.keyboard.press("Tab");
      reachedToggle = await page.evaluate(() => document.activeElement && document.activeElement.id === "navToggle");
    }
    expect(reachedToggle, "hamburger was not reached by real Tab presses").toBe(true);

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).not.toHaveClass(/open/);
    await page.locator("#navToggle").tap();
    await expect(sidebar).toHaveClass(/open/);
    await page.locator("#navToggle").tap();
    await expect(sidebar).not.toHaveClass(/open/);
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

test.describe("long-form prose keeps a constrained reading measure without narrowing full-width components", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("module paragraphs stay within the reading-measure cap while tables and quizzes keep full content width", async ({
    page,
  }) => {
    await page.goto("/");

    const contentWidth = await page.locator(".content").first().evaluate((el) => el.getBoundingClientRect().width);

    const proseWidth = await page.locator("#m9 p").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(proseWidth, `paragraph width ${proseWidth}px exceeds the intended ~70ch reading measure`).toBeLessThan(
      contentWidth * 0.85,
    );

    const tableWidth = await page.locator("#m9 .tbl-wrap").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(
      tableWidth,
      `table width ${tableWidth}px was narrowed along with prose — tables must keep full content width`,
    ).toBeGreaterThan(proseWidth);

    const quizWidth = await page.locator("#m9 .quiz").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(
      quizWidth,
      `quiz width ${quizWidth}px was narrowed along with prose — quizzes must keep full content width`,
    ).toBeGreaterThan(proseWidth);
  });
});
