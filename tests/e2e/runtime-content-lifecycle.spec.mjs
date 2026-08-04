import { test, expect, V1_KEY, V2_KEY, openDisclosure } from "./fixtures.mjs";

/* ============================ runtime-injected content lifecycle (Issue #2) ============================
   Real-browser counterpart to the dependency-free coverage in
   tests/dom-behavior.mjs. Definitions added via addQuestions() are
   session-only (never persisted); a valid question's ANSWER OUTCOME,
   once recorded, is durable in v2 progress by stable id, exactly like
   an authored question's outcome -- a deliberate split lifecycle. See
   index.html's RUNTIME-INJECTED CONTENT comment and
   docs/ARCHITECTURE.md "Runtime-injected content lifecycle" for the
   full policy. */

test.describe("runtime-injected content lifecycle", () => {
  test("getRuntimeContentPolicy() returns the exact documented shape", async ({ page }) => {
    await page.goto("/");
    const policy = await page.evaluate(() => window.CytoCourse.getRuntimeContentPolicy());
    expect(Object.keys(policy).sort()).toEqual([
      "callerOwnsIdStability", "contentPacksSupported", "definitionsSessionOnly",
      "outcomeSchemaVersion", "outcomesPersisted", "policyModel", "reinjectionRevivesOutcome",
    ]);
    expect(policy).toEqual({
      policyModel: "runtime-content-lifecycle-v1",
      definitionsSessionOnly: true,
      outcomesPersisted: true,
      outcomeSchemaVersion: 2,
      reinjectionRevivesOutcome: true,
      callerOwnsIdStability: true,
      contentPacksSupported: false,
    });
  });

  test("mutating the caller's source object and options array after a successful addQuestions() call cannot change the live, rendered, or scored question", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m2"]');

    const result = await page.evaluate(() => {
      const source = {
        id: "e2e-lifecycle-mutate-1", d: "operations", t: "lab-ops", x: 1,
        q: "Original prompt", o: ["Original A", "Original B"], a: 0, why: "Original rationale",
      };
      const r = window.CytoCourse.addQuestions("m2", [source]);
      // Mutate the caller's own object graph AFTER the call returns.
      source.q = "MUTATED PROMPT";
      source.o[0] = "MUTATED OPTION";
      source.a = 1;
      source.why = "MUTATED RATIONALE";
      return r;
    });
    expect(result.ok).toBe(true);
    // addQuestions() rebuilds the quiz widget (a fresh, closed <details>,
    // per its established behavior), so the disclosure must be opened
    // AFTER injecting, not before.
    await openDisclosure(mount.locator(".quiz"));

    const rendered = mount.locator(".qitem").last();
    await expect(rendered.locator(".qtext")).toHaveText("Original prompt");
    await expect(rendered.locator(".qopt").first()).toContainText("Original A");

    // Answer the ORIGINAL correct option (index 0) -- if the live `a`
    // had actually been flipped to 1 by the mutation, this would score
    // incorrect.
    await rendered.locator(".qopt").first().click();
    const record = await page.evaluate(() => window.CytoCourse.getProgress().answers["e2e-lifecycle-mutate-1"]);
    expect(record.c).toBe(true);

    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("addQuestions() rejects an accessor-property question without ever invoking the getter, adding nothing and rebuilding nothing", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m2"]');
    await openDisclosure(mount.locator(".quiz"));
    const beforeCount = await mount.locator(".qitem").count();

    const outcome = await page.evaluate(() => {
      let getterInvoked = false;
      const q = { d: "operations", t: "lab-ops", x: 1, q: "q", o: ["a", "b"], a: 0, why: "w" };
      Object.defineProperty(q, "id", { get() { getterInvoked = true; return "accessor-1"; }, enumerable: true });
      const result = window.CytoCourse.addQuestions("m2", [q]);
      return { result, getterInvoked };
    });
    expect(outcome.result.ok).toBe(false);
    expect(outcome.getterInvoked, "the adversarial getter must never be invoked").toBe(false);
    await expect(mount.locator(".qitem")).toHaveCount(beforeCount);

    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("addQuestions() rejects an explicit own w:undefined atomically without throwing (QL-029), and the page remains fully operational afterward", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m2"]');
    const beforeCount = await mount.locator(".qitem").count();

    // The exact reported counterexample: an otherwise-valid question
    // with an explicitly present `w: undefined` own property. Before the
    // fix, this reached `Object.keys(undefined)` inside
    // validateRuntimeQuestion() and threw a TypeError out of the public
    // addQuestions() API.
    const outcome = await page.evaluate(() => {
      try {
        const result = window.CytoCourse.addQuestions("m2", [{
          id: "e2e-w-undefined-1", d: "operations", t: "lab-ops", x: 1,
          q: "q", o: ["a", "b"], a: 0, why: "w",
          w: undefined,
        }]);
        return { threw: false, result };
      } catch (e) {
        return { threw: true, name: e.constructor.name, message: e.message };
      }
    });
    expect(outcome.threw, `addQuestions() must not throw; got ${JSON.stringify(outcome)}`).toBe(false);
    expect(outcome.result.ok).toBe(false);
    expect(outcome.result.added).toBe(0);
    await expect(mount.locator(".qitem")).toHaveCount(beforeCount);

    // Recovery proof: the page itself remains fully operational after
    // the rejected call -- inject and answer a genuinely valid question
    // in the SAME page context, with no reload.
    const validResult = await page.evaluate(() => window.CytoCourse.addQuestions("m2", [{
      id: "e2e-w-undefined-recovery-1", d: "operations", t: "lab-ops", x: 1,
      q: "Recovery question?", o: ["Yes", "No"], a: 0, why: "Because.",
    }]));
    expect(validResult.ok).toBe(true);
    await openDisclosure(mount.locator(".quiz"));
    const rendered = mount.locator(".qitem").last();
    await expect(rendered.locator(".qtext")).toHaveText("Recovery question?");
    await rendered.locator(".qopt").first().click();
    const record = await page.evaluate(() => window.CytoCourse.getProgress().answers["e2e-w-undefined-recovery-1"]);
    expect(record.c).toBe(true);

    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("reload without reinjection restores only authored questions, and the injected definition never appears in localStorage or exportJSON()", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const authoredCount = await page.evaluate(() => window.CytoCourse.getStats().questionsTotal);

    const mount = page.locator('.quiz-mount[data-quiz="m2"]');
    await page.evaluate(() => window.CytoCourse.addQuestions("m2", [{
      id: "e2e-lifecycle-storage-1", d: "operations", t: "lab-ops", x: 1,
      q: "SENTINEL PROMPT TEXT", o: ["SENTINEL OPTION A", "SENTINEL OPTION B"], a: 0, why: "SENTINEL RATIONALE TEXT",
    }]));
    // addQuestions() rebuilds the quiz widget (closed by default), so open
    // AFTER injecting.
    await openDisclosure(mount.locator(".quiz"));
    await mount.locator(".qitem").last().locator(".qopt").first().click();

    const [rawStorage, exported] = await page.evaluate(
      (key) => [localStorage.getItem(key), window.CytoCourse.exportJSON()],
      V2_KEY,
    );
    for (const needle of ["SENTINEL PROMPT TEXT", "SENTINEL OPTION A", "SENTINEL OPTION B", "SENTINEL RATIONALE TEXT"]) {
      expect(rawStorage.includes(needle), `localStorage must not contain "${needle}"`).toBe(false);
      expect(exported.includes(needle), `exportJSON() must not contain "${needle}"`).toBe(false);
    }
    expect(exported.includes("e2e-lifecycle-storage-1"), "exportJSON() DOES include the outcome, keyed by id").toBe(true);

    await page.reload();
    const afterReload = await page.evaluate(() => ({
      total: window.CytoCourse.getStats().questionsTotal,
      hasInjected: window.CytoCourse.getQuestions("m2").some((q) => q.id === "e2e-lifecycle-storage-1"),
    }));
    expect(afterReload.total).toBe(authoredCount);
    expect(afterReload.hasInjected).toBe(false);

    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("a preserved outcome remains inert after reload, contributes nothing to analytics, then revives on reinjection and a reattempt updates the same record without duplicating it", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const definitionScript = () => window.CytoCourse.addQuestions("m2", [{
      id: "e2e-lifecycle-revive-1", d: "operations", t: "lab-ops", x: 1,
      q: "Revive question?", o: ["Yes", "No"], a: 0, why: "Because.",
    }]);

    const mount = page.locator('.quiz-mount[data-quiz="m2"]');
    await page.evaluate(definitionScript);
    await openDisclosure(mount.locator(".quiz"));
    await mount.locator(".qitem").last().locator(".qopt").first().click();
    let record = await page.evaluate(() => window.CytoCourse.getProgress().answers["e2e-lifecycle-revive-1"]);
    expect(record.n).toBe(1);
    expect(record.c).toBe(true);

    // Reload WITHOUT reinjecting -- stale and inert.
    await page.reload();
    let stats = await page.evaluate(() => window.CytoCourse.getStats());
    expect(stats.questionsAnswered).toBe(0);
    const unmastered = await page.evaluate(() => window.CytoCourse.getUnmastered());
    expect(unmastered.some((e) => e.id === "e2e-lifecycle-revive-1")).toBe(false);

    // Reinject the exact same semantic question/id -- revives the outcome.
    await page.evaluate(definitionScript);
    stats = await page.evaluate(() => window.CytoCourse.getStats());
    expect(stats.questionsAnswered).toBe(1);
    record = await page.evaluate(() => window.CytoCourse.getProgress().answers["e2e-lifecycle-revive-1"]);
    expect(record.n, "the revived record is the same preserved one, not a fresh record").toBe(1);

    // Reattempt (opposite answer) -- only reachable across a reload.
    await page.reload();
    await page.evaluate(definitionScript);
    const reloadedMount = page.locator('.quiz-mount[data-quiz="m2"]');
    await openDisclosure(reloadedMount.locator(".quiz"));
    await reloadedMount.locator(".qitem").last().locator(".qopt").nth(1).click();

    record = await page.evaluate(() => window.CytoCourse.getProgress().answers["e2e-lifecycle-revive-1"]);
    expect(record.n, "the SAME record's attempt count grows").toBe(2);
    expect(record.c).toBe(false);
    const allAnswerIds = await page.evaluate(() => Object.keys(window.CytoCourse.getProgress().answers));
    expect(allAnswerIds, "still exactly one record for this id -- no duplicate").toEqual(["e2e-lifecycle-revive-1"]);

    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });

  test("Reset deletes an injected question's durable outcome from both storage keys, and it remains absent after reload", async ({
    page,
    consoleIssues,
  }) => {
    await page.goto("/");
    const mount = page.locator('.quiz-mount[data-quiz="m2"]');
    await page.evaluate(() => window.CytoCourse.addQuestions("m2", [{
      id: "e2e-lifecycle-reset-1", d: "operations", t: "lab-ops", x: 1,
      q: "Reset question?", o: ["Yes", "No"], a: 0, why: "Because.",
    }]));
    await openDisclosure(mount.locator(".quiz"));
    await mount.locator(".qitem").last().locator(".qopt").first().click();
    const recordedBefore = await page.evaluate(() => window.CytoCourse.getProgress().answers["e2e-lifecycle-reset-1"]);
    expect(recordedBefore).toBeTruthy();

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#resetBtn").click();
    await page.waitForLoadState("load");

    // The UI #resetBtn path clears PKEY by REMOVING it (not by writing a
    // blank state -- that is the API reset() path's own mechanism; see
    // performReset()'s own comment in index.html), so v2After is
    // genuinely null here, not a blank JSON object.
    const [v1After, v2After] = await page.evaluate(
      ([k1, k2]) => [localStorage.getItem(k1), localStorage.getItem(k2)],
      [V1_KEY, V2_KEY],
    );
    expect(v1After).toBeNull();
    expect(v2After).toBeNull();
    const liveAnswers = await page.evaluate(() => window.CytoCourse.getProgress().answers);
    expect(liveAnswers["e2e-lifecycle-reset-1"]).toBeUndefined();

    expect(consoleIssues, JSON.stringify(consoleIssues, null, 2)).toEqual([]);
  });
});
