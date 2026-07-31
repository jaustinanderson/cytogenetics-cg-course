import { test, expect } from "./fixtures.mjs";

/**
 * Mobile navigation on the real deployed page, driven by Playwright's
 * `hasTouch`-emulated tap input. This proves the same behavior the local
 * Playwright suite already covers against a local static server (see
 * tests/e2e/navigation.spec.mjs), but here against the actual HTTPS Pages
 * deployment and using `.tap()` throughout instead of `.click()`.
 *
 * IMPORTANT SCOPE NOTE: Playwright's `hasTouch`/`.tap()` emulates touch input
 * (dispatches touch* events and a synthesized click, as real touch browsers
 * do) inside a desktop Chromium engine. It does not exercise physical touch
 * hardware, a mobile OS, or a mobile browser build. See docs/VALIDATION.md.
 */
test.describe("deployed mobile navigation via emulated touch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    test.skip((page.viewportSize()?.width ?? 0) >= 980, "hamburger nav is desktop-hidden above 980px");
  });

  test("no unintended horizontal page overflow at the narrow viewport", async ({ page }) => {
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      overflow.scrollWidth,
      `document.documentElement.scrollWidth (${overflow.scrollWidth}) exceeds clientWidth (${overflow.clientWidth}); something is wider than the viewport`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test("tapping the hamburger opens the menu, and aria-expanded agrees with the visible state", async ({ page }) => {
    const toggle = page.locator("#navToggle");
    const sidebar = page.locator("#sidebar");

    // Closed state: aria-expanded="false" must agree with the sidebar
    // actually being off-canvas, not just the absence of an "open" class name.
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const closedBox = await sidebar.boundingBox();
    expect(closedBox.x, "sidebar should be off-canvas (negative x) while closed").toBeLessThan(0);

    await toggle.tap();

    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(sidebar).toHaveClass(/open/);
    const openBox = await sidebar.boundingBox();
    expect(
      openBox.x,
      `sidebar should be on-canvas (x ~ 0) while open, got x=${openBox.x}`,
    ).toBeGreaterThanOrEqual(-1);
    expect(
      openBox.x,
      `sidebar should have moved on-canvas from its closed position (${closedBox.x}), got x=${openBox.x}`,
    ).toBeGreaterThan(closedBox.x);
  });

  test("tapping a module link reaches the intended module and closes the mobile nav", async ({ page }) => {
    const toggle = page.locator("#navToggle");
    const sidebar = page.locator("#sidebar");

    await toggle.tap();
    await expect(sidebar).toHaveClass(/open/);

    const targetLink = page.locator('#sidebarNav .nav-link[data-target="m5"]');
    await targetLink.tap();

    await expect(sidebar).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect
      .poll(() => page.evaluate(() => window.location.hash), {
        message: "expected the URL hash to update to #m5 after tapping the module link",
      })
      .toBe("#m5");

    await expect
      .poll(
        async () => {
          const top = await page.evaluate(() => document.getElementById("m5").getBoundingClientRect().top);
          return Math.abs(top);
        },
        { message: "expected #m5 to have scrolled to (near) the top of the viewport", timeout: 5_000 },
      )
      .toBeLessThan(120);
  });

  test("tapping the backdrop closes the menu", async ({ page }) => {
    const toggle = page.locator("#navToggle");
    const sidebar = page.locator("#sidebar");
    const backdrop = page.locator("#backdrop");

    await toggle.tap();
    await expect(sidebar).toHaveClass(/open/);
    await expect(backdrop).toHaveClass(/show/);

    // As in the local suite (docs/QUALITY_LOG.md QL-008): at this width the
    // open sidebar and the fixed header overlap most of the backdrop, so tap
    // an explicit point clear of both instead of the element's default
    // center point.
    const sidebarBox = await sidebar.boundingBox();
    await backdrop.tap({
      position: { x: sidebarBox.x + sidebarBox.width + 10, y: sidebarBox.y + 50 },
    });

    await expect(sidebar).not.toHaveClass(/open/);
    await expect(backdrop).not.toHaveClass(/show/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
