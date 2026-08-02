import { test, expect } from "./fixtures.mjs";

/**
 * Real-browser regression coverage for Figure 9.1 (centromere morphology,
 * `#figMorph`, Module 9). The live SVG previously rendered its three
 * morphology labels as fixed-position <text> elements inside one shared SVG
 * viewBox that never accounted for label width: "Metacentric" overlapped
 * "Submetacentric", and "Acrocentric + satellite" extended past the
 * viewBox's right edge and the figure's own boundary.
 *
 * The fix (see index.html's `chromoOnlySVG()`/`morphGrid()`) separates each
 * chromosome drawing from its label: every morphology is now an
 * individually contained `.morph-item` card in a responsive CSS grid
 * (`.fig-morph-grid`, `repeat(auto-fit,minmax(150px,1fr))`), with the label
 * rendered as ordinary wrapping HTML text (`.morph-label`) below a small,
 * label-free SVG drawing, instead of embedded SVG <text>. This is
 * bounding-box coverage, deliberately not pixel snapshots, matching the
 * existing convention in tests/e2e/dashboard-layout.spec.mjs and
 * tests/e2e/visual-polish.spec.mjs.
 */

const EXPECTED_LABELS = ["Metacentric", "Submetacentric", "Acrocentric + satellite"];

// The acceptance criteria's explicit viewport matrix. 1280x900 and 390x844
// are already covered by this suite's two Playwright projects
// (desktop-chromium, mobile-chromium); the other three are exercised here
// directly via test.use({ viewport }), the same pattern
// tests/e2e/visual-polish.spec.mjs already established.
const EXTRA_VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "360x800", width: 360, height: 800 },
];

function boxesIntersect(a, b) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

function boxContains(outer, inner, epsilon = 1) {
  return (
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    inner.x + inner.width <= outer.x + outer.width + epsilon &&
    inner.y + inner.height <= outer.y + outer.height + epsilon
  );
}

async function assertNoHorizontalOverflow(page, label) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    scrollWidth,
    `${label}: document.documentElement.scrollWidth (${scrollWidth}) exceeds clientWidth (${clientWidth}) — horizontal page overflow`,
  ).toBeLessThanOrEqual(clientWidth + 1);
}

/** Runs the full label-containment/overlap/overflow assertion set at the page's current (ambient) viewport. */
async function assertFigure91Layout(page, label) {
  await page.goto("/");
  const figure = page.locator("#m9 figure.fig").first();
  await figure.scrollIntoViewIfNeeded();

  const labelLocators = page.locator("#figMorph .morph-label");
  await expect(labelLocators, `${label}: expected 3 morphology labels`).toHaveCount(3);

  const texts = await labelLocators.allTextContents();
  expect(texts, `${label}: exact, uncut label text`).toEqual(EXPECTED_LABELS);

  const figureBox = await figure.boundingBox();
  expect(figureBox, `${label}: figure must have a bounding box`).not.toBeNull();

  const boxes = [];
  for (let i = 0; i < texts.length; i += 1) {
    const loc = labelLocators.nth(i);
    const box = await loc.boundingBox();
    expect(box, `${label}: "${texts[i]}" must have a bounding box`).not.toBeNull();
    boxes.push({ text: texts[i], box });

    // The label itself must not be clipped/truncated by its own box (ordinary
    // wrapping text, not a fixed-width overflow:hidden container).
    const overflow = await loc.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(
      overflow.scrollWidth,
      `${label}: "${texts[i]}" label text is clipped (scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth})`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);

    expect(boxContains(figureBox, box), `${label}: "${texts[i]}" label escapes the figure's bounding box`).toBe(
      true,
    );
  }

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      expect(
        boxesIntersect(boxes[i].box, boxes[j].box),
        `${label}: "${boxes[i].text}" label overlaps "${boxes[j].text}" label`,
      ).toBe(false);
    }
  }

  await assertNoHorizontalOverflow(page, label);
}

test.describe("Figure 9.1 centromere morphology: labels stay visible, contained, and non-overlapping", () => {
  test("at the ambient project viewport", async ({ page }) => {
    await assertFigure91Layout(page, "ambient project viewport");
  });

  for (const vp of EXTRA_VIEWPORTS) {
    test(`at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await assertFigure91Layout(page, vp.name);
    });
  }
});

test.describe("Figure 9.1 stays explicitly identified as a schematic", () => {
  test("the figure title and caption both say so", async ({ page }) => {
    await page.goto("/");
    const figure = page.locator("#m9 figure.fig").first();
    await expect(figure.locator(".fig-title")).toContainText("(schematic)");
    await expect(figure.locator("figcaption .lic.schem")).toContainText("Schematic");
  });
});

test.describe("Figure 9.1 morphology cards are individually contained", () => {
  test("each morph-item's drawing and label both sit inside that item's own bounding box", async ({ page }) => {
    await page.goto("/");
    const items = page.locator("#figMorph .morph-item");
    await expect(items).toHaveCount(3);
    const count = await items.count();
    for (let i = 0; i < count; i += 1) {
      const item = items.nth(i);
      const itemBox = await item.boundingBox();
      const svgBox = await item.locator("svg").boundingBox();
      const labelBox = await item.locator(".morph-label").boundingBox();
      expect(boxContains(itemBox, svgBox), `item ${i + 1}: drawing escapes its own card`).toBe(true);
      expect(boxContains(itemBox, labelBox), `item ${i + 1}: label escapes its own card`).toBe(true);
    }
  });
});
