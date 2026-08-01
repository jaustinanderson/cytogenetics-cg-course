import { test, expect, openDisclosure } from "./fixtures.mjs";

test.describe("page initialization and rendered mounts", () => {
  test("the course loads, renders its mounts, and reports the documented API version", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Cytogenetics CG(ASCP) Mini-Course");

    await expect(page.locator(".quiz-mount")).toHaveCount(17);
    await expect(page.locator(".exer")).toHaveCount(6);
    await expect(page.locator(".mark-complete")).toHaveCount(17);
    await expect(page.locator("#flashMount .flash-cat")).toHaveCount(7);

    const heroStats = page.locator(".hero-stat .n");
    await expect(heroStats).toHaveText(["17", "150+", "6", "8"]);

    const api = await page.evaluate(() => ({
      version: window.CytoCourse.version,
      schema: window.CytoCourse.schema,
      moduleCount: window.CytoCourse.getModules().length,
      questionCount: window.CytoCourse.getStats().questionsTotal,
    }));
    expect(api.version).toBe("1.1.1");
    expect(api.schema).toBe(2);
    expect(api.moduleCount).toBe(17);
    expect(api.questionCount).toBe(153);

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("no page-origin console errors or warnings appear after interacting with the course", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");

    // Touch several subsystems in one pass: navigation, a quiz answer, and an
    // exercise answer are the interactions most likely to surface a runtime
    // warning that the DOM harness cannot observe (real event wiring, real
    // focus/scroll side effects).
    const firstQuizMount = page.locator(".quiz-mount").first();
    await openDisclosure(firstQuizMount.locator(".quiz"));
    await firstQuizMount.locator(".qopt").first().click();
    const exer = page.locator(".exer").first();
    await openDisclosure(exer);
    await exer.locator(".eopt").first().click();
    const toggle = page.locator("#navToggle");
    if (await toggle.isVisible()) await toggle.click();
    await page.locator("#sidebarNav .nav-link").nth(2).click();

    const pageOriginIssues = consoleIssues.filter(
      (issue) => issue.url === "" || issue.url.includes("127.0.0.1:4173"),
    );
    expect(pageOriginIssues, JSON.stringify(pageOriginIssues, null, 2)).toEqual([]);
  });
});
