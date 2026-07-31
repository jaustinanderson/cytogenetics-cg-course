import { test, expect } from "./fixtures.mjs";

test.describe("navigation and sidebar behavior", () => {
  test("sidebar navigation is generated from module data and every target resolves", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("#sidebarNav .nav-link");
    await expect(links).toHaveCount(25);

    const targets = await links.evaluateAll((els) => els.map((el) => el.getAttribute("data-target")));
    expect(targets).toContain("m1");
    expect(targets).toContain("m17");
    expect(targets).toContain("exam");
    for (const id of targets) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test("scrolling to a module updates the active nav link via IntersectionObserver", async ({ page }) => {
    // The DOM harness stubs IntersectionObserver and requires a manual
    // trigger; this is real layout, real scrolling, and the real observer.
    await page.goto("/");
    const toggle = page.locator("#navToggle");
    // On a narrow viewport the sidebar (and its links) sit off-canvas until
    // opened; on desktop the hamburger is hidden and the sidebar is already
    // on-canvas, so only open it when it is actually the visible affordance.
    if (await toggle.isVisible()) await toggle.click();
    await page.locator('#sidebarNav .nav-link[data-target="m5"]').click();
    await expect(page.locator('#sidebarNav .nav-link[data-target="m5"]')).toHaveClass(/active/);
  });

  test("the mobile navigation toggle opens, closes via the backdrop, and closes on link activation", async ({
    page,
  }) => {
    await page.goto("/");
    test.skip((page.viewportSize()?.width ?? 0) >= 980, "hamburger nav is desktop-hidden above 980px");

    const toggle = page.locator("#navToggle");
    const sidebar = page.locator("#sidebar");
    const backdrop = page.locator("#backdrop");

    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(sidebar).toHaveClass(/open/);
    await expect(backdrop).toHaveClass(/show/);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    // The open sidebar visually overlaps the left portion of the full-screen
    // backdrop, and the fixed topbar header overlaps its top strip, so the
    // default center-point click lands on one of those instead of the
    // backdrop. Click a point clear of both: to the right of the sidebar and
    // below the header.
    const sidebarBox = await sidebar.boundingBox();
    await backdrop.click({
      position: { x: sidebarBox.x + sidebarBox.width + 10, y: sidebarBox.y + 50 },
    });
    await expect(sidebar).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(sidebar).toHaveClass(/open/);
    await page.locator("#sidebarNav .nav-link").first().click();
    await expect(sidebar).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
