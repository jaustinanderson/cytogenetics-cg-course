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

  const rejected = env.api.importJSON(JSON.stringify({ state: { v: 1, modules: { m4: true } } }));
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
  assertImportRejectedAtomically(env, missingV, { errorPattern: /schema/i });
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
    "live status announcements (no aria-live regions exist yet)",
    "aria-current / aria-pressed state semantics (not implemented)",
    "accessible names for instructional SVGs",
    "flashcard front/back screen-reader state",
    "narrow-screen, touch, and deployed Pages behaviour",
    "automated WCAG scan and screen-reader review",
  ]) {
    console.log(`  · ${gap}`);
  }
}
