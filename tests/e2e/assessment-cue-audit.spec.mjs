import { test, expect } from "./fixtures.mjs";
import {
  computeCueMetrics,
  historicalLength,
  canonicalLength,
  selectPilotBatch,
  ORIGINAL_BASELINE,
  flattenQuestionBank,
} from "../../scripts/assessment-cue-audit.mjs";

/**
 * Real-browser cross-check for the assessment-cue audit (Phase 0 step 1-3,
 * docs/ASSESSMENT_VALIDITY.md; QL-033, docs/QUALITY_LOG.md). Proves the
 * dependency-free audit (tests/assessment-cue-audit.mjs, which boots
 * index.html's inline script in a Node `vm` sandbox) is not measuring a
 * subtly different world from what a real browser's
 * window.CytoCourse.getQuestions() actually returns -- the whole point of
 * this cross-check is that BOTH paths feed the exact same shared
 * scripts/assessment-cue-audit.mjs functions, so any divergence in their
 * result would mean the vm-sandbox reproduction is not faithful, not that
 * the measurement logic itself differs.
 *
 * Scope discipline: read-only. This spec must never mutate progress,
 * storage, or question content -- it only reads window.CytoCourse.getQuestions()
 * and window.CytoCourse.getQuestionGovernance().
 */

test.describe("assessment-cue audit — real-browser cross-check", () => {
  test("window.CytoCourse.getQuestions() exposes the same 153 authored ids the dependency-free audit measures", async ({ page, consoleIssues }) => {
    await page.goto("/");
    const browserQuestionsByModule = await page.evaluate(() => window.CytoCourse.getQuestions());
    const browserQuestions = flattenQuestionBank(browserQuestionsByModule);

    expect(browserQuestions.length).toBe(153);
    const idSet = new Set(browserQuestions.map((q) => q.id));
    expect(idSet.size).toBe(153);

    expect(consoleIssues).toEqual([]);
  });

  test("the browser-observed bank produces the exact same historical-metric counts as the dependency-free audit's frozen baseline", async ({ page, consoleIssues }) => {
    await page.goto("/");
    const browserQuestionsByModule = await page.evaluate(() => window.CytoCourse.getQuestions());
    const browserQuestions = flattenQuestionBank(browserQuestionsByModule);

    const metrics = computeCueMetrics(browserQuestions, { lengthFn: historicalLength });
    expect(metrics.total).toBe(ORIGINAL_BASELINE.totalAuthoredQuestions);
    expect(metrics.uniquelyLongestCorrect).toBe(ORIGINAL_BASELINE.uniquelyLongestCorrect);
    expect(metrics.longestOrTiedCorrect).toBe(ORIGINAL_BASELINE.longestOrTiedCorrect);
    const positionCounts = Object.fromEntries(metrics.byOptionCount[0].positionCounts.map((c, i) => [String(i), c]));
    expect(positionCounts).toEqual(ORIGINAL_BASELINE.positionCounts);

    expect(consoleIssues).toEqual([]);
  });

  test("the browser-observed bank's canonical-metric result matches the vm-sandbox-booted dependency-free audit's canonical-metric result exactly", async ({ page, consoleIssues }) => {
    await page.goto("/");
    const browserQuestionsByModule = await page.evaluate(() => window.CytoCourse.getQuestions());
    const browserQuestions = flattenQuestionBank(browserQuestionsByModule);
    const browserCanonical = computeCueMetrics(browserQuestions, { lengthFn: canonicalLength });

    // Independently re-derive the same measurement via the OTHER boot path
    // (bootLiveCourseApi()'s Node `vm` sandbox, the same technique
    // tests/assessment-cue-audit.mjs uses) against the same checked-out
    // index.html -- proving the real browser and the dependency-free
    // sandbox agree, not merely that each is internally self-consistent.
    const { bootLiveCourseApi } = await import("../../scripts/assessment-cue-audit.mjs");
    const vmApi = await bootLiveCourseApi();
    const vmQuestions = flattenQuestionBank(vmApi.getQuestions());
    const vmCanonical = computeCueMetrics(vmQuestions, { lengthFn: canonicalLength });

    expect(browserCanonical.uniquelyLongestCorrect).toBe(vmCanonical.uniquelyLongestCorrect);
    expect(browserCanonical.longestOrTiedCorrect).toBe(vmCanonical.longestOrTiedCorrect);
    expect(browserCanonical.ids.sort()).toEqual(vmCanonical.ids.sort());
    expect(browserCanonical.uniquelyLongestCorrect).toBe(114);
    expect(browserCanonical.longestOrTiedCorrect).toBe(133);

    expect(consoleIssues).toEqual([]);
  });

  test("the browser-observed bank yields the identical deterministic pilot batch the dependency-free audit selects", async ({ page, consoleIssues }) => {
    await page.goto("/");
    const browserQuestionsByModule = await page.evaluate(() => window.CytoCourse.getQuestions());
    const browserQuestions = flattenQuestionBank(browserQuestionsByModule);

    const pilot = selectPilotBatch(browserQuestions);
    expect(pilot.ids).toEqual([
      "final-q33", "m1-q1", "m1-q2", "m1-q3", "m12-q6", "m15-q1", "m16-q1",
      "m2-q1", "m2-q3", "m4-q1", "m6-q1", "m6-q4", "m7-q2",
    ]);

    expect(consoleIssues).toEqual([]);
  });

  test("reading getQuestions() and getQuestionGovernance() for the audit does not change progress, storage, or emit any event, and leaves all 153 questions Draft", async ({ page, consoleIssues }) => {
    await page.goto("/");

    const before = await page.evaluate(() => ({
      progress: JSON.stringify(window.CytoCourse.getProgress()),
      storageKeys: Object.keys(localStorage).sort(),
    }));

    const result = await page.evaluate(() => {
      const events = [];
      const handler = (e) => events.push(e);
      window.CytoCourse.on("*", handler);

      window.CytoCourse.getQuestions();
      window.CytoCourse.getQuestions("m1");
      const governance = window.CytoCourse.getQuestionGovernance();

      window.CytoCourse.off("*", handler);

      const ids = Object.keys(governance);
      const allDraft = ids.every((id) => governance[id].lifecycle === "draft" && governance[id].releaseQualified === false);

      return { events, idCount: ids.length, allDraft };
    });

    const after = await page.evaluate(() => ({
      progress: JSON.stringify(window.CytoCourse.getProgress()),
      storageKeys: Object.keys(localStorage).sort(),
    }));

    expect(result.events).toEqual([]);
    expect(result.idCount).toBe(153);
    expect(result.allDraft).toBe(true);
    expect(after.progress).toBe(before.progress);
    expect(after.storageKeys).toEqual(before.storageKeys);

    expect(consoleIssues).toEqual([]);
  });
});
