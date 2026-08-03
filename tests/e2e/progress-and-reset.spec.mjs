import { test, expect, V1_KEY, V2_KEY, openDisclosure } from "./fixtures.mjs";

test.describe("progress, migration, persistence, and reset", () => {
  test("marking a module complete updates the UI and persists across a real reload", async ({ page }) => {
    await page.goto("/");
    const button = page.locator('.mark-complete[data-mod="m1"]');
    await button.click();

    await expect(button).toHaveClass(/done/);
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");
    await expect(page.locator("#sideNum")).toHaveText("6%");

    await page.reload();

    await expect(page.locator('.mark-complete[data-mod="m1"]')).toHaveClass(/done/);
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), V2_KEY);
    expect(stored.v).toBe(2);
    expect(stored.modules.m1).toBe(true);
  });

  test("legacy v1 progress migrates to the v2 schema on first real-browser load", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [V1_KEY, JSON.stringify({ m1: true, m2: true, m5: true })],
    );
    await page.goto("/");

    await expect(page.locator("#tpLabel")).toHaveText("3 of 17 modules complete");
    const state = await page.evaluate(() => window.CytoCourse.getProgress());
    expect(state.v).toBe(2);
    expect(state.migratedFrom).toBe(1);
    expect(Object.keys(state.modules).sort()).toEqual(["m1", "m2", "m5"]);

    const migratedV2 = await page.evaluate((key) => localStorage.getItem(key), V2_KEY);
    expect(migratedV2).not.toBeNull();
  });

  test("Reset clears both storage keys and reloads with a clean course", async ({ page }) => {
    // Seed via evaluate + a single reload rather than addInitScript: an
    // addInitScript re-runs on every navigation in this page, including the
    // reload Reset itself triggers, which would silently re-seed the very
    // keys Reset just cleared and mask the behavior under test.
    await page.goto("/");
    await page.evaluate(
      ([v1Key, v1Value, v2Key, v2Value]) => {
        window.localStorage.setItem(v1Key, v1Value);
        window.localStorage.setItem(v2Key, v2Value);
      },
      [
        V1_KEY,
        JSON.stringify({ m1: true, m2: true }),
        V2_KEY,
        JSON.stringify({ v: 2, modules: { m1: true, m2: true }, answers: {}, exercises: {} }),
      ],
    );
    await page.reload();
    await expect(page.locator("#tpLabel")).toHaveText("2 of 17 modules complete");

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#resetBtn").click();
    await page.waitForLoadState("load");

    await expect(page.locator("#tpLabel")).toHaveText("0 of 17 modules complete");
    const [v1After, v2After] = await page.evaluate(
      ([k1, k2]) => [localStorage.getItem(k1), localStorage.getItem(k2)],
      [V1_KEY, V2_KEY],
    );
    expect(v1After).toBeNull();
    expect(v2After).toBeNull();
  });

  test("declining the Reset confirmation leaves progress untouched", async ({ page }) => {
    await page.goto("/");
    await page.locator('.mark-complete[data-mod="m1"]').click();
    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.locator("#resetBtn").click();

    await expect(page.locator("#tpLabel")).toHaveText("1 of 17 modules complete");
    const stored = await page.evaluate((key) => localStorage.getItem(key), V2_KEY);
    expect(stored).not.toBeNull();
  });
});

/* ============================ exercise widget re-render (Issue #2 / QL-025) ============================
   Real-browser counterpart to the dependency-free coverage in
   tests/dom-behavior.mjs: importJSON() and the API reset() method used
   to rebuild only .quiz-mount widgets, never .exer ones, so a rendered
   exercise widget silently disagreed with actual progress immediately
   after either call. Fixed by routing every rebuild through one shared
   helper (index.html's rebuildContentWidgets()). */
test.describe("exercise widget re-render after import and reset", () => {
  test("importJSON() with a partially completed exercise restores the rendered score and status, with item 0 available for reattempt", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    await openDisclosure(host);

    const result = await page.evaluate(
      ([itemIds]) => window.CytoCourse.importJSON({
        v: 2, modules: {}, answers: {},
        exercises: { [itemIds[0]]: { c: true, n: 1, ts: 1 }, [itemIds[1]]: { c: false, n: 1, ts: 1 } },
        started: 0,
      }),
      [[items[0].id, items[1].id]],
    );
    expect(result.ok).toBe(true);

    await expect(host.locator(".eh-score")).toHaveText(`1 / ${items.length}`);
    await expect(host.locator(".eh-state")).toHaveText("In progress");
    // Always starts at item 0 on a rebuild, matching the existing,
    // shipped reattempt-after-reload contract (see
    // tests/e2e/progressive-disclosure.spec.mjs's "reattempting an
    // exercise item after reload" test) -- even though item 0 already
    // has a persisted record.
    await expect(host.locator(".exer-prompt")).toHaveText(items[0].prompt);
    for (const opt of await host.locator(".eopt").all()) {
      await expect(opt).toBeEnabled();
    }
    await expect(host.locator(".exer-fb")).not.toHaveClass(/show/);
    await expect(host.locator(".exer-next")).toBeDisabled();

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("importJSON() with a fully completed exercise shows its completed state accurately in the summary", async ({ page, consoleIssues }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    await openDisclosure(host);

    const result = await page.evaluate(
      ([itemIds]) => window.CytoCourse.importJSON({
        v: 2, modules: {}, answers: {},
        exercises: Object.fromEntries(itemIds.map((id) => [id, { c: true, n: 1, ts: 1 }])),
        started: 0,
      }),
      [items.map((it) => it.id)],
    );
    expect(result.ok).toBe(true);

    await expect(host.locator(".eh-score")).toHaveText(`${items.length} / ${items.length}`);
    await expect(host.locator(".eh-state")).toHaveText("Completed");
    // Always starts at item 0, matching the existing reattempt-after-
    // reload contract, even for a fully completed exercise.
    await expect(host.locator(".exer-prompt")).toHaveText(items[0].prompt);
    await expect(host.locator(".exer-next")).toHaveText("Next");
    for (const opt of await host.locator(".eopt").all()) {
      await expect(opt).toBeEnabled();
    }

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("answering an exercise live, then importing blank progress, removes every stale answered/disabled/feedback state", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    await openDisclosure(host);

    await host.locator(".eopt").nth(items[0].answer).click();
    await expect(host.locator(".eh-score")).toHaveText(`1 / ${items.length}`);
    for (const opt of await host.locator(".eopt").all()) {
      await expect(opt).toBeDisabled();
    }

    const result = await page.evaluate(() =>
      window.CytoCourse.importJSON({ v: 2, modules: {}, answers: {}, exercises: {}, started: 0 })
    );
    expect(result.ok).toBe(true);

    await expect(host.locator(".eh-score")).toHaveText(`0 / ${items.length}`);
    await expect(host.locator(".eh-state")).toHaveText("Not started");
    await expect(host.locator(".exer-prompt")).toHaveText(items[0].prompt);
    for (const opt of await host.locator(".eopt").all()) {
      await expect(opt).toBeEnabled();
    }
    await expect(host.locator(".exer-fb")).not.toHaveClass(/show/);
    await expect(host.locator(".exer-next")).toBeDisabled();

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("the confirmed Reset path clears exercise progress, both storage keys, and the rendered exercise widget", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    await openDisclosure(host);

    await host.locator(".eopt").nth(items[0].answer).click();
    await expect(host.locator(".eh-score")).toHaveText(`1 / ${items.length}`);

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#resetBtn").click();
    await page.waitForLoadState("load");

    const [v1After, v2After] = await page.evaluate(
      ([k1, k2]) => [localStorage.getItem(k1), localStorage.getItem(k2)],
      [V1_KEY, V2_KEY],
    );
    expect(v1After).toBeNull();
    expect(v2After).toBeNull();

    const rebuiltHost = page.locator(".exer").first();
    await openDisclosure(rebuiltHost);
    await expect(rebuiltHost.locator(".eh-score")).toHaveText(`0 / ${items.length}`);
    await expect(rebuiltHost.locator(".eh-state")).toHaveText("Not started");
    for (const opt of await rebuiltHost.locator(".eopt").all()) {
      await expect(opt).toBeEnabled();
    }

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  /* --- independent review found a coverage gap: the UI Reset test above
     goes through #resetBtn, which ends in a real location.reload() -- a
     full re-execution of the page that would rebuild every widget from
     scratch (via init()) even if the PUBLIC API reset() method itself
     never rebuilt exercise widgets at all. That path therefore cannot
     prove reset() itself is fixed; it can only prove the page looks
     right AFTER a reload masks whatever reset() actually did. This test
     calls window.CytoCourse.reset() directly -- no #resetBtn click, no
     location.reload(), no navigation -- and checks the rendered DOM
     immediately, which is the only way to prove reset() itself, not a
     subsequent reload, is what rebuilds the exercise widget. */
  test("window.CytoCourse.reset() called directly (no reload, no navigation) immediately rebuilds the exercise widget", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    await openDisclosure(host);

    await host.locator(".eopt").nth(items[0].answer).click();
    await expect(host.locator(".eh-score")).toHaveText(`1 / ${items.length}`);
    await expect(host.locator(".eh-state")).toHaveText("In progress");
    for (const opt of await host.locator(".eopt").all()) {
      await expect(opt).toBeDisabled();
    }
    await expect(host.locator(".exer-fb")).toHaveClass(/show/);

    // A sentinel that only survives if window itself was never replaced
    // -- i.e. no navigation/reload happened. Installed, then counters for
    // exactly the three documented progress-related events, both BEFORE
    // reset() runs so the answer click above cannot be miscounted as
    // reset()'s own activity.
    await page.evaluate(() => {
      window.__noReloadSentinel = "still-here";
      window.__events = { progress: 0, answer: 0, exercise: 0 };
      window.CytoCourse.on("progress", () => { window.__events.progress += 1; });
      window.CytoCourse.on("answer", () => { window.__events.answer += 1; });
      window.CytoCourse.on("exercise", () => { window.__events.exercise += 1; });
    });

    const result = await page.evaluate(() => window.CytoCourse.reset());
    expect(result).toEqual({ ok: true });

    // Proof this ran without a reload/navigation: a real reload replaces
    // `window` entirely, which would wipe this property. Checked
    // immediately, with no page.reload()/page.goto() call anywhere in
    // this test.
    const sentinelSurvived = await page.evaluate(() => window.__noReloadSentinel);
    expect(sentinelSurvived).toBe("still-here");

    const events = await page.evaluate(() => window.__events);
    expect(events).toEqual({ progress: 1, answer: 0, exercise: 0 });

    // Rendered exercise widget, checked immediately -- no reload in
    // between reset() and these assertions.
    await expect(host.locator(".eh-score")).toHaveText(`0 / ${items.length}`);
    await expect(host.locator(".eh-state")).toHaveText("Not started");
    await expect(host.locator(".exer-prompt")).toHaveText(items[0].prompt);
    for (const opt of await host.locator(".eopt").all()) {
      await expect(opt).toBeEnabled();
    }
    await expect(host.locator(".exer-fb")).not.toHaveClass(/show/);
    await expect(host.locator(".exer-next")).toBeDisabled();

    const progress = await page.evaluate(() => window.CytoCourse.getProgress());
    expect(progress.modules).toEqual({});
    expect(progress.answers).toEqual({});
    expect(progress.exercises).toEqual({});

    const stats = await page.evaluate(() => window.CytoCourse.getStats());
    expect(stats.modulesComplete).toBe(0);
    expect(stats.questionsAnswered).toBe(0);
    expect(stats.questionsCorrect).toBe(0);
    expect(stats.overallPct).toBeNull();

    const [v1After, v2After] = await page.evaluate(
      ([k1, k2]) => [localStorage.getItem(k1), localStorage.getItem(k2)],
      [V1_KEY, V2_KEY],
    );
    expect(v1After).toBeNull(); // legacy key: fully removed
    const v2Parsed = JSON.parse(v2After); // current key: present, but blank
    expect(v2Parsed.modules).toEqual({});
    expect(v2Parsed.answers).toEqual({});
    expect(v2Parsed.exercises).toEqual({});

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("reattempting an already-recorded exercise item after an import-driven rebuild replaces its outcome without double-counting", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const host = page.locator(".exer").first();
    const key = await host.getAttribute("data-exer");
    const items = await page.evaluate((k) => window.CytoCourse.getExercises()[k].items, key);
    await openDisclosure(host);

    // item 1 pre-recorded INCORRECT via import; item 0 left unanswered.
    const result = await page.evaluate(
      ([id1]) => window.CytoCourse.importJSON({
        v: 2, modules: {}, answers: {}, exercises: { [id1]: { c: false, n: 1, ts: 1 } }, started: 0,
      }),
      [items[1].id],
    );
    expect(result.ok).toBe(true);
    await expect(host.locator(".exer-prompt")).toHaveText(items[0].prompt);

    await host.locator(".eopt").nth(items[0].answer).click();
    await host.locator(".exer-next").click();
    await expect(host.locator(".exer-prompt")).toHaveText(items[1].prompt);
    for (const opt of await host.locator(".eopt").all()) {
      await expect(opt).toBeEnabled();
    }

    await host.locator(".eopt").nth(items[1].answer).click(); // reattempt, this time correctly
    await expect(host.locator(".eh-score")).toHaveText(`2 / ${items.length}`);

    const progress = await page.evaluate(() => window.CytoCourse.getProgress().exercises);
    expect(Object.keys(progress)).toHaveLength(2);
    expect(progress[items[1].id].c).toBe(true);
    expect(progress[items[1].id].n).toBe(2);

    await page.waitForLoadState("networkidle");
    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });
});
