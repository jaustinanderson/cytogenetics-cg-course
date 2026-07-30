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
