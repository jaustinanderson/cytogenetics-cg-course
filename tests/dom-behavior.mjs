/**
 * DOM behavior smoke tests (Milestone 0 prerequisite).
 *
 * Covers the roadmap's required behavior list: navigation, quizzes, exercises,
 * v1-to-v2 migration, persistence across reload, Reset from every progress
 * state, import/export, print, and the public API with its events. Also
 * asserts the accessibility affordances that are actually implemented.
 *
 * Runs on stock Node with no dependencies, using tests/dom-harness.mjs, so the
 * existing CI workflow keeps working without an install step.
 *
 * Scope limit: this is a DOM-level behavior harness, not a real browser. It
 * cannot establish rendering, layout, contrast, true focus order, touch
 * behavior, or screen-reader output. Those gates remain open and are listed at
 * the end of this run.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createEnvironment } from "./dom-harness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const inlineScript = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim())[0];

const staticBody = html
  .replace(/[\s\S]*?<body[^>]*>/i, "")
  .replace(/<script[\s\S]*$/i, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "");

const V1_KEY = "cyto_cg_progress_v1";
const V2_KEY = "cyto_cg_progress_v2";

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`✗ ${name}`);
    failures.push({ name, error });
  }
}

/** Boot a fresh course instance with isolated storage. */
function boot(options = {}) {
  const env = createEnvironment(staticBody, options);
  vm.createContext(env.sandbox);
  vm.runInContext(inlineScript, env.sandbox, {
    filename: "index.inline.js",
    timeout: 15_000,
  });
  if ((options.readyState || "complete") === "loading") env.ready();
  env.api = env.sandbox.window.CytoCourse;
  return env;
}

const quizMount = (env, key) => env.body.querySelector(`.quiz-mount[data-quiz="${key}"]`);

/* ============================ rendering & navigation ============================ */

test("the course boots and renders every declared mount", () => {
  const env = boot();
  assert.equal(env.body.querySelectorAll(".quiz-mount").length, 17);
  assert.equal(env.body.querySelectorAll(".exer").length, 6);
  assert.equal(env.body.querySelectorAll(".mark-complete").length, 17);
  assert.ok(env.body.querySelector("#flashMount").querySelectorAll(".flash-cat").length === 7);
  for (const id of ["figSpreads", "figMorph", "figKaryoOrder", "figFISH"]) {
    assert.ok(env.document.getElementById(id).childNodes.length > 0, `${id} received schematic SVG`);
  }
});

test("navigation and dashboard are generated from the module data", () => {
  const env = boot();
  const links = env.body.querySelectorAll("#sidebarNav .nav-link");
  assert.equal(links.length, 25, "17 modules + 8 study-tool entries");
  assert.equal(env.body.querySelectorAll("#dashboardGrid .dash-cell").length, 17);
  const targets = links.map((link) => link.getAttribute("data-target"));
  assert.ok(targets.includes("m1") && targets.includes("m17") && targets.includes("exam"));
  for (const target of targets) {
    assert.ok(env.document.getElementById(target), `nav target #${target} exists in the document`);
  }
});

test("the mobile navigation toggle opens, closes, and reports state", () => {
  const env = boot();
  const toggle = env.document.getElementById("navToggle");
  const sidebar = env.document.getElementById("sidebar");
  const backdrop = env.document.getElementById("backdrop");

  toggle.click();
  assert.ok(sidebar.classList.contains("open"));
  assert.ok(backdrop.classList.contains("show"));
  assert.equal(toggle.getAttribute("aria-expanded"), "true");

  toggle.click();
  assert.ok(!sidebar.classList.contains("open"));
  assert.equal(toggle.getAttribute("aria-expanded"), "false");

  toggle.click();
  backdrop.click();
  assert.ok(!sidebar.classList.contains("open"), "backdrop click closes the sidebar");
});

test("activating a navigation link closes the mobile sidebar", () => {
  const env = boot();
  const toggle = env.document.getElementById("navToggle");
  toggle.click();
  env.body.querySelector("#sidebarNav .nav-link").click();
  assert.ok(!env.document.getElementById("sidebar").classList.contains("open"));
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
});

/* ============================ quizzes ============================ */

test("a correct quiz answer scores, locks the item, and explains itself", () => {
  const env = boot();
  const mount = quizMount(env, "m1");
  const item = mount.querySelectorAll(".qitem")[0];
  const correctIndex = env.api.getQuestions("m1")[0].a;
  const options = item.querySelectorAll(".qopt");

  options[correctIndex].click();

  assert.ok(options[correctIndex].classList.contains("correct"));
  assert.equal(mount.querySelector(".qh-score").textContent, "1 / 5");
  const feedback = item.querySelector(".qfb");
  assert.ok(feedback.classList.contains("show") && feedback.classList.contains("good"));
  assert.equal(feedback.querySelector(".fb-h").textContent, "Correct");
  assert.ok(feedback.querySelector(".fb-d").textContent.length > 0, "rationale is shown");
  assert.ok(options.every((option) => option.disabled), "all options lock after answering");
});

test("an incorrect quiz answer marks both choices and explains the distractor", () => {
  const env = boot();
  const mount = quizMount(env, "m2");
  const question = env.api.getQuestions("m2")[0];
  const wrongIndex = question.a === 0 ? 1 : 0;
  const item = mount.querySelectorAll(".qitem")[0];
  const options = item.querySelectorAll(".qopt");

  options[wrongIndex].click();

  assert.ok(options[wrongIndex].classList.contains("wrong"));
  assert.ok(options[question.a].classList.contains("correct"), "the correct answer is revealed");
  assert.equal(mount.querySelector(".qh-score").textContent, "0 / 6");
  const feedback = item.querySelector(".qfb");
  assert.ok(feedback.classList.contains("bad"));
  assert.equal(feedback.querySelector(".fb-h").textContent, "Not quite");
  if (question.w && question.w[wrongIndex]) {
    assert.ok(feedback.querySelector(".fb-x").textContent.includes("Why not"));
  }
});

test("a quiz item cannot be answered twice", () => {
  const env = boot();
  const mount = quizMount(env, "m1");
  const item = mount.querySelectorAll(".qitem")[0];
  const correctIndex = env.api.getQuestions("m1")[0].a;
  const options = item.querySelectorAll(".qopt");

  options[correctIndex].click();
  const scoreAfterFirst = mount.querySelector(".qh-score").textContent;
  options[correctIndex].click();
  options[(correctIndex + 1) % options.length].click();

  assert.equal(mount.querySelector(".qh-score").textContent, scoreAfterFirst);
  assert.equal(Object.keys(env.api.getProgress().answers).length, 1);
});

test("quiz outcomes are recorded against stable question ids", () => {
  const env = boot();
  const mount = quizMount(env, "m9");
  const questions = env.api.getQuestions("m9");
  mount.querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[questions[0].a].click();

  const answers = env.api.getProgress().answers;
  assert.ok(answers[questions[0].id], "outcome keyed by question id");
  assert.equal(answers[questions[0].id].c, true);
  assert.equal(answers[questions[0].id].n, 1);
  assert.ok(typeof answers[questions[0].id].ts === "number");
});

/* ============================ exercises ============================ */

test("an exercise scores, reveals feedback, and advances", () => {
  const env = boot();
  const host = env.body.querySelectorAll(".exer")[0];
  const key = host.getAttribute("data-exer");
  const items = env.api.getExercises()[key].items;

  const firstPrompt = host.querySelector(".exer-prompt").textContent;
  assert.equal(firstPrompt, items[0].prompt);
  assert.ok(host.querySelector(".exer-next").disabled, "Next is disabled before answering");

  host.querySelectorAll(".eopt")[items[0].answer].click();
  assert.equal(host.querySelector(".eh-score").textContent, `1 / ${items.length}`);
  const feedback = host.querySelector(".exer-fb");
  assert.ok(feedback.classList.contains("show") && feedback.classList.contains("good"));
  assert.equal(feedback.textContent, items[0].fb);
  assert.ok(!host.querySelector(".exer-next").disabled);

  host.querySelector(".exer-next").click();
  assert.equal(host.querySelector(".exer-prompt").textContent, items[1].prompt);
});

test("an exercise can be completed to the end", () => {
  const env = boot();
  const host = env.body.querySelectorAll(".exer")[0];
  const key = host.getAttribute("data-exer");
  const items = env.api.getExercises()[key].items;

  for (let index = 0; index < items.length; index += 1) {
    host.querySelectorAll(".eopt")[items[index].answer].click();
    host.querySelector(".exer-next").click();
  }

  assert.equal(host.querySelector(".eh-score").textContent, `${items.length} / ${items.length}`);
  assert.match(host.querySelector(".exer-prog").textContent, /Completed/);
  assert.ok(host.querySelector(".exer-next").disabled);
  assert.equal(Object.keys(env.api.getProgress().exercises).length, items.length);
});

/* ============================ progress, migration, persistence ============================ */

test("marking a module complete updates progress and storage", () => {
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[0].click();

  assert.equal(env.api.getStats().modulesComplete, 1);
  assert.equal(env.document.getElementById("tpLabel").textContent, "1 of 17 modules complete");
  assert.equal(env.document.getElementById("sideNum").textContent, "6%");
  const stored = JSON.parse(env.storage.getItem(V2_KEY));
  assert.equal(stored.v, 2);
  assert.equal(stored.modules.m1, true);
});

test("marking a module complete is reversible", () => {
  const env = boot();
  const button = env.body.querySelectorAll(".mark-complete")[0];
  button.click();
  button.click();
  assert.equal(env.api.getStats().modulesComplete, 0);
  assert.equal(JSON.parse(env.storage.getItem(V2_KEY)).modules.m1, undefined);
});

test("legacy v1 progress migrates to the v2 schema on first load", () => {
  const env = boot({
    storage: { [V1_KEY]: JSON.stringify({ m1: true, m2: true, m5: true }) },
  });
  const state = env.api.getProgress();
  assert.equal(state.v, 2);
  assert.equal(state.migratedFrom, 1);
  assert.equal(env.api.getStats().modulesComplete, 3);
  assert.deepEqual(Object.keys(state.modules).sort(), ["m1", "m2", "m5"]);
  assert.ok(env.storage.getItem(V2_KEY), "migrated state is persisted under the v2 key");
  assert.equal(env.document.getElementById("tpLabel").textContent, "3 of 17 modules complete");
});

test("v2 progress takes precedence and is not re-migrated", () => {
  const env = boot({
    storage: {
      [V1_KEY]: JSON.stringify({ m1: true, m2: true, m3: true, m4: true }),
      [V2_KEY]: JSON.stringify({ v: 2, modules: { m7: true }, answers: {}, exercises: {} }),
    },
  });
  assert.equal(env.api.getStats().modulesComplete, 1);
  assert.equal(env.api.getProgress().modules.m7, true);
  assert.equal(env.api.getProgress().migratedFrom, undefined);
});

test("progress survives a reload", () => {
  const first = boot();
  first.body.querySelectorAll(".mark-complete")[0].click();
  const questions = first.api.getQuestions("m1");
  quizMount(first, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[questions[0].a].click();

  const persisted = first.storage._raw;
  const second = boot({ storage: persisted });

  assert.equal(second.api.getStats().modulesComplete, 1);
  assert.equal(second.api.getProgress().answers[questions[0].id].c, true);
  assert.equal(second.document.getElementById("tpLabel").textContent, "1 of 17 modules complete");
  assert.ok(
    second.body.querySelectorAll(".mark-complete")[0].classList.contains("done"),
    "restored completion is reflected in the UI",
  );
});

/* ============================ exercise identity & stable IDs (Issue #2) ============================
   Exercise-outcome storage used to be keyed by a position-derived string
   ("<key>-<n>", computed fresh from array index on every render), so
   inserting or reordering an exercise item could silently reattach a
   learner's saved history to a different item (docs/QUALITY_LOG.md QL-005).
   Every exercise item now carries an explicit, literal `id` field instead,
   and migrateExerciseIds() normalizes any surviving legacy-format keys. */

/** The historical position-derived key format, mirrored here only to build
 * seed fixtures and assert legacy keys are really gone -- never used to
 * decide what the product *should* do, which is exactly the assumption
 * this migration replaces. */
const legacyExerciseId = (key, i) => `${key}-${i + 1}`;

test("every exercise item has an explicit, unique, non-blank id", () => {
  const env = boot();
  const exercises = env.api.getExercises();
  const seen = new Set();
  let total = 0;
  Object.keys(exercises).forEach((key) => {
    exercises[key].items.forEach((item, i) => {
      assert.equal(typeof item.id, "string", `${key}[${i}]: item is missing a string id`);
      assert.ok(item.id.trim(), `${key}[${i}]: item id must not be blank`);
      assert.ok(!seen.has(item.id), `duplicate exercise item id: ${item.id}`);
      seen.add(item.id);
      total += 1;
    });
  });
  assert.equal(total, 30, "30 exercise items across 6 sets, matching the documented baseline");
});

test("an item's id is a literal property of the item, not derived from its array position", () => {
  const env = boot();
  const items = env.api.getExercises().ex7.items;
  const originalIds = items.map((it) => it.id);
  const reversed = items.slice().reverse();
  assert.deepEqual(
    reversed.map((it) => it.id),
    originalIds.slice().reverse(),
    "reordering the array moved the ids with their items, not left them at fixed positions",
  );
  assert.equal(reversed[0].id, originalIds[originalIds.length - 1]);
  assert.notEqual(
    reversed[0].id,
    legacyExerciseId("ex7", 0),
    "the item now at position 0 must not silently pick up the legacy id that position would have implied",
  );
});

test("legacy position-derived exercise records migrate to their item's stable id on load", () => {
  const env = boot({
    storage: {
      [V2_KEY]: JSON.stringify({
        v: 2,
        modules: {},
        answers: {},
        started: 0,
        exercises: {
          "ex7-1": { c: true, n: 2, ts: 555 },
          "ex9group-3": { c: false, n: 1, ts: 777 },
        },
      }),
    },
  });
  const progress = env.api.getProgress();
  assert.deepEqual(progress.exercises["ex7-i1"], { c: true, n: 2, ts: 555 });
  assert.deepEqual(progress.exercises["ex9group-i3"], { c: false, n: 1, ts: 777 });
  assert.equal(progress.exercises["ex7-1"], undefined, "the legacy key no longer exists in memory");
  assert.equal(progress.exercises["ex9group-3"], undefined, "the legacy key no longer exists in memory");

  const stored = JSON.parse(env.storage.getItem(V2_KEY));
  assert.deepEqual(stored.exercises["ex7-i1"], { c: true, n: 2, ts: 555 }, "the migration is persisted, not only held in memory");
  assert.equal(stored.exercises["ex7-1"], undefined);
});

test("migrating exercise ids is idempotent — a second load against already-migrated state performs zero further writes", () => {
  const seeded = {
    v: 2, modules: {}, answers: {}, started: 0,
    exercises: { "ex10-4": { c: true, n: 1, ts: 111 } },
  };
  const first = boot({ storage: { [V2_KEY]: JSON.stringify(seeded) } });
  const afterFirstLoad = first.storage.getItem(V2_KEY);
  assert.deepEqual(JSON.parse(afterFirstLoad).exercises["ex10-i4"], { c: true, n: 1, ts: 111 }, "sanity: first load actually migrated");

  const second = boot({ storage: { [V2_KEY]: afterFirstLoad } });
  assert.equal(
    second.storage.getItem(V2_KEY),
    afterFirstLoad,
    "a second load against already-migrated state performs zero additional writes",
  );
  assert.deepEqual(second.api.getProgress().exercises["ex10-i4"], { c: true, n: 1, ts: 111 });
});

/* Records carry no attempt-level identifiers or provenance, so when both a
   legacy key and its item's stable key hold a record, the two attempt
   histories cannot be exactly reconstructed or merged -- they might be
   disjoint, but they might just as well overlap, and nothing in the stored
   fields can tell the two cases apart. Summing `n` would silently
   over-count in the overlapping case (see the mixed-tab example below), so
   migrateExerciseIds() instead keeps the ENTIRE record -- c, n, and ts
   together, never mixed from the two sides -- from whichever key was
   written more recently. */

test("a legacy/stable conflict keeps the entire newer record instead of summing — the mixed-version-tab overlap example", () => {
  // Two tabs, different app releases, on the same item's history: tab B
  // (new version) already migrated an earlier snapshot of 5 attempts to
  // the stable key; tab A (old version), still open, then recorded one
  // MORE attempt under the legacy key, so the legacy record's own n (6)
  // already includes everything the stable snapshot (5) does, plus one.
  // The true number of distinct attempts is 6. Summing 6 + 5 would report
  // 11, silently double-counting the 5 attempts both records share.
  const env = boot({
    storage: {
      [V2_KEY]: JSON.stringify({
        v: 2, modules: {}, answers: {}, started: 0,
        exercises: {
          "ex15-2": { c: true, n: 6, ts: 2000 }, // tab A: legacy key, written after tab B's migration
          "ex15-i2": { c: false, n: 5, ts: 1000 }, // tab B: stable key, the earlier migrated snapshot
        },
      }),
    },
  });
  assert.deepEqual(
    env.api.getProgress().exercises["ex15-i2"],
    { c: true, n: 6, ts: 2000 },
    "the entire newer (legacy) record wins outright — n stays 6, not 11",
  );
  assert.equal(env.api.getProgress().exercises["ex15-2"], undefined, "the legacy key is gone after resolution");
});

test("a newer stable record wins outright over an older legacy record", () => {
  const env = boot({
    storage: {
      [V2_KEY]: JSON.stringify({
        v: 2, modules: {}, answers: {}, started: 0,
        exercises: {
          "ex15-2": { c: false, n: 2, ts: 1000 }, // legacy, older
          "ex15-i2": { c: true, n: 3, ts: 5000 }, // stable, newer
        },
      }),
    },
  });
  assert.deepEqual(
    env.api.getProgress().exercises["ex15-i2"],
    { c: true, n: 3, ts: 5000 },
    "the entire newer (stable) record wins outright, not an arithmetic merge of both",
  );
  assert.equal(env.api.getProgress().exercises["ex15-2"], undefined);
});

test("a newer legacy record wins outright over an older stable record", () => {
  const env = boot({
    storage: {
      [V2_KEY]: JSON.stringify({
        v: 2, modules: {}, answers: {}, started: 0,
        exercises: {
          "ex10-1": { c: true, n: 4, ts: 9000 }, // legacy, newer
          "ex10-i1": { c: false, n: 1, ts: 100 }, // stable, older
        },
      }),
    },
  });
  assert.deepEqual(
    env.api.getProgress().exercises["ex10-i1"],
    { c: true, n: 4, ts: 9000 },
    "the entire newer (legacy) record wins outright",
  );
  assert.equal(env.api.getProgress().exercises["ex10-1"], undefined);
});

test("a legacy/stable conflict with equal timestamps deterministically keeps the canonical stable record", () => {
  const env = boot({
    storage: {
      [V2_KEY]: JSON.stringify({
        v: 2, modules: {}, answers: {}, started: 0,
        exercises: {
          "ex14-5": { c: true, n: 1, ts: 42 }, // legacy
          "ex14-i5": { c: false, n: 9, ts: 42 }, // stable -- deliberately different c/n so a mix-up is detectable
        },
      }),
    },
  });
  assert.deepEqual(
    env.api.getProgress().exercises["ex14-i5"],
    { c: false, n: 9, ts: 42 },
    "equal timestamps keep the entire canonical stable-key record, not the legacy one",
  );
  assert.equal(env.api.getProgress().exercises["ex14-5"], undefined);
});

test("migration idempotency holds after a legacy/stable conflict was resolved", () => {
  const env = boot({
    storage: {
      [V2_KEY]: JSON.stringify({
        v: 2, modules: {}, answers: {}, started: 0,
        exercises: { "ex10-1": { c: false, n: 1, ts: 10 }, "ex10-i1": { c: true, n: 5, ts: 20 } },
      }),
    },
  });
  const afterMerge = env.storage.getItem(V2_KEY);
  assert.deepEqual(
    JSON.parse(afterMerge).exercises["ex10-i1"],
    { c: true, n: 5, ts: 20 },
    "sanity: the newer (stable) record won outright",
  );
  const again = boot({ storage: { [V2_KEY]: afterMerge } });
  assert.equal(
    again.storage.getItem(V2_KEY),
    afterMerge,
    "re-running after conflict resolution performs zero further writes",
  );
  assert.deepEqual(again.api.getProgress().exercises["ex10-i1"], { c: true, n: 5, ts: 20 });
});

test("answering a fresh exercise item records its outcome only under the stable id, never a position-derived key", () => {
  const env = boot();
  const host = env.body.querySelectorAll('.exer[data-exer="ex9chrom"]')[0];
  const items = env.api.getExercises().ex9chrom.items;
  host.querySelectorAll(".eopt")[items[0].answer].click();

  const keys = Object.keys(env.api.getProgress().exercises);
  assert.deepEqual(keys, [items[0].id]);
  assert.equal(keys[0], "ex9chrom-i1");
  assert.notEqual(keys[0], legacyExerciseId("ex9chrom", 0));
});

test("exercise progress survives a real reload under its stable id", () => {
  const first = boot();
  const host = first.body.querySelectorAll('.exer[data-exer="ex7"]')[0];
  const items = first.api.getExercises().ex7.items;
  host.querySelectorAll(".eopt")[items[0].answer].click();

  const persisted = first.storage._raw;
  const second = boot({ storage: persisted });
  assert.equal(second.api.getProgress().exercises[items[0].id].c, true);
  assert.equal(
    second.body.querySelectorAll('.exer[data-exer="ex7"]')[0].querySelector(".eh-score").textContent,
    `1 / ${items.length}`,
  );
});

test("export/import round-trip preserves migrated exercise progress under its stable id", () => {
  const env = boot({
    storage: {
      [V2_KEY]: JSON.stringify({
        v: 2, modules: {}, answers: {}, started: 0,
        exercises: { "ex7-3": { c: true, n: 1, ts: 999 } },
      }),
    },
  });
  assert.deepEqual(env.api.getProgress().exercises["ex7-i3"], { c: true, n: 1, ts: 999 }, "already migrated on load");

  const exported = env.api.exportJSON();
  const fresh = boot();
  const result = fresh.api.importJSON(exported);
  assert.equal(result.ok, true);
  assert.deepEqual(fresh.api.getProgress().exercises["ex7-i3"], { c: true, n: 1, ts: 999 });
});

test("importing a legacy-format export migrates its exercise keys to stable ids", () => {
  const legacyExport = JSON.stringify({
    exported: new Date(0).toISOString(),
    state: {
      v: 2, modules: {}, answers: {}, started: 0,
      exercises: { "ex15-1": { c: true, n: 1, ts: 321 } },
    },
    stats: {},
  });
  const env = boot();
  const result = env.api.importJSON(legacyExport);
  assert.equal(result.ok, true);
  assert.deepEqual(env.api.getProgress().exercises["ex15-i1"], { c: true, n: 1, ts: 321 });
  assert.equal(env.api.getProgress().exercises["ex15-1"], undefined);
});

/* --- true end-to-end proof: reordering the real EXERCISES.ex7.items array
   cannot reassign a learner's recorded history to a different item. Runs
   the actual product script (not a stub) with one line injected --
   EXERCISES.ex7.items.reverse() -- into a copy of the exact inline script
   text, so this exercises real rendering and real recording code, not an
   assumption about it. */
test("reordering exercise items in source cannot attach stored history to a different item", () => {
  const first = boot();
  const items = first.api.getExercises().ex7.items;
  // Answering item 1 requires answering item 0 first (Next stays disabled
  // until the current item is answered), so both get recorded -- with
  // deliberately DIFFERENT outcomes, so a mix-up between the two ids would
  // be caught by either one's correctness flipping.
  const host = first.body.querySelectorAll('.exer[data-exer="ex7"]')[0];
  const wrongOptionForItem0 = (items[0].answer + 1) % host.querySelectorAll(".eopt").length;
  host.querySelectorAll(".eopt")[wrongOptionForItem0].click(); // item 0: deliberately WRONG
  host.querySelector(".exer-next").click(); // advance render to item 1
  host.querySelectorAll(".eopt")[items[1].answer].click(); // item 1: correct
  assert.equal(first.api.getProgress().exercises[items[0].id].c, false, "sanity: item 0 recorded as incorrect");
  assert.equal(first.api.getProgress().exercises[items[1].id].c, true, "sanity: item 1 recorded as correct");

  const anchor = "/* ============================ FLASHCARDS ============================ */";
  assert.ok(inlineScript.includes(anchor), "injection anchor must exist in the real script");
  const mutatedScript = inlineScript.replace(anchor, `EXERCISES.ex7.items.reverse();\n\n  ${anchor}`);
  assert.notEqual(mutatedScript, inlineScript, "the injection must actually change the executed script");

  const mutatedEnv = createEnvironment(staticBody, { storage: first.storage._raw });
  vm.createContext(mutatedEnv.sandbox);
  vm.runInContext(mutatedScript, mutatedEnv.sandbox, { filename: "index.inline.reordered.js", timeout: 15_000 });
  mutatedEnv.api = mutatedEnv.sandbox.window.CytoCourse;

  const reorderedItems = mutatedEnv.api.getExercises().ex7.items;
  assert.equal(reorderedItems.findIndex((it) => it.id === items[1].id), 2, "sanity: reversing 4 items moves former index 1 to index 2");
  assert.equal(reorderedItems.findIndex((it) => it.id === items[0].id), 3, "sanity: reversing 4 items moves former index 0 to index 3");

  const reorderedProgress = mutatedEnv.api.getProgress().exercises;
  assert.equal(
    reorderedProgress[items[1].id].c,
    true,
    "item 1's stable id keeps its correct outcome after its item moved from position 1 to position 2",
  );
  assert.equal(
    reorderedProgress[items[0].id].c,
    false,
    "item 0's stable id keeps its incorrect outcome after its item moved from position 0 to position 3 -- it did not inherit item 1's correct result",
  );
  assert.equal(
    reorderedProgress[legacyExerciseId("ex7", 0)],
    undefined,
    "no legacy position-derived key exists to misattribute this history to whatever item is now at that position",
  );
  assert.equal(reorderedProgress[legacyExerciseId("ex7", 1)], undefined);

  const reorderedHost = mutatedEnv.body.querySelectorAll('.exer[data-exer="ex7"]')[0];
  assert.equal(
    reorderedHost.querySelector(".eh-score").textContent,
    `1 / ${reorderedItems.length}`,
    "the reordered exercise's summary score (1 correct of 2 recorded) reflects both attempts, correctly attributed by id",
  );
});

/* --- migrateExerciseIds() must key each legacy record by its item's frozen
   `legacyId`, never by recomputing a position-derived key from the item's
   CURRENT array index. Otherwise a learner who first loads a later release
   after EXERCISES has been reordered could have their legacy progress
   migrated onto whichever item now occupies that position, not the item
   it actually belongs to (the exact regression an index-based
   `legacyExerciseId(key, i)` computed at migration time would reintroduce,
   silently, the moment anything is ever reordered). This reorders the real
   EXERCISES.ex7.items array via the same script-injection technique
   BEFORE the seeded legacy record is ever loaded/migrated, so both the
   fixture and the migration run against the mutated array. */
test("a legacy-format record migrates to its ORIGINAL item's stable id even if EXERCISES has since been reordered, never to whatever item now occupies that array position", () => {
  const originalFirstId = boot().api.getExercises().ex7.items[0].id; // "ex7-i1", read from the real (unreordered) data
  const seededLegacyKey = legacyExerciseId("ex7", 0); // "ex7-1" -- the true historical key for that same item

  const anchor = "/* ============================ FLASHCARDS ============================ */";
  const mutatedScript = inlineScript.replace(anchor, `EXERCISES.ex7.items.reverse();\n\n  ${anchor}`);
  assert.notEqual(mutatedScript, inlineScript, "the injection must actually change the executed script");

  const env = createEnvironment(staticBody, {
    storage: {
      [V2_KEY]: JSON.stringify({
        v: 2, modules: {}, answers: {}, started: 0,
        exercises: { [seededLegacyKey]: { c: true, n: 3, ts: 999 } },
      }),
    },
  });
  vm.createContext(env.sandbox);
  vm.runInContext(mutatedScript, env.sandbox, { filename: "index.inline.reordered-before-load.js", timeout: 15_000 });
  env.api = env.sandbox.window.CytoCourse;

  const reorderedItems = env.api.getExercises().ex7.items;
  assert.notEqual(
    reorderedItems[0].id,
    originalFirstId,
    "sanity: reordering before load really did change which item sits at position 0",
  );

  const progress = env.api.getProgress().exercises;
  assert.deepEqual(
    progress[originalFirstId],
    { c: true, n: 3, ts: 999 },
    "the record followed its ORIGINAL item's stable id (via its frozen legacyId), not whatever now occupies position 0",
  );
  assert.equal(
    progress[reorderedItems[0].id],
    undefined,
    "the item that now occupies position 0 must not inherit history that was never its own",
  );
  assert.equal(progress[seededLegacyKey], undefined, "the legacy key is gone");
});

test("importing a legacy-format export migrates to its ORIGINAL item's stable id even after EXERCISES has been reordered", () => {
  const anchor = "/* ============================ FLASHCARDS ============================ */";
  const mutatedScript = inlineScript.replace(anchor, `EXERCISES.ex7.items.reverse();\n\n  ${anchor}`);
  assert.notEqual(mutatedScript, inlineScript);

  const env = createEnvironment(staticBody, {});
  vm.createContext(env.sandbox);
  vm.runInContext(mutatedScript, env.sandbox, { filename: "index.inline.reordered-import.js", timeout: 15_000 });
  env.api = env.sandbox.window.CytoCourse;

  const reorderedItems = env.api.getExercises().ex7.items;
  const originalFirstId = "ex7-i1"; // the known, literal, frozen id
  const seededLegacyKey = "ex7-1"; // the known, literal, frozen legacyId
  assert.notEqual(reorderedItems[0].id, originalFirstId, "sanity: the reorder changed what sits at position 0");

  const legacyExport = JSON.stringify({
    exported: new Date(0).toISOString(),
    state: {
      v: 2, modules: {}, answers: {}, started: 0,
      exercises: { [seededLegacyKey]: { c: true, n: 2, ts: 555 } },
    },
    stats: {},
  });
  const result = env.api.importJSON(legacyExport);
  assert.equal(result.ok, true);

  const progress = env.api.getProgress().exercises;
  assert.deepEqual(progress[originalFirstId], { c: true, n: 2, ts: 555 });
  assert.equal(progress[reorderedItems[0].id], undefined);
  assert.equal(progress[seededLegacyKey], undefined);
});

/* ============================ reset ============================ */

for (const scenario of [
  { label: "v1-only", storage: { [V1_KEY]: JSON.stringify({ m1: true }) } },
  {
    label: "migrated",
    storage: { [V1_KEY]: JSON.stringify({ m1: true, m2: true }) },
    migrated: true,
  },
  {
    label: "v2-only",
    storage: { [V2_KEY]: JSON.stringify({ v: 2, modules: { m3: true }, answers: {}, exercises: {} }) },
  },
]) {
  test(`UI Reset clears both storage keys from a ${scenario.label} state`, () => {
    const env = boot({ storage: scenario.storage, confirmResponses: [true] });
    env.document.getElementById("resetBtn").click();

    assert.equal(env.storage.getItem(V1_KEY), null, "legacy v1 key is cleared");
    assert.equal(env.storage.getItem(V2_KEY), null, "v2 key is cleared");
    assert.equal(env.reloads.length, 1, "the page reloads after reset");
  });
}

test("UI Reset is abandoned when the confirmation is declined", () => {
  const env = boot({
    storage: { [V2_KEY]: JSON.stringify({ v: 2, modules: { m3: true }, answers: {}, exercises: {} }) },
    confirmResponses: [false],
  });
  env.document.getElementById("resetBtn").click();
  assert.ok(env.storage.getItem(V2_KEY), "progress is retained");
  assert.equal(env.reloads.length, 0);
});

test("API Reset clears progress and rebuilds quiz widgets", () => {
  const env = boot();
  const questions = env.api.getQuestions("m1");
  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[questions[0].a].click();
  assert.equal(env.api.getStats().questionsAnswered, 1);

  env.api.reset();

  assert.equal(env.api.getStats().questionsAnswered, 0);
  assert.equal(env.api.getStats().modulesComplete, 0);
  assert.equal(quizMount(env, "m1").querySelector(".qh-score").textContent, "0 / 5");
  const options = quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt");
  assert.ok(options.every((option) => !option.disabled), "the rebuilt quiz is answerable again");
});

/* --- the stale-ID policy's one deliberate exception (Issue #2 / QL-024
   addendum): "preserve, filter at read" governs loading, migration,
   import, export, and every ordinary read -- but an explicit,
   user-confirmed Reset is not a read. It intentionally deletes
   EVERYTHING, current or stale, module or answer or exercise, in either
   storage key, precisely because that is what a learner who clicks Reset
   and confirms the "this cannot be undone" prompt is asking for. This is
   proven through the real #resetBtn click path (window.confirm simulated
   via the harness's confirmResponses queue, exactly like the existing
   Reset tests above), not by directly clearing internal state, and with
   BOTH current and stale records seeded at every level -- module,
   answer, and exercise -- across BOTH the v2 and legacy v1 storage keys
   at once, which none of the existing per-scenario Reset tests above
   combine in one seed. */
test("an explicit, confirmed Reset removes current AND stale records everywhere, in both storage keys, and stays cleared after reload", () => {
  const seedEnv = boot();
  const currentQId = seedEnv.api.getQuestions("m1")[0].id;
  const currentExId = seedEnv.api.getExercises().ex7.items[0].id;
  const currentModId = seedEnv.api.getModules()[0].id;

  const v2Seed = {
    v: 2,
    modules: { [currentModId]: true, "stale-module-xyz": true },
    answers: { [currentQId]: { c: true, n: 1, ts: 1 }, "stale-question-xyz": { c: true, n: 5, ts: 2 } },
    exercises: { [currentExId]: { c: true, n: 1, ts: 1 }, "stale-exercise-xyz": { c: false, n: 3, ts: 3 } },
    started: 0,
  };
  const v1Seed = { m1: true, "stale-v1-module": true };

  const env = boot({
    storage: { [V2_KEY]: JSON.stringify(v2Seed), [V1_KEY]: JSON.stringify(v1Seed) },
    confirmResponses: [true],
  });
  // Sanity: the seed really does carry both current and stale progress
  // before Reset runs, so a passing test below is proof of clearing, not
  // an accident of an already-empty state.
  assert.equal(env.api.getStats().modulesComplete, 1);
  assert.equal(env.api.getStats().questionsAnswered, 1);

  env.document.getElementById("resetBtn").click();

  assert.equal(env.storage.getItem(V2_KEY), null, "v2 storage key is fully removed, stale records included");
  assert.equal(env.storage.getItem(V1_KEY), null, "legacy v1 storage key is fully removed, stale records included");
  assert.equal(env.reloads.length, 1, "the page reloads after a confirmed reset");

  // A real Reset ends in location.reload() -- a full re-fetch and
  // re-execution of the page. A fresh boot() against whatever now
  // remains in storage is the same simulated-reload technique the
  // existing "progress survives a reload" test uses.
  const afterReload = boot({ storage: { ...env.storage._raw } });
  const progress = afterReload.api.getProgress();
  assert.deepEqual(Object.keys(progress.modules), [], "no module record, current or stale, survives -- getProgress() is blank");
  assert.deepEqual(Object.keys(progress.answers), [], "no answer record, current or stale, survives");
  assert.deepEqual(Object.keys(progress.exercises), [], "no exercise record, current or stale, survives");

  const stats = afterReload.api.getStats();
  assert.equal(stats.modulesComplete, 0);
  assert.equal(stats.questionsAnswered, 0);
  assert.equal(stats.questionsCorrect, 0);
  assert.equal(stats.overallPct, null);

  assert.equal(afterReload.document.getElementById("tpLabel").textContent, "0 of 17 modules complete");
  assert.ok(
    !afterReload.body.querySelectorAll(".mark-complete")[0].classList.contains("done"),
    "the rendered module-complete state is cleared, not just the underlying data",
  );
});

/* ============================ exercise widget re-render (Issue #2 / QL-025) ============================
   Confirmed defect, reproduced through the real public API and rendered
   DOM before any fix was written: importJSON() and the API reset()
   method only ever rebuilt `.quiz-mount` widgets
   (`$all('.quiz-mount').forEach(buildQuiz)`), never `.exer` ones, so an
   exercise widget's rendered score/status/controls silently disagreed
   with `getProgress()`/`getStats()` immediately after either call --
   fixed by routing all three call sites (init(), importJSON(), reset())
   through one shared rebuildContentWidgets() helper.

   A resume-to-first-unanswered-item positioning change was ALSO tried
   while investigating this, then reverted before committing: it broke an
   existing, shipped, already-tested contract --
   tests/e2e/progressive-disclosure.spec.mjs's "reattempting an exercise
   item after reload" test -- which depends on an exercise widget always
   restarting at item 0 on any rebuild, with fresh/enabled controls,
   specifically so a learner can correct a previous answer by clicking
   item 0 again after a reload. buildExercise() therefore still always
   starts at item 0 and never pre-locks any item's controls from
   persisted state, exactly matching buildQuiz's own established
   behavior (confirmed directly: a rebuilt quiz mount never disables an
   already-answered question's options either) -- this rebuild fix only
   ensures buildExercise() actually RUNS after import/reset, not that it
   renders differently once it does. See index.html's
   rebuildContentWidgets() comment and docs/QUALITY_LOG.md QL-025 for the
   full account, including the reverted positioning attempt. */

test("importJSON() with a partially completed exercise restores the exact rendered state: score, status, and item 0 available for reattempt", () => {
  const env = boot();
  const items = env.api.getExercises().ex7.items;
  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];

  const result = env.api.importJSON({
    v: 2, modules: {}, answers: {},
    exercises: { [items[0].id]: { c: true, n: 1, ts: 1 }, [items[1].id]: { c: false, n: 1, ts: 1 } },
    started: 0,
  });
  assert.equal(result.ok, true, `expected success, got ${JSON.stringify(result)}`);

  assert.equal(host.querySelector(".eh-score").textContent, "1 / 4", "summary score reflects exactly the imported outcomes");
  assert.equal(host.querySelector(".eh-state").textContent, "In progress");
  assert.equal(
    host.querySelector(".exer-prompt").textContent,
    items[0].prompt,
    "always starts at item 0 on a rebuild, matching the existing reattempt-after-reload contract",
  );
  const opts = host.querySelectorAll(".eopt");
  assert.ok(opts.every((o) => !o.disabled), "item 0 is available fresh/interactive, not stale-disabled, even though it already has a persisted record -- reattempt remains possible");
  assert.ok(!host.querySelector(".exer-fb").classList.contains("show"), "no stale feedback carried over");
  assert.equal(host.querySelector(".exer-next").disabled, true, "Next stays disabled until item 0 is (re)answered in this render");
  assert.equal(host.querySelector(".exer-prog").textContent, `Item 1 of ${items.length} · Score 1`);
});

test("importJSON() with a completed exercise shows its completed state accurately in the summary while item 0 remains reattemptable", () => {
  const env = boot();
  const items = env.api.getExercises().ex7.items;
  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];

  const exercises = Object.fromEntries(items.map((it, i) => [it.id, { c: i % 2 === 0, n: 1, ts: 1 }]));
  const expectedScore = items.filter((_, i) => i % 2 === 0).length;
  const result = env.api.importJSON({ v: 2, modules: {}, answers: {}, exercises, started: 0 });
  assert.equal(result.ok, true, `expected success, got ${JSON.stringify(result)}`);

  assert.equal(host.querySelector(".eh-score").textContent, `${expectedScore} / ${items.length}`);
  assert.equal(host.querySelector(".eh-state").textContent, "Completed");
  assert.equal(
    host.querySelector(".exer-prompt").textContent,
    items[0].prompt,
    "always starts at item 0 on a rebuild, matching the existing reattempt-after-reload contract -- even for a fully completed exercise",
  );
  assert.equal(host.querySelector(".exer-next").textContent, "Next", "item 0 is not the last item, so the button reads Next, not Finish");
  assert.ok(host.querySelectorAll(".eopt").every((o) => !o.disabled), "item 0 remains reattemptable");
});

test("answering an exercise in the UI, then importing blank progress, removes every stale answered/disabled/feedback state", () => {
  const env = boot();
  const items = env.api.getExercises().ex7.items;
  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];

  host.querySelectorAll(".eopt")[items[0].answer].click();
  assert.equal(host.querySelector(".eh-score").textContent, "1 / 4", "sanity: the UI answer really was recorded and rendered");
  assert.ok(host.querySelectorAll(".eopt").every((o) => o.disabled), "sanity: item 0's controls are locked after answering it live");

  const result = env.api.importJSON({ v: 2, modules: {}, answers: {}, exercises: {}, started: 0 });
  assert.equal(result.ok, true, `expected success, got ${JSON.stringify(result)}`);

  assert.equal(host.querySelector(".eh-score").textContent, "0 / 4", "the stale score is gone");
  assert.equal(host.querySelector(".eh-state").textContent, "Not started");
  assert.equal(host.querySelector(".exer-prompt").textContent, items[0].prompt, "back to the first item");
  assert.ok(host.querySelectorAll(".eopt").every((o) => !o.disabled), "the stale disabled state is gone");
  assert.ok(!host.querySelector(".exer-fb").classList.contains("show"), "the stale feedback is gone");
  assert.equal(host.querySelector(".exer-next").disabled, true, "the stale enabled Next button is gone");
});

test("the public reset() API clears exercise progress, both storage keys, statistics, and rendered exercise UI", () => {
  const env = boot();
  const items = env.api.getExercises().ex7.items;
  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];
  host.querySelectorAll(".eopt")[items[0].answer].click();
  env.storage.setItem(V1_KEY, JSON.stringify({ m1: true }));
  assert.ok(env.storage.getItem(V1_KEY), "sanity: legacy v1 key is present before reset()");

  const result = env.api.reset();
  assert.equal(result.ok, true, `expected success, got ${JSON.stringify(result)}`);

  assert.equal(env.storage.getItem(V1_KEY), null, "legacy v1 key is removed by reset()");
  const stored = JSON.parse(env.storage.getItem(V2_KEY));
  assert.deepEqual(stored.exercises, {}, "v2 storage no longer carries the exercise record");

  assert.deepEqual(env.api.getProgress().exercises, {});
  assert.equal(host.querySelector(".eh-score").textContent, "0 / 4");
  assert.equal(host.querySelector(".eh-state").textContent, "Not started");
  assert.ok(host.querySelectorAll(".eopt").every((o) => !o.disabled), "the rebuilt exercise is answerable again");
});

test("repeated import and reset operations on an exercise widget create no duplicate controls, listeners, or scoring", () => {
  const env = boot();
  const items = env.api.getExercises().ex7.items;
  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];

  const seed = { v: 2, modules: {}, answers: {}, exercises: { [items[0].id]: { c: true, n: 1, ts: 1 } }, started: 0 };
  env.api.importJSON(seed);
  env.api.importJSON(seed);
  env.api.importJSON(seed);
  env.api.reset();
  env.api.reset();
  const finalSeed = env.api.importJSON(seed);
  assert.equal(finalSeed.ok, true);

  assert.equal(
    env.body.querySelectorAll('.exer[data-exer="ex7"]').length,
    1,
    "still exactly one exercise widget for ex7, not accumulated duplicates",
  );
  assert.equal(host.querySelectorAll(".eopt").length, items[0].options.length, "no duplicate option buttons");
  assert.equal(host.querySelector(".eh-score").textContent, "1 / 4", "no duplicate-listener score inflation across repeated rebuilds");

  // A single click on a freshly rebuilt item must fire recordExercise()
  // exactly once, never more, proving no listener stacking across the
  // five rebuilds above.
  let exerciseEvents = 0;
  env.api.on("exercise", () => { exerciseEvents += 1; });
  host.querySelectorAll(".eopt")[items[1].answer].click();
  assert.equal(exerciseEvents, 1, "exactly one exercise event from one click, no stacked listeners");
});

test("reattempting an exercise item after an import-driven rebuild replaces its prior outcome without double-counting", () => {
  const env = boot();
  const items = env.api.getExercises().ex7.items;
  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];

  // item 1 pre-recorded INCORRECT via import; item 0 left unanswered so
  // the widget resumes there.
  const result = env.api.importJSON({
    v: 2, modules: {}, answers: {},
    exercises: { [items[1].id]: { c: false, n: 1, ts: 1 } },
    started: 0,
  });
  assert.equal(result.ok, true);
  assert.equal(host.querySelector(".eh-score").textContent, "0 / 4");

  host.querySelectorAll(".eopt")[items[0].answer].click(); // answer item 0 correctly
  host.querySelector(".exer-next").click(); // advance to item 1, the already-recorded one

  assert.equal(host.querySelector(".exer-prompt").textContent, items[1].prompt);
  assert.ok(host.querySelectorAll(".eopt").every((o) => !o.disabled), "item 1 is reattemptable, not locked, after the rebuild");

  host.querySelectorAll(".eopt")[items[1].answer].click(); // reattempt item 1, this time correctly

  const rec = env.api.getProgress().exercises[items[1].id];
  assert.deepEqual(rec, { c: true, n: 2, ts: rec.ts }, "the outcome is replaced (c:true) and the attempt count increments -- n:2, not a fresh n:1");
  assert.equal(
    Object.keys(env.api.getProgress().exercises).length,
    2,
    "exactly two exercise records exist (item 0, item 1) -- reattempting item 1 did not create a duplicate record",
  );
  assert.equal(host.querySelector(".eh-score").textContent, "2 / 4", "score reflects both items now correct, not double-counted");
});

test("stable-ID migration and stale-exercise-ID handling remain intact after the rebuild fix", () => {
  const seedEnv = boot();
  const item0 = seedEnv.api.getExercises().ex7.items[0]; // legacyId "ex7-1"
  const seeded = {
    v: 2, modules: {}, answers: {},
    exercises: { "ex7-1": { c: true, n: 1, ts: 5 }, "ex7-77": { c: false, n: 2, ts: 9 } },
    started: 0,
  };
  const env = boot({ storage: { [V2_KEY]: JSON.stringify(seeded) } });
  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];

  const progress = env.api.getProgress();
  assert.deepEqual(progress.exercises[item0.id], { c: true, n: 1, ts: 5 }, "the legacy key migrated to its item's stable id");
  assert.equal(progress.exercises["ex7-1"], undefined);
  assert.deepEqual(
    progress.exercises["ex7-77"],
    { c: false, n: 2, ts: 9 },
    "the orphaned (stale) legacy-shaped key is preserved untouched -- Issue #2 stale-ID policy is unaffected by this rebuild fix",
  );
  assert.equal(host.querySelector(".eh-score").textContent, "1 / 4", "the rendered widget agrees: the stale key never counts, only the real migration does");
});

test("import and reset fire exactly the documented events: progress on both, never a manufactured answer/exercise event", () => {
  const env = boot();
  const items = env.api.getExercises().ex7.items;
  let progressEvents = 0, answerEvents = 0, exerciseEvents = 0;
  env.api.on("progress", () => { progressEvents += 1; });
  env.api.on("answer", () => { answerEvents += 1; });
  env.api.on("exercise", () => { exerciseEvents += 1; });

  const importResult = env.api.importJSON({
    v: 2, modules: {}, answers: {},
    exercises: { [items[0].id]: { c: true, n: 1, ts: 1 } },
    started: 0,
  });
  assert.equal(importResult.ok, true);
  assert.equal(progressEvents, 1, "importJSON() fires exactly one progress event, as already documented");
  assert.equal(answerEvents, 0, "rebuilding widgets from imported data must never manufacture an answer event");
  assert.equal(exerciseEvents, 0, "rebuilding widgets from imported data must never manufacture an exercise event");

  const resetResult = env.api.reset();
  assert.equal(resetResult.ok, true);
  assert.equal(progressEvents, 2, "reset() fires exactly one more progress event (via its existing saveProgress() call), as already documented");
  assert.equal(answerEvents, 0);
  assert.equal(exerciseEvents, 0);
});

test("a preserved disclosure open/closed state survives an import-driven exercise rebuild", () => {
  const env = boot();
  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];
  host.open = true;

  const result = env.api.importJSON({ v: 2, modules: {}, answers: {}, exercises: {}, started: 0 });
  assert.equal(result.ok, true);
  assert.equal(host.open, true, "the <details> element's own open attribute is untouched by an innerHTML-only rebuild");
});

/* ============================ import / export ============================ */

test("export and import round-trip preserves progress", () => {
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[0].click();
  const questions = env.api.getQuestions("m9");
  quizMount(env, "m9").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[questions[0].a].click();

  const exported = env.api.exportJSON();
  const parsed = JSON.parse(exported);
  assert.ok(parsed.exported && parsed.state && parsed.stats);
  assert.equal(parsed.state.v, 2);

  const fresh = boot();
  const result = fresh.api.importJSON(exported);
  assert.equal(result.ok, true);
  assert.equal(fresh.api.getStats().modulesComplete, 1);
  assert.equal(fresh.api.getProgress().answers[questions[0].id].c, true);
  assert.equal(fresh.document.getElementById("tpLabel").textContent, "1 of 17 modules complete");
});

test("imports with the wrong schema version are rejected without corrupting state", () => {
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[0].click();

  // A bare (unwrapped) state object -- every required field present and
  // own, but v is the wrong version -- isolates the schema-version check
  // from wrapper-shape validation (covered separately below).
  const rejected = env.api.importJSON(JSON.stringify({
    v: 1, modules: { m4: true }, answers: {}, exercises: {}, started: 0,
  }));
  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /schema/i);
  assert.equal(env.api.getStats().modulesComplete, 1, "existing progress is untouched");
  assert.equal(env.api.getProgress().modules.m4, undefined);
});

test("unparseable imports are rejected safely", () => {
  const env = boot();
  const result = env.api.importJSON("{not valid json");
  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.equal(env.api.getStats().modulesComplete, 0);
});

/* ============================ import hardening (Issue #2 / QL-006) ============================
   importJSON() used to check only the top-level `v` field and trust
   everything else, and directly assigned `state = s` -- if `json` was
   passed as an object rather than a string, the caller's own object
   became the app's live state by reference. See index.html's
   validateImportedState() for the exact accepted schema. */

/** Captures getProgress()/localStorage/rendered-label/progress-event count,
 * runs the import, then asserts every one of those is byte-for-byte
 * unchanged and the import was rejected -- the same "atomic failure"
 * contract for every rejection category below, in one place. */
function assertImportRejectedAtomically(env, badInput, { errorPattern } = {}) {
  const beforeProgress = JSON.stringify(env.api.getProgress());
  const beforeStorage = env.storage.getItem(V2_KEY);
  const beforeLabel = env.document.getElementById("tpLabel").textContent;
  let progressEvents = 0;
  env.api.on("progress", () => { progressEvents += 1; });

  const result = env.api.importJSON(badInput);

  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  if (errorPattern) assert.match(result.error, errorPattern, `error message: ${result.error}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "getProgress() must be unchanged");
  assert.equal(env.storage.getItem(V2_KEY), beforeStorage, "localStorage must be unchanged");
  assert.equal(env.document.getElementById("tpLabel").textContent, beforeLabel, "rendered state must be unchanged");
  assert.equal(progressEvents, 0, "a rejected import must fire no progress event");
  return result;
}

test("a current export successfully round-trips through import", () => {
  // Baseline coverage already exists ("export and import round-trip
  // preserves progress" above); this adds exercise-outcome coverage so the
  // round trip is proven for all three of modules/answers/exercises, not
  // only modules/answers.
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[0].click();
  const questions = env.api.getQuestions("m1");
  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[questions[0].a].click();
  const exHost = env.body.querySelectorAll(".exer")[0];
  const exKey = exHost.getAttribute("data-exer");
  const exItems = env.api.getExercises()[exKey].items;
  exHost.querySelectorAll(".eopt")[exItems[0].answer].click();

  const exported = env.api.exportJSON();
  const fresh = boot();
  const result = fresh.api.importJSON(exported);
  assert.equal(result.ok, true);
  assert.equal(fresh.api.getStats().modulesComplete, 1);
  assert.equal(fresh.api.getProgress().answers[questions[0].id].c, true);
  assert.equal(fresh.api.getProgress().exercises[exItems[0].id].c, true);
});

test("importing a plain object (not a JSON string) fully detaches live state from the caller's object", () => {
  const env = boot();
  const source = {
    v: 2,
    modules: { m1: true },
    answers: { "m1-q1": { c: true, n: 1, ts: 100 } },
    exercises: {},
    started: 0,
  };
  const result = env.api.importJSON(source);
  assert.equal(result.ok, true);

  // Mutate the caller's own object AFTER import -- top level, and inside a
  // nested outcome record -- and add a brand-new key.
  source.modules.m1 = false;
  source.modules.m2 = true;
  source.answers["m1-q1"].c = false;
  source.answers["m1-q1"].n = 999;
  source.answers["new-fake-q"] = { c: true, n: 1, ts: 1 };

  const progress = env.api.getProgress();
  assert.equal(progress.modules.m1, true, "live progress must not follow the caller's later mutation");
  assert.equal(progress.modules.m2, undefined);
  assert.equal(progress.answers["m1-q1"].c, true);
  assert.equal(progress.answers["m1-q1"].n, 1);
  assert.equal(progress.answers["new-fake-q"], undefined);
});

test("an import missing the schema version entirely is rejected", () => {
  const env = boot();
  const missingV = JSON.stringify({ modules: {}, answers: {}, exercises: {}, started: 0 });
  assertImportRejectedAtomically(env, missingV, { errorPattern: /missing required own field: v/i });
});

test("an oversized import string is rejected before it is ever parsed", () => {
  const env = boot();
  // Deliberately NOT valid JSON. If size were checked after (or not at all,
  // relying on JSON.parse to eventually choke), this would fail with a JSON
  // syntax error instead of a size-specific one -- getting the size error
  // proves the length check runs first.
  const hostileButInvalidJson = "x".repeat(300000);
  assertImportRejectedAtomically(env, hostileButInvalidJson, { errorPattern: /too large/i });
});

test("import rejects a payload with too many total progress entries", () => {
  const env = boot();
  const modules = {};
  for (let i = 0; i < 2001; i += 1) { modules[`fake-module-${i}`] = true; }
  const tooManyEntries = JSON.stringify({ v: 2, modules, answers: {}, exercises: {}, started: 0 });
  assertImportRejectedAtomically(env, tooManyEntries, { errorPattern: /too many/i });
});

test("an import with valid modules/answers but one malformed exercises entry writes nothing at all", () => {
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[2].click();
  const before = JSON.stringify(env.api.getProgress());

  const mixedInput = JSON.stringify({
    v: 2,
    modules: { m1: true, m5: true },
    answers: { "m1-q1": { c: true, n: 1, ts: 1 } },
    exercises: { "ex7-i1": { c: true, n: 0, ts: 1 } }, // n:0 is invalid (must be >= 1)
    started: 0,
  });
  const result = env.api.importJSON(mixedInput);
  assert.equal(result.ok, false);
  assert.equal(
    JSON.stringify(env.api.getProgress()),
    before,
    "no partial write occurred -- the valid modules/answers fields never leaked in",
  );
});

test("a dangerous __proto__ key never actually pollutes Object.prototype, even in a rejected import", () => {
  const env = boot();
  // Deliberately a raw JSON STRING, not a JS object literal: writing
  // `{ __proto__: ... }` (bareword or quoted) in JS source sets the
  // object's actual prototype instead of creating an own property, and so
  // does plain bracket assignment (`obj["__proto__"] = ...`) on an
  // ordinary object -- both go through Object.prototype's inherited
  // `__proto__` accessor. JSON.parse is different: it defines the property
  // directly, bypassing that accessor, so a real hostile payload really
  // does carry `__proto__` as a genuine own key. Verified directly (not
  // assumed) below before relying on it, since two different JS-source
  // ways of trying to build this same fixture were both silently wrong.
  const hostile =
    '{"v":2,"modules":{},"answers":{"m1-q1":{"c":true,"n":1,"ts":1},' +
    '"__proto__":{"c":true,"n":1,"ts":1}},"exercises":{},"started":0}';
  const sanity = JSON.parse(hostile);
  assert.deepEqual(Object.keys(sanity.answers), ["m1-q1", "__proto__"], "sanity: __proto__ is a real own key here");
  assertImportRejectedAtomically(env, hostile);
  // The real proof: check the COURSE'S OWN vm realm (a separate global
  // object from this test file's), since that is the only realm the
  // import logic could possibly pollute.
  assert.equal(
    vm.runInContext("({}).polluted", env.sandbox),
    undefined,
    "Object.prototype in the course's own realm must not be polluted",
  );
});

const REJECTION_FIXTURES = [
  { label: "modules is an array", input: { v: 2, modules: [], answers: {}, exercises: {}, started: 0 } },
  { label: "modules is null", input: { v: 2, modules: null, answers: {}, exercises: {}, started: 0 } },
  {
    label: "a modules entry is not the literal true",
    input: { v: 2, modules: { m1: "yes" }, answers: {}, exercises: {}, started: 0 },
  },
  { label: "answers is a string", input: { v: 2, modules: {}, answers: "nope", exercises: {}, started: 0 } },
  {
    label: "an answers entry is null",
    input: { v: 2, modules: {}, answers: { "m1-q1": null }, exercises: {}, started: 0 },
  },
  {
    label: "an answers entry is an array",
    input: { v: 2, modules: {}, answers: { "m1-q1": [] }, exercises: {}, started: 0 },
  },
  {
    label: "an answers entry has a non-boolean c",
    input: { v: 2, modules: {}, answers: { "m1-q1": { c: "true", n: 1, ts: 1 } }, exercises: {}, started: 0 },
  },
  {
    label: "an answers entry has a zero n",
    input: { v: 2, modules: {}, answers: { "m1-q1": { c: true, n: 0, ts: 1 } }, exercises: {}, started: 0 },
  },
  {
    label: "an answers entry has a negative n",
    input: { v: 2, modules: {}, answers: { "m1-q1": { c: true, n: -1, ts: 1 } }, exercises: {}, started: 0 },
  },
  {
    label: "an answers entry has a non-integer n",
    input: { v: 2, modules: {}, answers: { "m1-q1": { c: true, n: 1.5, ts: 1 } }, exercises: {}, started: 0 },
  },
  {
    label: "an answers entry has a string n",
    input: { v: 2, modules: {}, answers: { "m1-q1": { c: true, n: "1", ts: 1 } }, exercises: {}, started: 0 },
  },
  {
    label: "an answers entry has a negative ts",
    input: { v: 2, modules: {}, answers: { "m1-q1": { c: true, n: 1, ts: -5 } }, exercises: {}, started: 0 },
  },
  {
    label: "an answers entry has a string ts",
    input: { v: 2, modules: {}, answers: { "m1-q1": { c: true, n: 1, ts: "1" } }, exercises: {}, started: 0 },
  },
  {
    label: "an answers entry has an extra unexpected key",
    input: {
      v: 2,
      modules: {},
      answers: { "m1-q1": { c: true, n: 1, ts: 1, extra: true } },
      exercises: {},
      started: 0,
    },
  },
  {
    label: "an exercises entry is malformed the same way answers entries are validated",
    input: { v: 2, modules: {}, answers: {}, exercises: { "ex7-i1": { c: true, n: 0, ts: 1 } }, started: 0 },
  },
  {
    label: "a dangerous constructor key in modules",
    input: { v: 2, modules: { constructor: true }, answers: {}, exercises: {}, started: 0 },
  },
  {
    label: "a dangerous prototype key in exercises",
    input: { v: 2, modules: {}, answers: {}, exercises: { prototype: { c: true, n: 1, ts: 1 } }, started: 0 },
  },
  {
    label: "an unrecognized top-level field",
    input: { v: 2, modules: {}, answers: {}, exercises: {}, started: 0, bogus: true },
  },
  {
    label: "a non-numeric started timestamp",
    input: { v: 2, modules: {}, answers: {}, exercises: {}, started: "nope" },
  },
  {
    // Raw JSON string, not a JS object literal: `{ __proto__: ... }` (bareword
    // or quoted) in JS source sets the object's actual prototype instead of
    // creating an own property, so JSON.stringify-ing it would silently drop
    // the key and test nothing (see the dedicated __proto__ test above for
    // the full explanation and a from-scratch verification of this).
    // JSON.parse, unlike an object literal or bracket assignment, defines
    // the property directly and does carry it through.
    label: "a dangerous __proto__ key at the top level of the state object",
    raw: '{"v":2,"modules":{},"answers":{},"exercises":{},"started":0,"__proto__":{"polluted":true}}',
  },
];

for (const fixture of REJECTION_FIXTURES) {
  test(`import rejects and leaves state unchanged: ${fixture.label}`, () => {
    const env = boot();
    assertImportRejectedAtomically(env, fixture.raw || JSON.stringify(fixture.input));
  });
}

const MISSING_REQUIRED_STATE_FIELDS = ["modules", "answers", "exercises", "started"];
for (const field of MISSING_REQUIRED_STATE_FIELDS) {
  // "v" missing entirely is covered by its own dedicated test above; this
  // covers the remaining four required own fields the same way.
  test(`import rejects a state object missing the required own field: ${field}`, () => {
    const env = boot();
    const full = { v: 2, modules: {}, answers: {}, exercises: {}, started: 0 };
    delete full[field];
    assertImportRejectedAtomically(env, JSON.stringify(full), {
      errorPattern: new RegExp(`missing required own field: ${field}`, "i"),
    });
  });
}

/* ============================ import hardening — correction pass ============================
   Independent review found three further gaps in the hardening above, all
   fixed in index.html's IMPORT VALIDATION block and importJSON(): (1) a
   successful validation could still be silently lost to a storage failure,
   (2) required fields were checked by property ACCESS rather than OWN-ness,
   letting an object with the right values entirely on its prototype pass,
   and (3) the export-wrapper envelope was unwrapped without validating its
   own shape. See that block's comment for the full account of each. */

test("a persistence failure during import leaves state, storage, the UI, and events entirely unchanged", () => {
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[0].click();
  const beforeProgress = JSON.stringify(env.api.getProgress());
  const beforeStorage = env.storage.getItem(V2_KEY);
  const beforeLabel = env.document.getElementById("tpLabel").textContent;
  let progressEvents = 0;
  env.api.on("progress", () => { progressEvents += 1; });

  const originalSetItem = env.storage.setItem;
  env.storage.setItem = () => { throw new Error("QuotaExceededError"); };
  let result;
  try {
    const validImport = JSON.stringify({ v: 2, modules: { m4: true }, answers: {}, exercises: {}, started: 0 });
    result = env.api.importJSON(validImport);
  } finally {
    env.storage.setItem = originalSetItem;
  }

  assert.equal(result.ok, false, `an otherwise-valid import must fail when persistence fails, got ${JSON.stringify(result)}`);
  assert.match(result.error, /save|storage|quota/i);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "getProgress() must be unchanged");
  assert.equal(env.storage.getItem(V2_KEY), beforeStorage, "localStorage must be unchanged");
  assert.equal(env.document.getElementById("tpLabel").textContent, beforeLabel, "rendered state must be unchanged");
  assert.equal(progressEvents, 0, "a persistence failure must fire no progress event");

  // Prove the write really would have succeeded afterward -- i.e. this
  // wasn't rejected for some unrelated reason -- confirming the failure
  // above was specifically about persistence, not validation.
  const retryResult = env.api.importJSON(JSON.stringify({ v: 2, modules: { m4: true }, answers: {}, exercises: {}, started: 0 }));
  assert.equal(retryResult.ok, true, `the same import must succeed once storage works again, got ${JSON.stringify(retryResult)}`);
});

test("a state object with required fields only on its prototype is rejected, not read through the prototype chain", () => {
  // The prototype itself is built with Object.create(null), so the
  // hostile object's own prototype chain is exactly one level deep --
  // proto's own prototype IS null -- the same shape as an ordinary plain
  // object or an explicit null-prototype record, and so it passes the
  // record-object check (isRecordObject()) and isolates the OWNERSHIP
  // check this test exists to prove, rather than being rejected one layer
  // earlier for having a non-record prototype chain (see the dedicated
  // test below for that separate case).
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  const proto = Object.create(null);
  proto.v = 2; proto.modules = { m4: true }; proto.answers = {}; proto.exercises = {}; proto.started = 0;
  const hostile = Object.create(proto);
  assert.deepEqual(Object.keys(hostile), [], "sanity: the hostile object owns nothing");
  assert.equal(hostile.v, 2, "sanity: v is still readable via the prototype chain");

  const result = env.api.importJSON(hostile);
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.match(result.error, /missing required own field/i);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("a state object whose prototype chain is deeper than a plain record (fields inherited through an intermediate plain object) is rejected outright", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  // Here the intermediate prototype is an ORDINARY plain object (own
  // prototype is Object.prototype, not null), so the whole chain is two
  // levels deep -- not the shape of any genuine record object -- and
  // isRecordObject() rejects it before ownership is ever checked.
  const proto = { v: 2, modules: { m4: true }, answers: {}, exercises: {}, started: 0 };
  const hostile = Object.create(proto);
  assert.equal(Object.getPrototypeOf(Object.getPrototypeOf(hostile)), Object.prototype, "sanity: chain is two levels deep");

  const result = env.api.importJSON(hostile);
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("an outcome record with inherited c/n/ts plus three unrelated own keys is rejected", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  const proto = { c: true, n: 1, ts: 1 };
  const hostileRecord = Object.create(proto);
  hostileRecord.foo = 1; hostileRecord.bar = 2; hostileRecord.baz = 3;
  assert.deepEqual(Object.keys(hostileRecord).sort(), ["bar", "baz", "foo"], "sanity: three own keys, none of them c/n/ts");
  assert.equal(hostileRecord.c, true, "sanity: c is still readable via the prototype chain");

  const hostileState = { v: 2, modules: {}, answers: { "m1-q1": hostileRecord }, exercises: {}, started: 0 };
  const result = env.api.importJSON(hostileState);
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("import wrapper rejects an unknown top-level field", () => {
  const env = boot();
  const validState = { v: 2, modules: {}, answers: {}, exercises: {}, started: 0 };
  const hostile = JSON.stringify({ exported: "x", state: validState, stats: {}, bogus: true });
  assertImportRejectedAtomically(env, hostile, { errorPattern: /unrecognized field in import wrapper/i });
});

test("import wrapper rejects a dangerous own key", () => {
  const env = boot();
  const hostile = '{"exported":"x","state":{"v":2,"modules":{},"answers":{},"exercises":{},"started":0},'
    + '"stats":{},"__proto__":{"polluted":true}}';
  const sanity = JSON.parse(hostile);
  assert.ok(Object.prototype.hasOwnProperty.call(sanity, "__proto__"), "sanity: __proto__ is a real own key here");
  assertImportRejectedAtomically(env, hostile, { errorPattern: /disallowed key/i });
});

test("a wrapper whose state is only inherited (not own) is rejected, not silently unwrapped", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  const proto = { state: { v: 2, modules: { m4: true }, answers: {}, exercises: {}, started: 0 } };
  const hostile = Object.create(proto);
  hostile.exported = "x";
  hostile.stats = {};
  assert.equal(Object.prototype.hasOwnProperty.call(hostile, "state"), false, "sanity: state is only inherited");
  assert.equal(hostile.state.modules.m4, true, "sanity: state is still readable via the prototype chain");

  const result = env.api.importJSON(hostile);
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("import wrapper rejects a missing required field (exported)", () => {
  const env = boot();
  const validState = { v: 2, modules: {}, answers: {}, exercises: {}, started: 0 };
  const missingExported = JSON.stringify({ state: validState, stats: {} });
  assertImportRejectedAtomically(env, missingExported, { errorPattern: /missing a required own field/i });
});

test("import wrapper rejects wrong field types for exported/stats", () => {
  const env = boot();
  const validState = { v: 2, modules: {}, answers: {}, exercises: {}, started: 0 };
  assertImportRejectedAtomically(
    env,
    JSON.stringify({ exported: 12345, state: validState, stats: {} }),
    { errorPattern: /exported field must be a string/i },
  );
  assertImportRejectedAtomically(
    env,
    JSON.stringify({ exported: "x", state: validState, stats: "nope" }),
    { errorPattern: /stats field must be an object/i },
  );
});

test("a valid current export wrapper round-trips through import", () => {
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[0].click();
  const exported = env.api.exportJSON();
  const parsed = JSON.parse(exported);
  assert.ok(Object.prototype.hasOwnProperty.call(parsed, "exported"));
  assert.ok(Object.prototype.hasOwnProperty.call(parsed, "state"));
  assert.ok(Object.prototype.hasOwnProperty.call(parsed, "stats"));
  assert.deepEqual(Object.keys(parsed).sort(), ["exported", "state", "stats"]);

  const fresh = boot();
  const result = fresh.api.importJSON(exported);
  assert.equal(result.ok, true, `expected success, got ${JSON.stringify(result)}`);
  assert.equal(fresh.api.getStats().modulesComplete, 1);
});

/* ============================ import hardening — record-object correction pass ============================
   Independent review found a fourth gap: isPlainObject() only checked
   `typeof x === 'object' && !Array.isArray(x)`, which is true of ANY
   non-array object -- including exotic built-ins (Date, Map, Set, RegExp)
   that carry no data reachable through ordinary own-property enumeration,
   so e.g. `{modules: new Date(0)}` was silently accepted as an empty
   `modules` map. The exact-shape checks were also built on Object.keys(),
   which lists only OWN ENUMERABLE STRING keys -- invisible to a
   non-enumerable extra property, a symbol-keyed property, or an accessor
   (getter/setter) property, any of which could smuggle data past the
   "exactly these own keys" checks or reintroduce a validate-once/persist-
   different-value TOCTOU gap. See index.html's isRecordObject()/
   hasOnlyOwnDataProperties() and the file-level IMPORT VALIDATION comment
   for the full account; all four counterexamples below were confirmed as
   real, working exploits by direct execution against the pre-fix
   validator before any fix was written. */

test("import rejects a state whose modules/answers are exotic built-ins (Date/Map), not record objects", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());
  // Object.keys(new Date(0)) and Object.keys(new Map()) are both [] --
  // without a record-object check, these silently pass as "empty" maps.
  const hostile = { v: 2, modules: new Date(0), answers: new Map(), exercises: {}, started: 0 };
  const result = env.api.importJSON(hostile);
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("import rejects a state whose exercises container is a Set, and one whose modules container is a RegExp", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  const withSet = { v: 2, modules: {}, answers: {}, exercises: new Set(), started: 0 };
  let result = env.api.importJSON(withSet);
  assert.equal(result.ok, false, `expected rejection (Set), got ${JSON.stringify(result)}`);

  // A RegExp instance owns a non-enumerable `lastIndex` property, so it is
  // caught by hasOnlyOwnDataProperties() even before isRecordObject() --
  // either defense alone is sufficient here, which is the point of
  // combining both rather than relying on just one.
  const withRegExp = { v: 2, modules: /x/, answers: {}, exercises: {}, started: 0 };
  result = env.api.importJSON(withRegExp);
  assert.equal(result.ok, false, `expected rejection (RegExp), got ${JSON.stringify(result)}`);

  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("a Symbol.toStringTag-spoofing exotic object is still rejected as a modules container", () => {
  // Confirms the record-object check inspects prototype-chain SHAPE, not
  // Object.prototype.toString -- a Map subclass that overrides its tag to
  // read as "[object Object]" must not be able to disguise itself as a
  // plain object this way.
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  class SpoofedMap extends Map {
    get [Symbol.toStringTag]() { return "Object"; }
  }
  const spoofed = new SpoofedMap();
  assert.equal(Object.prototype.toString.call(spoofed), "[object Object]", "sanity: the tag really is spoofed");

  const result = env.api.importJSON({ v: 2, modules: spoofed, answers: {}, exercises: {}, started: 0 });
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("import rejects an outcome record with a non-enumerable extra own property", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  const rec = { c: true, n: 1, ts: 1 };
  Object.defineProperty(rec, "hidden", { value: "secret", enumerable: false });
  assert.deepEqual(Object.keys(rec), ["c", "n", "ts"], "sanity: Object.keys() cannot see the extra property");
  assert.equal(Object.getOwnPropertyNames(rec).length, 4, "sanity: it is a genuine fourth own property");

  const result = env.api.importJSON({ v: 2, modules: {}, answers: { "m1-q1": rec }, exercises: {}, started: 0 });
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("import rejects an outcome record whose c field is an accessor (getter), not a data property", () => {
  // A getter's value can legally differ between the read that validates it
  // and the later read that persists it -- rejecting any accessor
  // property closes that gap outright rather than trusting a single read.
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  const rec = { n: 1, ts: 1 };
  let reads = 0;
  Object.defineProperty(rec, "c", {
    get(){ reads += 1; return reads === 1; }, // true on the first read, false thereafter
    enumerable: true, configurable: true,
  });

  const result = env.api.importJSON({ v: 2, modules: {}, answers: { "m1-q1": rec }, exercises: {}, started: 0 });
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("import rejects a state with an own Symbol key", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  const sym = Symbol("evil");
  const hostile = { v: 2, modules: {}, answers: {}, exercises: {}, started: 0 };
  hostile[sym] = "malicious payload smuggled via a symbol key";
  assert.deepEqual(Object.keys(hostile).sort(), ["answers", "exercises", "modules", "started", "v"], "sanity: Object.keys() cannot see the symbol key");

  const result = env.api.importJSON(hostile);
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("import wrapper rejects a stats field that is an exotic built-in (Date), not a record object", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  const hostile = {
    exported: "x",
    state: { v: 2, modules: {}, answers: {}, exercises: {}, started: 0 },
    stats: new Date(0),
  };
  const result = env.api.importJSON(hostile);
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "existing progress is untouched");
});

test("null-prototype objects are accepted as valid records at every level (state, containers, and outcome records)", () => {
  // Documents the deliberate decision: a null-prototype object behaves
  // identically to an ordinary plain object for every check this
  // validator performs (all of them use explicit hasOwnProperty/bracket
  // access, never the object's own inherited methods), so a direct
  // (non-JSON-string) caller who builds one to avoid prototype-pollution
  // surface entirely is not penalized for it.
  const env = boot();

  const rec = Object.create(null);
  rec.c = true; rec.n = 1; rec.ts = 1;
  const answers = Object.create(null);
  answers["m1-q1"] = rec;
  const state = Object.create(null);
  state.v = 2; state.modules = Object.create(null); state.answers = answers;
  state.exercises = Object.create(null); state.started = 0;
  assert.equal(Object.getPrototypeOf(state), null, "sanity: state truly has no prototype");

  const result = env.api.importJSON(state);
  assert.equal(result.ok, true, `expected success, got ${JSON.stringify(result)}`);
  assert.equal(env.api.getProgress().answers["m1-q1"].c, true);
});

/* ============================ stale-ID policy (Issue #2 / QL-024) ============================
   A modules/answers/exercises key can outlive the content it once
   described: a question renumbered or removed, an exercise item dropped,
   a module deleted, or a runtime-injected question whose session ended.
   Policy (see index.html's PROGRESS file-level comment for the full
   record): PRESERVE the record under its original id -- never delete,
   move, or quarantine it on load/migration/import -- and let every
   current-facing consumer decide "does this id count" by checking
   membership in the live MODULES/QUIZZES/EXERCISES data at READ time, not
   by trusting a stored map's own keys. A real bug this closes: getStats()
   used to count every key in state.answers regardless of whether the
   course still recognized it, so a state holding only a stale answer
   record reported a fabricated 100% overall accuracy -- confirmed by
   direct execution against the pre-fix code before it was corrected. */

test("known and stale question records in the same state contribute independently to getStats()", () => {
  const env = boot();
  const currentId = env.api.getQuestions("m1")[0].id;
  const result = env.api.importJSON({
    v: 2, modules: {}, exercises: {},
    answers: {
      [currentId]: { c: true, n: 1, ts: 1 },
      "totally-fake-question-id": { c: true, n: 5, ts: 2 },
    },
    started: 0,
  });
  assert.equal(result.ok, true, `expected success, got ${JSON.stringify(result)}`);

  const stats = env.api.getStats();
  assert.equal(stats.questionsAnswered, 1, "only the current-content id counts toward questionsAnswered");
  assert.equal(stats.questionsCorrect, 1);
  assert.equal(stats.overallPct, 100, "a fabricated stale record must not dilute or inflate overallPct");

  // Preserved, not deleted -- exact value-for-value intact.
  const stale = env.api.getProgress().answers["totally-fake-question-id"];
  assert.deepEqual(stale, { c: true, n: 5, ts: 2 }, "the stale record itself is untouched, only excluded from current stats");
});

test("known and stale exercise records in the same state: only the current record reaches rendered score", () => {
  const seedEnv = boot();
  const currentId = seedEnv.api.getExercises().ex7.items[0].id;
  const seeded = {
    v: 2, modules: {},
    answers: {},
    exercises: {
      [currentId]: { c: true, n: 1, ts: 1 },
      "stale-exercise-xyz": { c: true, n: 3, ts: 2 },
    },
    started: 0,
  };
  // Seeded directly into storage and booted fresh, rather than routed
  // through importJSON(), because importJSON() only rebuilds quiz mounts
  // on success (re-rendering exercise widgets after import/Reset is a
  // separate, still-open Milestone 1 item this PR deliberately does not
  // implement) -- a fresh boot is the documented, already-covered path by
  // which a persisted exercise state actually reaches the rendered DOM.
  const env = boot({ storage: { [V2_KEY]: JSON.stringify(seeded) } });

  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];
  assert.equal(host.querySelector(".eh-score").textContent, "1 / 4", "the stale record must not inflate the rendered score");
  assert.equal(host.querySelector(".eh-state").textContent, "In progress");

  assert.deepEqual(
    env.api.getProgress().exercises["stale-exercise-xyz"],
    { c: true, n: 3, ts: 2 },
    "the stale exercise record is preserved untouched",
  );
});

test("a state containing only stale module/answer/exercise records produces zero current-facing figures", () => {
  const env = boot();
  const result = env.api.importJSON({
    v: 2,
    modules: { "stale-module-xyz": true },
    answers: { "stale-question-xyz": { c: true, n: 1, ts: 1 } },
    exercises: { "stale-exercise-xyz": { c: true, n: 1, ts: 1 } },
    started: 0,
  });
  assert.equal(result.ok, true, `expected success, got ${JSON.stringify(result)}`);

  const stats = env.api.getStats();
  assert.equal(stats.modulesComplete, 0);
  assert.equal(stats.questionsAnswered, 0);
  assert.equal(stats.questionsCorrect, 0);
  assert.equal(stats.overallPct, null);
  // JSON.stringify comparison, not assert.deepEqual, against these three:
  // tally() builds them via raw object-literal syntax inside the vm
  // sandbox, so their prototype is that realm's own intrinsic
  // Object.prototype, not this test file's -- assert.deepEqual (strict)
  // checks prototype identity and fails on that alone even when every
  // enumerable property matches, confirmed directly against Node's assert
  // before relying on JSON.stringify here instead.
  assert.equal(JSON.stringify(stats.byDomain), "{}");
  assert.equal(JSON.stringify(stats.byTopic), "{}");
  assert.equal(JSON.stringify(stats.byDifficulty), "{}");

  // Every current question is reported unmastered (zero attempts), never
  // thrown off by the presence of records for ids it doesn't recognize.
  const unmastered = env.api.getUnmastered();
  const totalQuestions = Object.values(env.api.getQuestions()).reduce((n, arr) => n + arr.length, 0);
  assert.equal(unmastered.length, totalQuestions);
  assert.ok(unmastered.every((u) => u.attempts === 0));

  // Preserved, not silently dropped.
  const progress = env.api.getProgress();
  assert.equal(progress.modules["stale-module-xyz"], true);
  assert.deepEqual(progress.answers["stale-question-xyz"], { c: true, n: 1, ts: 1 });
  assert.deepEqual(progress.exercises["stale-exercise-xyz"], { c: true, n: 1, ts: 1 });
});

test("an orphaned (non-migratable) legacy exercise key survives migration inert, alongside a real migration", () => {
  const seedEnv = boot();
  const item0 = seedEnv.api.getExercises().ex7.items[0]; // legacyId "ex7-1"
  const seeded = {
    v: 2, modules: {}, answers: {},
    exercises: {
      "ex7-1": { c: true, n: 1, ts: 5 }, // matches item0.legacyId -- must migrate
      "ex7-77": { c: false, n: 2, ts: 9 }, // matches no current item's legacyId -- stale, orphaned
    },
    started: 0,
  };
  const env = boot({ storage: { [V2_KEY]: JSON.stringify(seeded) } });

  const progress = env.api.getProgress();
  assert.deepEqual(progress.exercises[item0.id], { c: true, n: 1, ts: 5 }, "the real legacy key migrated to its item's stable id");
  assert.equal(progress.exercises["ex7-1"], undefined, "the migrated legacy key is gone");
  assert.deepEqual(
    progress.exercises["ex7-77"],
    { c: false, n: 2, ts: 9 },
    "the orphaned legacy-shaped key is preserved untouched -- never deleted, never merged into item0's record",
  );

  // The orphaned key never reaches any current item's rendered score.
  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];
  assert.equal(host.querySelector(".eh-score").textContent, "1 / 4");

  // Migration actually ran (a real key changed), so it must have persisted
  // -- and the orphaned key must still be present in the persisted form.
  const stored = JSON.parse(env.storage.getItem(V2_KEY));
  assert.deepEqual(stored.exercises["ex7-77"], { c: false, n: 2, ts: 9 });
  assert.equal(stored.exercises["ex7-1"], undefined);
});

test("reordering the live QUIZZES array cannot attach a stale answer record to a different current question", () => {
  const first = boot();
  const qs = first.api.getQuestions("m1");
  const result = first.api.importJSON({
    v: 2, modules: {}, exercises: {},
    answers: { "totally-fake-question-id": { c: true, n: 9, ts: 1 } },
    started: 0,
  });
  assert.equal(result.ok, true);

  const anchor = "/* ============================ FLASHCARDS ============================ */";
  assert.ok(inlineScript.includes(anchor), "injection anchor must exist in the real script");
  const mutatedScript = inlineScript.replace(anchor, `QUIZZES.m1.reverse();\n\n  ${anchor}`);
  assert.notEqual(mutatedScript, inlineScript);

  const mutatedEnv = createEnvironment(staticBody, { storage: first.storage._raw });
  vm.createContext(mutatedEnv.sandbox);
  vm.runInContext(mutatedScript, mutatedEnv.sandbox, { filename: "index.inline.quiz-reordered.js", timeout: 15_000 });
  mutatedEnv.api = mutatedEnv.sandbox.window.CytoCourse;

  const reorderedQs = mutatedEnv.api.getQuestions("m1");
  assert.equal(reorderedQs[reorderedQs.length - 1].id, qs[0].id, "sanity: reversal really moved the former-first question");

  // Whatever question now occupies m1's former array position 0 must not
  // suddenly read as answered because of the stale (fabricated) record.
  assert.equal(mutatedEnv.api.getProgress().answers[reorderedQs[0].id], undefined);
  assert.equal(mutatedEnv.api.getStats().questionsAnswered, 0, "the stale record still doesn't count after reordering");
  assert.deepEqual(
    mutatedEnv.api.getProgress().answers["totally-fake-question-id"],
    { c: true, n: 9, ts: 1 },
    "the stale record itself survived the reorder untouched, still under its own id",
  );
});

test("reordering EXERCISES.ex7.items cannot attach a stale exercise record to a different current item", () => {
  const seedEnv = boot();
  const items = seedEnv.api.getExercises().ex7.items;
  const seeded = {
    v: 2, modules: {}, answers: {},
    exercises: { "totally-fake-exercise-id": { c: true, n: 9, ts: 1 } },
    started: 0,
  };

  const anchor = "/* ============================ FLASHCARDS ============================ */";
  const mutatedScript = inlineScript.replace(anchor, `EXERCISES.ex7.items.reverse();\n\n  ${anchor}`);
  assert.notEqual(mutatedScript, inlineScript);

  const env = createEnvironment(staticBody, { storage: { [V2_KEY]: JSON.stringify(seeded) } });
  vm.createContext(env.sandbox);
  vm.runInContext(mutatedScript, env.sandbox, { filename: "index.inline.ex-reordered.js", timeout: 15_000 });
  env.api = env.sandbox.window.CytoCourse;

  const reorderedItems = env.api.getExercises().ex7.items;
  assert.equal(reorderedItems[reorderedItems.length - 1].id, items[0].id, "sanity: reversal really moved the former-first item");

  const host = env.body.querySelectorAll('.exer[data-exer="ex7"]')[0];
  assert.equal(host.querySelector(".eh-score").textContent, "0 / 4", "no current item reads as answered because of the stale record");
  assert.deepEqual(
    env.api.getProgress().exercises["totally-fake-exercise-id"],
    { c: true, n: 9, ts: 1 },
    "the stale record survived the reorder untouched",
  );
});

test("reload after stale-state normalization is idempotent and getStats() stays consistent across reloads", () => {
  const seedEnv = boot();
  const item0 = seedEnv.api.getExercises().ex7.items[0];
  const seeded = {
    v: 2, modules: { "stale-module-xyz": true }, answers: {},
    exercises: { "ex7-1": { c: true, n: 1, ts: 5 }, "ex7-77": { c: false, n: 2, ts: 9 } },
    started: 0,
  };
  const first = boot({ storage: { [V2_KEY]: JSON.stringify(seeded) } });
  const afterFirstLoad = first.storage.getItem(V2_KEY);
  const statsAfterFirstLoad = first.api.getStats();

  const second = boot({ storage: { [V2_KEY]: afterFirstLoad } });
  const afterSecondLoad = second.storage.getItem(V2_KEY);

  assert.equal(afterSecondLoad, afterFirstLoad, "a second load against already-normalized state performs zero further writes");
  // JSON.stringify, not assert.deepEqual: getStats() nests objects built
  // via raw object-literal syntax inside each boot()'s own vm realm, and
  // `first`/`second` are two SEPARATE realms (each boot() call creates a
  // fresh vm context) -- their respective intrinsic Object.prototypes
  // differ from each other, not just from this test file's.
  assert.equal(JSON.stringify(second.api.getStats()), JSON.stringify(statsAfterFirstLoad), "getStats() agrees across reloads");
  assert.deepEqual(
    second.api.getProgress().exercises["ex7-77"],
    { c: false, n: 2, ts: 9 },
    "the orphaned stale key survives a second reload untouched",
  );
  assert.deepEqual(second.api.getProgress().exercises[item0.id], { c: true, n: 1, ts: 5 });
  assert.equal(second.api.getProgress().modules["stale-module-xyz"], true);
});

test("export/import round-trip preserves stale records byte-for-byte while excluding them from stats, on both sides", () => {
  const env = boot();
  const currentQId = env.api.getQuestions("m1")[0].id;
  const currentExId = env.api.getExercises().ex7.items[0].id;
  const result = env.api.importJSON({
    v: 2,
    modules: {},
    answers: { [currentQId]: { c: true, n: 1, ts: 1 }, "stale-q": { c: false, n: 9, ts: 2 } },
    exercises: { [currentExId]: { c: true, n: 1, ts: 1 }, "stale-ex": { c: true, n: 3, ts: 3 } },
    started: 0,
  });
  assert.equal(result.ok, true);

  const exported = env.api.exportJSON();
  const parsed = JSON.parse(exported);
  assert.deepEqual(parsed.state.answers["stale-q"], { c: false, n: 9, ts: 2 }, "raw exported state includes the stale record exactly");
  assert.deepEqual(parsed.state.exercises["stale-ex"], { c: true, n: 3, ts: 3 });
  assert.equal(parsed.stats.questionsAnswered, 1, "the exported stats block excludes the stale record");

  const fresh = boot();
  const reimport = fresh.api.importJSON(exported);
  assert.equal(reimport.ok, true, `expected success, got ${JSON.stringify(reimport)}`);
  assert.deepEqual(fresh.api.getProgress().answers["stale-q"], { c: false, n: 9, ts: 2 }, "round-trip preserves the stale record value-for-value");
  assert.deepEqual(fresh.api.getProgress().answers[currentQId], { c: true, n: 1, ts: 1 }, "the current record round-trips value-for-value too");
  assert.equal(fresh.api.getStats().questionsAnswered, 1, "stats still exclude the stale record after the round trip");
});

test("loading or importing a stale-only state fires no misleading answer/exercise events, only progress", () => {
  const env = boot();
  let answerEvents = 0, exerciseEvents = 0, progressEvents = 0;
  env.api.on("answer", () => { answerEvents += 1; });
  env.api.on("exercise", () => { exerciseEvents += 1; });
  env.api.on("progress", () => { progressEvents += 1; });

  const result = env.api.importJSON({
    v: 2,
    modules: { "stale-module-xyz": true },
    answers: { "stale-q": { c: true, n: 1, ts: 1 } },
    exercises: { "stale-ex": { c: true, n: 1, ts: 1 } },
    started: 0,
  });
  assert.equal(result.ok, true);
  assert.equal(answerEvents, 0, "normalizing/accepting a stale record must never look like the learner answering a question");
  assert.equal(exerciseEvents, 0, "normalizing/accepting a stale record must never look like the learner completing an exercise");
  assert.equal(progressEvents, 1, "a genuinely persisted import still fires exactly one progress event, as documented");
});

test("import atomicity and storage-failure behavior remain intact when stale ids are present alongside malformed data", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());

  // A stale id (answers-a-question-that-doesn't-exist) sitting right next
  // to a genuinely malformed record (n:0 is invalid) -- the malformed
  // record must still cause a full atomic rejection; the presence of a
  // stale-but-structurally-valid sibling must not change that.
  const mixed = {
    v: 2, modules: {},
    answers: { "stale-q": { c: true, n: 1, ts: 1 }, "m1-bad": { c: true, n: 0, ts: 1 } },
    exercises: {},
    started: 0,
  };
  const result = env.api.importJSON(mixed);
  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "rejection must leave existing progress fully untouched");
});

test("a persistence failure during a stale-record-containing import leaves state, storage, and events unchanged", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());
  const beforeStorage = env.storage.getItem(V2_KEY);
  let progressEvents = 0;
  env.api.on("progress", () => { progressEvents += 1; });

  const originalSetItem = env.storage.setItem;
  env.storage.setItem = () => { throw new Error("QuotaExceededError"); };
  let result;
  try {
    result = env.api.importJSON({
      v: 2, modules: {}, exercises: {},
      answers: { "stale-q": { c: true, n: 1, ts: 1 } },
      started: 0,
    });
  } finally {
    env.storage.setItem = originalSetItem;
  }

  assert.equal(result.ok, false, `expected rejection, got ${JSON.stringify(result)}`);
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress);
  assert.equal(env.storage.getItem(V2_KEY), beforeStorage);
  assert.equal(progressEvents, 0, "a failed persistence attempt must fire no progress event, stale ids or not");
});

test("public API behavior agrees with the documented stale-ID policy: getProgress()/exportJSON() preserve, getStats() excludes, markModule() still guards new writes", () => {
  const env = boot();
  const result = env.api.importJSON({
    v: 2,
    modules: { "stale-module-xyz": true },
    answers: {}, exercises: {},
    started: 0,
  });
  assert.equal(result.ok, true);

  // Reads: preserved raw, excluded from figures.
  assert.equal(env.api.getProgress().modules["stale-module-xyz"], true);
  assert.equal(JSON.parse(env.api.exportJSON()).state.modules["stale-module-xyz"], true);
  assert.equal(env.api.getStats().modulesComplete, 0);

  // markModule() is a WRITE-time guard against ever CREATING a new record
  // for an id that was never valid -- a different concern from this
  // policy, which governs an EXISTING record for an id that used to be
  // valid. The two must not be conflated: markModule() still rejects
  // outright, while the pre-existing stale record above is preserved.
  const writeResult = env.api.markModule("totally-unknown-module-id", true);
  assert.equal(writeResult.ok, false);
  assert.equal(env.api.getProgress().modules["totally-unknown-module-id"], undefined, "markModule() must never create a new stale record");
});

test("a runtime-injected question's answer becomes stale when its session ends, and revives if the id is reintroduced -- without deciding the content-pack format", () => {
  const first = boot();
  const addResult = first.api.addQuestions("m2", [{
    id: "injected-boundary-1", d: "operations", t: "lab-ops", x: 1,
    q: "Injected boundary question?", o: ["Yes", "No"], a: 0, why: "Injected.",
  }]);
  assert.equal(addResult.ok, true);
  const mount = quizMount(first, "m2");
  const items = mount.querySelectorAll(".qitem");
  items[items.length - 1].querySelectorAll(".qopt")[0].click(); // answer correctly
  assert.equal(first.api.getProgress().answers["injected-boundary-1"].c, true, "sanity: recorded within the injecting session");
  assert.equal(first.api.getStats().questionsAnswered >= 1, true, "sanity: counted while the injected question is still known this session");

  // A new session boots from the same storage WITHOUT re-injecting the
  // question -- runtime-injected content is documented as session-only,
  // and whether/how it should persist is the separate, still-open
  // content-pack roadmap item. This test does not touch that decision; it
  // only proves what happens to the ALREADY-RECORDED progress once the id
  // is no longer known.
  const persisted = first.storage._raw;
  const second = boot({ storage: persisted });
  assert.equal(
    second.api.getStats().questionsAnswered,
    0,
    "the injected question's id is unknown this session, so its record no longer counts",
  );
  assert.deepEqual(
    second.api.getProgress().answers["injected-boundary-1"],
    { c: true, n: 1, ts: first.api.getProgress().answers["injected-boundary-1"].ts },
    "the record is preserved, not deleted, purely because the id is currently unrecognized",
  );

  // Reintroducing the SAME id (here, via addQuestions() again -- standing
  // in for whatever future content-pack mechanism might reintroduce it)
  // revives the preserved history automatically, with no special-case
  // code: this is the general reintroduction policy, not a content-pack
  // feature.
  const revive = second.api.addQuestions("m2", [{
    id: "injected-boundary-1", d: "operations", t: "lab-ops", x: 1,
    q: "Injected boundary question?", o: ["Yes", "No"], a: 0, why: "Injected.",
  }]);
  assert.equal(revive.ok, true);
  assert.equal(second.api.getStats().questionsAnswered, 1, "the exact same preserved record is picked up the moment the id is known again");
});

/* ============================ storage-failure detection / session-only mode (Issue #2) ============================
   Confirmed defects, reproduced through the real public API and rendered
   DOM before any fix was written: saveProgress() caught
   localStorage.setItem() failures silently and still fired `progress`,
   so recordAnswer()/recordExercise()/markModule() and the module-complete
   UI kept advancing in-memory state while the learner received no
   warning -- the "Saved -- nice work." status could appear for a module
   change the browser had just rejected. loadProgress() also treated an
   inaccessible store identically to "no progress yet," with no warning,
   and conflated that with merely-corrupt stored JSON. The UI Reset
   handler reloaded unconditionally even if the storage removal itself
   failed. No public way existed to inspect any of this.

   Policy implemented (see index.html's persistState comment and
   docs/ARCHITECTURE.md "Storage-failure detection and session-only mode"
   for the full account): a module-level `persistState` -- deliberately
   NOT part of `state`, never exported/imported, no SCHEMA_V involvement
   -- tracks {persistent, reason}. `reason: 'write-failed'` (storage was
   confirmed readable at load; a later write failed) self-heals the
   moment any later saveProgress() call succeeds, since that call always
   serializes the ENTIRE current state, not a diff. `reason: 'unavailable'`
   (the READ itself failed at load) is sticky for the whole session --
   saveProgress() skips every write attempt while it holds, specifically
   because a read failure means real prior progress could exist unseen,
   and letting a later write "succeed" could silently clobber it; only a
   reload (a fresh loadProgress() read) can clear it. Reset and
   importJSON() are the deliberate exceptions: both are explicit
   replace-everything actions, so both always attempt their writes
   regardless of `reason`, honestly reporting whatever the browser
   actually allowed. */

test("a quiz answer when localStorage.setItem() throws still advances in-memory progress and the rendered UI, warns, and never falsely claims a save", () => {
  const env = boot({ failStorageWrites: true });
  let answerEvents = 0, progressEvents = 0;
  env.api.on("answer", () => { answerEvents += 1; });
  env.api.on("progress", () => { progressEvents += 1; });

  const questions = env.api.getQuestions("m1");
  const item = quizMount(env, "m1").querySelectorAll(".qitem")[0];
  item.querySelectorAll(".qopt")[questions[0].a].click();

  assert.equal(env.api.getProgress().answers[questions[0].id].c, true, "in-memory progress still advances");
  assert.ok(item.querySelectorAll(".qopt")[questions[0].a].classList.contains("correct"), "the rendered UI still reflects the answer");
  assert.equal(env.storage.getItem(V2_KEY), null, "durable storage remains untouched -- nothing was ever successfully saved");

  const warningEl = env.document.getElementById("storageWarning");
  assert.equal(warningEl.hidden, false, "the session-only warning is shown");
  assert.ok(warningEl.textContent.length > 0);

  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "write-failed" }));
  assert.equal(answerEvents, 1, "the documented answer-event count is unaffected");
  assert.equal(progressEvents, 1, "progress still fires exactly once, matching its existing unconditional-emit semantics");
});

test("an exercise answer when localStorage.setItem() throws still advances in-memory progress and the rendered UI, warns, and never falsely claims a save", () => {
  const env = boot({ failStorageWrites: true });
  let exerciseEvents = 0, progressEvents = 0;
  env.api.on("exercise", () => { exerciseEvents += 1; });
  env.api.on("progress", () => { progressEvents += 1; });

  const host = env.body.querySelectorAll(".exer")[0];
  const items = env.api.getExercises()[host.getAttribute("data-exer")].items;
  host.querySelectorAll(".eopt")[items[0].answer].click();

  assert.equal(env.api.getProgress().exercises[items[0].id].c, true, "in-memory progress still advances");
  assert.equal(host.querySelector(".eh-score").textContent, `1 / ${items.length}`, "the rendered UI still reflects the answer");
  assert.equal(env.storage.getItem(V2_KEY), null, "durable storage remains untouched");

  const warningEl = env.document.getElementById("storageWarning");
  assert.equal(warningEl.hidden, false);
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "write-failed" }));
  assert.equal(exerciseEvents, 1);
  assert.equal(progressEvents, 1);
});

test("marking a module complete via the UI when localStorage.setItem() throws advances the button/UI but never shows a false Saved message", () => {
  const env = boot({ failStorageWrites: true });
  env.body.querySelectorAll(".mark-complete")[0].click();

  assert.equal(env.api.getProgress().modules.m1, true, "in-memory progress still advances");
  assert.ok(env.body.querySelectorAll(".mark-complete")[0].classList.contains("done"), "the button still reflects completion");
  assert.equal(
    env.body.querySelectorAll(".mark-status")[0].textContent,
    "",
    "no false 'Saved — nice work.' message for a change that was not durably written",
  );
  assert.equal(env.storage.getItem(V2_KEY), null);

  const warningEl = env.document.getElementById("storageWarning");
  assert.equal(warningEl.hidden, false);
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "write-failed" }));
});

test("the public markModule() API when localStorage.setItem() throws still validly applies the in-memory change and getPersistenceStatus() agrees with the UI", () => {
  const env = boot({ failStorageWrites: true });
  const result = env.api.markModule("m1", true);

  // markModule()'s `ok` has always meant "the requested id was recognized
  // and the in-memory change was applied" -- unrelated to durability, and
  // unchanged by this task, matching recordAnswer()/recordExercise()
  // (which have never reported persistence either). Durability is
  // exclusively getPersistenceStatus()'s job, checked separately below.
  assert.equal(result.ok, true);
  assert.equal(env.api.getProgress().modules.m1, true);
  assert.equal(env.body.querySelectorAll(".mark-status")[0].textContent, "");
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "write-failed" }));
});

test("a localStorage read failure at initialization is distinguished from corrupt JSON: the course initializes safely, the warning shows immediately, and status reports reason:'unavailable'", () => {
  const env = boot({ failStorageReads: true });

  assert.equal(env.api.getProgress().v, 2, "the course still initializes safely, with a blank state");
  assert.equal(JSON.stringify(env.api.getProgress().modules), JSON.stringify({}));

  const warningEl = env.document.getElementById("storageWarning");
  assert.equal(warningEl.hidden, false, "the warning is present immediately, before any user action");
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "unavailable" }));
});

test("corrupt JSON in localStorage at initialization is NOT treated as a storage-availability failure", () => {
  const env = boot({ storage: { [V2_KEY]: "{not valid json" } });

  assert.equal(env.api.getProgress().v, 2, "falls through to a blank v2 state, exactly as it always did for unparseable stored data");
  const warningEl = env.document.getElementById("storageWarning");
  assert.equal(warningEl.hidden, true, "no session-only warning -- storage access itself is confirmed working");
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: true, reason: null }));
});

test("a read failure at initialization never lets a later action silently overwrite whatever might already be in storage", () => {
  // Seed storage with real, genuine prior progress the app can never see
  // this session (its read is broken) -- then confirm that a later
  // action neither claims success nor actually calls setItem, so the
  // seeded value is provably untouched, not merely "not observed to
  // change" by accident.
  const genuinePriorProgress = JSON.stringify({ v: 2, modules: { m5: true }, answers: {}, exercises: {}, started: 1 });
  const env = boot({ storage: { [V2_KEY]: genuinePriorProgress }, failStorageReads: true });

  assert.equal(env.api.getProgress().modules.m5, undefined, "sanity: the app genuinely could not see the seeded prior progress");

  let setItemCalled = false;
  const originalSetItem = env.storage.setItem;
  env.storage.setItem = (...args) => { setItemCalled = true; return originalSetItem.apply(env.storage, args); };

  env.body.querySelectorAll(".mark-complete")[0].click();

  assert.equal(setItemCalled, false, "no write is even attempted while the sticky 'unavailable' reason holds");
  // getItem() itself is mocked to throw for this test (that's the failure being
  // simulated), so read the underlying store directly via `_raw` -- a plain
  // accessor closing over the real backing store, unaffected by the getItem
  // override -- to confirm the seeded value was never touched.
  assert.equal(env.storage._raw[V2_KEY], genuinePriorProgress, "the genuine prior progress in storage is byte-for-byte untouched");
  assert.equal(
    JSON.stringify(env.api.getPersistenceStatus()),
    JSON.stringify({ persistent: false, reason: "unavailable" }),
    "status stays 'unavailable', not silently cleared by the attempted action",
  );
});

test("repeated storage-write failures across several actions create only one warning, fire the persistence event exactly once, and do not corrupt or double-count progress", () => {
  const env = boot({ failStorageWrites: true });
  let persistenceEvents = 0;
  env.api.on("persistence", () => { persistenceEvents += 1; });

  env.body.querySelectorAll(".mark-complete")[0].click();
  env.body.querySelectorAll(".mark-complete")[1].click();
  const questions = env.api.getQuestions("m1");
  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[questions[0].a].click();

  assert.equal(persistenceEvents, 1, "the transition to session-only fires exactly once, not once per failed action");
  assert.equal(env.document.querySelectorAll("#storageWarning").length, 1, "exactly one warning element, never duplicated");
  assert.equal(env.api.getProgress().modules.m1, true);
  assert.equal(env.api.getProgress().modules.m2, true);
  assert.equal(Object.keys(env.api.getProgress().answers).length, 1, "no double-counted or duplicated records across the repeated failures");
});

test("recovery after a write-only failure persists the entire accumulated in-memory state on the next successful write, clears the warning only then, and survives a reload", () => {
  const env = boot();
  const originalSetItem = env.storage.setItem;
  env.storage.setItem = () => { throw new Error("fail"); };

  env.body.querySelectorAll(".mark-complete")[0].click(); // m1 -- fails to persist
  env.body.querySelectorAll(".mark-complete")[1].click(); // m2 -- fails to persist
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "write-failed" }));
  assert.equal(env.storage.getItem(V2_KEY), null, "sanity: nothing persisted yet");

  env.storage.setItem = originalSetItem; // storage becomes writable again
  env.body.querySelectorAll(".mark-complete")[2].click(); // m3 -- this write should succeed

  const stored = JSON.parse(env.storage.getItem(V2_KEY));
  assert.equal(
    JSON.stringify(stored.modules),
    JSON.stringify({ m1: true, m2: true, m3: true }),
    "the successful write persists the ENTIRE accumulated state -- not only the m3 action that happened to succeed",
  );
  assert.equal(
    JSON.stringify(env.api.getPersistenceStatus()),
    JSON.stringify({ persistent: true, reason: null }),
    "the warning/status clears only now, once the full state is actually durable",
  );
  assert.equal(env.document.getElementById("storageWarning").hidden, true);

  const reloaded = boot({ storage: { ...env.storage._raw } });
  assert.equal(
    JSON.stringify(reloaded.api.getProgress().modules),
    JSON.stringify({ m1: true, m2: true, m3: true }),
    "every accumulated change survives a reload",
  );
});

test("the public reset() API honestly reports failure (never {ok:true}) when a required storage operation fails, and applies the blank state in memory regardless", () => {
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[0].click();
  env.storage.setItem = () => { throw new Error("fail"); }; // the API path writes a blank state via setItem

  const result = env.api.reset();

  assert.equal(result.ok, false, "reset() must never falsely imply durable success");
  assert.equal(JSON.stringify(env.api.getProgress().modules), JSON.stringify({}), "the blank state is still applied in memory, matching ordinary-action behavior");
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "write-failed" }));
});

test("the public reset() API honestly reports partial failure when only the legacy-key removal fails", () => {
  const env = boot();
  env.storage.removeItem = () => { throw new Error("fail"); };

  const result = env.api.reset();

  assert.equal(result.ok, false, "a partial failure is still a failure -- reset() does not claim transactional behavior the browser cannot guarantee");
});

test("a fully successful reset() (both storage operations succeed) still reports {ok:true}, a regression guard", () => {
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[0].click();
  const result = env.api.reset();
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: true, reason: null }));
});

test("the UI #resetBtn path does not reload when a required storage-removal operation fails, and instead applies the blank state honestly in place", () => {
  const env = boot({ confirmResponses: [true] });
  env.body.querySelectorAll(".mark-complete")[0].click();
  env.storage.removeItem = () => { throw new Error("removal blocked"); };

  env.document.getElementById("resetBtn").click();

  assert.equal(env.reloads.length, 0, "no reload -- reloading here would risk silently restoring progress that did not actually get cleared");
  assert.equal(JSON.stringify(env.api.getProgress().modules), JSON.stringify({}), "the blank state is still applied and rendered in place");
  assert.equal(env.body.querySelectorAll(".mark-complete")[0].classList.contains("done"), false);
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "write-failed" }));
  const warningEl = env.document.getElementById("storageWarning");
  assert.equal(warningEl.hidden, false);
});

test("a storage-write failure during import updates the persistence status without weakening the existing atomic all-or-nothing guarantee", () => {
  const env = boot();
  const beforeProgress = JSON.stringify(env.api.getProgress());
  const beforeStorage = env.storage.getItem(V2_KEY);
  let progressEvents = 0, answerEvents = 0, exerciseEvents = 0, persistenceEvents = 0;
  env.api.on("progress", () => { progressEvents += 1; });
  env.api.on("answer", () => { answerEvents += 1; });
  env.api.on("exercise", () => { exerciseEvents += 1; });
  env.api.on("persistence", () => { persistenceEvents += 1; });

  env.storage.setItem = () => { throw new Error("fail"); };
  const result = env.api.importJSON({ v: 2, modules: { m1: true }, answers: {}, exercises: {}, started: 0 });

  assert.equal(result.ok, false, "the atomic guarantee is unchanged: a failed import still reports failure");
  assert.equal(JSON.stringify(env.api.getProgress()), beforeProgress, "live state is untouched");
  assert.equal(env.storage.getItem(V2_KEY), beforeStorage, "storage is untouched");
  assert.equal(progressEvents, 0, "still no progress event on a failed import, exactly as before this task");
  assert.equal(answerEvents, 0);
  assert.equal(exerciseEvents, 0);

  // The one narrow, deliberate exception: the shared persistence status
  // DOES reflect the genuinely-observed write failure.
  assert.equal(persistenceEvents, 1);
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "write-failed" }));
});

test("a successful import clears session-only mode", () => {
  const env = boot();
  const originalSetItem = env.storage.setItem;
  env.storage.setItem = () => { throw new Error("fail"); };
  env.body.querySelectorAll(".mark-complete")[0].click();
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "write-failed" }));

  env.storage.setItem = originalSetItem; // storage becomes writable again

  const result = env.api.importJSON({ v: 2, modules: { m9: true }, answers: {}, exercises: {}, started: 0 });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: true, reason: null }));
});

/* ============================ storage-failure detection: correction addendum (QL-026 addendum) ============================
   Independent review of the original QL-026 implementation reproduced a
   real data-loss sequence: seed genuine prior v2 progress; make reads
   fail at init (status becomes {persistent:false, reason:'unavailable'},
   sticky against ordinary writes specifically because the app never saw
   what might already be in storage); attempt an otherwise-valid import
   while writes ALSO fail; the failed import incorrectly downgraded the
   status to the non-sticky 'write-failed'; a later ordinary action
   (e.g. markModule()) then successfully wrote the session's blank/
   partial in-memory state over the genuine prior progress that was
   never actually read -- the exact clobber 'unavailable' exists to
   prevent. Also independently found: the API reset() path could report
   session-only (and show #storageWarning) for a Reset whose canonical
   v2 write fully succeeded, purely because the separate, already-inert
   legacy v1 key could not be removed -- an inaccurate, alarming status
   for a Reset that is, in fact, fully durable. Both corrected; see
   index.html's importJSON()/performReset() comments and
   docs/QUALITY_LOG.md QL-026's addendum for the full record. */

test("a failed import while storage is unavailable-at-init never weakens the sticky 'unavailable' status, and a later ordinary action still cannot clobber the unseen prior record", () => {
  const genuinePriorProgress = JSON.stringify({ v: 2, modules: { m5: true }, answers: {}, exercises: {}, started: 1 });
  const env = boot({ storage: { [V2_KEY]: genuinePriorProgress }, failStorageReads: true });
  assert.equal(
    JSON.stringify(env.api.getPersistenceStatus()),
    JSON.stringify({ persistent: false, reason: "unavailable" }),
    "sanity: the course starts in the sticky unavailable state, having never actually read the seeded record",
  );
  assert.equal(env.api.getProgress().modules.m5, undefined, "sanity: the app genuinely could not see the seeded prior progress");

  let persistenceEvents = 0;
  env.api.on("persistence", () => { persistenceEvents += 1; });

  const originalSetItem = env.storage.setItem;
  env.storage.setItem = () => { throw new Error("fail"); };
  const result = env.api.importJSON({ v: 2, modules: { m9: true }, answers: {}, exercises: {}, started: 0 });

  assert.equal(result.ok, false, "the failed import still reports failure -- atomicity is unaffected");
  assert.equal(JSON.stringify(env.api.getProgress().modules), JSON.stringify({}), "live state is untouched by the failed import (still the blank init state, not the candidate)");
  assert.equal(
    JSON.stringify(env.api.getPersistenceStatus()),
    JSON.stringify({ persistent: false, reason: "unavailable" }),
    "the failed import must NOT downgrade the sticky 'unavailable' reason to the non-sticky 'write-failed'",
  );
  assert.equal(persistenceEvents, 0, "no persistence transition/event for a status that did not actually change");
  assert.equal(env.storage._raw[V2_KEY], genuinePriorProgress, "the unseen prior progress in storage is still byte-for-byte untouched after the failed import");

  // Restore write access while READ access remains broken -- exactly the
  // scenario that previously let saveProgress() clobber the seeded record.
  let setItemCalled = false;
  env.storage.setItem = (...args) => { setItemCalled = true; return originalSetItem.apply(env.storage, args); };

  env.api.markModule("m1", true);

  assert.equal(setItemCalled, false, "an ordinary action still never attempts a write while the sticky 'unavailable' reason holds");
  assert.equal(env.storage._raw[V2_KEY], genuinePriorProgress, "the seeded prior progress remains completely unclobbered");
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "unavailable" }));
});

test("a failed import that begins from persistent:true still transitions to 'write-failed', unchanged from before this correction", () => {
  const env = boot();
  env.storage.setItem = () => { throw new Error("fail"); };
  const result = env.api.importJSON({ v: 2, modules: { m1: true }, answers: {}, exercises: {}, started: 0 });
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: false, reason: "write-failed" }));
});

test("API reset(): only legacy-key removal fails -- the canonical v2 blank state is still durably written, so persistence status stays accurate (not falsely session-only)", () => {
  const env = boot({ storage: { [V1_KEY]: JSON.stringify({ m1: true }) } });
  env.storage.removeItem = () => { throw new Error("legacy key removal blocked"); };

  const result = env.api.reset();

  assert.equal(result.ok, false, "reset() still honestly reports the legacy-key cleanup failure");
  assert.equal(JSON.stringify(env.api.getProgress().modules), JSON.stringify({}));
  assert.equal(
    JSON.stringify(env.api.getPersistenceStatus()),
    JSON.stringify({ persistent: true, reason: null }),
    "the current live (blank) state IS durably written -- this must not be reported as session-only",
  );
  assert.equal(env.document.getElementById("storageWarning").hidden, true, "no alarming warning for a Reset whose current state is genuinely durable");

  const stored = JSON.parse(env.storage.getItem(V2_KEY));
  assert.equal(JSON.stringify(stored.modules), JSON.stringify({}), "the canonical v2 key holds the durable blank state");
  // The legacy key is honestly still present -- never falsely reported as removed.
  assert.notEqual(env.storage.getItem(V1_KEY), null);

  // A subsequent reload proves the durable v2 blank state is authoritative
  // over the surviving (but now provably inert) legacy key.
  const reloaded = boot({ storage: { ...env.storage._raw } });
  assert.equal(JSON.stringify(reloaded.api.getProgress().modules), JSON.stringify({}), "reload stays blank -- the legacy key is never read back once a valid v2 record exists");
});

test("API reset(): the canonical v2 write itself fails -- session-only/write-failed remains correct", () => {
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[0].click();
  env.storage.setItem = () => { throw new Error("v2 write blocked"); };

  const result = env.api.reset();

  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(env.api.getProgress().modules), JSON.stringify({}), "the blank state is still applied in memory");
  assert.equal(
    JSON.stringify(env.api.getPersistenceStatus()),
    JSON.stringify({ persistent: false, reason: "write-failed" }),
    "the current state is genuinely NOT durable here -- session-only is the accurate status",
  );
  assert.equal(env.document.getElementById("storageWarning").hidden, false);
});

test("API reset(): a fully successful reset (both operations succeed) reports {ok:true} and persistent status, a regression guard", () => {
  const env = boot({ storage: { [V1_KEY]: JSON.stringify({ m1: true }) } });
  const result = env.api.reset();
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(env.api.getPersistenceStatus()), JSON.stringify({ persistent: true, reason: null }));
  assert.equal(env.storage.getItem(V1_KEY), null, "the legacy key is genuinely removed when nothing fails");
});

test("UI #resetBtn: only legacy-key removal fails -- old progress could still return via v1 migration on reload, so this remains a genuine session-only failure (unlike the API path)", () => {
  const env = boot({ confirmResponses: [true], storage: { [V1_KEY]: JSON.stringify({ m1: true }) } });
  env.body.querySelectorAll(".mark-complete")[0].click();
  const originalRemoveItem = env.storage.removeItem;
  env.storage.removeItem = (key) => {
    if (key === V1_KEY) { throw new Error("legacy key removal blocked"); }
    return originalRemoveItem(key);
  };

  env.document.getElementById("resetBtn").click();

  assert.equal(env.reloads.length, 0, "no reload -- the surviving legacy key could still repopulate progress via migration");
  assert.equal(JSON.stringify(env.api.getProgress().modules), JSON.stringify({}), "the blank state is still applied and rendered in place");
  assert.equal(
    JSON.stringify(env.api.getPersistenceStatus()),
    JSON.stringify({ persistent: false, reason: "write-failed" }),
    "unlike the API path, the UI path's PKEY removal succeeding does not make this durable: a surviving legacy key can still resurrect old progress on a future reload",
  );
  assert.equal(env.document.getElementById("storageWarning").hidden, false);
});

/* ============================ storage-failure detection: non-obstruction correction (QL-026 addendum 2) ============================
   Independent review found the fixed #storageWarning banner (added by
   the prior correction to guarantee viewport visibility at any scroll
   depth) could itself overlap ordinary course content and the mobile
   sidebar's own nav links, since position:fixed removes the element
   from normal flow and nothing downstream reserved room for it. Fixed
   by keeping a --storage-warning-h custom property on
   document.documentElement in sync with the banner's live rendered
   height (0 when hidden), which .content's bottom padding and
   .sidebar's own height both add/subtract -- see index.html's
   setStorageWarningReservedHeight() and the .storage-warning CSS
   comment's "Non-obstruction correction" for the full account. This
   harness has no real layout engine, so the geometry/hit-testing proof
   itself lives in tests/e2e/storage-failure-warning.spec.mjs; what IS
   meaningfully checkable here, without layout, is the state/property
   connection itself: does the custom property genuinely track shown vs.
   hidden, using the harness's Node.getBoundingClientRect() stub (0 when
   [hidden], a plausible non-zero height otherwise, per its own comment
   in tests/dom-harness.mjs). */

test("the --storage-warning-h custom property reflects the banner's shown/hidden state, read via the standard getPropertyValue() API", () => {
  const env = boot({ failStorageWrites: true });
  const root = env.document.documentElement;

  assert.equal(root.style.getPropertyValue("--storage-warning-h"), "0px", "hidden at boot: no reservation");

  env.body.querySelectorAll(".mark-complete")[0].click();

  const reservedWhileShown = root.style.getPropertyValue("--storage-warning-h");
  assert.notEqual(reservedWhileShown, "0px", "shown: a non-zero reservation is set from the banner's own rendered height");
  assert.match(reservedWhileShown, /^\d+px$/, "expressed as a plain pixel length");
});

test("recovery clears the reserved height back to 0px alongside the banner itself", () => {
  const env = boot();
  const originalSetItem = env.storage.setItem;
  env.storage.setItem = () => { throw new Error("fail"); };
  env.body.querySelectorAll(".mark-complete")[0].click();

  const root = env.document.documentElement;
  assert.notEqual(root.style.getPropertyValue("--storage-warning-h"), "0px");

  env.storage.setItem = originalSetItem;
  env.body.querySelectorAll(".mark-complete")[1].click();

  assert.equal(root.style.getPropertyValue("--storage-warning-h"), "0px", "the reservation collapses back to 0 the moment the banner itself hides");
  assert.equal(env.document.getElementById("storageWarning").hidden, true);
});

test("repeated failures keep the reservation at a single, stable value rather than accumulating across each dedup'd no-op transition", () => {
  const env = boot({ failStorageWrites: true });
  const root = env.document.documentElement;

  env.body.querySelectorAll(".mark-complete")[0].click();
  const afterFirst = root.style.getPropertyValue("--storage-warning-h");
  env.body.querySelectorAll(".mark-complete")[1].click();
  env.body.querySelectorAll(".mark-complete")[2].click();
  const afterThird = root.style.getPropertyValue("--storage-warning-h");

  assert.equal(afterThird, afterFirst, "the same banner, same text, same rendered height -- the reservation does not drift across repeated failures");
});

/* ============================ print ============================ */

test("the print control invokes printing and toggles the print class", () => {
  const env = boot();
  env.document.getElementById("printBtn").click();
  assert.equal(env.printCalls.length, 1);

  env.window.dispatchEvent("beforeprint");
  assert.ok(env.document.body.classList.contains("printmode"));
  env.window.dispatchEvent("afterprint");
  assert.ok(!env.document.body.classList.contains("printmode"));
});

/* ============================ public API ============================ */

test("the public API reports its stabilized surface", () => {
  const env = boot();
  const api = env.api;
  assert.equal(api.version, "1.1.1");
  assert.equal(api.schema, 2);
  for (const method of [
    "getModules", "getQuestions", "getExercises", "getFlashcards", "getImages",
    "getProgress", "getStats", "getWeakAreas", "getUnmastered", "exportJSON",
    "importJSON", "addQuestions", "markModule", "reset", "on", "off",
  ]) {
    assert.equal(typeof api[method], "function", `${method} is exposed`);
  }
});

test("API reads return copies that cannot mutate course state", () => {
  const env = boot();
  const questions = env.api.getQuestions("m1");
  questions[0].q = "MUTATED";
  questions.length = 0;
  assert.notEqual(env.api.getQuestions("m1")[0].q, "MUTATED");
  assert.equal(env.api.getQuestions("m1").length, 5);

  const images = env.api.getImages();
  images.pop();
  assert.equal(env.api.getImages().length, 19);
});

test("API events fire for answers, exercises, progress, and content", () => {
  const env = boot();
  const seen = { answer: [], exercise: [], progress: 0, content: [], all: 0 };
  env.api.on("answer", (payload) => seen.answer.push(payload));
  env.api.on("exercise", (payload) => seen.exercise.push(payload));
  env.api.on("progress", () => { seen.progress += 1; });
  env.api.on("content", (payload) => seen.content.push(payload));
  env.api.on("*", () => { seen.all += 1; });

  const questions = env.api.getQuestions("m1");
  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[questions[0].a].click();
  assert.equal(seen.answer.length, 1);
  // Payloads originate inside the vm realm, so their prototype differs from
  // this module's Object.prototype. Compare fields rather than using
  // deepStrictEqual, which also compares prototypes.
  assert.equal(seen.answer[0].id, questions[0].id);
  assert.equal(seen.answer[0].correct, true);

  const host = env.body.querySelectorAll(".exer")[0];
  const exerciseItems = env.api.getExercises()[host.getAttribute("data-exer")].items;
  host.querySelectorAll(".eopt")[exerciseItems[0].answer].click();
  assert.equal(seen.exercise.length, 1);
  assert.equal(seen.exercise[0].correct, true);

  env.api.addQuestions("m2", [{
    id: "smoke-content-1", d: "molecular", t: "fish", x: 2,
    q: "Injected question?", o: ["A", "B"], a: 1, why: "Test rationale",
  }]);
  assert.equal(seen.content.length, 1);
  assert.equal(seen.content[0].added, 1);

  assert.ok(seen.progress >= 2, "progress events accompany saved outcomes");
  assert.ok(seen.all >= 4, "the wildcard listener receives every event");
});

test("removing an API listener stops delivery", () => {
  const env = boot();
  let calls = 0;
  const handler = () => { calls += 1; };
  env.api.on("answer", handler);
  const questions = env.api.getQuestions("m1");
  const items = quizMount(env, "m1").querySelectorAll(".qitem");
  items[0].querySelectorAll(".qopt")[questions[0].a].click();
  assert.equal(calls, 1);

  env.api.off("answer", handler);
  items[1].querySelectorAll(".qopt")[questions[1].a].click();
  assert.equal(calls, 1, "no further deliveries after off()");
});

test("injected questions render into the live quiz", () => {
  const env = boot();
  const before = quizMount(env, "m2").querySelectorAll(".qitem").length;
  const result = env.api.addQuestions("m2", [{
    id: "smoke-render-1", d: "operations", t: "lab-ops", x: 1,
    q: "Rendered injected question?", o: ["Yes", "No"], a: 0, why: "Rendered.",
  }]);
  assert.equal(result.ok, true);
  const items = quizMount(env, "m2").querySelectorAll(".qitem");
  assert.equal(items.length, before + 1);
  assert.equal(items[items.length - 1].querySelector(".qtext").textContent, "Rendered injected question?");
});

test("authored and injected text stays text when it contains markup characters", () => {
  const env = boot();
  const prompt = "Which statement is true: 1 < 2 & 3 > 2?";
  const option = "<not-an-element>";
  const result = env.api.addQuestions("m2", [{
    id: "smoke-escaping-1", d: "operations", t: "lab-ops", x: 1,
    q: prompt, o: [option, "Neither"], a: 0, why: "Markup characters remain text.",
  }]);

  assert.equal(result.ok, true);
  const items = quizMount(env, "m2").querySelectorAll(".qitem");
  const rendered = items[items.length - 1];
  assert.equal(rendered.querySelector(".qtext").textContent, prompt);
  assert.equal(rendered.querySelectorAll(".qopt")[0].textContent, `A${option}`);
  assert.equal(rendered.querySelector("not-an-element"), null);
});

test("markModule rejects unknown module ids", () => {
  const env = boot();
  const bad = env.api.markModule("not-a-module", true);
  assert.equal(bad.ok, false);
  assert.equal(env.api.getStats().modulesComplete, 0);

  const good = env.api.markModule("m4", true);
  assert.equal(good.ok, true);
  assert.equal(env.api.getStats().modulesComplete, 1);
});

test("analytics aggregate by domain, topic, and difficulty", () => {
  const env = boot();
  const questions = env.api.getQuestions("m15");
  const items = quizMount(env, "m15").querySelectorAll(".qitem");
  items[0].querySelectorAll(".qopt")[questions[0].a].click();
  const wrongIndex = questions[1].a === 0 ? 1 : 0;
  items[1].querySelectorAll(".qopt")[wrongIndex].click();

  const stats = env.api.getStats();
  assert.equal(stats.questionsTotal, 153);
  assert.equal(stats.questionsAnswered, 2);
  assert.equal(stats.questionsCorrect, 1);
  assert.equal(stats.overallPct, 50);
  assert.equal(stats.byDomain.molecular.answered, 2);
  assert.equal(stats.byDomain.molecular.correct, 1);

  const unmastered = env.api.getUnmastered();
  assert.equal(unmastered.length, 152, "answered-correctly items drop out of the unmastered set");
  assert.ok(unmastered.some((entry) => entry.id === questions[1].id));
});

/* ============================ analytics semantics: last-attempt mastery (Issue #2) ============================
   The v2 outcome record is {c: <latest correctness>, n: <total attempt
   count>, ts: <latest timestamp>} -- it never stored a per-attempt
   history or an independently maintained correct-attempt counter.
   Confirmed by direct execution before writing this section: answering a
   question (correct, incorrect, correct) across three reloads and
   answering a DIFFERENT question (incorrect, incorrect, correct) across
   three reloads both end at the byte-identical {c:true, n:3} shape (only
   `ts` differs) -- 2-of-3 correct and 1-of-3 correct are indistinguishable
   from the stored record alone. Genuine total-attempt accuracy is
   therefore not implemented and cannot be derived from existing data;
   this section names, documents, and tests the one model this course has
   always actually implemented -- LAST-ATTEMPT MASTERY
   (analyticsModel:'last-attempt-mastery-v1') -- and adds explicit,
   machine-readable fields alongside the existing ones as compatibility
   aliases. See index.html's ANALYTICS SEMANTICS comment and
   docs/ARCHITECTURE.md for the full policy. */

test("fresh state: zero answered, zero mastered, mastery percentage null, and every compatibility alias agrees exactly", () => {
  const env = boot();
  const stats = env.api.getStats();
  assert.equal(stats.analyticsModel, "last-attempt-mastery-v1");
  assert.equal(stats.questionsAnswered, 0);
  assert.equal(stats.questionsMastered, 0);
  assert.equal(stats.lastAttemptMasteryPct, null);
  assert.equal(stats.questionsCorrect, stats.questionsMastered, "questionsCorrect alias agrees");
  assert.equal(stats.overallPct, stats.lastAttemptMasteryPct, "overallPct alias agrees");
  assert.equal(JSON.stringify(stats.byDomain), "{}");
  assert.equal(env.api.getWeakAreas().length, 0);
  assert.equal(env.api.getUnmastered().length, 153, "every current question is unmastered when unanswered");
});

test("one question answered correctly: one distinct answered, one mastered, 100% last-attempt mastery", () => {
  const env = boot();
  const question = env.api.getQuestions("m1")[0];
  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[question.a].click();

  const stats = env.api.getStats();
  assert.equal(stats.questionsAnswered, 1);
  assert.equal(stats.questionsMastered, 1);
  assert.equal(stats.lastAttemptMasteryPct, 100);
  assert.equal(stats.questionsCorrect, 1);
  assert.equal(stats.overallPct, 100);
});

test("correct then incorrect reattempt (through the real reload/rebuild path): mastery follows the LATEST attempt, not attempt count -- 0%, not 50%", () => {
  let env = boot();
  const question = env.api.getQuestions("m1")[0];
  const wrongIndex = question.a === 0 ? 1 : 0;

  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[question.a].click();
  assert.equal(env.api.getProgress().answers[question.id].c, true, "sanity: first attempt correct");

  // Re-answering an already-answered question is only reachable across a
  // reload (buildQuiz() never disables an already-recorded item's
  // controls) -- reboot from the same persisted storage, matching this
  // repository's standing pattern for reattempt tests.
  env = boot({ storage: { [V2_KEY]: JSON.stringify(env.api.getProgress()) } });
  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[wrongIndex].click();

  const record = env.api.getProgress().answers[question.id];
  assert.equal(record.c, false, "the current outcome is the latest attempt's result");
  assert.equal(record.n, 2, "attempt count grows, but is never the mastery denominator");

  const stats = env.api.getStats();
  assert.equal(stats.questionsAnswered, 1, "still exactly one distinct answered question, not two");
  assert.equal(stats.questionsMastered, 0);
  assert.equal(stats.lastAttemptMasteryPct, 0, "0%, not 50% -- mastery is not attempt-weighted");
  assert.equal(stats.overallPct, 0);

  const unmastered = env.api.getUnmastered();
  assert.ok(unmastered.some((e) => e.id === question.id), "getUnmastered() includes it after the correctness-flipping reattempt");
  const entry = unmastered.find((e) => e.id === question.id);
  assert.equal(entry.attempts, 2);
});

test("incorrect then correct reattempt (through the real reload/rebuild path): mastery follows the LATEST attempt -- 100%, not 50%", () => {
  let env = boot();
  const question = env.api.getQuestions("m1")[0];
  const wrongIndex = question.a === 0 ? 1 : 0;

  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[wrongIndex].click();
  assert.equal(env.api.getProgress().answers[question.id].c, false, "sanity: first attempt incorrect");

  env = boot({ storage: { [V2_KEY]: JSON.stringify(env.api.getProgress()) } });
  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[question.a].click();

  const record = env.api.getProgress().answers[question.id];
  assert.equal(record.c, true);
  assert.equal(record.n, 2);

  const stats = env.api.getStats();
  assert.equal(stats.questionsAnswered, 1, "still exactly one distinct answered question");
  assert.equal(stats.questionsMastered, 1);
  assert.equal(stats.lastAttemptMasteryPct, 100, "100%, not 50%");
  assert.equal(stats.overallPct, 100);

  const unmastered = env.api.getUnmastered();
  assert.ok(!unmastered.some((e) => e.id === question.id), "getUnmastered() excludes it once mastered");
});

test("multiple questions across different domains, topics, and ALL THREE difficulty levels: every affected aggregate row, explicit field, and compatibility alias is exact, with no unexpected keys", () => {
  const env = boot();
  // Six questions, chosen specifically to span multiple domains AND
  // topics AND all three difficulty levels (x:1, x:2, x:3), with a
  // deliberate mix of mastered and unmastered latest outcomes -- the
  // prior version of this test used three difficulty-1 questions and
  // therefore never actually exercised byDifficulty's x:2/x:3 rows.
  const qOrient1 = env.api.getQuestions("m1")[0];  // orientation / orientation, x:1
  const qOrient2 = env.api.getQuestions("m1")[2];  // orientation / orientation, x:2
  const qSpec1   = env.api.getQuestions("m2")[0];  // specimen / specimen-collection, x:1
  const qSpec3   = env.api.getQuestions("m2")[3];  // specimen / specimen-collection, x:3
  const qAnalysis = env.api.getQuestions("m9")[0]; // analysis / chromosome-id, x:1
  const qMolecular = env.api.getQuestions("m15")[0]; // molecular / fish-array, x:2

  assert.equal(qOrient1.x, 1); assert.equal(qOrient2.x, 2);
  assert.equal(qSpec1.x, 1); assert.equal(qSpec3.x, 3);
  assert.equal(qAnalysis.x, 1); assert.equal(qMolecular.x, 2);

  const wrongOrient2 = qOrient2.a === 0 ? 1 : 0;
  const wrongAnalysis = qAnalysis.a === 0 ? 1 : 0;

  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[qOrient1.a].click(); // correct, x1
  quizMount(env, "m1").querySelectorAll(".qitem")[2].querySelectorAll(".qopt")[wrongOrient2].click(); // incorrect, x2
  quizMount(env, "m2").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[qSpec1.a].click(); // correct, x1
  quizMount(env, "m2").querySelectorAll(".qitem")[3].querySelectorAll(".qopt")[qSpec3.a].click(); // correct, x3
  quizMount(env, "m9").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[wrongAnalysis].click(); // incorrect, x1
  quizMount(env, "m15").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[qMolecular.a].click(); // correct, x2

  const stats = env.api.getStats();
  assert.equal(stats.questionsAnswered, 6);
  assert.equal(stats.questionsMastered, 4); // qOrient1, qSpec1, qSpec3, qMolecular correct; qOrient2, qAnalysis incorrect
  assert.equal(stats.lastAttemptMasteryPct, Math.round((4 / 6) * 100));
  assert.equal(stats.questionsCorrect, stats.questionsMastered);
  assert.equal(stats.overallPct, stats.lastAttemptMasteryPct);

  function assertRowExact(rows, key, expectAnswered, expectMastered) {
    const row = rows[key];
    assert.ok(row, `expected a row for key "${key}"`);
    assert.equal(row.answered, expectAnswered, `${key}.answered`);
    assert.equal(row.mastered, expectMastered, `${key}.mastered`);
    assert.equal(row.masteryPct, expectAnswered ? Math.round((expectMastered / expectAnswered) * 100) : null, `${key}.masteryPct`);
    assert.equal(row.correct, row.mastered, `${key}.correct alias`);
    assert.equal(row.pct, row.masteryPct, `${key}.pct alias`);
  }

  // byDomain: orientation (qOrient1 correct + qOrient2 incorrect = 2
  // answered, 1 mastered), specimen (qSpec1 + qSpec3, both correct = 2,
  // 2), analysis (qAnalysis incorrect = 1, 0), molecular (qMolecular
  // correct = 1, 1) -- driven by the questions' own `.d` fields, not
  // hardcoded domain-name literals, so this can never silently pass
  // against the wrong key.
  assertRowExact(stats.byDomain, qOrient1.d, 2, 1);
  assertRowExact(stats.byDomain, qSpec1.d, 2, 2);
  assertRowExact(stats.byDomain, qAnalysis.d, 1, 0);
  assertRowExact(stats.byDomain, qMolecular.d, 1, 1);
  // No unexpected aggregate keys introduced -- exactly these four domains.
  assert.deepEqual(
    new Set(Object.keys(stats.byDomain)),
    new Set([qOrient1.d, qSpec1.d, qAnalysis.d, qMolecular.d]),
  );

  // byTopic: orientation (2,1), specimen-collection (2,2), chromosome-id (1,0), fish-array (1,1)
  assertRowExact(stats.byTopic, qOrient1.t, 2, 1);
  assertRowExact(stats.byTopic, qSpec1.t, 2, 2);
  assertRowExact(stats.byTopic, qAnalysis.t, 1, 0);
  assertRowExact(stats.byTopic, qMolecular.t, 1, 1);
  assert.deepEqual(
    new Set(Object.keys(stats.byTopic)),
    new Set([qOrient1.t, qSpec1.t, qAnalysis.t, qMolecular.t]),
  );

  // byDifficulty: x1 = qOrient1(correct) + qSpec1(correct) + qAnalysis(incorrect) => 3 answered, 2 mastered
  //               x2 = qOrient2(incorrect) + qMolecular(correct)                  => 2 answered, 1 mastered
  //               x3 = qSpec3(correct)                                            => 1 answered, 1 mastered
  assertRowExact(stats.byDifficulty, "1", 3, 2);
  assertRowExact(stats.byDifficulty, "2", 2, 1);
  assertRowExact(stats.byDifficulty, "3", 1, 1);
  assert.deepEqual(new Set(Object.keys(stats.byDifficulty)), new Set(["1", "2", "3"]));
});

test("unanswered questions affect coverage (questionsTotal) but never enter the answered-question mastery denominator", () => {
  const env = boot();
  const question = env.api.getQuestions("m1")[0];
  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[question.a].click();

  const stats = env.api.getStats();
  assert.equal(stats.questionsTotal, 153, "coverage denominator counts every current question");
  assert.equal(stats.questionsAnswered, 1, "mastery denominator counts only distinct ANSWERED questions");
  assert.equal(stats.lastAttemptMasteryPct, 100, "unanswered questions do not dilute the mastery percentage");
});

test("stale question records remain in getProgress()/exportJSON() but are excluded from every mastery, coverage, grouping, weak-area, and unmastered calculation", () => {
  const env = boot({
    storage: {
      [V2_KEY]: JSON.stringify({
        v: 2, modules: {}, exercises: {},
        answers: { "totally-fabricated-stale-id": { c: true, n: 9, ts: 1 } },
        started: 0,
      }),
    },
  });
  const stats = env.api.getStats();
  assert.equal(stats.questionsAnswered, 0);
  assert.equal(stats.questionsMastered, 0);
  assert.equal(stats.lastAttemptMasteryPct, null);
  assert.equal(JSON.stringify(stats.byDomain), "{}");
  assert.equal(env.api.getWeakAreas(1).length, 0);
  assert.equal(env.api.getUnmastered().length, 153, "the stale id never appears; every CURRENT question is unmastered");

  assert.deepEqual(env.api.getProgress().answers["totally-fabricated-stale-id"], { c: true, n: 9, ts: 1 }, "the stale record itself is preserved, not deleted");
  const exported = JSON.parse(env.api.exportJSON());
  assert.deepEqual(exported.state.answers["totally-fabricated-stale-id"], { c: true, n: 9, ts: 1 }, "exportJSON() preserves the stale record too");
});

test("exercise records and module-completion records never enter question mastery/coverage analytics, and continue to behave normally elsewhere", () => {
  const env = boot();
  env.body.querySelectorAll(".mark-complete")[0].click(); // module completion
  const exHost = env.body.querySelectorAll(".exer")[0];
  const exKey = exHost.getAttribute("data-exer");
  const exItems = env.api.getExercises()[exKey].items;
  exHost.querySelectorAll(".eopt")[exItems[0].answer].click(); // exercise answer

  const stats = env.api.getStats();
  assert.equal(stats.questionsAnswered, 0, "the exercise answer and module completion are not quiz-question analytics");
  assert.equal(stats.questionsMastered, 0);
  assert.equal(stats.lastAttemptMasteryPct, null);
  assert.equal(env.api.getUnmastered().length, 153);
  assert.equal(JSON.stringify(stats.byDomain), "{}");

  // Both still behave normally through their own, separate signals.
  assert.equal(stats.modulesComplete, 1);
  assert.equal(env.api.getProgress().exercises[exItems[0].id].c, true);
});

test("a runtime-injected question participates in analytics only while currently registered, and becomes inert (not fabricated) under the stale-ID policy after a fresh session -- without deciding content-pack persistence", () => {
  const first = boot();
  const addResult = first.api.addQuestions("m2", [{
    id: "analytics-injected-1", d: "operations", t: "lab-ops", x: 1,
    q: "Injected analytics question?", o: ["Yes", "No"], a: 0, why: "Injected.",
  }]);
  assert.equal(addResult.ok, true);
  const mount = quizMount(first, "m2");
  const items = mount.querySelectorAll(".qitem");
  items[items.length - 1].querySelectorAll(".qopt")[0].click(); // answer correctly

  const statsWhileKnown = first.api.getStats();
  assert.ok(statsWhileKnown.questionsAnswered >= 1, "counted while the injected id is known this session");
  assert.equal(first.api.getProgress().answers["analytics-injected-1"].c, true);

  // A fresh session from the same storage, without re-injecting -- this
  // test does not decide or implement whether injected content should
  // persist; it only proves the existing stale-ID policy (QL-024)
  // applies identically to analytics for an injected id that is no
  // longer known.
  const second = boot({ storage: first.storage._raw });
  const statsAfterSessionEnds = second.api.getStats();
  assert.equal(statsAfterSessionEnds.questionsTotal, 153, "the injected question is not part of the base bank");
  assert.deepEqual(
    second.api.getProgress().answers["analytics-injected-1"],
    { c: true, n: 1, ts: first.api.getProgress().answers["analytics-injected-1"].ts },
    "the record is preserved, not fabricated or deleted",
  );
  assert.equal(second.api.getUnmastered().every((e) => e.id !== "analytics-injected-1"), true, "an unrecognized id never appears in current-facing analytics");
});

/* ============================ runtime-injected content lifecycle (Issue #2) ============================
   Confirmed by direct execution before any change: a question added via
   addQuestions() exists only in the current session; reloading without
   reinjection removes its definition from the live quiz; if answered,
   its outcome remains an inert stale v2 record (QL-024); exportJSON()
   includes that outcome but never the definition (prompt/options/
   answer/rationale); importing that export does not recreate the
   definition; reintroducing the same id revives the preserved outcome;
   and -- a real, confirmed defect -- mutating the caller's source
   object/options array/wrong-answer-feedback object AFTER a successful
   addQuestions() call changed the live, accepted question, because
   addQuestions() pushed the caller's own object reference directly into
   QUIZZES rather than a detached copy.

   Policy adopted (see index.html's RUNTIME-INJECTED CONTENT comment and
   docs/ARCHITECTURE.md "Runtime-injected content lifecycle" for the
   full record): a deliberate SPLIT lifecycle. Definitions are
   session-only (never persisted anywhere). Outcomes, once recorded, are
   durable in existing v2 progress by stable id -- exactly like an
   authored question's outcome -- and the existing stale-ID policy
   (QL-024) is what makes reinjection "just work": staleness is decided
   by live-index membership at read time, with no injection-specific
   code. The caller owns semantic id stability; the app cannot detect
   cross-session semantic reuse (a v2 outcome carries no definition or
   content fingerprint to compare against) -- that is an unsupported
   contract violation, not a detected error. Persistent/versioned
   content packs are explicitly unsupported this release. */

test("getRuntimeContentPolicy() returns the exact frozen shape, and mutating a returned object never affects a later call", () => {
  const env = boot();
  const policy = env.api.getRuntimeContentPolicy();
  assert.equal(JSON.stringify(Object.keys(policy).sort()), JSON.stringify([
    "callerOwnsIdStability", "contentPacksSupported", "definitionsSessionOnly",
    "outcomeSchemaVersion", "outcomesPersisted", "policyModel", "reinjectionRevivesOutcome",
  ]), "no unexpected field is present or missing");
  assert.equal(policy.policyModel, "runtime-content-lifecycle-v1");
  assert.equal(policy.definitionsSessionOnly, true);
  assert.equal(policy.outcomesPersisted, true);
  assert.equal(policy.outcomeSchemaVersion, 2);
  assert.equal(policy.reinjectionRevivesOutcome, true);
  assert.equal(policy.callerOwnsIdStability, true);
  assert.equal(policy.contentPacksSupported, false);

  policy.policyModel = "TAMPERED";
  policy.contentPacksSupported = true;
  const again = env.api.getRuntimeContentPolicy();
  assert.equal(again.policyModel, "runtime-content-lifecycle-v1", "mutating a returned object cannot affect a later call");
  assert.equal(again.contentPacksSupported, false);
});

test("a valid runtime injection renders, records an answer, and fires exactly the existing single content event with its documented payload", () => {
  const env = boot();
  let contentEvents = [];
  env.api.on("content", (payload) => { contentEvents.push(payload); });

  const before = quizMount(env, "m2").querySelectorAll(".qitem").length;
  const result = env.api.addQuestions("m2", [{
    id: "lifecycle-valid-1", d: "operations", t: "lab-ops", x: 1,
    q: "Lifecycle valid question?", o: ["Yes", "No"], a: 0, why: "Because.",
    w: { 1: "No is incorrect because..." },
  }]);
  assert.equal(result.ok, true);
  assert.equal(result.added, 1);
  assert.equal(contentEvents.length, 1, "exactly one content event for the batch, unchanged");
  assert.equal(contentEvents[0].quiz, "m2");
  assert.equal(contentEvents[0].added, 1);

  const items = quizMount(env, "m2").querySelectorAll(".qitem");
  assert.equal(items.length, before + 1);
  const rendered = items[items.length - 1];
  assert.equal(rendered.querySelector(".qtext").textContent, "Lifecycle valid question?");

  rendered.querySelectorAll(".qopt")[0].click();
  assert.equal(env.api.getProgress().answers["lifecycle-valid-1"].c, true);
  assert.equal(contentEvents.length, 1, "answering does not fire another content event");
});

test("mutating the caller's source object, options array, or wrong-answer-feedback object after a successful addQuestions() call cannot change the live, accepted question or its correctness (QL-028)", () => {
  const env = boot();
  const source = {
    id: "lifecycle-mutate-1", d: "operations", t: "lab-ops", x: 1,
    q: "Original prompt", o: ["Original A", "Original B"], a: 0, why: "Original rationale",
    w: { 1: "Original feedback" },
  };
  const result = env.api.addQuestions("m2", [source]);
  assert.equal(result.ok, true);

  // Mutate every mutable part of the caller's own object graph AFTER the
  // call returns.
  source.q = "MUTATED PROMPT";
  source.o[0] = "MUTATED OPTION";
  source.o.push("INJECTED EXTRA OPTION");
  source.a = 1; // attempt to flip the correct answer
  source.why = "MUTATED RATIONALE";
  source.w[1] = "MUTATED FEEDBACK";
  source.w[0] = "SMUGGLED FEEDBACK FOR THE CORRECT OPTION";

  const live = env.api.getQuestions("m2").find((q) => q.id === "lifecycle-mutate-1");
  assert.equal(live.q, "Original prompt");
  assert.equal(live.o.length, 2, "the extra pushed option never appears");
  assert.equal(live.o[0], "Original A");
  assert.equal(live.a, 0, "the correct-answer index is unaffected by the later mutation");
  assert.equal(live.why, "Original rationale");
  assert.equal(live.w["1"], "Original feedback");
  assert.equal(live.w["0"], undefined, "the smuggled post-hoc feedback key never appears");

  // Confirm correctness itself, not just the read-back shape: answering
  // option 0 (the ORIGINAL correct answer) must still be scored correct,
  // proving the live question's own `a` was never actually flipped.
  const mount = quizMount(env, "m2");
  const item = [...mount.querySelectorAll(".qitem")].find((el) => el.querySelector(".qtext").textContent === "Original prompt");
  item.querySelectorAll(".qopt")[0].click();
  assert.equal(env.api.getProgress().answers["lifecycle-mutate-1"].c, true);
});

test("addQuestions() rejects adversarial inputs atomically -- accessor, inherited, symbol-keyed, non-enumerable, dangerous-key, sparse-array, extra-field, and non-record -- adding nothing, rebuilding nothing, and emitting nothing, without ever invoking a caller getter", () => {
  const cases = [];

  var accessorGetterInvoked = false;
  var accessorQuestion = { d: "operations", t: "lab-ops", x: 1, q: "q", o: ["a", "b"], a: 0, why: "w" };
  Object.defineProperty(accessorQuestion, "id", { get() { accessorGetterInvoked = true; return "accessor-1"; }, enumerable: true });
  cases.push(["accessor id property", accessorQuestion]);

  cases.push(["symbol-keyed extra property", Object.assign(
    { id: "symbol-1", d: "operations", t: "lab-ops", x: 1, q: "q", o: ["a", "b"], a: 0, why: "w" },
    { [Symbol("marker")]: "x" },
  )]);

  var nonEnumerable = { d: "operations", t: "lab-ops", x: 1, q: "q", o: ["a", "b"], a: 0, why: "w" };
  Object.defineProperty(nonEnumerable, "id", { value: "nonenum-1", enumerable: false });
  cases.push(["non-enumerable id property", nonEnumerable]);

  var dangerousKey = { id: "danger-1", d: "operations", t: "lab-ops", x: 1, q: "q", o: ["a", "b"], a: 0, why: "w" };
  Object.defineProperty(dangerousKey, "__proto__", { value: {}, enumerable: true, configurable: true });
  cases.push(["dangerous own key (__proto__)", dangerousKey]);

  cases.push(["sparse options array", { id: "sparse-1", d: "operations", t: "lab-ops", x: 1, q: "q", o: [, "b"], a: 0, why: "w" }]);
  cases.push(["unsupported extra top-level field", { id: "extra-1", d: "operations", t: "lab-ops", x: 1, q: "q", o: ["a", "b"], a: 0, why: "w", bogus: "x" }]);
  cases.push(["non-record object (Date)", new Date()]);
  cases.push(["inherited (not own) id via prototype", Object.assign(Object.create({ id: "inherited-1" }), { d: "operations", t: "lab-ops", x: 1, q: "q", o: ["a", "b"], a: 0, why: "w" })]);

  cases.forEach(([label, badQuestion]) => {
    const env = boot();
    let contentEvents = 0;
    env.api.on("content", () => { contentEvents += 1; });
    const before = env.api.getQuestions("m2").length;
    const beforeMountItems = quizMount(env, "m2").querySelectorAll(".qitem").length;

    const result = env.api.addQuestions("m2", [badQuestion]);
    assert.equal(result.ok, false, `${label}: batch must be rejected`);
    assert.equal(result.added, 0, `${label}: nothing added`);
    assert.equal(env.api.getQuestions("m2").length, before, `${label}: nothing added to the live bank`);
    assert.equal(quizMount(env, "m2").querySelectorAll(".qitem").length, beforeMountItems, `${label}: widget not rebuilt`);
    assert.equal(contentEvents, 0, `${label}: no content event emitted`);
  });

  assert.equal(accessorGetterInvoked, false, "the adversarial id getter was never invoked while validating or reporting the rejection");
});

test("a batch with one valid and one invalid question is rejected atomically: neither question is added", () => {
  const env = boot();
  let contentEvents = 0;
  env.api.on("content", () => { contentEvents += 1; });
  const before = env.api.getQuestions("m2").length;

  const result = env.api.addQuestions("m2", [
    { id: "batch-valid-1", d: "operations", t: "lab-ops", x: 1, q: "Valid?", o: ["Yes", "No"], a: 0, why: "Because." },
    { id: "batch-invalid-1", d: "not-a-real-domain", t: "lab-ops", x: 1, q: "Invalid?", o: ["Yes", "No"], a: 0, why: "Because." },
  ]);
  assert.equal(result.ok, false);
  assert.equal(env.api.getQuestions("m2").length, before, "the valid question in the same batch is not partially committed");
  assert.equal(contentEvents, 0);
});

test("reload without reinjection restores only authored questions, with the injected definition never appearing in localStorage or exportJSON()", () => {
  const env = boot();
  const authoredCount = env.api.getStats().questionsTotal;
  env.api.addQuestions("m2", [{
    id: "lifecycle-storage-1", d: "operations", t: "lab-ops", x: 1,
    q: "SENTINEL PROMPT TEXT", o: ["SENTINEL OPTION A", "SENTINEL OPTION B"], a: 0, why: "SENTINEL RATIONALE TEXT",
  }]);
  quizMount(env, "m2").querySelectorAll(".qitem")[quizMount(env, "m2").querySelectorAll(".qitem").length - 1].querySelectorAll(".qopt")[0].click();

  const rawStorage = env.storage.getItem(V2_KEY);
  assert.ok(rawStorage, "sanity: a save did happen");
  for (const needle of ["SENTINEL PROMPT TEXT", "SENTINEL OPTION A", "SENTINEL OPTION B", "SENTINEL RATIONALE TEXT"]) {
    assert.equal(rawStorage.includes(needle), false, `localStorage must never contain the injected definition text ("${needle}")`);
  }
  const exported = env.api.exportJSON();
  for (const needle of ["SENTINEL PROMPT TEXT", "SENTINEL OPTION A", "SENTINEL OPTION B", "SENTINEL RATIONALE TEXT"]) {
    assert.equal(exported.includes(needle), false, `exportJSON() must never contain the injected definition text ("${needle}")`);
  }
  assert.ok(exported.includes("lifecycle-storage-1"), "exportJSON() DOES include the outcome, keyed by id");

  const reloaded = boot({ storage: env.storage._raw });
  assert.equal(reloaded.api.getStats().questionsTotal, authoredCount, "reload without reinjection restores only authored questions");
  assert.equal(reloaded.api.getQuestions("m2").some((q) => q.id === "lifecycle-storage-1"), false);
});

test("that stale outcome contributes nothing to coverage, mastery, weak areas, unmastered results, or rendered UI after reload", () => {
  const env = boot();
  env.api.addQuestions("m2", [{
    id: "lifecycle-stale-analytics-1", d: "operations", t: "lab-ops", x: 1,
    q: "Stale analytics question?", o: ["Yes", "No"], a: 0, why: "Because.",
  }]);
  const mount = quizMount(env, "m2");
  mount.querySelectorAll(".qitem")[mount.querySelectorAll(".qitem").length - 1].querySelectorAll(".qopt")[0].click();

  const reloaded = boot({ storage: env.storage._raw });
  const stats = reloaded.api.getStats();
  assert.equal(stats.questionsAnswered, 0, "coverage excludes the stale outcome");
  assert.equal(stats.questionsMastered, 0);
  assert.equal(JSON.stringify(stats.byDomain), "{}", "no domain aggregate is contaminated");
  assert.equal(reloaded.api.getWeakAreas(1).length, 0, "weak areas excludes it");
  assert.equal(reloaded.api.getUnmastered().every((e) => e.id !== "lifecycle-stale-analytics-1"), true, "unmastered results never surface a stale id");
  assert.equal(quizMount(reloaded, "m2").querySelectorAll(".qitem").length, reloaded.api.getQuestions("m2").length, "the rendered widget matches only currently known questions -- no stale item is rendered");
});

test("importJSON() containing an injected question's outcome does not install its definition", () => {
  const env = boot();
  env.api.addQuestions("m2", [{
    id: "lifecycle-import-1", d: "operations", t: "lab-ops", x: 1,
    q: "Import boundary question?", o: ["Yes", "No"], a: 0, why: "Because.",
  }]);
  const mount = quizMount(env, "m2");
  mount.querySelectorAll(".qitem")[mount.querySelectorAll(".qitem").length - 1].querySelectorAll(".qopt")[0].click();
  const exportedState = JSON.parse(env.api.exportJSON()).state;

  const fresh = boot();
  const importResult = fresh.api.importJSON(exportedState);
  assert.equal(importResult.ok, true);
  assert.equal(fresh.api.getQuestions("m2").some((q) => q.id === "lifecycle-import-1"), false, "importJSON() never installs a question definition");
  assert.equal(fresh.api.getProgress().answers["lifecycle-import-1"].c, true, "the outcome itself IS imported, as an ordinary (currently stale) progress record");
  assert.equal(fresh.api.getStats().questionsAnswered, 0, "and is correctly excluded from current-facing analytics, since the id is unknown this session");
});

test("reinjecting the exact same semantic question under the same id revives its preserved outcome, and a subsequent reattempt updates that ONE record without duplicating it", () => {
  const definition = {
    id: "lifecycle-revive-1", d: "operations", t: "lab-ops", x: 1,
    q: "Revive question?", o: ["Yes", "No"], a: 0, why: "Because.",
  };
  const first = boot();
  first.api.addQuestions("m2", [definition]);
  const mount1 = quizMount(first, "m2");
  mount1.querySelectorAll(".qitem")[mount1.querySelectorAll(".qitem").length - 1].querySelectorAll(".qopt")[0].click();
  assert.equal(first.api.getProgress().answers["lifecycle-revive-1"].n, 1);

  const second = boot({ storage: first.storage._raw });
  assert.equal(second.api.getStats().questionsAnswered, 0, "sanity: stale before reinjection");
  const revive = second.api.addQuestions("m2", [definition]);
  assert.equal(revive.ok, true);
  assert.equal(second.api.getStats().questionsAnswered, 1, "reviving picks the preserved outcome back up, with no special-case code");
  assert.equal(second.api.getProgress().answers["lifecycle-revive-1"].n, 1, "the revived record is the SAME one, not a fresh n:0/undefined record");

  // Reattempt (opposite answer) after revival, through the real
  // reload/rebuild path -- this is only reachable across a reload,
  // matching every other reattempt test in this suite.
  const third = boot({ storage: second.storage._raw });
  third.api.addQuestions("m2", [definition]);
  const mount3 = quizMount(third, "m2");
  mount3.querySelectorAll(".qitem")[mount3.querySelectorAll(".qitem").length - 1].querySelectorAll(".qopt")[1].click();

  const record = third.api.getProgress().answers["lifecycle-revive-1"];
  assert.equal(record.n, 2, "the ONE existing record's attempt count grows -- no duplicate record under a different key");
  assert.equal(record.c, false, "the outcome reflects the latest attempt");
  assert.equal(Object.keys(third.api.getProgress().answers).length, 1, "still exactly one answer record total");
});

test("Reset deletes an injected question's durable outcome exactly like any other progress record, and it remains absent after reload", () => {
  const env = boot();
  env.api.addQuestions("m2", [{
    id: "lifecycle-reset-1", d: "operations", t: "lab-ops", x: 1,
    q: "Reset question?", o: ["Yes", "No"], a: 0, why: "Because.",
  }]);
  const mount = quizMount(env, "m2");
  mount.querySelectorAll(".qitem")[mount.querySelectorAll(".qitem").length - 1].querySelectorAll(".qopt")[0].click();
  assert.ok(env.api.getProgress().answers["lifecycle-reset-1"], "sanity: the outcome is recorded");

  const resetResult = env.api.reset();
  assert.equal(resetResult.ok, true);
  assert.equal(env.api.getProgress().answers["lifecycle-reset-1"], undefined, "Reset removes it immediately, like any current or stale record");

  const reloaded = boot({ storage: env.storage._raw });
  assert.equal(reloaded.api.getProgress().answers["lifecycle-reset-1"], undefined, "it remains absent after reload -- Reset's removal was durable");
});

test("ordinary authored course questions are byte-for-byte unchanged by an unrelated addQuestions() call", () => {
  const env = boot();
  const before = JSON.stringify(env.api.getQuestions("m1"));
  env.api.addQuestions("m2", [{
    id: "lifecycle-unrelated-1", d: "operations", t: "lab-ops", x: 1,
    q: "Unrelated question?", o: ["Yes", "No"], a: 0, why: "Because.",
  }]);
  const after = JSON.stringify(env.api.getQuestions("m1"));
  assert.equal(after, before, "an authored module's question data is untouched by injecting into a different module");
});

test("getWeakAreas(): distinct answered questions, latest outcomes, minAnswered as a distinct-question threshold (not an attempt threshold), TWO independently qualifying topics sorted weakest-first, with compatible fields, and the order genuinely reverses after real reload/rebuild reattempts", () => {
  const env = boot();
  // Two independent topics, each with 3 distinct answered questions (the
  // prior version of this test created only one qualifying topic, so a
  // one-row array could never actually prove sort order).
  const specQ = env.api.getQuestions("m2").slice(0, 3);      // specimen-collection
  const analysisQ = env.api.getQuestions("m9").slice(0, 3);  // chromosome-id
  const wrongSpec0 = specQ[0].a === 0 ? 1 : 0;
  const wrongSpec1 = specQ[1].a === 0 ? 1 : 0;
  const wrongAnalysis2 = analysisQ[2].a === 0 ? 1 : 0;

  const specMount = quizMount(env, "m2");
  specMount.querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[wrongSpec0].click(); // incorrect
  specMount.querySelectorAll(".qitem")[1].querySelectorAll(".qopt")[wrongSpec1].click(); // incorrect
  specMount.querySelectorAll(".qitem")[2].querySelectorAll(".qopt")[specQ[2].a].click(); // correct
  // specimen-collection: 1/3 correct = 33% -- the weaker topic

  const analysisMount = quizMount(env, "m9");
  analysisMount.querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[analysisQ[0].a].click(); // correct
  analysisMount.querySelectorAll(".qitem")[1].querySelectorAll(".qopt")[analysisQ[1].a].click(); // correct
  analysisMount.querySelectorAll(".qitem")[2].querySelectorAll(".qopt")[wrongAnalysis2].click(); // incorrect
  // chromosome-id: 2/3 correct = 67% -- the stronger topic

  const belowThreshold = env.api.getWeakAreas(4);
  assert.equal(belowThreshold.length, 0, "3 distinct answered questions per topic is below a minAnswered:4 threshold (counts distinct questions, not attempts)");

  const rows = env.api.getWeakAreas(3);
  assert.equal(rows.length, 2, "both topics independently qualify at minAnswered:3");
  assert.equal(rows[0].topic, specQ[0].t, "the weaker topic (33%) sorts first");
  assert.equal(rows[0].answered, 3);
  assert.equal(rows[0].mastered, 1);
  assert.equal(rows[0].masteryPct, Math.round((1 / 3) * 100));
  assert.equal(rows[0].correct, rows[0].mastered, "compatibility alias agrees");
  assert.equal(rows[0].pct, rows[0].masteryPct, "compatibility alias agrees");
  assert.equal(rows[1].topic, analysisQ[0].t, "the stronger topic (67%) sorts second");
  assert.equal(rows[1].answered, 3);
  assert.equal(rows[1].mastered, 2);
  assert.equal(rows[1].masteryPct, Math.round((2 / 3) * 100));
  assert.equal(rows[1].correct, rows[1].mastered);
  assert.equal(rows[1].pct, rows[1].masteryPct);

  // Reverse which topic is weaker, entirely through the real
  // reload/rebuild reattempt path: bring specimen-collection up to 100%
  // and bring chromosome-id down to 0%.
  const reloaded = boot({ storage: { [V2_KEY]: JSON.stringify(env.api.getProgress()) } });
  const reloadedSpecMount = quizMount(reloaded, "m2");
  reloadedSpecMount.querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[specQ[0].a].click(); // now correct
  reloadedSpecMount.querySelectorAll(".qitem")[1].querySelectorAll(".qopt")[specQ[1].a].click(); // now correct
  const reloadedAnalysisMount = quizMount(reloaded, "m9");
  const wrongAnalysis0 = analysisQ[0].a === 0 ? 1 : 0;
  const wrongAnalysis1 = analysisQ[1].a === 0 ? 1 : 0;
  reloadedAnalysisMount.querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[wrongAnalysis0].click(); // now incorrect
  reloadedAnalysisMount.querySelectorAll(".qitem")[1].querySelectorAll(".qopt")[wrongAnalysis1].click(); // now incorrect

  const reversedRows = reloaded.api.getWeakAreas(3);
  assert.equal(reversedRows.length, 2);
  assert.equal(reversedRows[0].topic, analysisQ[0].t, "chromosome-id is now the weaker topic (0%) and sorts first");
  assert.equal(reversedRows[0].masteryPct, 0);
  assert.equal(reversedRows[0].mastered, 0);
  assert.equal(reversedRows[1].topic, specQ[0].t, "specimen-collection is now the stronger topic (100%) and sorts second -- the order genuinely reversed");
  assert.equal(reversedRows[1].masteryPct, 100);
  assert.equal(reversedRows[1].mastered, 3);
});

test("exportJSON()'s stats snapshot reports the same analytics model and field semantics as getStats(), and import atomicity is unaffected", () => {
  const env = boot();
  const question = env.api.getQuestions("m1")[0];
  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[question.a].click();

  const liveStats = env.api.getStats();
  const exported = JSON.parse(env.api.exportJSON());
  assert.equal(exported.stats.analyticsModel, "last-attempt-mastery-v1");
  assert.equal(JSON.stringify(exported.stats), JSON.stringify(liveStats), "the exported snapshot agrees field-for-field with getStats()");

  // Import atomicity is unrelated to this task and must remain unchanged:
  // a malformed import still leaves live state/stats untouched.
  const beforeStats = JSON.stringify(env.api.getStats());
  const result = env.api.importJSON({ v: 2, modules: {}, answers: "not-an-object", exercises: {}, started: 0 });
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(env.api.getStats()), beforeStats);
});

test("reading analytics emits no events, and answering/reattempting preserves the existing event contract with no new analytics event added", () => {
  const env = boot();
  const counts = { progress: 0, answer: 0, exercise: 0, content: 0, persistence: 0, all: 0 };
  ["progress", "answer", "exercise", "content", "persistence"].forEach((evt) => {
    env.api.on(evt, () => { counts[evt] += 1; });
  });
  env.api.on("*", () => { counts.all += 1; });

  // Pure reads: none of these may emit anything.
  env.api.getStats();
  env.api.getWeakAreas();
  env.api.getUnmastered();
  env.api.exportJSON();
  assert.equal(counts.all, 0, "no event fires from reading analytics");

  const question = env.api.getQuestions("m1")[0];
  quizMount(env, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[question.a].click();
  assert.equal(counts.answer, 1);
  assert.equal(counts.progress, 1);
  assert.equal(counts.exercise, 0);
  assert.equal(counts.persistence, 0, "no new analytics event was introduced");

  const reloaded = boot({ storage: { [V2_KEY]: JSON.stringify(env.api.getProgress()) } });
  const wrongIndex = question.a === 0 ? 1 : 0;
  let reloadedAnswerEvents = 0, reloadedProgressEvents = 0;
  reloaded.api.on("answer", () => { reloadedAnswerEvents += 1; });
  reloaded.api.on("progress", () => { reloadedProgressEvents += 1; });
  quizMount(reloaded, "m1").querySelectorAll(".qitem")[0].querySelectorAll(".qopt")[wrongIndex].click();
  assert.equal(reloadedAnswerEvents, 1, "a reattempt still fires exactly one answer event, unchanged");
  assert.equal(reloadedProgressEvents, 1);
});

/* ============================ accessibility (implemented behavior) ============================ */

test("the document exposes landmarks, a skip link, and labelled regions", () => {
  assert.match(html, /class="skip-link"/i);
  assert.match(html, /<main\b[^>]*id="main"/i);
  assert.match(html, /<aside\b[^>]*aria-label=/i);
  assert.match(html, /<nav\b[^>]*aria-label=/i);
  assert.match(html, /@media\s*\(prefers-reduced-motion/i);
  assert.match(html, /:focus-visible/i);
});

test("the navigation toggle exposes aria-expanded in both states", () => {
  const env = boot();
  const toggle = env.document.getElementById("navToggle");
  assert.ok(toggle.hasAttribute("aria-expanded"), "aria-expanded present before interaction");
  toggle.click();
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  toggle.click();
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
});

test("flashcards are keyboard operable", () => {
  const env = boot();
  const card = env.body.querySelector(".flash-card");
  assert.equal(card.getAttribute("tabindex"), "0");
  assert.ok(card.getAttribute("role"), "the card advertises an interactive role");

  card.dispatchEvent("keydown", { key: "Enter" });
  assert.ok(card.classList.contains("flipped"), "Enter flips the card");
  card.dispatchEvent("keydown", { key: " " });
  assert.ok(!card.classList.contains("flipped"), "Space flips it back");

  const front = card.querySelector(".ff-q").textContent;
  env.body.querySelectorAll(".flash-cat")[1].click();
  assert.notEqual(card.querySelector(".ff-q").textContent, front, "switching decks changes the card");
});

test("every rendered control is a typed button", () => {
  const env = boot();
  const untyped = env.body
    .querySelectorAll("button")
    .filter((button) => (button.getAttribute("type") || "").toLowerCase() !== "button");
  assert.deepEqual(
    untyped.map((button) => button.className),
    [],
    "dynamically created buttons declare type=button",
  );
});

/* ============================ summary ============================ */

console.log("");
if (failures.length) {
  console.error(`DOM behavior smoke tests failed: ${failures.length} of ${passed + failures.length}.\n`);
  for (const failure of failures) {
    console.error(`— ${failure.name}`);
    console.error(`  ${failure.error.message}\n`);
  }
  process.exitCode = 1;
} else {
  console.log(`DOM behavior smoke tests passed (${passed} checks).`);
  console.log("");
  console.log("Gates this harness does NOT cover — still require a real browser:");
  for (const gap of [
    "rendering, layout, and colour contrast",
    "true focus order, focus trapping, and Escape/inert behaviour for the mobile sidebar",
    "actual assistive-tech announcement of the role=\"status\" storage warning (this harness checks its DOM state/text only)",
    "aria-current / aria-pressed state semantics (not implemented)",
    "accessible names for instructional SVGs",
    "flashcard front/back screen-reader state",
    "narrow-screen, touch, and deployed Pages behaviour",
    "automated WCAG scan and screen-reader review",
  ]) {
    console.log(`  · ${gap}`);
  }
}
