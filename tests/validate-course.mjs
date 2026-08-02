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

test("displayed fonts and embedded images are served locally, not from a remote runtime host", () => {
  // Every @font-face src must be a local, relative path — no remote font host.
  const fontFaceBlocks = [...html.matchAll(/@font-face\s*\{[^}]*\}/gi)].map((match) => match[0]);
  assert.ok(fontFaceBlocks.length >= 7, "expected at least 7 @font-face rules (4 Sans weights + 3 Mono weights)");
  const fontSrcUrls = fontFaceBlocks.flatMap((block) =>
    [...block.matchAll(/url\((["']?)([^"')]+)\1\)/gi)].map((match) => match[2]),
  );
  assert.ok(fontSrcUrls.length > 0, "no @font-face src url() found");
  for (const url of fontSrcUrls) {
    assert.ok(!/^https?:\/\//i.test(url), `@font-face src must be local, found remote url: ${url}`);
    assert.match(url, /^assets\/fonts\//, `@font-face src must live under assets/fonts/, found: ${url}`);
  }

  // No remaining reference to a remote font host anywhere in the document.
  assert.doesNotMatch(html, /fonts\.googleapis\.com/i);
  assert.doesNotMatch(html, /fonts\.gstatic\.com/i);

  // The two embedded figure <img> tags must point to local assets, not a remote image host.
  const embeddedImageLocalPaths = [
    "assets/images/nhgri-human-male-karyotype-46xy.png",
    "assets/images/wellcome-b0000249-trisomy21-karyotype-47xy.jpg",
  ];
  for (const localPath of embeddedImageLocalPaths) {
    const imgTagPattern = new RegExp(`<img\\b[^>]*\\bsrc\\s*=\\s*["']${localPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
    assert.match(html, imgTagPattern, `expected an <img> tag with src="${localPath}"`);
  }
  assert.doesNotMatch(html, /<img\b[^>]*\bsrc\s*=\s*["']https?:\/\//i, "no <img> tag may load from a remote host");

  // Every local font/image asset referenced by the page must actually exist on disk with nonzero size.
  const referencedLocalAssets = [
    ...fontSrcUrls,
    ...embeddedImageLocalPaths,
  ];
  for (const relPath of referencedLocalAssets) {
    const absPath = path.join(root, relPath);
    assert.ok(fs.existsSync(absPath), `referenced local asset does not exist: ${relPath}`);
    assert.ok(fs.statSync(absPath).size > 0, `referenced local asset is empty: ${relPath}`);
  }

  // External attribution/source-page links must remain intact and external (not localized).
  assert.match(html, /https:\/\/commons\.wikimedia\.org\/wiki\/File:NHGRI_human_male_karyotype\.png/);
  assert.match(html, /https:\/\/wellcomecollection\.org\/works\/wmcdanw6/);
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

test("every exercise item has complete, unique, non-colliding stable and legacy id metadata", () => {
  // Issue #2 / QL-005: exercise progress identity depends on every item
  // carrying both an explicit stable `id` and a literal, frozen `legacyId`
  // (the exact position-derived key that item held before this migration
  // existed). Missing, blank, duplicate, or colliding values here would
  // silently break migrateExerciseIds()'s guarantees.
  const stableIds = [];
  const legacyIds = [];
  Object.entries(exercises).forEach(([key, exercise]) => {
    exercise.items.forEach((item, i) => {
      assert.equal(typeof item.id, "string", `${key}[${i}]: missing a string id`);
      assert.ok(item.id.trim(), `${key}[${i}]: id must not be blank`);
      assert.equal(typeof item.legacyId, "string", `${key}[${i}]: missing a string legacyId`);
      assert.ok(item.legacyId.trim(), `${key}[${i}]: legacyId must not be blank`);
      stableIds.push(item.id);
      legacyIds.push(item.legacyId);
    });
  });

  assert.equal(stableIds.length, 30, "30 exercise items across 6 sets");
  assert.equal(new Set(stableIds).size, 30, "every stable id must be unique");
  assert.equal(legacyIds.length, 30);
  assert.equal(new Set(legacyIds).size, 30, "every legacy id must be unique");

  const stableSet = new Set(stableIds);
  const legacyOverlap = legacyIds.filter((id) => stableSet.has(id));
  assert.deepEqual(legacyOverlap, [], "no legacy id may accidentally collide with any stable id");
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
  const modules = api.getModules();

  // Checked before splitting into module/pool rows: the table must contain
  // exactly one row per live module plus exactly one final-pool row — no
  // more, no fewer. This catches a duplicated or fabricated row that a
  // Set-based ID comparison alone would miss (Set collapses duplicates).
  assert.equal(
    rows.length,
    modules.length + 1,
    `docs/SCIENTIFIC_REVIEW.md's per-module table has ${rows.length} data rows; expected exactly ` +
      `${modules.length + 1} (one per live module, plus exactly one final-pool row)`,
  );

  const moduleRows = rows.filter((row) => /^m\d+$/.test(row[0]));
  // The final-pool row must use this exact, stable identifier — not "any
  // row whose Module cell isn't shaped like m<number>", which would let a
  // renamed or fabricated non-module row silently stand in for it.
  const FINAL_POOL_ID = "*(pool)*";
  const poolRows = rows.filter((row) => row[0] === FINAL_POOL_ID);

  assert.equal(
    moduleRows.length,
    modules.length,
    `docs/SCIENTIFIC_REVIEW.md has ${moduleRows.length} rows matching "m<number>"; expected exactly ` +
      `${modules.length} to match the live module count (a duplicated module row would inflate this ` +
      "without changing the row's set of unique IDs)",
  );

  const tableIdList = moduleRows.map((row) => row[0]);
  const tableIdSet = new Set(tableIdList);
  assert.equal(
    tableIdList.length,
    tableIdSet.size,
    `docs/SCIENTIFIC_REVIEW.md has duplicate module rows sharing an ID: ${JSON.stringify(tableIdList)} ` +
      `(${tableIdList.length} module rows but only ${tableIdSet.size} unique IDs)`,
  );

  const liveIds = new Set(modules.map((module) => module.id));
  assert.deepEqual(
    [...tableIdSet].sort(),
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
    `expected exactly one final-pool row identified by Module cell "${FINAL_POOL_ID}" in the per-module ` +
      "status table (a renamed or fabricated identifier would not be recognized as the pool row)",
  );
  assert.equal(
    poolRows[0][1],
    "Final cumulative exam",
    `final-pool row title ("${poolRows[0][1]}") must be exactly "Final cumulative exam"`,
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
