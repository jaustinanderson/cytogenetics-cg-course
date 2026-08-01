import { test, expect, openDisclosure } from "./fixtures.mjs";

test.describe("deployed page identity, content counts, and console cleanliness", () => {
  test("the deployed page responds over HTTPS with the expected title and heading", async ({ page }) => {
    const response = await page.goto("./");
    expect(response, "page.goto() returned no response object").not.toBeNull();
    expect(response.ok(), `expected a successful HTTP response, got ${response.status()}`).toBe(true);
    expect(response.url().startsWith("https://"), `expected an HTTPS URL, got ${response.url()}`).toBe(true);

    await expect(page).toHaveTitle("Cytogenetics CG(ASCP) Mini-Course");
    await expect(page.locator("#heroTitle")).toHaveText(
      "Read the slide. Name every chromosome. Write the nomenclature.",
    );
  });

  test("the deployed page renders 17 modules, 17 quiz mounts, and 6 exercise sets", async ({ page }) => {
    await page.goto("./");

    await expect(page.locator(".mark-complete")).toHaveCount(17);
    await expect(page.locator(".quiz-mount")).toHaveCount(17);
    await expect(page.locator(".exer")).toHaveCount(6);

    const api = await page.evaluate(() => ({
      moduleCount: window.CytoCourse.getModules().length,
      questionCount: window.CytoCourse.getStats().questionsTotal,
    }));
    expect(api.moduleCount).toBe(17);
    expect(api.questionCount).toBe(153);
  });

  test("no page-origin console errors or warnings appear on load", async ({ page, consoleIssues }) => {
    await page.goto("./");
    await page.waitForLoadState("networkidle");

    const pageOriginIssues = consoleIssues.filter(
      (issue) => issue.url === "" || issue.url.includes(new URL(page.url()).host),
    );
    expect(pageOriginIssues, JSON.stringify(pageOriginIssues, null, 2)).toEqual([]);
  });

  test("no page-origin console errors or warnings appear after a representative interaction pass", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("./");

    const firstQuizMount = page.locator(".quiz-mount").first();
    await openDisclosure(firstQuizMount.locator(".quiz"));
    await firstQuizMount.locator(".qopt").first().click();
    const exer = page.locator(".exer").first();
    await openDisclosure(exer);
    await exer.locator(".eopt").first().click();
    const toggle = page.locator("#navToggle");
    if (await toggle.isVisible()) {
      await toggle.tap();
      await page.locator("#sidebarNav .nav-link").first().tap();
    } else {
      await page.locator("#sidebarNav .nav-link").nth(2).click();
    }

    const pageOriginIssues = consoleIssues.filter(
      (issue) => issue.url === "" || issue.url.includes(new URL(page.url()).host),
    );
    expect(pageOriginIssues, JSON.stringify(pageOriginIssues, null, 2)).toEqual([]);
  });
});
