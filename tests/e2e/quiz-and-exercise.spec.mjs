import { test, expect, openDisclosure } from "./fixtures.mjs";

test.describe("quiz and exercise interaction", () => {
  test("a correct quiz answer scores, locks the item, and shows the rationale", async ({ page }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m1")[0]);
    await openDisclosure(mount.locator(".quiz"));
    const item = mount.locator(".qitem").first();
    const options = item.locator(".qopt");

    await options.nth(question.a).click();

    await expect(options.nth(question.a)).toHaveClass(/correct/);
    await expect(mount.locator(".qh-score")).toHaveText("1 / 5");
    const feedback = item.locator(".qfb");
    await expect(feedback).toHaveClass(/show/);
    await expect(feedback).toHaveClass(/good/);
    await expect(feedback.locator(".fb-h")).toHaveText("Correct");
    await expect(feedback.locator(".fb-d")).not.toBeEmpty();
    for (let i = 0; i < (await options.count()); i += 1) {
      await expect(options.nth(i)).toBeDisabled();
    }
  });

  test("an incorrect quiz answer marks both choices and explains the distractor", async ({ page }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m2"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m2")[0]);
    const wrongIndex = question.a === 0 ? 1 : 0;
    await openDisclosure(mount.locator(".quiz"));
    const item = mount.locator(".qitem").first();
    const options = item.locator(".qopt");

    await options.nth(wrongIndex).click();

    await expect(options.nth(wrongIndex)).toHaveClass(/wrong/);
    await expect(options.nth(question.a)).toHaveClass(/correct/);
    await expect(mount.locator(".qh-score")).toHaveText("0 / 6");
    const feedback = item.locator(".qfb");
    await expect(feedback).toHaveClass(/bad/);
    await expect(feedback.locator(".fb-h")).toHaveText("Not quite");
  });

  test("a quiz item cannot be answered twice", async ({ page }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m1")[0]);
    await openDisclosure(mount.locator(".quiz"));
    const item = mount.locator(".qitem").first();
    const options = item.locator(".qopt");

    await options.nth(question.a).click();
    await expect(mount.locator(".qh-score")).toHaveText("1 / 5");
    // Locked options are disabled; force the click to prove it has no effect.
    await options.nth((question.a + 1) % (await options.count())).click({ force: true });
    await expect(mount.locator(".qh-score")).toHaveText("1 / 5");

    const answered = await page.evaluate(() => Object.keys(window.CytoCourse.getProgress().answers).length);
    expect(answered).toBe(1);
  });

  test("an exercise scores, reveals feedback, and advances", async ({ page }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    await openDisclosure(host);

    await expect(host.locator(".exer-prompt")).toHaveText(items[0].prompt);
    await expect(host.locator(".exer-next")).toBeDisabled();

    await host.locator(".eopt").nth(items[0].answer).click();
    await expect(host.locator(".eh-score")).toHaveText(`1 / ${items.length}`);
    const feedback = host.locator(".exer-fb");
    await expect(feedback).toHaveClass(/show/);
    await expect(feedback).toHaveClass(/good/);
    await expect(feedback).toHaveText(items[0].fb);
    await expect(host.locator(".exer-next")).toBeEnabled();

    await host.locator(".exer-next").click();
    await expect(host.locator(".exer-prompt")).toHaveText(items[1].prompt);
  });

  test("an exercise can be completed to the end", async ({ page }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    await openDisclosure(host);

    for (let index = 0; index < items.length; index += 1) {
      await host.locator(".eopt").nth(items[index].answer).click();
      await host.locator(".exer-next").click();
    }

    await expect(host.locator(".eh-score")).toHaveText(`${items.length} / ${items.length}`);
    await expect(host.locator(".exer-prog")).toContainText("Completed");
    await expect(host.locator(".exer-next")).toBeDisabled();

    const recorded = await page.evaluate(() => Object.keys(window.CytoCourse.getProgress().exercises).length);
    expect(recorded).toBe(items.length);
  });
});
