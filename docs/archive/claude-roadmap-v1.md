# Cytogenetics CG(ASCP) Course — Roadmap

**Status:** Phase 0 complete (shipped in `cytogenetics_cg_course.html`, v1.1). Phases 1–5 below are sequenced by dependency, not by wish-list order.

---

## What changed just now (Phase 0 — done)

The schema retrofit is in the file. Four things landed:

**1. All 153 questions tagged.** Every question object now carries `id`, `d` (domain), `t` (topic), `x` (difficulty 1–3). IDs are stable (`m9-q3`, `final-q17`) — verified zero duplicates. Domains map to the four ASCP BOC content areas so performance can be scored against real exam weighting.

**2. Progress model v2, with migration.** Replaced the binary `{modId:true}` blob with a versioned structure recording per-question outcomes (`{c:correct, n:attempts, ts:timestamp}`) for both quiz questions and exercise items. Existing `cyto_cg_progress_v1` data is detected and migrated on first load — tested, no loss of completed-module state.

**3. `window.CytoCourse` API.** External tooling reads and writes without scraping the DOM:

| Read | Analytics | Write | Events |
| :-- | :-- | :-- | :-- |
| `getModules()` | `getStats()` | `addQuestions(key, [...])` | `on('answer')` |
| `getQuestions([key])` | `getWeakAreas(minN)` | `importJSON(json)` | `on('exercise')` |
| `getExercises()` | `getUnmastered()` | `markModule(id, bool)` | `on('progress')` |
| `getFlashcards()` | `exportJSON()` | `reset()` | `on('content')` |
| `getImages([status])` | | | `off(evt, fn)` |

All reads return deep copies. `addQuestions()` validates shape, rejects duplicate IDs, and re-renders the affected quiz in place — so an agent can inject generated items into a live session.

**4. Image manifest.** `IMAGES` array — 2 embedded (license-verified) + 17 needed, each with type, subject, target module/exercise, and a candidate lead. Carries `redistribution_ok` as a field distinct from any ML-training judgement, for the reason in Phase 2.

*Validation: `node --check` clean; runtime harness exercised migration, tagging, analytics, import/export, and content injection. Tag balance intact. 335,650 → 354,772 bytes.*

---

## What the tagging immediately revealed

Tagging was supposed to be plumbing. It surfaced a content problem instead — **the question bank does not match the exam blueprint.**

| Domain | Questions | Current | ASCP target | Status |
| :-- | --: | --: | :-- | :-- |
| Specimen prep & culture | 33 | 22.3% | 20–25% | on target |
| Chromosome analysis & imaging | 91 | 61.5% | 45–50% | **over** |
| Molecular (FISH/array) | 14 | 9.5% | 15–25% | **under** |
| Lab operations | 10 | 6.8% | 10–15% | **under** |

*(148 blueprint-scored; 5 orientation questions in Module 1 are unscored.)*

Molecular is at **less than half** its floor, operations meaningfully below. Nobody would have seen this by reading the file — I wrote those questions and did not notice the drift, because module-level coverage looked complete. Domain tags made it a two-line query.

Difficulty seed also skews recall-heavy: **61% recall / 27% application / 12% judgment.** The exam leans harder on judgment than that.

This converts "increase question volume" from a vague goal into a specific target — see Phase 3.

---

## Phase 1 — Reconcile the image-sourcing picture *(do first; unblocks Phase 2)*

You currently have **three overlapping documents** describing the same problem: the Gemini catalog (two conflicting versions), my reconciliation of those, and Grok's resource guide. Collapse to one before sourcing anything.

Actions:

1. **Resolve the v1/v2 conflicts** in `datasets_catalog_reconciliation.md` — priority order is ChromosomeNet counts/license, AutoKary2022 data license, S-BIAD634 license split, Mendeley version-on-disk.
2. **Add Mendeley `nn4353y2xx` to the catalog.** Verified: 100 G-banded metaphase images, 2048×1536, 24-bit PNG, volunteer peripheral blood, Leica DM 2500 / DMC 2900. Absent from both catalog versions. Its published acquisition protocol (PHA, 72 h, colchicine at 69 h, 0.075 M KCl, trypsin 5–10 s, Giemsa 4–6 min) maps directly onto Modules 3–5 — a real image *and* the exact harvest that produced it. **License still unconfirmed — this is the gating check.**
3. **Add a `redistribution_ok` column.** Training-corpus suitability and republishing suitability are different questions. The catalog's designated open-training core (CIL) is 5,000 images of fetuses from amniotic culture — excellent for a model on your NAS, a heavier call for images redistributed inside a file you hand to other people. Volunteer-derived sets invert that ranking.
4. **Re-stamp `Last Verified Date` per row** and add `verification_source`. Both catalog versions currently claim the same verification date while contradicting each other, so that column proves nothing.

---

## Phase 2 — Real images into the four `.imgneeded` slots

Once Phase 1 clears licensing, fill in this order (highest teaching value first):

1. **Four metaphase quality states** (well-spread / overlapped / over-spread / short-contracted) — replaces schematic Figure 4.1 and upgrades exercise `ex7` from judging cartoons to judging real cells. This is the single biggest realism gain.
2. **Normal female 46,XX** — Module 8; the most conspicuous gap.
3. **Band-resolution series** (~400 / ~550 / ~700–850) — Module 9; nothing schematic can teach this.
4. **Abnormality karyograms** — Turner, Klinefelter, deletion, isochromosome, Philadelphia, inversion, ring.

Keep the SVG schematics. They are better than photographs for pure landmark drilling (clean, unambiguous, consistent) — real photos are better for quality judgment and "what do you actually see." Use both, deliberately, for different exercise types.

Target 15–30 curated images, not bulk ingest. Register each in `IMAGES` with license and credit at the time of insertion, never after.

---

## Phase 3 — Close the blueprint gap *(now a specific number)*

Holding analysis at its current 91 questions and rebalancing around it:

| Domain | Have | Target | Add |
| :-- | --: | --: | --: |
| Specimen prep & culture | 33 | 43 | **+10** |
| Chromosome analysis & imaging | 91 | 91 | +0 |
| Molecular (FISH/array) | 14 | 37 | **+23** |
| Lab operations | 10 | 23 | **+13** |
| **Total** | **153** | **199** | **+46** |

Molecular needs to more than double. Skew new items toward difficulty 2–3 to correct the recall bias — roughly 40% application, 30% judgment.

Because `addQuestions()` validates and dedupes, these can be drafted externally and injected, or written straight into the `QUIZZES` object. Either way they must carry the full tag set or they will not appear in analytics.

---

## Phase 4 — ISCN builder and harder cases

**ISCN builder.** The current `ex14` (pick the correct string) is the right idea at the wrong depth. Upgrade to token-by-token construction with rule validation — modal number → sex chromosomes → abnormality ordering → breakpoint format → clone brackets. Add "find the error" and "rewrite correctly" modes. This is the highest-yield skill in the course and the one most improved by interactivity.

**Harder cases.** The eight existing cases are clean single-thread scenarios. What the exam actually tests is discrimination under ambiguity: technical artifact vs. real finding, benign heteromorphism vs. pathogenic variant, pseudomosaicism vs. true low-level mosaicism. Add 4–6 cases that deliberately braid these, where the correct answer is sometimes "this is artifact, do not report it."

---

## Phase 5 — Mobile and adaptive layer

**Mobile** is genuinely last: the layout is already responsive, so remaining work is refinement (touch targets, sidebar behavior, exercise stage sizing on narrow screens) rather than construction.

**Adaptive study loop** becomes possible once Phases 0 and 3 are in place: `getWeakAreas()` identifies the soft topics, `getUnmastered()` returns the specific items, an external agent generates targeted questions, `addQuestions()` injects them. The course becomes the interface; your agent supplies the adaptation. Nothing further needs to be built inside the HTML for this to work.

---

## Where I differ from the Grok handoff

**On sequencing.** That document accepted priorities 1–6 as given. But 3, 4, and 5 all *emit data into the schema* that 1 defines — write 46 new questions before tagging exists and you retrofit tags onto 46 questions. Schema first was not a preference; it was the dependency. It is now done, so the rest can proceed in any order.

**On scope.** The handoff implied a substantial reorganization into a data layer. The data layer already existed — `MODULES`, `QUIZZES`, `EXERCISES`, `FLASHCARDS` were discrete objects with the engines reading from them. The real gaps were narrower and specific: closure-scoped data, binary progress, untagged questions, no manifest. All four are now closed, without a framework and without restructuring the file.

**On the workspace claim.** The handoff states no Gemini catalog exists in the shared workspace. Two versions are in your Drive, dated 25 July. Any image-sourcing plan that ignores them duplicates work already done — and the catalog is the more rigorous artifact, since it carries licensing gates the resource guide does not.

---

## Recommended order

1. **Phase 1** — collapse three image documents into one; confirm the Mendeley license *(blocking)*
2. **Phase 3** — +46 questions, molecular-heavy *(largest measurable gain, no dependencies)*
3. **Phase 2** — real metaphases into `ex7` *(depends on Phase 1)*
4. **Phase 4** — ISCN builder, then harder cases
5. **Phase 5** — mobile polish; adaptive loop switches on by itself

Phases 2 and 3 are independent and can run in parallel.
