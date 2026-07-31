import { test, expect } from "./fixtures.mjs";

/**
 * Real-browser layout coverage for the progress-dashboard cards
 * (`#dashboardGrid .dash-cell`). Added after a confirmed defect: the
 * title/"Module N" wrapper span had no class and no layout rules, so the two
 * plain inline spans (`.dc-t`, `.dc-s`) ran together on one line instead of
 * stacking, and `.dc-state` ("To do") lacked `flex:0 0 auto`/`white-space:
 * nowrap` and could wrap. See docs/QUALITY_LOG.md for the fix.
 *
 * These are layout assertions (bounding boxes, computed line-height),
 * deliberately not pixel/visual snapshots — the DOM harness in
 * tests/dom-behavior.mjs cannot evaluate real layout at all, and a pixel
 * snapshot would be brittle across font-hinting/OS/Chromium differences for
 * a property (line arrangement) that bounding boxes can check directly and
 * deterministically.
 */

function assertSingleLine(locator, label) {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    let lineHeight = parseFloat(cs.lineHeight);
    if (Number.isNaN(lineHeight)) lineHeight = parseFloat(cs.fontSize) * 1.2;
    return { height: rect.height, lineHeight };
  }).then(({ height, lineHeight }) => {
    expect(height, `${label}: height ${height}px suggests wrapping past a single ${lineHeight}px line`).toBeLessThan(
      lineHeight * 1.5,
    );
  });
}

test.describe("dashboard card layout", () => {
  test("all 17 dashboard cards render", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#dashboardGrid .dash-cell")).toHaveCount(17);
  });

  test("every card's title and \"Module N\" render on separate, non-overlapping lines, and status text does not overlap or wrap", async ({
    page,
  }) => {
    await page.goto("/");
    const cards = page.locator("#dashboardGrid .dash-cell");
    const count = await cards.count();
    expect(count).toBe(17);

    for (let i = 0; i < count; i += 1) {
      const card = cards.nth(i);
      const title = card.locator(".dc-t");
      const sub = card.locator(".dc-s");
      const state = card.locator(".dc-state");

      const titleBox = await title.boundingBox();
      const subBox = await sub.boundingBox();
      const stateBox = await state.boundingBox();
      const label = `card ${i + 1}`;

      // The subtitle ("Module N") must start at or below where the title
      // line ends, not overlap it horizontally on the same line.
      expect(
        subBox.y,
        `${label}: expected "Module N" (y=${subBox.y}) to start at or below the title's bottom edge (${
          titleBox.y + titleBox.height
        }), i.e. on its own line`,
      ).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);

      // The status ("To do"/"Done") must sit to the right of the title text,
      // never overlapping it horizontally.
      expect(
        stateBox.x,
        `${label}: expected the status text (x=${stateBox.x}) to start at or after the title's right edge (${
          titleBox.x + titleBox.width
        }), i.e. not overlapping it`,
      ).toBeGreaterThanOrEqual(titleBox.x + titleBox.width - 1);

      await assertSingleLine(state, `${label} status text`);
    }
  });

  test("dashboard card layout holds at the narrow/mobile viewport too", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator("#dashboardGrid .dash-cell");
    await expect(cards).toHaveCount(17);

    const first = cards.first();
    const titleBox = await first.locator(".dc-t").boundingBox();
    const subBox = await first.locator(".dc-s").boundingBox();
    const stateBox = await first.locator(".dc-state").boundingBox();

    expect(subBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);
    expect(stateBox.x).toBeGreaterThanOrEqual(titleBox.x + titleBox.width - 1);
    await assertSingleLine(first.locator(".dc-state"), "narrow-viewport card 1 status text");

    // The card itself must not force the dashboard grid wider than the
    // viewport (a regression here would silently reintroduce a layout
    // defect at the width this test specifically targets).
    const viewport = page.viewportSize();
    const cardBox = await first.boundingBox();
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 1);
  });
});
