import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const htmlPath = path.join(root, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = String(item[field]);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

test("index.html has the expected document shell", () => {
  assert.match(html, /^<!DOCTYPE html>/i);
  assert.match(html, /<html\s+lang="en">/i);
  assert.match(html, /<meta\s+name="viewport"/i);
  assert.match(html, /<main\b[^>]*id="main"/i);
  assert.match(html, /<\/html>\s*$/i);
});

test("the development-only Tailwind CDN is absent", () => {
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/i);
});

test("static buttons declare their type", () => {
  const buttonTags = [...html.matchAll(/<button\b[^>]*>/gi)].map((match) => match[0]);
  const missingType = buttonTags.filter((tag) => !/\btype\s*=/i.test(tag));
  assert.equal(missingType.length, 0, `Buttons missing type: ${missingType.join(", ")}`);
});

test("static DOM ids are unique", () => {
  const markup = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
  const ids = [...markup.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test("external page resources use HTTPS", () => {
  const resources = [
    ...html.matchAll(/\b(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi),
  ].map((match) => match[1]);
  assert.ok(resources.length > 0);
  assert.deepEqual(resources.filter((url) => !url.startsWith("https://")), []);
});

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim());

test("the course has one syntactically valid inline script", () => {
  assert.equal(inlineScripts.length, 1);
  new vm.Script(inlineScripts[0], { filename: "index.inline.js" });
});

const documentStub = {
  readyState: "loading",
  addEventListener() {},
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
};
const sandbox = {
  window: {},
  document: documentStub,
  console,
  Date,
  JSON,
  Math,
  setTimeout,
  clearTimeout,
};
vm.createContext(sandbox);
vm.runInContext(inlineScripts[0], sandbox, {
  filename: "index.inline.js",
  timeout: 5_000,
});

const api = sandbox.window.CytoCourse;
const quizSets = api.getQuestions();
const questions = Object.entries(quizSets).flatMap(([quiz, items]) =>
  items.map((item) => ({ ...item, quiz })),
);
const exercises = api.getExercises();
const flashcards = api.getFlashcards();
const images = api.getImages();

test("the public course API exposes the stabilized version", () => {
  assert.equal(api.version, "1.1.1");
  assert.equal(api.schema, 2);
  assert.equal(api.getModules().length, 17);
});

test("all 153 questions satisfy the content contract", () => {
  const domains = new Set(["orientation", "specimen", "analysis", "molecular", "operations"]);
  assert.equal(questions.length, 153);

  for (const question of questions) {
    assert.ok(question.id);
    assert.ok(domains.has(question.d), `${question.id}: invalid domain`);
    assert.equal(typeof question.t, "string", `${question.id}: missing topic`);
    assert.ok([1, 2, 3].includes(question.x), `${question.id}: invalid difficulty`);
    assert.equal(typeof question.q, "string", `${question.id}: missing prompt`);
    assert.ok(Array.isArray(question.o) && question.o.length >= 2, `${question.id}: invalid options`);
    assert.ok(Number.isInteger(question.a), `${question.id}: answer is not an integer`);
    assert.ok(question.a >= 0 && question.a < question.o.length, `${question.id}: answer out of bounds`);
    assert.equal(typeof question.why, "string", `${question.id}: missing rationale`);
  }

  const ids = questions.map((question) => question.id);
  assert.equal(new Set(ids).size, ids.length, "Question ids must be globally unique");
});

test("question distribution matches the documented v1.1 baseline", () => {
  assert.deepEqual(
    countBy(questions, "d"),
    { orientation: 5, specimen: 33, analysis: 91, molecular: 14, operations: 10 },
  );
  assert.deepEqual(countBy(questions, "x"), { 1: 93, 2: 42, 3: 18 });
});

test("exercise, flashcard, and image manifests match the baseline", () => {
  assert.equal(Object.keys(exercises).length, 6);
  assert.equal(
    Object.values(exercises).reduce((total, exercise) => total + exercise.items.length, 0),
    30,
  );
  assert.equal(Object.keys(flashcards).length, 7);
  assert.equal(
    Object.values(flashcards).reduce((total, deck) => total + deck.length, 0),
    61,
  );
  assert.equal(images.length, 19);
  assert.equal(images.filter((image) => image.status === "embedded").length, 2);
  assert.equal(images.filter((image) => image.status === "needed").length, 17);

  for (const image of images.filter((item) => item.status === "embedded")) {
    assert.equal(image.licenseVerified, true, `${image.id}: license must be verified`);
    assert.equal(image.redistribution_ok, true, `${image.id}: redistribution decision missing`);
    assert.ok(image.sourcePage, `${image.id}: source page missing`);
    assert.ok(image.credit, `${image.id}: credit missing`);
  }
});

test("quiz and exercise mounts map to declared data keys", () => {
  const quizMounts = [...html.matchAll(/data-quiz=["']([^"']+)["']/g)].map((match) => match[1]);
  const exerciseMounts = [...html.matchAll(/data-exer=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(quizMounts)].sort(), Object.keys(quizSets).sort());
  assert.deepEqual([...new Set(exerciseMounts)].sort(), Object.keys(exercises).sort());
});

test("question injection rejects malformed and globally duplicate ids atomically", () => {
  const before = api.getQuestions("m2").length;
  const malformed = api.addQuestions("m2", [{
    id: "test-malformed",
    d: "molecular",
    t: "test",
    x: 9,
    q: "Invalid difficulty",
    o: ["A", "B"],
    a: 0,
    why: "Test",
  }]);
  assert.equal(malformed.ok, false);
  assert.equal(api.getQuestions("m2").length, before);

  const duplicate = api.addQuestions("m2", [{
    ...api.getQuestions("m1")[0],
  }]);
  assert.equal(duplicate.ok, false);
  assert.equal(api.getQuestions("m2").length, before);
});

test("the scientific-review status record's per-module table matches the live course data exactly", () => {
  const reviewDocPath = path.join(root, "docs", "SCIENTIFIC_REVIEW.md");
  const reviewDoc = fs.readFileSync(reviewDocPath, "utf8");
  const lines = reviewDoc.split("\n");

  const headerIndex = lines.findIndex((line) =>
    /^\|\s*Module\s*\|\s*Title\s*\|\s*Blueprint domain\s*\|\s*Quiz questions\s*\|\s*Scientific review status\s*\|/.test(
      line.trim(),
    ),
  );
  assert.notEqual(headerIndex, -1, "expected the per-module status table header in docs/SCIENTIFIC_REVIEW.md");

  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith("|")) break;
    const cells = trimmed.split("|").slice(1, -1).map((cell) => cell.trim());
    assert.equal(cells.length, 5, `malformed table row in docs/SCIENTIFIC_REVIEW.md: "${trimmed}"`);
    rows.push(cells);
  }
  assert.ok(rows.length > 0, "expected at least one data row in the per-module status table");

  // Column order: [Module, Title, Blueprint domain, Quiz questions, Scientific review status].
  const moduleRows = rows.filter((row) => /^m\d+$/.test(row[0]));
  const poolRows = rows.filter((row) => !/^m\d+$/.test(row[0]));

  const modules = api.getModules();
  const liveIds = new Set(modules.map((module) => module.id));
  const tableIds = new Set(moduleRows.map((row) => row[0]));
  assert.deepEqual(
    [...tableIds].sort(),
    [...liveIds].sort(),
    "docs/SCIENTIFIC_REVIEW.md's module rows must exactly match the live module ID set from getModules() " +
      "(no missing module and no stale extra row)",
  );

  const rowById = new Map(moduleRows.map((row) => [row[0], row]));
  let moduleQuestionSum = 0;
  for (const module of modules) {
    const row = rowById.get(module.id);
    assert.ok(row, `docs/SCIENTIFIC_REVIEW.md is missing a row for module "${module.id}"`);
    assert.equal(
      row[1],
      module.short,
      `docs/SCIENTIFIC_REVIEW.md title for "${module.id}" ("${row[1]}") must match the live module title ` +
        `("${module.short}") from getModules()`,
    );
    const liveCount = api.getQuestions(module.id).length;
    const countMatch = row[3].match(/^(\d+)/);
    assert.ok(
      countMatch,
      `docs/SCIENTIFIC_REVIEW.md question count for "${module.id}" ("${row[3]}") must start with a number`,
    );
    const tableCount = Number(countMatch[1]);
    assert.equal(
      tableCount,
      liveCount,
      `docs/SCIENTIFIC_REVIEW.md question count for "${module.id}" (${tableCount}) must match ` +
        `getQuestions("${module.id}").length (${liveCount})`,
    );
    moduleQuestionSum += liveCount;
  }

  assert.equal(
    poolRows.length,
    1,
    'expected exactly one final-pool row (a Module cell not matching "m<number>") in the per-module status table',
  );
  const poolCountMatch = poolRows[0][3].match(/^(\d+)/);
  assert.ok(poolCountMatch, `final-pool row question count ("${poolRows[0][3]}") must start with a number`);
  const poolTableCount = Number(poolCountMatch[1]);
  const poolLiveCount = api.getQuestions("final").length;
  assert.equal(
    poolTableCount,
    poolLiveCount,
    `final-pool row count (${poolTableCount}) must match getQuestions("final").length (${poolLiveCount})`,
  );

  assert.equal(
    moduleQuestionSum + poolLiveCount,
    questions.length,
    `module question counts (${moduleQuestionSum}) plus the final-pool count (${poolLiveCount}) must reconcile ` +
      `to the live total question count (${questions.length})`,
  );
});

console.log("\nCourse validation passed.");
