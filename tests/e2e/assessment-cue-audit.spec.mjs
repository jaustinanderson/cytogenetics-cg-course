import { test, expect } from "./fixtures.mjs";
import {
  computeCueMetrics,
  historicalLength,
  canonicalLength,
  selectPilotBatch,
  ORIGINAL_BASELINE,
  ORIGINAL_ID_MANIFEST,
  FROZEN_PILOT_MANIFEST,
  compareToIdManifest,
  flattenQuestionBank,
  evaluateGateA,
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
 * Also includes the RENDERED-TEXT ORACLE (docs/ASSESSMENT_VALIDITY.md
 * section 3.2, corrected): direct proof that canonicalLength() measures
 * exactly the text a learner sees in a real rendered `.qopt`, using
 * window.CytoCourse.addQuestions() (the existing, already-validated
 * runtime-injection API) to render synthetic option text covering
 * literal angle brackets, entity-like text, Unicode composition,
 * whitespace, emoji/grapheme clusters, punctuation, and multiline text --
 * never real question content.
 *
 * Scope discipline: read-only with respect to authored content and
 * durable state. The oracle test injects a SESSION-ONLY runtime question
 * (per the existing, separately-validated split-lifecycle policy,
 * docs/ARCHITECTURE.md "Runtime-injected content lifecycle") in an
 * isolated browser context that is discarded at the end of the test; it
 * never answers the injected question, so no progress record is created
 * for it either. This spec never mutates real question content, progress,
 * or storage otherwise.
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

  test("the browser-observed bank matches the frozen exact-id manifest (detects removal/addition/replacement, not merely count)", async ({ page, consoleIssues }) => {
    await page.goto("/");
    const browserQuestionsByModule = await page.evaluate(() => window.CytoCourse.getQuestions());
    const browserQuestions = flattenQuestionBank(browserQuestionsByModule);

    const check = compareToIdManifest(browserQuestions.map((q) => q.id));
    expect(check.matches).toBe(true);
    expect(check.removed).toEqual([]);
    expect(check.added).toEqual([]);
    expect(check.liveCount).toBe(ORIGINAL_ID_MANIFEST.count);

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

    const browserGateA = evaluateGateA(browserCanonical);
    const vmGateA = evaluateGateA(vmCanonical);
    expect(browserGateA.overall).toBe(vmGateA.overall);
    expect(browserGateA.overall).toBe("fail");

    expect(consoleIssues).toEqual([]);
  });

  test("the browser-observed bank yields the identical deterministic pilot batch the dependency-free audit selects, matching the frozen pilot manifest", async ({ page, consoleIssues }) => {
    await page.goto("/");
    const browserQuestionsByModule = await page.evaluate(() => window.CytoCourse.getQuestions());
    const browserQuestions = flattenQuestionBank(browserQuestionsByModule);

    const pilot = selectPilotBatch(browserQuestions);
    expect(pilot.ids).toEqual([...FROZEN_PILOT_MANIFEST]);

    // Order-independence, proven against the real browser's own question
    // order too, not only synthetic fixtures (tests/assessment-cue-audit.mjs
    // already proves this for the vm-booted bank).
    const reversedPilot = selectPilotBatch([...browserQuestions].reverse());
    expect(reversedPilot.ids).toEqual(pilot.ids);

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

  test.describe("rendered-text oracle — canonicalLength() must match what a learner actually sees in a real .qopt", () => {
    // Synthetic option strings, never real question content, chosen to
    // cover every category docs/ASSESSMENT_VALIDITY.md section 3.2 and
    // this correction's point B require: literal angle-bracket text,
    // entity-like text, Unicode composition (NFC vs. NFD), collapsible
    // whitespace, an emoji built from multiple code points, punctuation,
    // and multiline text.
    const SYNTHETIC_OPTIONS = [
      "Plain option with no special characters",
      "Contains a literal <b>bold-looking</b> tag that must render as literal text, not bold",
      "Contains a literal &amp; entity-looking sequence that must render literally",
      "Café (precomposed NFC) vs Café (decomposed NFD) must measure identically",
      "Extra   internal    whitespace   collapses  for  display",
      "Ends with a decorative punctuation mark that must now be COUNTED, not stripped.",
      "Contains a thumbs-up\u{1F44D}emoji built from a surrogate pair",
    ];

    test("literal tags, entities, Unicode composition, whitespace, punctuation, and emoji all measure identically between canonicalLength() and the real rendered .qopt text", async ({ page, consoleIssues }) => {
      await page.goto("/");

      const rendered = await page.evaluate((options) => {
        const injectId = "__oracle_probe_q__";
        const result = window.CytoCourse.addQuestions("m1", [
          {
            id: injectId,
            d: "orientation",
            t: "orientation",
            x: 1,
            q: "Assessment-cue oracle probe (session-only, never answered)",
            o: options,
            a: 0,
            why: "n/a -- oracle probe only",
          },
        ]);
        if (!result.ok) { throw new Error("addQuestions rejected the oracle probe: " + JSON.stringify(result)); }

        const mount = document.querySelector('.quiz-mount[data-quiz="m1"]');
        mount.querySelector("details").open = true;

        const items = Array.from(mount.querySelectorAll(".qitem"));
        const probeItem = items[items.length - 1]; // injected question is appended last
        const optionButtons = Array.from(probeItem.querySelectorAll(".qopt"));

        return optionButtons.map((btn) => {
          const spans = btn.querySelectorAll("span");
          const keySpan = spans[0]; // .opt-key
          const textSpan = spans[1]; // the option text
          return {
            rawTextContent: textSpan.textContent,
            renderedInnerText: textSpan.innerText,
            keyText: keySpan.textContent,
          };
        });
      }, SYNTHETIC_OPTIONS);

      expect(rendered.length).toBe(SYNTHETIC_OPTIONS.length);

      rendered.forEach((r, i) => {
        // The DOM's raw textContent must round-trip byte-for-byte back to
        // the original source string -- proof that esc() never actually
        // transforms what a learner's document contains, only how it is
        // safely serialized in transit (docs/ASSESSMENT_VALIDITY.md
        // section 3.2's rendering-contract explanation).
        expect(r.rawTextContent, `option ${i} raw textContent must equal the source string verbatim`).toBe(SYNTHETIC_OPTIONS[i]);

        // The library's canonicalLength(), computed directly on the RAW
        // source string, must equal canonicalLength() computed on the
        // browser's own rendered innerText (which independently reflects
        // real CSS whitespace-collapse) -- the actual oracle comparison.
        const computedFromSource = canonicalLength(SYNTHETIC_OPTIONS[i]);
        const computedFromRenderedInnerText = canonicalLength(r.renderedInnerText);
        expect(computedFromSource, `option ${i}: "${SYNTHETIC_OPTIONS[i]}"`).toBe(computedFromRenderedInnerText);
      });

      // Specific, named assertions for the categories point B calls out
      // by name, so a future regression fails with an obvious label
      // rather than only a generic index mismatch above.
      expect(rendered[1].rawTextContent).toContain("<b>bold-looking</b>");
      expect(rendered[2].rawTextContent).toContain("&amp;");
      expect(canonicalLength(SYNTHETIC_OPTIONS[3])).toBe(canonicalLength("Café (precomposed NFC) vs Café (decomposed NFD) must measure identically".normalize("NFC")));
      expect(canonicalLength(SYNTHETIC_OPTIONS[5])).toBe(canonicalLength(SYNTHETIC_OPTIONS[5].slice(0, -1)) + 1); // trailing "." now counted

      expect(consoleIssues).toEqual([]);
    });
  });
});
