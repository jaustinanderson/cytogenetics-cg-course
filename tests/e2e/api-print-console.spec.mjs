import { test, expect } from "./fixtures.mjs";

test.describe("public API, import/export, and print", () => {
  test("the public API exposes its documented surface and read methods return copies", async ({ page }) => {
    await page.goto("/");
    const surface = await page.evaluate(() => {
      const api = window.CytoCourse;
      const methods = [
        "getModules", "getQuestions", "getExercises", "getFlashcards", "getImages",
        "getProgress", "getStats", "getWeakAreas", "getUnmastered", "exportJSON",
        "importJSON", "addQuestions", "markModule", "reset", "on", "off",
      ];
      return {
        version: api.version,
        schema: api.schema,
        methodTypes: methods.map((name) => typeof api[name]),
      };
    });
    expect(surface.version).toBe("1.1.1");
    expect(surface.schema).toBe(2);
    expect(surface.methodTypes).toEqual(surface.methodTypes.map(() => "function"));

    const mutationIsIsolated = await page.evaluate(() => {
      const questions = window.CytoCourse.getQuestions("m1");
      questions[0].q = "MUTATED";
      questions.length = 0;
      const fresh = window.CytoCourse.getQuestions("m1");
      return fresh[0].q !== "MUTATED" && fresh.length === 5;
    });
    expect(mutationIsIsolated).toBe(true);
  });

  test("API events fire for real answer, exercise, progress, and content actions", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.__events = { answer: [], exercise: [], progress: 0, content: [] };
      window.CytoCourse.on("answer", (p) => window.__events.answer.push(p));
      window.CytoCourse.on("exercise", (p) => window.__events.exercise.push(p));
      window.CytoCourse.on("progress", () => { window.__events.progress += 1; });
      window.CytoCourse.on("content", (p) => window.__events.content.push(p));
    });

    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m1")[0]);
    await page
      .locator('.quiz-mount[data-quiz="m1"]')
      .locator(".qitem")
      .first()
      .locator(".qopt")
      .nth(question.a)
      .click();

    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    await host.locator(".eopt").nth(items[0].answer).click();

    await page.evaluate(() => {
      window.CytoCourse.addQuestions("m2", [{
        id: "e2e-content-1", d: "molecular", t: "fish", x: 2,
        q: "Injected during Playwright smoke run?", o: ["A", "B"], a: 1, why: "Test rationale",
      }]);
    });

    const events = await page.evaluate(() => window.__events);
    expect(events.answer).toHaveLength(1);
    expect(events.answer[0].correct).toBe(true);
    expect(events.exercise).toHaveLength(1);
    expect(events.content).toHaveLength(1);
    expect(events.content[0].added).toBe(1);
    expect(events.progress).toBeGreaterThanOrEqual(2);
  });

  test("exportJSON/importJSON round-trips progress between two independent browser contexts", async ({
    page,
    browser,
  }) => {
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m9")[0]);
    await page
      .locator('.quiz-mount[data-quiz="m9"]')
      .locator(".qitem")
      .first()
      .locator(".qopt")
      .nth(question.a)
      .click();

    const exported = await page.evaluate(() => window.CytoCourse.exportJSON());
    const parsed = JSON.parse(exported);
    expect(parsed.state.v).toBe(2);

    // A new page in the SAME BrowserContext would share localStorage with
    // `page` above (storage is partitioned per context+origin, not per
    // page), so it would already carry this progress before import ever
    // runs and the assertions below would pass even if importJSON did
    // nothing. Use a genuinely separate context so the destination starts
    // from proven-clean storage.
    const freshContext = await browser.newContext();
    const fresh = await freshContext.newPage();
    await fresh.goto("/");

    await expect(fresh.locator("#tpLabel")).toHaveText("0 of 17 modules complete");
    const priorAnswer = await fresh.evaluate(
      (id) => window.CytoCourse.getProgress().answers[id],
      question.id,
    );
    expect(priorAnswer).toBeUndefined();

    const result = await fresh.evaluate((json) => window.CytoCourse.importJSON(json), exported);
    expect(result.ok).toBe(true);
    await expect(fresh.locator("#tpLabel")).toHaveText("1 of 17 modules complete");
    const restoredCorrect = await fresh.evaluate(
      (id) => window.CytoCourse.getProgress().answers[id]?.c,
      question.id,
    );
    expect(restoredCorrect).toBe(true);
    await freshContext.close();
  });

  test("the print control invokes window.print and beforeprint/afterprint toggle print mode", async ({ page }) => {
    await page.addInitScript(() => {
      window.__printCalls = 0;
      window.print = () => { window.__printCalls += 1; };
    });
    await page.goto("/");

    await page.locator("#printBtn").click();
    expect(await page.evaluate(() => window.__printCalls)).toBe(1);

    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await expect(page.locator("body")).toHaveClass(/printmode/);
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await expect(page.locator("body")).not.toHaveClass(/printmode/);
  });
});
