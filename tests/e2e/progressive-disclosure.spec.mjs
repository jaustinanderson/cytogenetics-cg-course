import { test, expect, openDisclosure, V2_KEY } from "./fixtures.mjs";

/**
 * Real-browser coverage for the quiz/exercise progressive-disclosure
 * redesign (Issue #11): quiz and exercise widgets (`.quiz`, `.exer`) are now
 * native `<details>`/`<summary>` elements, collapsed by default, instead of
 * always-expanded blocks. This suite is complementary to, not a replacement
 * for, the disclosure-specific keyboard coverage already added to
 * tests/e2e/keyboard-navigation.spec.mjs (Tab-reachability, visible focus,
 * and keyboard-opening the summary) and the axe-core states already added to
 * tests/e2e/accessibility.spec.mjs (a freshly opened, unanswered quiz).
 *
 * Native <details> gives keyboard operability, focus handling, and a real
 * closed/open DOM state for free -- there is no custom ARIA to wire up or
 * verify beyond checking that same `open` property and the visible,
 * accessible-name-contributing state text this file asserts on directly.
 *
 * The collapsed summary's status/score is derived from persisted
 * state.answers/state.exercises records (QL-021's addendum), not assumed
 * "Not started" on every load -- see "persisted state after reload" and
 * "reattempting a persisted item" below, which exist specifically because
 * an earlier version of this file did not catch that regression: it only
 * ever answered a question for the first time in the same session it
 * reloaded from, so the summary and the stored record always happened to
 * agree by coincidence, not because the derivation was verified.
 */

async function readyForMounts(page) {
  await page.waitForFunction(() => window.CytoCourse && document.querySelectorAll(".quiz-mount").length === 17);
}

async function tabUntilFocused(page, target, { max = 100, label = "target" } = {}) {
  const handle = await target.elementHandle();
  if (!handle) throw new Error(`tabUntilFocused: "${label}" did not resolve to an element in the DOM`);
  const already = await page.evaluate((el) => el === document.activeElement, handle);
  if (already) return 0;
  for (let presses = 1; presses <= max; presses += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((el) => el === document.activeElement, handle)) return presses;
  }
  throw new Error(`tabUntilFocused: "${label}" was not reached by natural Tab order within ${max} presses.`);
}

test.describe("progressive disclosure: default state communicates type, title, count, and status", () => {
  test("every quiz and exercise starts collapsed with an informative summary", async ({ page }) => {
    await page.goto("/");

    const quizCount = await page.locator(".quiz").count();
    const exerCount = await page.locator(".exer").count();
    expect(quizCount).toBe(17);
    expect(exerCount).toBe(6);

    // None open by default -- this is the density fix itself, not incidental.
    const openQuizzes = await page.locator(".quiz[open]").count();
    const openExercises = await page.locator(".exer[open]").count();
    expect(openQuizzes, "no quiz should be open on a fresh load").toBe(0);
    expect(openExercises, "no exercise should be open on a fresh load").toBe(0);

    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const summary = mount.locator(".quiz > summary");
    await expect(summary.locator("h3")).toHaveText("Quick check");
    await expect(summary.locator(".qh-meta")).toHaveText("Quiz · 5 questions");
    await expect(summary.locator(".qh-state")).toHaveText("Not started");
    await expect(summary.locator(".qh-score")).toHaveText("0 / 5");

    const exerSummary = page.locator(".exer").first().locator("> summary");
    await expect(exerSummary.locator("h4")).not.toBeEmpty();
    await expect(exerSummary.locator(".eh-meta")).toContainText("Exercise ·");
    await expect(exerSummary.locator(".eh-meta")).toContainText("item");
    await expect(exerSummary.locator(".eh-state")).toHaveText("Not started");
  });
});

test.describe("progressive disclosure: expand and collapse", () => {
  test("clicking the quiz summary expands it, revealing questions; clicking again collapses it", async ({
    page,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const quiz = mount.locator(".quiz");
    const summary = quiz.locator("> summary");
    const firstItem = mount.locator(".qitem").first();

    await expect(quiz).toHaveJSProperty("open", false);
    await expect(firstItem).toBeHidden();

    await summary.click();
    await expect(quiz).toHaveJSProperty("open", true);
    await expect(firstItem).toBeVisible();

    await summary.click();
    await expect(quiz).toHaveJSProperty("open", false);
    await expect(firstItem).toBeHidden();
  });

  test("clicking the exercise summary expands it, revealing the current item; clicking again collapses it", async ({
    page,
  }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const summary = host.locator("> summary");
    const prompt = host.locator(".exer-prompt");

    await expect(host).toHaveJSProperty("open", false);
    await expect(prompt).toBeHidden();

    await summary.click();
    await expect(host).toHaveJSProperty("open", true);
    await expect(prompt).toBeVisible();
    await expect(prompt).not.toBeEmpty();

    await summary.click();
    await expect(host).toHaveJSProperty("open", false);
    await expect(prompt).toBeHidden();
  });

  test("collapsing a quiz after answering keeps the score and status visible on the summary", async ({
    page,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m2"]');
    const quiz = mount.locator(".quiz");
    const summary = quiz.locator("> summary");
    const question = await page.evaluate(() => window.CytoCourse.getQuestions("m2")[0]);

    await summary.click();
    await mount.locator(".qitem").first().locator(".qopt").nth(question.a).click();
    await expect(summary.locator(".qh-score")).toHaveText("1 / 6");
    await expect(summary.locator(".qh-state")).toHaveText("In progress");

    await summary.click();
    await expect(quiz).toHaveJSProperty("open", false);
    // Status must stay legible while collapsed -- this is the "avoid trapping
    // a partially answered activity in an unclear collapsed state" behavior.
    await expect(summary.locator(".qh-score")).toHaveText("1 / 6");
    await expect(summary.locator(".qh-state")).toHaveText("In progress");
    await expect(summary).toHaveAccessibleName(/In progress/);
  });
});

test.describe("progressive disclosure: keyboard close (complementary to keyboard-navigation.spec.mjs)", () => {
  test("Space closes an open quiz disclosure without losing focus", async ({ page }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m3"]');
    const quiz = mount.locator(".quiz");
    const summary = quiz.locator("> summary");

    await tabUntilFocused(page, summary, { max: 100, label: "m3 quiz summary" });
    await page.keyboard.press("Enter");
    await expect(quiz).toHaveJSProperty("open", true);
    await expect(summary).toBeFocused();

    await page.keyboard.press(" ");
    await expect(quiz).toHaveJSProperty("open", false);
    await expect(summary).toBeFocused();
  });
});

test.describe("progressive disclosure: touch activation", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("tapping the quiz summary opens it, and tapping again closes it", async ({ page }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    const quiz = mount.locator(".quiz");
    const summary = quiz.locator("> summary");

    await expect(quiz).toHaveJSProperty("open", false);
    await summary.tap();
    await expect(quiz).toHaveJSProperty("open", true);
    await summary.tap();
    await expect(quiz).toHaveJSProperty("open", false);
  });

  test("tapping the exercise summary opens it and an item can be answered by tap", async ({ page }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    const summary = host.locator("> summary");

    await summary.tap();
    await expect(host).toHaveJSProperty("open", true);
    await host.locator(".eopt").nth(items[0].answer).tap();
    await expect(host.locator(".eh-score")).toHaveText(`1 / ${items.length}`);
  });

  test("the summary row does not cause horizontal page overflow at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    await mount.locator(".quiz").scrollIntoViewIfNeeded();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

test.describe("progressive disclosure: does not count as course progress", () => {
  test("opening and closing quiz/exercise disclosures on a fresh page does not change stored progress or fire progress events", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.__progressEvents = 0;
      window.CytoCourse.on("progress", () => { window.__progressEvents += 1; });
    });

    const before = await page.evaluate(() => JSON.stringify(window.CytoCourse.getProgress()));

    for (const quiz of await page.locator(".quiz").all()) {
      await quiz.locator("> summary").evaluate((el) => { el.click(); el.click(); });
    }
    for (const exer of await page.locator(".exer").all()) {
      await exer.locator("> summary").evaluate((el) => { el.click(); el.click(); });
    }

    const after = await page.evaluate(() => JSON.stringify(window.CytoCourse.getProgress()));
    expect(after).toBe(before);
    expect(await page.evaluate(() => window.__progressEvents)).toBe(0);
  });

  test("loading a page with existing persisted answer/exercise records writes nothing new and fires no progress event", async ({
    page,
  }) => {
    // Seed distinct, checkable sentinel records (fixed ts/n) directly into
    // storage before the page's own script runs. If buildQuiz/buildExercise's
    // summary-seeding logic ever called recordAnswer/recordExercise/
    // saveProgress instead of only reading state, these exact values would
    // change (a new ts, or n incremented) even though nothing was clicked.
    // The exercise record is seeded under "ex7-i1", the item's real stable
    // id (Issue #2) -- not the legacy position-derived "ex7-1" -- so no
    // migration is needed here and this test keeps proving its original
    // claim (nothing written, no event) rather than incidentally covering
    // migration, which has its own dedicated coverage in
    // tests/dom-behavior.mjs.
    const seeded = {
      v: 2,
      modules: {},
      started: 0,
      answers: { "m1-q1": { c: true, n: 1, ts: 12345 } },
      exercises: { "ex7-i1": { c: true, n: 1, ts: 67890 } },
    };
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [V2_KEY, JSON.stringify(seeded)],
    );
    await page.goto("/");
    await readyForMounts(page);

    const progress = await page.evaluate(() => window.CytoCourse.getProgress());
    expect(progress.answers["m1-q1"]).toEqual(seeded.answers["m1-q1"]);
    expect(progress.exercises["ex7-i1"]).toEqual(seeded.exercises["ex7-i1"]);

    // The summary must reflect the seeded record immediately, before any
    // interaction -- this is the regression this correction fixes.
    const mount = page.locator('.quiz-mount[data-quiz="m1"]');
    await expect(mount.locator(".quiz > summary .qh-state")).toHaveText("In progress");
    await expect(mount.locator(".quiz > summary .qh-score")).toHaveText("1 / 5");

    await page.evaluate(() => {
      window.__progressEvents = 0;
      window.CytoCourse.on("progress", () => { window.__progressEvents += 1; });
    });
    for (const quiz of await page.locator(".quiz").all()) {
      await quiz.locator("> summary").evaluate((el) => { el.click(); el.click(); });
    }
    for (const exer of await page.locator(".exer").all()) {
      await exer.locator("> summary").evaluate((el) => { el.click(); el.click(); });
    }
    expect(await page.evaluate(() => window.__progressEvents)).toBe(0);
  });
});

test.describe("progressive disclosure: persisted state after reload", () => {
  test("a partially answered quiz shows 'In progress' and the correct score after reload, not 'Not started'", async ({
    page,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m4"]');
    const quiz = mount.locator(".quiz");
    const questions = await page.evaluate(() => window.CytoCourse.getQuestions("m4"));
    const question = questions[0];

    await openDisclosure(quiz);
    await mount.locator(".qitem").first().locator(".qopt").nth(question.a).click();
    const priorAnswer = await page.evaluate((id) => window.CytoCourse.getProgress().answers[id], question.id);
    expect(priorAnswer && priorAnswer.c).toBe(true);

    await page.reload();
    await readyForMounts(page);

    // The disclosure itself resets to collapsed (it is not progress), but
    // the confirmed regression this corrects: the summary previously always
    // said "Not started" / "0 / N" here, contradicting the persisted record
    // it sits right next to.
    await expect(mount.locator(".quiz")).toHaveJSProperty("open", false);
    await expect(mount.locator(".quiz > summary .qh-state")).toHaveText("In progress");
    await expect(mount.locator(".quiz > summary .qh-score")).toHaveText(`1 / ${questions.length}`);

    const afterReload = await page.evaluate((id) => window.CytoCourse.getProgress().answers[id], question.id);
    expect(afterReload && afterReload.c).toBe(true);
  });

  test("a fully answered quiz shows 'Completed' and the correct score after reload", async ({ page }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m11"]');
    const quiz = mount.locator(".quiz");
    const questions = await page.evaluate(() => window.CytoCourse.getQuestions("m11"));

    await openDisclosure(quiz);
    for (let i = 0; i < questions.length; i += 1) {
      await mount.locator(".qitem").nth(i).locator(".qopt").nth(questions[i].a).click();
    }
    await expect(mount.locator(".quiz > summary .qh-state")).toHaveText("Completed");

    await page.reload();
    await readyForMounts(page);

    await expect(mount.locator(".quiz")).toHaveJSProperty("open", false);
    await expect(mount.locator(".quiz > summary .qh-state")).toHaveText("Completed");
    await expect(mount.locator(".quiz > summary .qh-score")).toHaveText(`${questions.length} / ${questions.length}`);
  });

  test("a partially answered exercise shows 'In progress' and the correct score after reload", async ({
    page,
  }) => {
    await page.goto("/");
    const host = page.locator('.exer[data-exer="ex10"]');
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);

    await openDisclosure(host);
    await host.locator(".eopt").nth(items[0].answer).click();
    await expect(host.locator("> summary .eh-state")).toHaveText("In progress");

    await page.reload();
    await readyForMounts(page);
    const host2 = page.locator('.exer[data-exer="ex10"]');

    await expect(host2).toHaveJSProperty("open", false);
    await expect(host2.locator("> summary .eh-state")).toHaveText("In progress");
    await expect(host2.locator("> summary .eh-score")).toHaveText(`1 / ${items.length}`);
  });

  test("a fully answered exercise shows 'Completed' and the correct score after reload", async ({ page }) => {
    await page.goto("/");
    const host = page.locator('.exer[data-exer="ex14"]');
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);

    await openDisclosure(host);
    for (let i = 0; i < items.length; i += 1) {
      await host.locator(".eopt").nth(items[i].answer).click();
      if (i < items.length - 1) await host.locator(".exer-next").click();
    }
    await expect(host.locator("> summary .eh-state")).toHaveText("Completed");

    await page.reload();
    await readyForMounts(page);
    const host2 = page.locator('.exer[data-exer="ex14"]');

    await expect(host2.locator("> summary .eh-state")).toHaveText("Completed");
    await expect(host2.locator("> summary .eh-score")).toHaveText(`${items.length} / ${items.length}`);
  });
});

test.describe("progressive disclosure: reattempting a previously recorded item", () => {
  test("reattempting a quiz question after reload updates the score to the latest result without double-counting", async ({
    page,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m8"]');
    const quiz = mount.locator(".quiz");
    const questions = await page.evaluate(() => window.CytoCourse.getQuestions("m8"));
    const q0 = questions[0];

    await openDisclosure(quiz);
    await mount.locator(".qitem").first().locator(".qopt").nth(q0.a).click(); // correct
    await expect(mount.locator(".quiz > summary .qh-score")).toHaveText(`1 / ${questions.length}`);

    await page.reload();
    await readyForMounts(page);
    const mount2 = page.locator('.quiz-mount[data-quiz="m8"]');
    await openDisclosure(mount2.locator(".quiz"));

    // Reattempt the SAME question (only possible across a reload -- a
    // locked item can't be clicked twice within one render), this time
    // incorrectly.
    const wrongIndex = q0.o.findIndex((_opt, i) => i !== q0.a);
    await mount2.locator(".qitem").first().locator(".qopt").nth(wrongIndex).click();

    await expect(mount2.locator(".quiz > summary .qh-score")).toHaveText(`0 / ${questions.length}`);
    await expect(mount2.locator(".quiz > summary .qh-state")).toHaveText("In progress");

    // Only one distinct question in this quiz has ever been recorded --
    // the reattempt must not have counted as a second newly-answered item.
    const answers = await page.evaluate(() => window.CytoCourse.getProgress().answers);
    const thisQuizIds = questions.map((q) => q.id);
    const recordedForThisQuiz = Object.keys(answers).filter((id) => thisQuizIds.includes(id));
    expect(recordedForThisQuiz).toHaveLength(1);
    expect(answers[q0.id].c).toBe(false);
    expect(answers[q0.id].n).toBe(2); // attempt count incremented, not a fresh record
  });

  test("reattempting an exercise item after reload updates the score to the latest result without double-counting", async ({
    page,
  }) => {
    await page.goto("/");
    const host = page.locator('.exer[data-exer="ex15"]');
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    const firstId = items[0].id; // the item's own stable id (Issue #2), not a position-derived guess

    await openDisclosure(host);
    const wrongIndex = items[0].options.findIndex((_opt, i) => i !== items[0].answer);
    await host.locator(".eopt").nth(wrongIndex).click(); // incorrect
    await expect(host.locator("> summary .eh-score")).toHaveText(`0 / ${items.length}`);

    await page.reload();
    await readyForMounts(page);
    const host2 = page.locator('.exer[data-exer="ex15"]');
    await openDisclosure(host2);

    // Reattempt item 0, this time correctly.
    await host2.locator(".eopt").nth(items[0].answer).click();
    await expect(host2.locator("> summary .eh-score")).toHaveText(`1 / ${items.length}`);

    const exercises = await page.evaluate(() => window.CytoCourse.getProgress().exercises);
    expect(Object.keys(exercises)).toHaveLength(1);
    expect(exercises[firstId].c).toBe(true);
    expect(exercises[firstId].n).toBe(2);
  });
});

test.describe("progressive disclosure: Reset and print", () => {
  test("Reset clears progress and reloads with every disclosure collapsed and reset to 'Not started'", async ({
    page,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m5"]');
    const quiz = mount.locator(".quiz");
    const questions = await page.evaluate(() => window.CytoCourse.getQuestions("m5"));
    const question = questions[0];

    await openDisclosure(quiz);
    await mount.locator(".qitem").first().locator(".qopt").nth(question.a).click();
    await expect(mount.locator(".quiz > summary .qh-state")).toHaveText("In progress");

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#resetBtn").click();
    await page.waitForLoadState("load");

    await expect(mount.locator(".quiz")).toHaveJSProperty("open", false);
    await expect(mount.locator(".quiz > summary .qh-state")).toHaveText("Not started");
    await expect(mount.locator(".quiz > summary .qh-score")).toHaveText(`0 / ${questions.length}`);
  });

  test("print mode exposes full quiz and exercise content regardless of collapsed state", async ({ page }) => {
    // Real print-media emulation, not just a `display` computed-style check:
    // a closed <details>'s content is suppressed by the browser's native
    // rendering model for the element, not by an author-overridable
    // `display` value on its children -- `getComputedStyle(...).display`
    // reports "block" for that content even while it is genuinely not
    // visible/rendered, so only page.emulateMedia({media:'print'}) plus a
    // real visibility/bounding-box check can actually prove this. Confirmed
    // by first trying the `display:block !important` CSS-only approach here,
    // finding it did not work under real print media, and fixing the product
    // to force the real `open` property instead -- see docs/QUALITY_LOG.md.
    await page.goto("/");
    const quiz = page.locator('.quiz-mount[data-quiz="m6"] .quiz');
    const exer = page.locator(".exer").first();
    const questionCount = await page.evaluate(() => window.CytoCourse.getQuestions("m6").length);
    await expect(quiz).toHaveJSProperty("open", false);
    await expect(exer).toHaveJSProperty("open", false);

    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await page.emulateMedia({ media: "print" });

    await expect(quiz.locator(".quiz-body")).toBeVisible();
    await expect(exer.locator(".exer-body")).toBeVisible();
    // The underlying questions/options are the actual educational content;
    // confirm they are really present and rendered, not just a non-"none"
    // display on an empty wrapper.
    await expect(quiz.locator(".qitem")).toHaveCount(questionCount);
    for (let i = 0; i < questionCount; i += 1) {
      await expect(quiz.locator(".qitem").nth(i)).toBeVisible();
    }
    await expect(exer.locator(".exer-prompt")).toBeVisible();
    await expect(exer.locator(".exer-prompt")).not.toBeEmpty();

    // beforeprint force-opens every <details> for the duration of printing;
    // afterprint must restore the real prior (closed) state -- opening for
    // print is not a genuine user action and must not stick afterward.
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await expect(quiz).toHaveJSProperty("open", false);
    await expect(exer).toHaveJSProperty("open", false);
  });

  test("print mode does not permanently open a disclosure the reader had already opened themselves", async ({
    page,
  }) => {
    await page.goto("/");
    const quiz = page.locator('.quiz-mount[data-quiz="m7"] .quiz');
    await openDisclosure(quiz);
    await expect(quiz).toHaveJSProperty("open", true);

    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await expect(quiz).toHaveJSProperty("open", true);
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));

    // It was genuinely open before printing, so it must still be open after
    // -- afterprint must restore real prior state, not force everything
    // closed indiscriminately.
    await expect(quiz).toHaveJSProperty("open", true);
  });

  test("print mode also exposes a closed case-study reveal card (pre-existing details.card pattern)", async ({
    page,
  }) => {
    const card = page.locator("details.card").first();
    await page.goto("/");
    await expect(card).toHaveJSProperty("open", false);

    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await page.emulateMedia({ media: "print" });
    await expect(card.locator(".card-body")).toBeVisible();

    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await expect(card).toHaveJSProperty("open", false);
  });
});
