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
