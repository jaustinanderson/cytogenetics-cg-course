import { test, expect, openDisclosure } from "./fixtures.mjs";

/* ============================ analytics semantics: last-attempt mastery (Issue #2) ============================
   Real-browser counterpart to the dependency-free coverage in
   tests/dom-behavior.mjs. The v2 outcome record ({c, n, ts}) cannot
   distinguish a 2-of-3-correct history from a 1-of-3-correct history that
   both end on a correct attempt -- genuine total-attempt accuracy is not
   implemented. getStats() now exposes analyticsModel:'last-attempt-mastery-v1',
   questionsMastered, and lastAttemptMasteryPct, with questionsCorrect/
   overallPct retained as compatibility aliases (identical values). See
   index.html's ANALYTICS SEMANTICS comment and docs/ARCHITECTURE.md for
   the full policy. */

test.describe("last-attempt mastery analytics", () => {
  test("a correct-then-incorrect reattempt through a real page reload changes mastery to 0%, not 50%, and getUnmastered() picks it up", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m1")[0]);
    await openDisclosure(mount.locator(".quiz"));
    await mount.locator(".qitem").first().locator(".qopt").nth(question.a).click();

    let stats = await page.evaluate(() => window.CytoCourse.getStats());
    expect(stats.questionsAnswered).toBe(1);
    expect(stats.questionsMastered).toBe(1);
    expect(stats.lastAttemptMasteryPct).toBe(100);

    // Re-answering an already-answered question is only reachable across a
    // reload (the clicked option is otherwise permanently disabled).
    await page.reload();
    const wrongIndex = question.a === 0 ? 1 : 0;
    const reloadedMount = page.locator('.quiz-mount[data-quiz="m1"]');
    await openDisclosure(reloadedMount.locator(".quiz"));
    await reloadedMount.locator(".qitem").first().locator(".qopt").nth(wrongIndex).click();

    const record = await page.evaluate((qid) => window.CytoCourse.getProgress().answers[qid], question.id);
    expect(record.c).toBe(false);
    expect(record.n).toBe(2);

    stats = await page.evaluate(() => window.CytoCourse.getStats());
    expect(stats.questionsAnswered, "still exactly one distinct answered question, not two").toBe(1);
    expect(stats.questionsMastered).toBe(0);
    expect(stats.lastAttemptMasteryPct, "0%, not 50% -- mastery follows the latest attempt only").toBe(0);
    expect(stats.overallPct).toBe(0);

    const unmastered = await page.evaluate(() => window.CytoCourse.getUnmastered());
    expect(unmastered.some((e) => e.id === question.id)).toBe(true);

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("getStats() exposes analyticsModel, explicit mastery fields, and compatibility aliases with identical values", async ({ page }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m2"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m2")[0]);
    await openDisclosure(mount.locator(".quiz"));
    await mount.locator(".qitem").first().locator(".qopt").nth(question.a).click();

    const stats = await page.evaluate(() => window.CytoCourse.getStats());
    expect(stats.analyticsModel).toBe("last-attempt-mastery-v1");
    expect(stats.questionsCorrect).toBe(stats.questionsMastered);
    expect(stats.overallPct).toBe(stats.lastAttemptMasteryPct);
    const domainRow = stats.byDomain[question.d];
    expect(domainRow.correct).toBe(domainRow.mastered);
    expect(domainRow.pct).toBe(domainRow.masteryPct);
  });

  test("exportJSON()'s stats snapshot agrees field-for-field with a live getStats() call", async ({ page }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m1")[0]);
    await openDisclosure(mount.locator(".quiz"));
    await mount.locator(".qitem").first().locator(".qopt").nth(question.a).click();

    const [liveStats, exportedStats] = await page.evaluate(() => [
      window.CytoCourse.getStats(),
      JSON.parse(window.CytoCourse.exportJSON()).stats,
    ]);
    expect(exportedStats).toEqual(liveStats);
  });

  test("reading analytics emits no events, and a real reattempt still fires exactly one answer/progress event pair", async ({ page }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m1")[0]);
    await openDisclosure(mount.locator(".quiz"));

    await page.evaluate(() => {
      window.__counts = { answer: 0, progress: 0, persistence: 0, all: 0 };
      window.CytoCourse.on("answer", () => { window.__counts.answer += 1; });
      window.CytoCourse.on("progress", () => { window.__counts.progress += 1; });
      window.CytoCourse.on("persistence", () => { window.__counts.persistence += 1; });
      window.CytoCourse.on("*", () => { window.__counts.all += 1; });
    });

    await page.evaluate(() => {
      window.CytoCourse.getStats();
      window.CytoCourse.getWeakAreas();
      window.CytoCourse.getUnmastered();
      window.CytoCourse.exportJSON();
    });
    let counts = await page.evaluate(() => window.__counts);
    expect(counts.all, "reading analytics must never emit an event").toBe(0);

    await mount.locator(".qitem").first().locator(".qopt").nth(question.a).click();
    counts = await page.evaluate(() => window.__counts);
    expect(counts.answer).toBe(1);
    expect(counts.progress).toBe(1);
    expect(counts.persistence, "no new analytics event was introduced by this task").toBe(0);
  });
});
