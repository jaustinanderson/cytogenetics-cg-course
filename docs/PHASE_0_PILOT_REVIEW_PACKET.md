# Phase 0 Pilot Scientific and Assessment-Review Packet

**Source commit:** `386ee7f25a8901dc4cfa0d685680857019196774` (`main`, after PR #26
merge `42a46d62b111ba11072059e40115972620b5f406` and PR #27 merge
`386ee7f25a8901dc4cfa0d685680857019196774`)
**Generated:** 2026-08-10
**Scope:** Issue #24, Phase 0 (`docs/LEARNING_PLATFORM_ROADMAP.md`), preparatory
research for batched-remediation steps 4–5 on the 13-question frozen pilot
batch defined in `docs/ASSESSMENT_VALIDITY.md` section 6.

## What this document is — and is not

- **This is** AI-assisted research and a proposed preliminary analysis, built
  to give Austin a single, organized packet to review question by question.
- **This is not** Austin's SME review. No claim in this document has been
  confirmed by Austin.
- **This is not** independent second-person review. The approved
  independent-reviewer registry (`APPROVED_INDEPENDENT_REVIEWERS_BY_PACK` in
  `index.html`) remains **empty** — no real independent reviewer, credential,
  or approval exists for any item in this pack, and none is invented here. No
  item can become `release-qualified` until a real approved independent
  reviewer completes that separate work.
- **This is not** completion of source-checking. No source below has been
  entered into `QUESTION_GOVERNANCE`; nothing here changes any question's
  recorded lifecycle.
- **This is not** Gate B approval. Section 5 of every item's record below is
  explicitly a *preliminary worksheet*, not an actual Gate B pass — Gate B is
  defined in `docs/ASSESSMENT_VALIDITY.md` section 5 as a human reviewer's
  rubric, and no item has been reviewed against it by a human as of this
  document.
- **This is not** release qualification of any kind.
- **Agreement between AI systems, or between this document and any single
  web source, is not scientific validation.** Every conclusion below is
  explicitly labeled preliminary and requires Austin's independent
  evaluation before it means anything for the live course.

`QUESTION_GOVERNANCE` is unmodified by this document. All 153 questions,
including the 13 covered here, remain `draft`. `index.html` is unmodified.
QL-033 is not marked corrected. Phase 0 remains incomplete, and Issue #24's
Phase 0 checklist item remains unchecked.

## The 13 frozen pilot questions, canonical order

Reproduced from `FROZEN_PILOT_MANIFEST` in `scripts/assessment-cue-audit.mjs`
and independently re-extracted directly from the live `index.html` at the
source commit above via `bootLiveCourseApi()` (the same dependency-free
technique `scripts/assessment-cue-audit.mjs` and `tests/assessment-cue-audit.mjs`
use) — not retyped from memory. A content fingerprint (SHA-256 of the exact
stem, options, answer index, rationale, and wrong-answer feedback as
currently authored) is recorded for each so any future drift from this
snapshot is mechanically detectable, not just assumed.

| # | ID | Module | Domain | Content fingerprint (SHA-256) |
| ---: | --- | --- | --- | --- |
| 1 | `m1-q1` | m1 | orientation | `7133389905af380343360c11553c4378b4c5d39764fa5b5854f3aa6cb2c30292` |
| 2 | `m1-q2` | m1 | orientation | `3f2cb1e1c79f3e4e6b77ca28feef28fffb121c951dcea233f7bfa4f2d706e5f9` |
| 3 | `m1-q3` | m1 | orientation | `8d5cf4e10bdd8429d10f66b7a4fcfd28bcc8b6c14c7e7f56e9d30e1ff0187b77` |
| 4 | `m2-q1` | m2 | specimen | `09af93632be4341aa4463d4ece8b0d9f44d61e6b77fbc766eed5b591da00e0a4` |
| 5 | `m2-q3` | m2 | specimen | `bc6d7f579adee75198d57bb853a0bac050621513ca020097fc269ec1ab06a6dd` |
| 6 | `m4-q1` | m4 | specimen | `4add900460a4d23595a88b443cb4bb6aa0cdd00dbb7343e712537694bef51ca1` |
| 7 | `m6-q1` | m6 | analysis | `684462a649860e1c13a9218d9caf4456710b2b77c24d3c4fba8c10c4d2fa2347` |
| 8 | `m6-q4` | m6 | analysis | `69cdacede4acd6867abf6c5235f38b25b492a4430ebd6e5100ec9865830dfd39` |
| 9 | `m7-q2` | m7 | analysis | `b8476e3e83340a06877eddc973d2c992471dd6c018634e7a8e1e9abd538487f5` |
| 10 | `m12-q6` | m12 | analysis | `e72605996b292febd4a70afa05e9d7c97ee2bce93ba82acfbcecf7bd4a9950e1` |
| 11 | `m15-q1` | m15 | molecular | `bee7691ff0803cb8edfcc865ba4b56bb0b27aa22016453ccc6ce43a81d1da47b` |
| 12 | `m16-q1` | m16 | operations | `044574fd4fe2244607340dca7d69289b3fd46ad093aa63f9ae03a251dbeec5f1` |
| 13 | `final-q33` | final | molecular | `6aa8de3633bfe9acf7f6c09c100b2a77e83f626b6c15aebe3f1efccb5632d26c` |

**Fingerprint method (reproducible):** SHA-256 hex digest of
`JSON.stringify({q, o, a, why, w, d, t, x})` for each question object exactly
as `window.CytoCourse.getQuestions()` returns it — `q`=stem, `o`=options
array, `a`=answer index, `why`=rationale, `w`=wrong-answer feedback object or
`null`, `d`=domain, `t`=topic, `x`=difficulty. Re-run this exact construction
against a later `index.html` and compare against the table above to detect
drift in any of these 13 items.

**Baseline assessment-cue audit (unchanged by this document):**
`npm run audit:assessment-cues -- --json` run twice at the source commit is
byte-identical (SHA-256 `b3957de22cad17e3d26beb4b81120c01728de9b23a7473269e6badac8a0bcafa`
for both runs). This document performs no scientific evaluation that changes
any measured cue statistic — see the completion report for the exact
before/after re-confirmation at the head this packet is committed on.

---

## How to read each item's record

Every one of the 9 required sections appears for every question, in the same
order, so the packet can be skimmed consistently:

1. Identity and current snapshot
2. Intended educational purpose
3. Source dossier
4. Scientific-analysis proposal
5. Gate B preliminary worksheet (17 criteria)
6. Recommended disposition
7. Proposed revision (or explicit statement that none is proposed)
8. Austin SME decision fields (pending)
9. Independent-review fields (pending)

Gate B verdicts use exactly one of: `appears satisfied`, `possible concern`,
`fails preliminary review`, `not applicable`, `requires Austin judgment`.
**Every Gate B verdict below is preliminary.** No item has been reviewed
against Gate B by a human.

---

# 1. `m1-q1`

## 1.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m1-q1` |
| Module / form | m1 — How to use this course |
| Domain | orientation (unscored) |
| Topic | orientation |
| Difficulty | 1 |
| Cue classification | `not-longest` (correct option is index 1 of 4, lengths 32/31/35/21 chars — the correct answer is not the longest option) |
| Governance status | `draft`; blockers: `missing-drafter`, `missing-sources`, `missing-source-check`, `missing-reviewer`, `missing-review-date`, `incomplete-review-checks`, `unresolved-edition-sensitivity`, `missing-independent-review` |
| Content fingerprint | `7133389905af380343360c11553c4378b4c5d39764fa5b5854f3aa6cb2c30292` |

**Stem:** "Which content area carries the greatest weight on the CG(ASCP) exam?"

**Options (current order):**
0. Specimen preparation and culture
1. **Chromosome analysis and imaging** ← keyed answer
2. Molecular cytogenetics (FISH/array)
3. Laboratory operations

**Rationale:** "Chromosome analysis and imaging is the largest domain (about
45–50%), which is why this course goes deepest there."

**Distractor feedback:** 0 — "Specimen/culture is substantial (~20–25%) but
not the largest." 2 — "Molecular is ~15–25% — important but second to
analysis/imaging." 3 — "Operations is the smallest band (~10–15%)."

## 1.2 Intended educational purpose

Orients a new learner to how the course's depth (`README.md` "Course
coverage") maps onto the real exam's weighting, so study time allocation
makes sense before the learner starts module content. Cognitive level:
**recall/orientation** — no reasoning is required, only recognition of a
stated fact. The `orientation`/difficulty-1 tagging is supportable for this
purpose: it is a course-navigation fact, not a clinical judgment item, and
the five orientation questions are already excluded from blueprint scoring
(`README.md`), so no domain/difficulty mistagging risk exists here. No
uncertainty about intended objective.

## 1.3 Source dossier

| Field | Value |
| --- | --- |
| Title | *CG(ASCP) and CG(ASCPi) Examination Content Guideline* |
| Publisher | American Society for Clinical Pathology, Board of Certification (ASCP BOC) |
| Edition/date | Revised September 25, 2025 |
| Locator | Domain weighting table (four content areas) |
| URL | `https://www.ascp.org/boc/docs/default-source/explore-credentials/content-guidelines/ascp_ascpi_cg_content_guideline.pdf` |
| Retrieved | Existence, title, and September 25, 2025 revision date confirmed via web search 2026-08-10. Three separate direct-fetch attempts against three different URL forms of the primary PDF, made during this correction round (2026-08-10, session 2), each returned **HTTP 403 Forbidden**; a web-archive fallback attempt was refused by this session's own tooling. **This document's own tooling still could not directly inspect the primary PDF, in either research round.** |
| Source status (taxonomy, § Finding 3) | **`source unresolved`** — this document's own tooling never directly inspected the primary PDF. See "Unresolved problem" for the distinct, narrower reason the item's *content* is nonetheless resolved (Austin-supplied citation, not this document's inspection). |
| Directly inspected? | **No, not by this document, in either round.** Austin has supplied, as directly stated ground truth for this correction round, the primary guideline's exact title ("Technologist in Cytogenetics - CG(ASCP) and CG(ASCPi) Examination Content Guideline"), publisher (ASCP Board of Certification), revision date (September 25, 2025), and locator (page 1, Examination Content Areas table): Specimen 20–25%, **Molecular 15–25%**, Analysis/Imaging 45–50%, Operations 10–15%. This is an authority claim attributed explicitly to Austin's own direct instruction in this correction round, not to any fetch performed by this document. This repository's own `README.md` and `docs/SCIENTIFIC_REVIEW.md` independently cite the same Molecular 15–25% figure. |
| Narrow claim supported | That an ASCP BOC content guideline exists, is dated September 25, 2025, and defines four weighted content domains for this exam, with Molecular at 15–25% — now resolved in favor of this figure per Austin's directly supplied primary-source citation (see immediately above), which matches this repository's pre-existing citation exactly. |
| Edition/jurisdiction sensitivity | High — ASCP revises this guideline periodically; the rationale's percentages are only accurate for the currently cited revision. |
| Unresolved problem | **Resolved this correction round, with one honest caveat.** The prior round found a discrepancy between this repository's existing citation (Molecular 15–25%) and a secondary, non-ASCP study-aid site (`cytogenetics.mlsascp.com/ascp-boc.html`, an independently authored exam-prep resource, states Molecular 15–20%). Austin has directly supplied the primary guideline's own stated figure (Molecular 15–25%, page 1, Examination Content Areas table), which resolves the discrepancy in favor of this repository's existing citation and against the secondary site's figure. **Caveat:** this document's own fetch tooling still cannot independently re-verify the primary PDF (403 Forbidden, three attempts this round); the resolution above rests on Austin's direct supplied citation, not on this session's own source inspection, and that distinction is recorded here rather than blurred. |

## 1.4 Scientific-analysis proposal

The keyed answer (Chromosome analysis and imaging) is defensible under
*both* conflicting sources above — the disputed figure is Molecular's lower
bound, not which domain is largest, and Analysis/Imaging is the clear
plurality under every version found. Exactly one best answer is supportable.
The rationale's own stated range for the correct answer ("about 45–50%") is
not the disputed figure. No distractor is defensible as equally correct. No
absolute wording, outdated framing, or overgeneralization. Not
ISCN/lab-policy/jurisdiction sensitive in the way clinical items are — it is
sensitive to *which exam-guideline revision* is current, a narrower and more
tractable dependency. **Confidence: moderate-high** for the keyed answer
itself (converges across all sources found); **low** for full source-dossier
completeness, specifically because the primary document was not directly
reopened this session. **Austin must independently evaluate this
conclusion** — in particular, Austin (or a future session with working PDF
access) should open the primary guideline directly and confirm the exact
current Molecular range before this item's source is entered into
`QUESTION_GOVERNANCE`.

## 1.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | Largest domain is unambiguous under every source found |
| 2 | Scientific correctness is separate | not applicable | Noted; see section 1.4 |
| 3 | Distractor plausibility | appears satisfied | Each is a real, smaller domain — plausible to a learner who mis-recalls weighting |
| 4 | Parallel construction | appears satisfied | All four are domain-name noun phrases |
| 5 | Mutual distinguishability | appears satisfied | Four genuinely distinct domains |
| 6 | Grammar/stem-completion clues | appears satisfied | All complete the stem equally |
| 7 | Repeated stem wording | appears satisfied | No stem word repeated only in the key |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied | Key is not the longest option (`not-longest`) |
| 9 | Absolute words / unintended cues | appears satisfied | None present |
| 10 | Paired/opposite-option patterns | appears satisfied | No pairing pattern |
| 11 | "All/none of the above," negative stems | not applicable | Not used |
| 12 | Implausible padding | appears satisfied | Distractor lengths (31/35/21) look like genuine content, not padding |
| 13 | Rationale/feedback alignment | appears satisfied | Each distractor feedback names its own domain's real range |
| 14 | Preserves assessed intent/stable-ID meaning | requires Austin judgment | Only relevant if a future edit is made |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | Not currently proposing either |
| 16 | Quarantine when unsupportable | not applicable | Not quarantined |
| 17 | Evidence required before release-qualification | fails preliminary review | No source yet recorded in `QUESTION_GOVERNANCE`; this is expected at Draft |

## 1.6 Recommended disposition

**Leave unchanged — resolved, not pending.** The prior round of this
document wrongly stated that "this item's own text does not spell out the
disputed figure." That claim was factually wrong: the item's own
distractor-2 feedback already states, verbatim, "Molecular is ~15–25% —
important but second to analysis/imaging" (line 135 of this document,
section 1.1) — exactly the figure now confirmed correct per section 1.3.
With Austin's directly supplied primary-source figure matching both this
repository's existing citation and the item's own already-written feedback
text, the Molecular-range discrepancy identified in the prior round is
resolved in favor of 15–25%, and this item requires no content change.

## 1.7 Proposed revision

None proposed. The prior open question (which published percentage table is
current) is now resolved per section 1.3 above; the item's own text already
states the correct, now-confirmed figure, so there is nothing to edit.

## 1.8 Austin SME decision fields (pending)

- Source accepted / rejected / additional source required: **PENDING**
- Scientific conclusion accepted / rejected / revised: **PENDING**
- Intended learning objective (confirm or correct): **PENDING**
- Final item disposition: **PENDING**
- Gate B decisions (confirm or override each row above): **PENDING**
- Edition/SOP sensitivity decision: **PENDING**
- Proposed wording accepted / rejected / revised: **PENDING** *(none proposed)*
- Austin review date: **PENDING**
- Austin notes: **PENDING**

## 1.9 Independent-review fields (pending)

- Reviewer identity: **PENDING** — the approved-independent-reviewer
  registry is currently empty; no reviewer exists for this item.
- Qualification/approval basis: **PENDING**
- Review date: **PENDING**
- Review scope: **PENDING**
- Complete independent checklist (`GOVERNANCE_REVIEW_CHECKS_V1`, a
  separate recorded instance from any SME checklist): **PENDING**
- Authorship/conflict declaration: **PENDING**
- Findings: **PENDING**
- Approval or rejection: **PENDING** — cannot occur until an approved
  reviewer is added and completes this work.

---

# 2. `m1-q2`

## 2.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m1-q2` |
| Module / form | m1 — How to use this course |
| Domain | orientation (unscored) |
| Topic | orientation |
| Difficulty | 1 |
| Cue classification | `uniquely-longest` (correct option is index 1 of 4, lengths 18/32/24/15 — the correct answer is the single longest option) |
| Governance status | `draft`; blockers identical set as `m1-q1` above |
| Content fingerprint | `3f2cb1e1c79f3e4e6b77ca28feef28fffb121c951dcea233f7bfa4f2d706e5f9` |

**Stem:** "The course's progress is stored where?"

**Options:** 0. On a remote server · 1. **In your browser via localStorage**
← keyed · 2. In a cookie sent to ASCP · 3. It is not saved

**Rationale:** "Completion and answer history are saved locally in your
browser using localStorage; the course has no progress server or user
account."

**Distractor feedback:** 0 — "There is no server component for course
progress." 2 — "No progress or answer data is sent to ASCP." 3 — "It is
saved — locally."

## 2.2 Intended educational purpose

Tells a new learner, up front, exactly where their data lives and that
nothing leaves their browser — a privacy/trust orientation fact, not a
cytogenetics fact. Cognitive level: recall. Domain/topic/difficulty tagging
(orientation, difficulty 1) is fully supportable — this is a repository/
application-behavior fact, the correct kind of content for the unscored
orientation module. No uncertainty about intended objective.

## 2.3 Source dossier

| Field | Value |
| --- | --- |
| Title | This repository's own committed documentation and source |
| Publisher | This project (`README.md` "How progress works"; `docs/ARCHITECTURE.md`) |
| Edition/date | Current `main` at the source commit above |
| Locator | `README.md` § "How progress works"; the live `index.html` implementation itself (`localStorage.setItem`/`getItem` calls, no `fetch`/network call for progress) |
| URL | Not applicable (local repository files) |
| Retrieved | Directly inspected 2026-08-10, same session |
| Source status (taxonomy, § Finding 3) | **`repository-source-appropriate`** — the claim is about this application's own behavior; this repository's own docs/implementation are the correct and sufficient source type, not a placeholder for an external citation. |
| Directly inspected? | **Yes** |
| Narrow claim supported | The application stores progress only in browser `localStorage`, has no server/account, and does not transmit progress to ASCP or anyone else. |
| Edition/jurisdiction sensitivity | None — this is a fact about this specific application's own implementation, not an external clinical standard. |
| Unresolved problem | None. Per the task's explicit allowance, a repository-behavior/project-navigation question may cite the repository's own documentation as authoritative — this is exactly that case, not a clinical claim forced onto a non-clinical source. |

## 2.4 Scientific-analysis proposal

Not a scientific claim in the clinical sense — a verifiable software-behavior
fact, directly confirmed against the actual implementation. The keyed answer
is exactly and uniquely correct; no distractor is defensible. Rationale is
accurate and appropriately scoped. No ambiguity, no edition/jurisdiction/SOP
dependency. **Confidence: high.** Austin should still confirm this reads
naturally to a learner and remains accurate if the storage architecture ever
changes (it has not).

## 2.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | Software fact, not a clinical claim |
| 3 | Distractor plausibility | appears satisfied | Each is a plausible misconception (server, cookie, unsaved) |
| 4 | Parallel construction | possible concern | Options mix a location noun phrase, two location phrases, and a negation ("It is not saved") — the fourth option is structurally different in kind, not just content. Worth Austin's eye, not clearly wrong |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | "stored"/"saved" vary naturally, not a planted duplicate |
| 8 | Conspicuously longer/more-qualified correct answer | possible concern | Key is `uniquely-longest` (32 vs. 18/24/15 chars) — a real Gate A signal on this specific item, though this packet does not treat single-item length alone as disqualifying (that is Gate A's bank-level job); Gate B review should judge whether the extra length is genuine necessary specificity ("via localStorage") or could be trimmed |
| 9 | Absolute words | appears satisfied | None |
| 10 | Paired/opposite-option patterns | appears satisfied | None |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | "via localStorage" is genuine technical specificity, not filler |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 2.6 Recommended disposition

**Leave unchanged.** The one real signal (item 8, unique-longest) is a
length observation, not a scientific defect — and the task is explicit that
disposition should not be driven by rebalancing answer length. Flagged for
Austin's Gate B judgment call, not proposed as an edit here.

## 2.7 Proposed revision

None proposed.

## 2.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** · Scientific
conclusion accepted/rejected/revised: **PENDING** · Intended learning
objective: **PENDING** · Final item disposition: **PENDING** · Gate B
decisions: **PENDING** · Edition/SOP sensitivity decision: **PENDING**
*(none expected)* · Proposed wording accepted/rejected/revised: **PENDING**
*(none proposed)* · Austin review date: **PENDING** · Austin notes:
**PENDING**

## 2.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 3. `m1-q3`

## 3.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m1-q3` |
| Module / form | m1 — How to use this course |
| Domain | orientation (unscored) |
| Topic | orientation |
| Difficulty | 2 |
| Cue classification | `tied-longest` (correct option index 1 of 4, tied at max length with option 0; lengths 36/36/22/24) |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `8d5cf4e10bdd8429d10f66b7a4fcfd28bcc8b6c14c7e7f56e9d30e1ff0187b77` |

**Stem:** "In this course, a stated colcemid time, KCl molarity, or
cell-count is best treated as:"

**Options:** 0. A universal rule to memorize exactly · 1. **An example that
is SOP/lab-dependent** ← keyed · 2. Irrelevant to the exam · 3. A regulatory
requirement

**Rationale:** "Such specifics are laboratory-, SOP-, and assay-dependent;
learn the concept and defer to current standards/your lab."

**Distractor feedback:** 0 — "There is no single universal number; values
are validated per lab." 2 — "The concepts are highly testable even if exact
numbers vary." 3 — "They are not fixed by regulation; they are validated
locally."

## 3.2 Intended educational purpose

Teaches a learner a meta-level orientation fact before they hit specific
numeric parameters throughout the course: don't memorize any single stated
number as universal; understand it as an illustrative, locally-validated
example. Cognitive level: **comprehension** (a conceptual framing, not pure
recall). Domain/difficulty tagging (orientation, difficulty 2 — one step up
from the other two orientation items) is supportable; this item requires
slightly more conceptual reasoning than `m1-q1`/`m1-q2`, consistent with the
higher difficulty tag.

## 3.3 Source dossier

| Field | Value |
| --- | --- |
| Title | 42 CFR § 493.1276, "Standard: Clinical cytogenetics," and 42 CFR § 493.1253, "Standard: Establishment and verification of performance specifications" (CLIA) |
| Publisher | Centers for Medicare & Medicaid Services (CMS), administering 42 CFR Part 493 (CLIA) |
| Edition/date | Current CLIA regulatory framework; both sections directly fetched (Cornell Legal Information Institute mirror) this correction round, 2026-08-10 |
| Locator | § 493.1276(b): laboratory must document media, cell/chromosome counts, and banding quality, and ensure "resolution is appropriate for the type of tissue or specimen and the type of study required." § 493.1253(b): laboratory must verify or establish accuracy, precision, analytical sensitivity, analytical specificity, reportable range, and reference intervals for each test system. |
| URL | `https://www.law.cornell.edu/cfr/text/42/493.1276`; `https://www.law.cornell.edu/cfr/text/42/493.1253` (full regulatory text of both sections, directly fetched this round) |
| Retrieved | 2026-08-10 (this correction round; § 493.1253 was invoked but *not* directly inspected in the prior round — that gap is closed this round, and the result is reported honestly below rather than assumed favorable) |
| Source status (taxonomy, § Finding 3) | **Corrected this round, per Finding 2: `source unresolved`, not `directly-inspected-and-adequate`.** Both sections are now genuinely directly inspected (full text, both fetched this round), but neither one — nor a further specialist/CAP source search described below — adequately establishes this item's specific narrow claim. Direct inspection without adequacy does not earn `directly-inspected-and-adequate`; see "Narrow claim supported" below for exactly what these sources do and do not establish. |
| Directly inspected? | **Yes, both sections, in full, this round.** § 493.1276: all five lettered subsections (a)–(e), reproduced in this packet's earlier correction round. § 493.1253: (a) applicability; (b)(1) verification of performance specifications for unmodified FDA-cleared systems (accuracy, precision, reportable range; verifying manufacturer reference intervals); (b)(2) establishment of performance specifications for modified/non-FDA-cleared systems (accuracy, precision, analytical sensitivity, analytical specificity, reportable range, reference intervals, "any other performance characteristic required"); (b)(3) calibration/control procedures; (c) documentation requirement. |
| Narrow claim supported | **Corrected this round — the prior round overstated this.** Neither section states that colcemid exposure time, KCl molarity, or a cell-count target specifically is laboratory/SOP-validated, and neither states that no applicable regulation, standard, manufacturer instruction, or validated method fixes a value for those parameters. § 493.1276 requires documenting banding quality and using resolution "appropriate for the type of tissue or specimen and the type of study required" — a general quality-documentation duty, not a statement about reagent-exposure-time or hypotonic-molarity validation. § 493.1253 requires establishing/verifying general performance characteristics (accuracy, precision, sensitivity, specificity, reportable range, reference intervals) — again a general validation framework, not a statement naming colcemid timing or KCl concentration. The prior round's claim that these sections "directly and specifically" support the item's local-validation claim was an inferential leap from "CLIA requires labs to validate their own performance in general" to "CLIA establishes that these three specific reagent/count parameters are locally validated" — the sections do not make that specific connection themselves. |
| Additional sources searched this round, and why they remain inadequate | (1) `cytogenetics.mlsascp.com/select-prepare-use-reagents-1.html` (the same specialist site used for `m4-q1`/`m6-q1`/`m6-q4`/`final-q33`) — directly fetched this round; states colcemid exposure "30–60 minutes (Standard)" and KCl "typically used at 10 µg/mL," but does not explicitly frame these as laboratory-validated/SOP-dependent rather than fixed; "standard"/"typically" is suggestive, not an adequate direct statement of the narrow proposition. (2) CAP *Test Method Validation and Verification* checklist excerpts (2017 release) — directly fetched and read in full (9 pages) this round; establishes a general laboratory-developed-test performance-validation framework (accuracy, precision, analytical sensitivity/specificity, reportable range) essentially parallel to § 493.1253, but likewise never names reagent-exposure-time or hypotonic-molarity parameters specifically. No adequate directly-inspected source naming this item's exact narrow proposition was found this round, despite three separate, genuine search-and-fetch attempts. |
| Edition/jurisdiction sensitivity | Applies to U.S. CLIA-certified laboratories/CAP-accredited laboratories; not evaluated further given the more fundamental sourcing gap above. |
| Unresolved problem | **Restored, per Finding 2 item 7: a genuine, honestly unresolved sourcing gap.** No directly-inspected source — regulatory or specialist — was found this round that explicitly supports the narrow proposition that colcemid timing, hypotonic concentration, and cell-count/analysis targets specifically depend on the laboratory's validated method, specimen, SOP, or clinical purpose, as opposed to being fixed by an applicable regulation, standard, or manufacturer instruction. The ideal source (the *AGT Cytogenetics Laboratory Manual*, subscription-gated) remains inaccessible. This is marked `source unresolved`, not filled by inference, and not described as "closed." |

## 3.4 Scientific-analysis proposal

**Corrected this round, per Finding 2.** The prior round claimed the keyed
answer was "well-supported by a directly-inspected, cytogenetics-specific
primary regulatory source" and that Gate B item 1 concerns were resolved
"with an exact regulatory locator." That claim is withdrawn: § 493.1276 and
§ 493.1253, now both directly inspected in full (§ 3.3), establish only
general validation/documentation duties — they do not themselves state
that colcemid time, KCl molarity, or cell-count targets are
laboratory-validated rather than externally fixed. The absence of a number
from these two sections is not proof that no applicable regulation,
standard, manufacturer instruction, or validated method specifies one
elsewhere; this document does not treat it as such.

The underlying pedagogical point — that a specific numeric parameter stated
in this course is illustrative and laboratory/SOP-dependent, not a value to
memorize as universal — remains *plausible* and consistent with general
cytogenetics laboratory practice (the specialist site's "typically"/
"standard" framing, § 3.3, is suggestive in this direction), and this
document is not asserting the item is wrong. But this document also cannot
certify the claim against one adequate, directly-inspected, named source,
and says so plainly rather than treating a search-effort shortfall as
resolved. **Confidence: lowered this round, from high to moderate** on the
narrow distractor-3 rationale specifically; confidence in the keyed answer
itself (option 1) remains reasonable on general domain-plausibility
grounds, distinct from the distractor-3 sourcing question.

## 3.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | With the nuance in 3.4 noted; the sourcing gap affects distractor-3's rationale, not whether option 1 is the single best answer |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | **possible concern — restored this round** | Distractor 3's subtlety (3.4) is genuinely unresolved: no directly-inspected source adequately confirms that colcemid time/KCl molarity/cell-count specifically are regulation-independent parameters, as opposed to the general "labs must validate their own performance" principle. The prior round's "resolved... appears satisfied" verdict is retracted; this round marks it `source unresolved` (§ 3.3) rather than papering over the gap with a citation that does not actually say what it was cited for |
| 4 | Parallel construction | appears satisfied | All four are noun-phrase characterizations |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied | Key is tied-longest with option 0, not uniquely longest |
| 9 | Absolute words | appears satisfied | "universal," "exactly" appear in a *wrong* option, correctly used to signal implausibility, not in the key |
| 10 | Paired/opposite-option patterns | appears satisfied *(resolved this round, no revision)* | Options 0 and 3 both gesture at "fixed/universal," options 1 and 2 both gesture at "not fixed" — reviewed under Finding 5 and judged a natural, non-disqualifying consequence of testing one true/false axis with four options (two ways to be wrong-as-fixed, one way to be wrong-as-irrelevant, one correct way to be not-fixed), not an unintended structural telegraph; no revision proposed |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | Content itself not deemed unsupportable; the keyed answer is not in question — only distractor 3's specific regulatory rationale lacks an adequate source, which is a narrower, feedback-level gap |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 3.6 Recommended disposition

**Leave unchanged — corrected this round, per Finding 2.** The prior
round's "Edit in place (feedback text only)" is withdrawn: that proposed
feedback revision cited 42 CFR § 493.1276(b) and § 493.1253 as directly
establishing that CLIA "does not itself fix what the number must be" —
an attribution these sections do not support (§ 3.3/3.4). Proposing a
sourced-sounding feedback edit grounded in a citation that does not
actually say what it was cited for would be a worse outcome than leaving
the existing, more modestly worded feedback ("They are not fixed by
regulation; they are validated locally.") in place. That existing text
does not itself misattribute a specific claim to CLIA, so it is not
disqualifying on its own — but it is not resourced or strengthened this
round either. The stem, all four option texts, the rationale, and the
keyed answer remain unchanged; distractor 3's feedback is also left as
originally authored, pending either Austin's own domain confirmation or a
future session's access to an adequate specialist source (§ 3.3).

## 3.7 Proposed revision

**None proposed this round — withdrawn.** The prior round's proposed
distractor-3 feedback revision is retracted because it attributed a claim
to 42 CFR §§ 493.1276/493.1253 that those sections do not make (§ 3.3/3.4).
Per Finding 2 item 9, an edit-in-place recommendation may remain only if
its wording does not overstate what the cited sources establish; since no
adequate replacement source was found this round (§ 3.3), no revision is
proposed. Austin's options, once he reviews this item: (a) confirm from his
own domain expertise that colcemid time/KCl molarity/cell-count targets are
indeed laboratory/SOP-validated and approve a revision on that basis rather
than a specific CFR citation; (b) accept the existing feedback as adequate
without a regulatory citation; or (c) direct further sourcing (e.g., the
*AGT Cytogenetics Laboratory Manual*) before any wording changes.

## 3.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** *(cytogenetics-
specific manual citation still needed)* · Scientific conclusion
accepted/rejected/revised: **PENDING** · Intended learning objective:
**PENDING** · Final item disposition: **PENDING** · Gate B decisions:
**PENDING** · Edition/SOP sensitivity decision: **PENDING** · Proposed
wording accepted/rejected/revised: **PENDING** · Austin review date:
**PENDING** · Austin notes: **PENDING**

## 3.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 4. `m2-q1`

## 4.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m2-q1` |
| Module / form | m2 — Specimen collection & triage |
| Domain | specimen |
| Topic | specimen-collection |
| Difficulty | 1 |
| Cue classification | `uniquely-longest` (correct option index 1, lengths 19/26/25/20) |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `09af93632be4341aa4463d4ece8b0d9f44d61e6b77fbc766eed5b591da00e0a4` |

**Stem:** "Which anticoagulant tube is correct for a peripheral-blood
chromosome study?"

**Options:** 0. EDTA (lavender top) · 1. **Sodium heparin (green top)** ←
keyed · 2. Sodium citrate (blue top) · 3. Serum/clot (red top)

**Rationale:** "Sodium heparin preserves viable, dividing cells for
culture."

**Distractor feedback:** 0 — "EDTA is toxic to cultures and inhibits cell
growth — a classic cause of failure." 2 — "Citrate is for coagulation
testing, not chromosome culture." 3 — "A clotted serum tube has no viable
cells to culture."

## 4.2 Intended educational purpose

A foundational pre-analytic specimen-collection fact every cytogenetic
technologist must know before any downstream step (culture, harvest) can
succeed. Cognitive level: **recall** of a specific, high-stakes procedural
fact. Domain/topic (specimen / specimen-collection), difficulty 1, are all
supportable — this is entry-level, first-principles content appropriate for
module 2.

## 4.3 Source dossier

| Field | Value |
| --- | --- |
| Title | Chromosome Analysis, Blood — clinical laboratory specimen-requirements reference |
| Publisher | Meadville Medical Center, Professional Laboratory Resources (a hospital clinical-laboratory test-menu publication) |
| Edition/date | Current live page, retrieved 2026-08-10; no separate revision date printed on the page as fetched |
| Locator | "Specimen Requirements" section, chromosome analysis test entry |
| URL | `https://www.mmchs.org/professional-laboratory-resources/test-menu-index/chromosome-analysis-blood/` |
| Retrieved | 2026-08-10 |
| Source status (taxonomy, § Finding 3) | **`directly-inspected-but-secondary-or-incomplete`** — the source itself was fully and directly fetched, but it is one hospital's own local specimen-requirement page, not a national standard-setting body's document; adequate for the item's narrow claim, corroborated by two further public test-menu pages, but not a primary/official standard. |
| Directly inspected? | **Yes**, fetched and quoted directly this session: *"1 green-top (sodium heparin) tube (minimum: 1.0 mL of heparinized whole blood)"*; *"Green-top (lithium heparin) IS NOT acceptable."* |
| Narrow claim supported | Sodium heparin (green top) is the required/accepted anticoagulant for peripheral-blood chromosome analysis; lithium heparin is explicitly rejected by this specific laboratory's published requirements. |
| Edition/jurisdiction sensitivity | Low for the anticoagulant *class* (sodium heparin is standard practice broadly, corroborated independently by OhioHealth's and Wake Forest Baptist's public test-menu pages found in the same search, not separately fetched in full); individual labs' exact acceptable-tube lists (e.g., whether a royal-blue-top sodium-heparin tube is also accepted) can vary by institution. |
| Unresolved problem | This is one hospital laboratory's published specimen requirement, not a single national standard-setting body's document (e.g., not CLSI or CAP directly). The standard specialist reference for this exact claim, the *AGT Cytogenetics Laboratory Manual*, exists but was not directly inspected (subscription-gated, as in `m1-q3`). The *class* of anticoagulant (sodium, not lithium, heparin) is corroborated across three independent public clinical-lab sources, which meaningfully strengthens this despite no single primary standards document being opened. |

## 4.4 Scientific-analysis proposal

Keyed answer is well-supported and corroborated across multiple independent
public clinical-laboratory sources, converging exactly. Each distractor is
wrong for a specific, correct, distinct reason (EDTA chelates calcium and is
cytotoxic to the culture; citrate is a coagulation-study anticoagulant;
clotted serum has no viable dividing cells at all) — not vague or
interchangeable wrongness. No absolute/overgeneralized wording. Not
edition-sensitive in a way that would date this item. **Confidence: high.**
Austin should still confirm this against the specific reference his own
practice uses, since exact accepted-tube lists (e.g., royal-blue-top
acceptance) can be lab-specific, though this does not affect the keyed
answer.

## 4.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | appears satisfied | Each is a real, named tube type a learner could plausibly confuse |
| 4 | Parallel construction | appears satisfied | All four: anticoagulant name + tube color |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied *(reviewed under Finding 5, no revision)* | `uniquely-longest`, though only marginally (26 vs. 19/25/20 chars) — a Gate A/bank-level signal, not a content defect; the extra length is the substantive tube-color qualifier, not padding, so no revision is proposed |
| 9 | Absolute words | appears satisfied | |
| 10 | Paired/opposite-option patterns | appears satisfied | |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 4.6 Recommended disposition

**Leave unchanged.**

## 4.7 Proposed revision

None proposed.

## 4.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** · Scientific
conclusion accepted/rejected/revised: **PENDING** · Intended learning
objective: **PENDING** · Final item disposition: **PENDING** · Gate B
decisions: **PENDING** · Edition/SOP sensitivity decision: **PENDING** ·
Proposed wording accepted/rejected/revised: **PENDING** · Austin review
date: **PENDING** · Austin notes: **PENDING**

## 4.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 5. `m2-q3`

## 5.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m2-q3` |
| Module / form | m2 — Specimen collection & triage |
| Domain | specimen |
| Topic | specimen-collection |
| Difficulty | 1 |
| Cue classification | `not-longest` (correct option index 1 of 4, lengths 14/27/29/26 — option 2 is longest, not the key) |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `bc6d7f579adee75198d57bb853a0bac050621513ca020097fc269ec1ab06a6dd` |

**Stem:** "Minimum acceptable patient identification at collection is:"

**Options:** 0. One identifier · 1. **Two independent identifiers** ← keyed
· 2. The ordering physician's name · 3. A verbal confirmation only

**Rationale:** "Two independent identifiers anchor the chain of identity
from the start."

**Distractor feedback:** 0 — "A single identifier is insufficient for safe
identification." 2 — "The physician's name does not identify the patient."
3 — "A documented, verifiable label is required, not just verbal."

## 5.2 Intended educational purpose

A patient-safety fact applicable to any specimen collection, not
cytogenetics-specific — but essential pre-analytic knowledge before any
chromosome study can be trusted. Cognitive level: recall. Domain/topic
(specimen/specimen-collection) and difficulty 1 are supportable.

## 5.3 Source dossier

| Field | Value |
| --- | --- |
| Title | *National Patient Safety Goals — Effective January 2026 for the Laboratory Program*, Goal 1, NPSG.01.01.01 |
| Publisher | The Joint Commission |
| Edition/date | Effective January 2026; report dated August 11, 2025; © 2025 Joint Commission |
| Locator | NPSG.01.01.01, "Use at least two patient identifiers when providing laboratory services"; Element of Performance (EP) 1 and EP 2 |
| URL | `https://digitalassets.jointcommission.org/api/public/content/3c7a110c215943bc80d9ce87e9d9ee9d?v=aef80e14` |
| Retrieved | 2026-08-10 (this correction round; the primary document, not a FAQ page, was fetched directly) |
| Source status (taxonomy, § Finding 3) | **`directly-inspected-and-adequate`** — upgraded this round from a search-summary-only citation to a genuine direct fetch of the primary Joint Commission Laboratory Program NPSG document. |
| Directly inspected? | **Yes, this round.** The prior round's citation ("reviewed via search-result summary... not separately re-fetched") is corrected: the actual primary PDF was fetched and quoted verbatim this round: EP 1 — *"Use at least two patient identifiers when administering blood or blood components; when collecting blood samples and other specimens for clinical testing; and when providing other treatments or procedures. The patient's room number or physical location is not used as an identifier."* EP 2 — *"Label containers used for blood and other specimens in the presence of the patient."* |
| Narrow claim supported | At least two patient identifiers are required when collecting a specimen (EP 1); room number/location is explicitly *not* an acceptable identifier (EP 1); specimen containers must be labeled with two identifiers in the patient's presence (EP 2) — directly and exactly matching the item's stem and keyed answer. |
| Edition/jurisdiction sensitivity | Applies to Joint Commission–accredited U.S. facilities; other accreditors/countries may phrase the requirement differently, though "at least two independent identifiers" is a broadly convergent international patient-safety norm (not independently verified outside the U.S. context this session). |
| Unresolved problem | None. This round closes the prior round's own honest gap (search-summary rather than direct inspection) — the primary document is now directly fetched and quoted. |

## 5.4 Scientific-analysis proposal

Keyed answer matches the named standard precisely. Every distractor is
wrong for a distinct, correct reason (insufficient count; wrong kind of
identifier — the ordering party, not the patient; wrong identification
method — unverifiable verbal only). No ambiguity, no absolute-wording
problem, no edition dependency beyond "this is current Joint Commission
policy," which is not disputed. **Confidence: high.**

## 5.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | appears satisfied | |
| 4 | Parallel construction | appears satisfied | |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | "identification"/"identifiers" is the stem's own topic word, appearing in the key AND the wrong answers ("identifier(s)" in 0 and by implication 2/3) — not a planted one-sided clue |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied | `not-longest` |
| 9 | Absolute words | appears satisfied | "only" appears in a wrong option (3), correctly signaling implausibility |
| 10 | Paired/opposite-option patterns | appears satisfied | |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 5.6 Recommended disposition

**Leave unchanged.**

## 5.7 Proposed revision

None proposed.

## 5.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** · Scientific
conclusion accepted/rejected/revised: **PENDING** · Intended learning
objective: **PENDING** · Final item disposition: **PENDING** · Gate B
decisions: **PENDING** · Edition/SOP sensitivity decision: **PENDING** ·
Proposed wording accepted/rejected/revised: **PENDING** · Austin review
date: **PENDING** · Austin notes: **PENDING**

## 5.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 6. `m4-q1`

## 6.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m4-q1` |
| Module / form | m4 — Harvest, hypotonic & fixation |
| Domain | specimen |
| Topic | harvest |
| Difficulty | 1 |
| Cue classification | `tied-longest`, all four options tied at 38 characters (`nullProbabilityCorrectAtMax = 1`) — **no length cue is possible on this item; it is maximally balanced by construction** |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `4add900460a4d23595a88b443cb4bb6aa0cdd00dbb7343e712537694bef51ca1` |

**Stem:** "The correct harvest sequence is:"

**Options:** 0. Hypotonic → colcemid → fixative → drop · 1. **Colcemid →
hypotonic → fixative → drop** ← keyed · 2. Fixative → colcemid → hypotonic →
drop · 3. Colcemid → fixative → hypotonic → drop

**Rationale:** "Arrest in metaphase (colcemid), swell (hypotonic), preserve
(fixative), then make slides."

**Distractor feedback:** 0 — "Colcemid must arrest cells before hypotonic
swelling." 2 — "Fixation comes after hypotonic, not first." 3 — "Hypotonic
must precede fixation."

## 6.2 Intended educational purpose

Core procedural-sequence knowledge for chromosome harvest — a technologist
who reorders these steps produces an unusable specimen. Cognitive level:
**application/procedural sequencing** (not pure recall — the learner must
reason about *why* the order matters, not just memorize a list, matching the
rationale's causal framing). Domain/topic/difficulty (specimen/harvest,
difficulty 1) are supportable for an entry-level procedural-sequence check.

## 6.3 Source dossier

| Field | Value |
| --- | --- |
| Title | "Culture Harvest" |
| Publisher | *CG - Cytogenetics* (independently authored ASCP-BOC-CG-exam study resource, author Brett M. Rice; explicitly stated to be "intended to assist preparation for Cytogenetics content on ASCP BOC's Technologist in Cytogenetics, CG(ASCP) and CG(ASCPi), certification exam," recommended "as a supplement to the Reading List cited by the ASCP BOC" — **not** an ASCP-published document itself) |
| Edition/date | Live web page, no printed revision date; retrieved 2026-08-10 |
| Locator | "Culture Harvest" page, three-step sequence description |
| URL | `https://cytogenetics.mlsascp.com/culture-harvest-1.html` |
| Retrieved | 2026-08-10 |
| Source status (taxonomy, § Finding 3) | **`directly-inspected-but-secondary-or-incomplete`** — fully and directly fetched, but an independently-authored specialist study aid, not an ASCP/AGT/peer-reviewed primary publication. |
| Directly inspected? | **Yes**, fetched and quoted directly: mitotic arrest via colcemid/colchicine (spindle-fiber inhibition) → hypotonic treatment (e.g., 0.075M KCl, osmotic swelling) → fixation ("Carnoy's Fixative," 3:1 methanol:glacial acetic acid) — matching the keyed sequence exactly. |
| Narrow claim supported | The standard chromosome-harvest chemical sequence is colcemid arrest, then hypotonic swelling, then fixation — corroborated independently by a second, unrelated general web search summarizing the same three-step order with matching rationale (spindle-fiber inhibition timing, osmotic mechanism, Carnoy's composition). |
| Edition/jurisdiction sensitivity | Low — this is a stable, foundational technique, not a numeric SOP parameter (see `m1-q3` for why exact timings/molarities are treated differently from the *order* of steps, which is not lab-specific). |
| Unresolved problem | This specialist source is a third-party study aid, not an ASCP-official or peer-reviewed primary publication; it is corroborated by an independent general web search converging on the identical sequence, which meaningfully strengthens it, but the ideal formal citation for `QUESTION_GOVERNANCE` would be the *AGT Cytogenetics Laboratory Manual* or an equivalent peer-reviewed/official source, not directly inspected this session (same limitation as `m1-q3`/`m2-q1`). |

## 6.4 Scientific-analysis proposal

Keyed sequence is correct and independently corroborated. Every distractor
represents a genuine, specific, plausible sequencing error (swelling before
arrest; fixing before either step; fixing before swelling) with accurate,
distinct feedback for each. No absolute wording or unsupported claim. This
item is also a good example of length-cue-neutral construction (all four
options exactly 38 characters) — worth noting positively, not as a defect.
**Confidence: high.**

## 6.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | appears satisfied | Each is a specific, real sequencing error |
| 4 | Parallel construction | appears satisfied | All four are the same four-step arrow-chain format |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied | All four options identical length (38 chars) — no possible length cue |
| 9 | Absolute words | appears satisfied | |
| 10 | Paired/opposite-option patterns | appears satisfied | |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 6.6 Recommended disposition

**Leave unchanged.** This item is a positive example worth citing back to
the Gate A/Gate B rubric discussion: perfectly length-balanced, factually
solid, single defensible answer.

## 6.7 Proposed revision

None proposed.

## 6.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** · Scientific
conclusion accepted/rejected/revised: **PENDING** · Intended learning
objective: **PENDING** · Final item disposition: **PENDING** · Gate B
decisions: **PENDING** · Edition/SOP sensitivity decision: **PENDING** ·
Proposed wording accepted/rejected/revised: **PENDING** · Austin review
date: **PENDING** · Austin notes: **PENDING**

## 6.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 7. `m6-q1`

## 7.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m6-q1` |
| Module / form | m6 — Microscopy & imaging |
| Domain | analysis |
| Topic | imaging |
| Difficulty | 3 |
| Cue classification | `uniquely-longest` (correct option index 1, lengths 32/50/12/13 — option 1 is markedly longer than the rest) |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `684462a649860e1c13a9218d9caf4456710b2b77c24d3c4fba8c10c4d2fa2347` |

**Stem:** "To locate metaphases on a slide you use, and to analyze bands you
use:"

**Options:** 0. 100× oil to find; 10× to analyze · 1. **Low power (e.g.,
10×) to find; 100× oil to analyze** ← keyed · 2. 10× for both · 3. 100× for
both

**Rationale:** "Scan at low power to find spreads, then switch to 100× oil
to resolve bands for analysis."

**Distractor feedback:** 0 — "This reverses the correct order." 2 — "Low
power cannot resolve bands for analysis." 3 — "High power alone is
inefficient for scanning the whole slide."

## 7.2 Intended educational purpose

Core microscopy workflow: efficient slide scanning at low magnification,
then switching to oil immersion for band-level resolution. Cognitive level:
**application** (requires understanding *why* each power level suits each
task, not just memorizing numbers — reinforced by the rationale and
distractor feedback all giving mechanistic reasons). Domain/topic
(analysis/imaging), difficulty 3 (the highest difficulty among these 13
pilot items) are supportable — this combines two related facts (which power
for which task, in both directions) into one item, plausibly harder than a
single-fact recall item.

## 7.3 Source dossier

| Field | Value |
| --- | --- |
| Title | "Select, Count, & Analyze" |
| Publisher | *CG - Cytogenetics* (same independently authored ASCP-BOC-CG-exam study resource as `m4-q1`; explicitly a supplement to, not a republication of, official ASCP BOC materials) |
| Edition/date | Live web page, no printed revision date; retrieved 2026-08-10 |
| Locator | "Select, Count, & Analyze" page, metaphase-scanning description |
| URL | `https://cytogenetics.mlsascp.com/select-count-analyze.html` |
| Retrieved | 2026-08-10 |
| Source status (taxonomy, § Finding 3) | **`directly-inspected-but-secondary-or-incomplete`** — fully and directly fetched, but an independently-authored specialist study aid corroborated only by domain-general microscopy convention, not a second cytogenetics-specific source. |
| Directly inspected? | **Yes**, fetched and quoted directly: *"The laboratory scientist scans the slide using low power (10x) to identify candidates and then switches to high power (100x Oil) to verify quality."* |
| Narrow claim supported | Low power is used to locate/scan for metaphase candidates; 100× oil immersion is used for detailed band-level analysis — matching the keyed answer's direction exactly. |
| Edition/jurisdiction sensitivity | Low — this is a stable microscopy-workflow convention, not a numeric SOP value or regulation. |
| Unresolved problem | Same third-party-specialist-source caveat as `m4-q1`/`m6-q4` — not an ASCP-official or peer-reviewed document; not independently corroborated by a second source in this session (only one matching source was found and fetched for this specific claim, unlike `m4-q1`'s two-source corroboration). Recommend a second, ideally peer-reviewed or manufacturer/technical (e.g., a cytogenetics laboratory manual or microscopy-vendor technical note) source before formal source-checking. |

## 7.4 Scientific-analysis proposal

The keyed answer matches the one directly-inspected source exactly, and is
also consistent with general, uncontroversial microscopy practice (scanning
at low power before switching to oil immersion for fine detail is standard
across light microscopy generally, well beyond cytogenetics specifically —
a domain-general principle that independently supports the same direction).
Every distractor is a plausible, specific error (reversed order; same power
for both, in each direction). No absolute wording. **Confidence:
moderate-high** — single specialist source plus a well-established
domain-general microscopy principle, but only one specific source was
directly fetched for the cytogenetics-specific framing; a second source
would strengthen this before formal sign-off.

## 7.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | appears satisfied | |
| 4 | Parallel construction | appears satisfied | All four use the same "X to find; Y to analyze" pattern |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied *(reviewed under Finding 5, no revision)* | `uniquely-longest` and by a wide margin (50 vs. 32/12/13 chars) — the key is nearly 4× the shortest distractor. **Correction (this round): the prior text called this "the most pronounced length gap of any item in this pilot batch," which is inaccurate — `m16-q1` has both a larger absolute gap (62 vs. 10/21/16, a 52-character spread vs. this item's 38-character spread) and a larger ratio (~6.2× vs. ~4.2×); that superlative claim is retracted here.** The extra length here is substantive ("e.g., 10×" qualifier and the explicit dual-clause structure), not filler; no revision proposed |
| 9 | Absolute words | appears satisfied | |
| 10 | Paired/opposite-option patterns | appears satisfied *(reviewed under Finding 5, no revision)* | Options 2 and 3 are a clean "same power for both" pair (10× vs. 100×) — reviewed and judged a deliberate, legitimate test of whether the learner knows the power level *must* differ between the two tasks, not an unintended telegraph; no revision proposed |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 7.6 Recommended disposition

**Leave unchanged.** Per Finding 5, the length gap (item 8) and
paired-option pattern (item 10) have each been resolved this round to an
explicit evidence-backed explanation rather than left as open flags — see
the "reviewed under Finding 5" notes above. Austin's Gate B sign-off is
still required (§ 7.8/7.9 remain pending), but this document no longer
defers the *judgment call itself* on these two rows.

## 7.7 Proposed revision

None proposed here — if Austin's Gate B review concludes option 1 should be
tightened (e.g., dropping "e.g.,"), that is a narrow wording call best made
directly against the rubric, not pre-empted by this preliminary packet.

## 7.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** *(second
corroborating source recommended)* · Scientific conclusion
accepted/rejected/revised: **PENDING** · Intended learning objective:
**PENDING** · Final item disposition: **PENDING** · Gate B decisions:
**PENDING** · Edition/SOP sensitivity decision: **PENDING** · Proposed
wording accepted/rejected/revised: **PENDING** · Austin review date:
**PENDING** · Austin notes: **PENDING**

## 7.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 8. `m6-q4`

## 8.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m6-q4` |
| Module / form | m6 — Microscopy & imaging |
| Domain | analysis |
| Topic | imaging |
| Difficulty | 1 |
| Cue classification | `not-longest` (correct option index 2 of 4, lengths 37/27/34/43 — option 3 is longest, not the key) |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `69cdacede4acd6867abf6c5235f38b25b492a4430ebd6e5100ec9865830dfd39` |

**Stem:** "Acceptable image enhancement does NOT include:"

**Options:** 0. Adjusting overall brightness/contrast · 1. Subtracting even
background · 2. **Erasing or adding chromatin/signal** ← keyed · 3.
Capturing in separate channels then merging

**Rationale:** "You may optimize visualization, but never add, erase,
clone, or move real material — that fabricates/destroys a finding."

**Distractor feedback (for the three non-keyed options, all of which are
themselves acceptable practices being confirmed, not rejected):** 0 —
"Brightness/contrast adjustment is acceptable." 1 — "Even background
subtraction is acceptable." 3 — "Channel capture and merge is standard,
legitimate practice."

## 8.2 Intended educational purpose

Teaches image-integrity ethics/policy: what counts as legitimate
visualization enhancement versus data fabrication in karyotype/FISH imaging
— a professional-integrity and diagnostic-validity concept, not a technique
recall item. Cognitive level: **application/judgment** (a negatively-phrased
stem requiring the learner to distinguish a category boundary, correctly
flagged as such per Gate B item 11's own concern about negative stems — see
worksheet below). Domain/topic (analysis/imaging), difficulty 1, are
debatable: this is conceptually about professional integrity/ethics as much
as imaging technique, and arguably deserves difficulty ≥2 given the
judgment required — flagged for Austin below, not changed here.

## 8.3 Source dossier

| Field | Value |
| --- | --- |
| Title | "Enhance Images" |
| Publisher | *CG - Cytogenetics* (same independently authored ASCP-BOC-CG-exam study resource as `m4-q1`/`m6-q1`) |
| Edition/date | Live web page, no printed revision date; retrieved 2026-08-10 |
| Locator | "Enhance Images" page, acceptable-vs-unacceptable enhancement lists |
| URL | `https://cytogenetics.mlsascp.com/enhance-images-1.html` |
| Retrieved | 2026-08-10 |
| Source status (taxonomy, § Finding 3) | **`directly-inspected-but-secondary-or-incomplete`** — fully and directly fetched, closely matching source, but an independently-authored specialist study aid, not an ASCP/CAP primary. |
| Directly inspected? | **Yes**, fetched and quoted directly. Acceptable, quoted: contrast/brightness adjustment "to maximize the dynamic range of the image"; background removal "to remove debris, stain precipitate, or uneven lighting from the empty space." Not acceptable, quoted: "Deleting Signals: Using the 'eraser' tool to remove a FISH signal that 'looks like background'"; "Copy/Paste: Copying a normal chromosome from another cell to replace a blurry one"; "Band Drawing: Using a paintbrush tool to darken a band that 'should be there.'" Stated principle, quoted: *"Enhancement makes existing data clearer; manipulation creates false data."* |
| Narrow claim supported | The specific boundary this item tests (adjust visualization vs. add/remove/move real chromosomal material) matches this source's stated acceptable/unacceptable lists closely, item for item. |
| Edition/jurisdiction sensitivity | Low — this is a general image-integrity principle, reinforced by the same "never fabricate data" norm found broadly in scientific-image-integrity guidance (general search corroboration, not cytogenetics-specific, e.g. general biomedical-publication image-integrity practices). |
| Unresolved problem | Same third-party-specialist-source caveat as other items citing this domain. This is nonetheless the **strongest, most directly matching single source found in this entire research pass** — the acceptable/unacceptable lists correspond almost one-to-one with this item's four options. An official CAP Cytogenetics Checklist citation (searched for specifically, not found in a directly-accessible public form this session — CAP checklists are member/subscriber-gated) would be the ideal formal primary source and was **not** locatable/inspectable. |

## 8.4 Scientific-analysis proposal

This is the best-sourced item in the pilot batch: every option maps
directly onto the fetched source's own explicit acceptable/unacceptable
categorization. Keyed answer is exactly and uniquely correct under this
source. Rationale's own wording ("add, erase, clone, or move real
material") closely echoes the source's three named unacceptable practices
(deleting/erasing, copy/paste, band drawing/adding). No unsupported
absolute claim — "never" in the rationale is used correctly, describing an
actual bright-line integrity rule, not an unintentional overgeneralization.
**Confidence: high**, with the caveat that the *formal* citable source
(ideally a CAP checklist item) was not locatable in public form this
session — flagged, not filled by inference.

## 8.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | appears satisfied | Each is a real, named acceptable technique a learner might wrongly suspect is *not* allowed |
| 4 | Parallel construction | appears satisfied | All four are gerund-phrase imaging actions |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied | `not-longest`; option 3 is longest, not the key |
| 9 | Absolute words | appears satisfied | "never" appears correctly in the rationale (not the stem/options) to describe a genuine bright-line rule |
| 10 | Paired/opposite-option patterns | appears satisfied | |
| 11 | "All/none," negative stems | appears satisfied *(reviewed under Finding 5, no revision)* | The stem is a **negatively phrased "does NOT include"** item, clearly marked (capitalized "NOT"), matching the rubric's own requirement that negative stems be "clearly marked as such" — this item already satisfies the rubric's stated bar on its own terms; no revision proposed |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 8.6 Recommended disposition

**Leave unchanged.** Best-sourced item in this pilot batch. Only open items
are (a) locating a fully public, formally citable primary source (CAP
checklist ideally) to replace/supplement the specialist study-site
citation, and (b) Austin's confirmation of the difficulty tag (1 vs.
possibly 2, per 8.2) — neither is a scientific-content concern.

## 8.7 Proposed revision

None proposed.

## 8.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** *(CAP
checklist citation would strengthen; not required to proceed)* · Scientific
conclusion accepted/rejected/revised: **PENDING** · Intended learning
objective: **PENDING** · Final item disposition: **PENDING** · Gate B
decisions: **PENDING** · Edition/SOP sensitivity decision: **PENDING** ·
Proposed wording accepted/rejected/revised: **PENDING** · Austin review
date: **PENDING** · Austin notes: **PENDING** *(including the difficulty-tag
question in 8.2)*

## 8.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 9. `m7-q2`

## 9.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m7-q2` |
| Module / form | m7 — Metaphase selection |
| Domain | analysis |
| Topic | metaphase-selection |
| Difficulty | 1 |
| Cue classification | `tied-longest`, options 0/1/2 all tied at 37 characters, option 3 at 19 |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `b8476e3e83340a06877eddc973d2c992471dd6c018634e7a8e1e9abd538487f5` |

**Stem:** "Which is the correct quality hierarchy (most to least
demanding)?"

**Options:** 0. Countable > analyzable > karyotypable · 1. **Karyotypable >
analyzable > countable** ← keyed · 2. Analyzable > karyotypable > countable
· 3. They are equivalent

**Rationale:** "Every karyotypable cell is analyzable, and every analyzable
cell is countable — not the reverse."

**Distractor feedback:** 0 — "This reverses the demand order." 2 —
"Karyotypable is the most demanding, above analyzable." 3 — "They are
nested tiers, not equivalent."

## 9.2 Intended educational purpose

Teaches the metaphase-quality nesting concept underlying every metaphase
count in a cytogenetics report — that a laboratory *counts* more cells than
it fully *analyzes*, and *analyzes* more than it formally *karyotypes*, and
why that ordering, not an arbitrary one, is correct. Cognitive level:
**comprehension** of a conceptual nesting relationship, not simple recall.
Domain/topic (analysis/metaphase-selection), difficulty 1, are supportable
for the *concept itself*, though see 9.3/9.4 for why this item is this
packet's single largest open item.

## 9.3 Source dossier

| Field | Value |
| --- | --- |
| Title | *(unresolved — no single source directly confirms this exact three-term nested hierarchy)* |
| Publisher | — |
| Edition/date | — |
| Locator | — |
| URL | — |
| Retrieved | Multiple searches performed 2026-08-10 |
| Source status (taxonomy, § Finding 3) | **`source unresolved`** — no primary or secondary source directly confirms the exact three-term hierarchy; explicitly not filled by inference. |
| Directly inspected? | **No source using exactly the terms "countable," "analyzable," and "karyotypable" together as a formal three-tier nested hierarchy was located and directly inspected this session**, despite specifically searching the same specialist study site used successfully for four other items in this batch (`cytogenetics.mlsascp.com/select-count-analyze.html`, directly fetched and re-checked specifically for this question — it uses "analyzable" once, in isolation, with no tiered comparison to "countable" or "karyotypable"). |
| Narrow claim supported | *Adjacent, supporting* facts were found: a successful karyotype conventionally requires a minimum number of analyzable metaphases (a commonly cited convention is ≥10, per general search results, itself not independently verified against one primary counting-standard document this session); the general "count ~20, fully analyze a smaller subset (e.g., 5)" convention is well attested informally. These are consistent with, but do not by themselves prove, the *specific* strict three-way nesting this item states. |
| Edition/jurisdiction sensitivity | Unknown until a source is found. |
| Unresolved problem | **Explicitly marked `source unresolved`, per this task's own instruction, rather than inferring the gap closed.** The concept is *plausible* and *internally consistent* with general cytogenetics QC practice (each stage requires everything the stage below it requires, plus more), but this document does not claim to have verified it against one authoritative source, and says so plainly rather than papering over the gap. The ideal source remains a peer-reviewed methods paper or the *AGT Cytogenetics Laboratory Manual* (unresolved for the same access reason as `m1-q3`/`m2-q1`/`m4-q1`), or — if this specific three-term framing is this course's own original pedagogical simplification rather than a term-for-term standard citation — that should be Austin's explicit call, not silently assumed either way by this document. |

## 9.4 Scientific-analysis proposal

The underlying *concept* (a nested nested quality nesting: karyotypable ⊂
analyzable ⊂ countable) is scientifically plausible and internally
consistent with how cytogenetics laboratories actually report cell counts
(more cells counted than fully karyotyped) — but this document cannot
certify it as scientifically defensible against one direct, named source,
and explicitly does not do so. This is different from every other item in
this packet, all of which had at least one directly-inspected, reasonably
matching source. **Confidence: low-to-moderate on sourcing specifically;
moderate on internal plausibility of the concept itself.** This is exactly
the kind of gap that should block source-checking (not necessarily
`sme-reviewed`, which is a separate, later Austin judgment) until resolved.
**Austin must independently evaluate this conclusion** and, in particular,
should say plainly whether "countable/analyzable/karyotypable" is
established field terminology he recognizes from training/practice or a
locally coined course simplification — that answer changes what kind of
source (external citation vs. an explicit "this is the course's own
operational definition" note) is actually needed.

## 9.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | requires Austin judgment | Internally consistent with the rationale as written, but the source gap (9.3) means this document cannot independently confirm the *terminology* is standard, only that the *logic* is self-consistent |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | appears satisfied | Each of 0/2 is a plausible reordering; 3 is a plausible "maybe they're the same" misconception |
| 4 | Parallel construction | appears satisfied | 0/1/2 share identical format; 3 breaks format as a qualitatively different claim ("equivalent") — acceptable, since it is a genuinely different claim type, not a construction defect |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | possible concern | Key is tied-longest with two other options (37 chars, shared with options 0 and 2) — not uniquely flagged, but worth noting option 3 is conspicuously *shorter* (19 chars), which could itself function as a "this one is obviously not it" cue in the opposite direction; Gate A/Gate B judgment call |
| 9 | Absolute words | appears satisfied | |
| 10 | Paired/opposite-option patterns | appears satisfied | |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | Internally consistent, contingent on 9.3's gap |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | requires Austin judgment | This is the live question — see 9.6 |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft, and additionally blocked on 9.3 specifically |

## 9.6 Recommended disposition

**Quarantine pending evidence.** This is not a claim that the item is
wrong — the concept is plausible and the item is otherwise well-constructed
(single defensible internal logic, clean distractors, good rationale) — it
is a claim that **this document could not close the source-dossier
requirement** for the specific three-term hierarchy as stated, despite a
real search effort, and the task's own instruction is explicit: mark
`source unresolved` rather than fill the gap through inference. Of the 13
pilot items, this is the one this packet recommends Austin look at *first*,
specifically because it is the one place a genuine sourcing gap — not
merely an incomplete citation of an otherwise-solid fact — remains.

## 9.7 Proposed revision

None proposed. A revision is not obviously needed — the content may well be
exactly correct as written — so no rewrite is offered to avoid implying a
content problem where the actual gap is evidentiary.

## 9.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING — this is
the priority item; Austin's own domain knowledge may resolve this
directly, faster than further web search** · Scientific conclusion
accepted/rejected/revised: **PENDING** · Intended learning objective:
**PENDING** · Final item disposition: **PENDING** · Gate B decisions:
**PENDING** · Edition/SOP sensitivity decision: **PENDING** · Proposed
wording accepted/rejected/revised: **PENDING** · Austin review date:
**PENDING** · Austin notes: **PENDING**

## 9.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 10. `m12-q6`

## 10.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m12-q6` |
| Module / form | m12 — Structural II: t/inv/cancer |
| Domain | analysis |
| Topic | structural-2 |
| Difficulty | 1 |
| Cue classification | `not-longest` (correct option index 1 of 4, lengths 12/13/18/17) |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `e72605996b292febd4a70afa05e9d7c97ee2bce93ba82acfbcecf7bd4a9950e1` |

**Stem:** "The Philadelphia chromosome itself is the:"

**Options:** 0. Large der(9) · 1. **Small der(22)** ← keyed · 2. Whole
chromosome 9 · 3. Marker chromosome

**Rationale:** "The Ph chromosome is the small derivative 22 from the
t(9;22)."

**Distractor feedback:** 0 — "The der(9) is the larger product, not the Ph
chromosome." 1 — *(empty string — see 10.4)* 2 — "It is a derivative, not
an intact 9." 3 — "It is identifiable as der(22), not an unidentifiable
marker."

## 10.2 Intended educational purpose

A foundational structural-cytogenetics fact central to CML/ALL diagnosis —
distinguishing the Philadelphia chromosome itself (the smaller derivative
product) from the reciprocal, larger der(9), a distinction learners commonly
confuse. Cognitive level: recall of a specific, well-established fact.
Domain/topic (analysis/structural-2), difficulty 1, are supportable.

## 10.3 Source dossier

| Field | Value |
| --- | --- |
| Title | Kang ZJ, Liu YF, Xu LZ, et al., "The Philadelphia chromosome in leukemogenesis" |
| Publisher | *Chinese Journal of Cancer* (peer-reviewed), 2016 |
| Edition/date | 2016; article directly re-fetched this correction round, 2026-08-10 |
| Locator | Introduction — the article's opening definitional statement of the Philadelphia chromosome |
| URL | `https://pmc.ncbi.nlm.nih.gov/articles/PMC4896164/` |
| Retrieved | 2026-08-10 (this correction round; full article fetched, not a search snippet) |
| Source status (taxonomy, § Finding 3) | **`directly-inspected-and-adequate`** — upgraded this round from search-result-summary-only to a genuine direct fetch of one specific, named, peer-reviewed article with an exact locator, per Finding 4. |
| Directly inspected? | **Yes, this round.** Quoted verbatim: *"The truncated chromosome 22 that results from the reciprocal translocation t(9;22)(q34;q11) is known as the Philadelphia chromosome (Ph)."* This directly and specifically supports the keyed answer: Ph = der(22), the smaller/truncated reciprocal product of t(9;22), not der(9). |
| Narrow claim supported | The Philadelphia chromosome is the derivative/truncated chromosome 22 produced by t(9;22)(q34;q11) — directly and exactly matching the keyed answer, now via one specific, directly-inspected, peer-reviewed locator rather than converging general-search summaries. |
| Edition/jurisdiction sensitivity | None — this is a foundational, stable structural-cytogenetics fact (first described by Nowell and Hungerford, 1960; molecularly characterized by Rowley, 1973), not subject to edition/jurisdiction variation. |
| Unresolved problem | None material, after this round's re-sourcing. The prior round's general-search convergence (PLOS Genetics, ScienceDirect Topics, additional PMC articles) is retained as corroborating background but is no longer the primary citation; the single directly-inspected article above is now the primary locator. |

## 10.4 Scientific-analysis proposal

Keyed answer is correct and well-established; not a disputed or
edition-sensitive fact, now supported by one specific, directly-inspected
peer-reviewed locator (§ 10.3). Distractors are each wrong for a specific,
correct reason. **One structural/authoring observation, not a scientific
one:** the wrong-answer-feedback object carries an explicit but **empty
string** keyed to index `1` — the correct answer's own index. Functionally
harmless (the correct answer does not need "wrong" feedback and the UI does
not display this), but it is untidy authored data. **Confidence: high** on
the scientific content.

**Correction (this round, per Finding 5):** the prior round's disposition
simultaneously "recommended cleanup" of the stray key (§ 10.4 above) and
"Leave unchanged... no change is justified" (§ 10.6) — two incompatible
positions left unresolved side by side. This round picks one explicitly:
the stray `"1": ""` key is a zero-risk, zero-content-impact structural
cleanup (it does not touch the stem, any option text, the rationale, the
keyed answer, or any *displayed* feedback), so it is proposed as a minor
**edit-in-place** (§ 10.7), not left as an unresolved dangling note.

## 10.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | appears satisfied | der(9) confusion is a classic, realistic learner error |
| 4 | Parallel construction | appears satisfied | |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied | `not-longest` |
| 9 | Absolute words | appears satisfied | |
| 10 | Paired/opposite-option patterns | possible concern | Options 0 and 1 are a clean der(9)/der(22) minimal pair ("Large der(9)" vs. "Small der(22)") — plausible as a deliberate, legitimate two-option contrast testing the exact right distinction, not a defect, but worth Austin's eye per the rubric's own item 10 |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied *(resolved this round — edit-in-place proposed)* | Stray empty-string feedback entry keyed to the correct answer's own index (10.4) — resolved per Finding 5 as a proposed minor edit-in-place (§ 10.7), not left as an open concern |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 10.6 Recommended disposition

**Edit in place (structural only)** — revised this round per Finding 5,
replacing the prior round's self-contradictory "leave unchanged / recommend
cleanup" pairing with one explicit decision. The scientific content (stem,
options, rationale, keyed answer, and all three *displayed* distractor
feedback strings) is unchanged and requires no revision. Only the stray
`"1": ""` key in the feedback data object is proposed for removal.

## 10.7 Proposed revision

**Proposed (packet-only; not applied to `index.html` or
`QUESTION_GOVERNANCE` by this document):** remove the stray `"1": ""` entry
from this item's wrong-answer-feedback object. It is keyed to the correct
answer's own index, is never read or displayed by the application (the UI
only shows feedback for non-keyed options), and its removal changes no
visible content, no rationale, no option text, and no stable-ID meaning —
a pure data-hygiene fix, distinct in kind from every other proposed
revision in this packet (which change learner-visible text).

## 10.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** · Scientific
conclusion accepted/rejected/revised: **PENDING** · Intended learning
objective: **PENDING** · Final item disposition: **PENDING** · Gate B
decisions: **PENDING** · Edition/SOP sensitivity decision: **PENDING** ·
Proposed wording accepted/rejected/revised: **PENDING** · Austin review
date: **PENDING** · Austin notes: **PENDING** *(including whether to clean
up the stray empty feedback key)*

## 10.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 11. `m15-q1`

## 11.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m15-q1` |
| Module / form | m15 — FISH & microarray |
| Domain | molecular |
| Topic | fish-array |
| Difficulty | 2 |
| Cue classification | `uniquely-longest` (correct option index 0 of 4, lengths 53/32/40/24) |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `bee7691ff0803cb8edfcc865ba4b56bb0b27aa22016453ccc6ce43a81d1da47b` |

**Stem:** "Interphase FISH (nuc ish) is especially useful because it:"

**Options:** 0. **Requires no culture and enumerates known targets fast** ←
keyed · 1. Shows full chromosome morphology · 2. Detects balanced
translocations directly · 3. Replaces all karyotyping

**Rationale:** "Interphase FISH works on non-dividing nuclei (even FFPE),
giving fast enumeration of known targets."

**Distractor feedback:** 1 — "It cannot show chromosome morphology — that
needs metaphase." 2 — "FISH targets specific loci; it doesn't broadly
screen for balanced events the way it might seem." 3 — "It complements, not
replaces, karyotyping."

## 11.2 Intended educational purpose

Teaches the core practical advantage of interphase FISH over
metaphase-dependent karyotyping — speed and no culture requirement — and
equally important, its real limitations (no morphology, not a general
screen for balanced rearrangements, not a replacement for karyotyping).
Cognitive level: **comprehension/application** — requires understanding
*why* the advantage exists (non-dividing cells) and correctly rejecting
plausible overclaims about FISH's scope. Domain/topic (molecular/fish-array),
difficulty 2, are supportable — appropriately harder than the difficulty-1
items given three of four options require nuanced understanding of FISH's
real scope and limits, not just its stated advantage.

## 11.3 Source dossier

| Field | Value |
| --- | --- |
| Title | Wolff DJ, et al., "Guidance for Fluorescence in Situ Hybridization Testing in Hematologic Disorders" |
| Publisher | *The Journal of Molecular Diagnostics* (official journal of the Association for Molecular Pathology, published by Elsevier), 2007;9(2):134–143 |
| Edition/date | 2007; full text directly re-fetched this correction round, 2026-08-10 |
| Locator | Discussion of dual-fusion (D-FISH) *BCR/ABL1* probe detection of t(9;22)/variant/cryptic rearrangements; and the article's stated general limitation of interphase FISH |
| URL | `https://pmc.ncbi.nlm.nih.gov/articles/PMC1867444/` (DOI 10.2353/jmoldx.2007.060128) |
| Retrieved | 2026-08-10 (this correction round; full text fetched twice and quoted verbatim, not a search snippet) |
| Source status (taxonomy, § Finding 3) | **`directly-inspected-and-adequate`** — upgraded this round from summary-level to genuine full-text direct inspection, per Finding 4. |
| Directly inspected? | **Yes, this round, in full.** Two directly relevant passages, quoted verbatim: (1) *"The dual-color, dual-fusion BCR(green)/ABL1(red) probe (D-FISH) set allows for detection of all forms of the BCR/ABL1 fusion (yellow), ie, t(9;22), variant translocations, and cryptic translocations or insertions."* (2) *"Although interphase FISH analysis provides information only on specific probes used and generally does not substitute for complete karyotype analysis, it may, under some disease circumstances, be the preferred means of identifying an abnormal clone."* |
| Narrow claim supported | Interphase FISH's major advantage is working on non-dividing cells without culture, enabling fast, targeted enumeration (quote 2, matching the keyed answer and rationale). **This round's correction:** quote (1) also shows that a *targeted* dual-fusion/break-apart FISH probe strategy genuinely does detect specific balanced translocations — including t(9;22) — directly in interphase nuclei. Quote (2) is the article's own stated boundary: FISH provides information **only on the specific probes used** and is not a substitute for complete (i.e., untargeted, genome-wide) karyotype analysis. Together, these two quotes are the basis for this round's Gate B and revision corrections below. |
| Edition/jurisdiction sensitivity | Low for the core biological/technical claim; FISH panel-specific regulatory guidance can evolve, not directly relevant to this item's narrow claim. |
| Unresolved problem | None material, after this round's full-text re-fetch. |

## 11.4 Scientific-analysis proposal

**Correction (this round, per Finding 1):** the prior round's analysis was
wrong. It asserted that the "Detects balanced translocations directly"
distractor (former option 2) was straightforwardly false and that Gate B
item 1 (exactly one defensible best answer) "appears satisfied." Direct
full-text inspection of Wolff et al. (§ 11.3, quote 1) shows this is not
correct: a targeted dual-fusion/break-apart FISH probe strategy genuinely
**does** detect specific balanced translocations — including t(9;22) — in
interphase nuclei. The former distractor's own wording, "Detects balanced
translocations directly," never claimed FISH *broadly screens* for
balanced events; the prior round's feedback text rejected a claim ("broadly
screen") the option itself never made, while the option's literal claim was
true under a targeted-probe reading. That made the former option 2 a
second, genuinely defensible answer, not a clean distractor — a real Gate B
item 1/3/13 defect, not a preliminary-review false alarm.

The keyed answer (option 0, no-culture/fast enumeration) remains correct
and is not in question. Wolff et al.'s own stated limitation (§ 11.3, quote
2 — FISH "provides information only on specific probes used and generally
does not substitute for complete karyotype analysis") is the scientifically
accurate basis for a replacement distractor: interphase FISH is targeted
and rapid, but it is **not** an untargeted, genome-wide screen for unknown
rearrangements — that is the real, unambiguously false overclaim this item
should test, in place of the ambiguous former option 2. See § 11.7 for the
full proposed revision. **Confidence: high**, now grounded in full-text
inspection of an authoritative, on-topic, peer-reviewed guidance source.

## 11.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | **fails preliminary review — corrected this round** | The former option 2, "Detects balanced translocations directly," is a second defensible answer under a targeted-probe reading (§ 11.4); this round's revision (§ 11.7) replaces it to restore a single defensible best answer |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | **fails preliminary review — corrected this round** | The former option 2 was not a clean distractor — its literal claim was true under Wolff et al. (§ 11.3/11.4); the prior round's feedback rejected a claim the option never made ("broadly screen"). Replaced this round with a distractor that is unambiguously false under the same source (§ 11.7) |
| 4 | Parallel construction | appears satisfied | All four (three after revision, see § 11.7) complete "...because it:" as a verb-phrase claim |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied *(reviewed under Finding 5, no further revision)* | Original: `uniquely-longest` (53 vs. 32/40/24 chars). The § 11.7 revision's replacement option 2 is itself long (grounded in the same source's actual limitation, not padding), which incidentally reduces or removes the key's unique-longest status; exact post-revision lengths are Austin's to confirm at edit time, not re-measured by this document |
| 9 | Absolute words | appears satisfied | "all" appears in a wrong option (3), correctly signaling implausibility |
| 10 | Paired/opposite-option patterns | appears satisfied | |
| 11 | "All/none," negative stems | not applicable | Option 3 uses "all" but is not an "all of the above"-style option |
| 12 | Implausible padding | appears satisfied | Key's extra length, and the revised option 2's length, are both substantive, not filler |
| 13 | Rationale/feedback alignment | **fails preliminary review — corrected this round** | The former option 2's feedback ("doesn't broadly screen... the way it might seem") did not actually rebut the option's literal claim; § 11.7's revised feedback is aligned to the revised option and grounded in a direct quote |
| 14 | Preserves assessed intent | appears satisfied *(reviewed under Finding 5)* | The revision preserves the item's core teaching point (interphase FISH is targeted/rapid/no-culture, not a genome-wide screen, not a karyotyping replacement) exactly; only the previously-ambiguous option/feedback pair changes |
| 15 | Edit-in-place vs. supersede | **Edit in place** *(decided this round)* | A targeted option/feedback correction preserving the stable ID, stem, rationale, and keyed answer — not a change in assessed intent, so supersession is not warranted |
| 16 | Quarantine when unsupportable | not applicable | The item is not unsupportable; it is correctable, and this round proposes the correction |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 11.6 Recommended disposition

**Edit in place** — corrected this round per Finding 1. The prior round's
"Leave unchanged" disposition was wrong: it rested on the same mistaken
belief (Gate B item 1 "appears satisfied") that direct full-text inspection
of Wolff et al. now overturns (§ 11.3/11.4). The stem, rationale, keyed
answer (option 0), and options 1/3 with their feedback are unchanged and
remain correct. Only option 2 and its feedback are revised (§ 11.7), to
remove the second defensible answer and restore a single, unambiguous
distractor grounded in the same source's own stated limitation.

## 11.7 Proposed revision

**Proposed (packet-only; not applied to `index.html` or
`QUESTION_GOVERNANCE` by this document — Austin's edit, if approved):**

Option 2, current text: *"Detects balanced translocations directly"*

Option 2, proposed replacement: *"Screens the whole genome for any
rearrangement without a targeted probe"*

Option-2 feedback, current text: *"FISH targets specific loci; it doesn't
broadly screen for balanced events the way it might seem."*

Option-2 feedback, proposed replacement: *"FISH detects only the specific
probe target(s) chosen — it provides information only on those probes and
is not a substitute for complete karyotype analysis (Wolff et al., J Mol
Diagn 2007); an untargeted, genome-wide screen is not what interphase FISH
does."*

Rationale for the revision: the replacement option is unambiguously false
under the same directly-inspected source (§ 11.3, quote 2) — interphase
FISH is explicitly *not* an untargeted, whole-genome screen — so it no
longer risks being a second defensible answer the way the former option's
literal wording did. The revised feedback explains the correct boundary
(targeted per-probe detection vs. untargeted genome-wide screening) instead
of rejecting a claim the option never made. The stem, rationale, keyed
answer, and options 1/3 are unchanged, preserving the item's stable ID and
assessed intent exactly.

## 11.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** · Scientific
conclusion accepted/rejected/revised: **PENDING** · Intended learning
objective: **PENDING** · Final item disposition: **PENDING** · Gate B
decisions: **PENDING** · Edition/SOP sensitivity decision: **PENDING** ·
Proposed wording accepted/rejected/revised: **PENDING** · Austin review
date: **PENDING** · Austin notes: **PENDING**

## 11.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 12. `m16-q1`

## 12.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `m16-q1` |
| Module / form | m16 — Lab operations & ethics |
| Domain | operations |
| Topic | lab-ops |
| Difficulty | 1 |
| Cue classification | `uniquely-longest` (correct option index 1 of 4, lengths 10/62/21/16 — the largest length gap of any item in this batch) |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `044574fd4fe2244607340dca7d69289b3fd46ad093aa63f9ae03a251dbeec5f1` |

**Stem:** "The cytogenetic fixative components and their hazards are:"

**Options:** 0. Both inert · 1. **Methanol (flammable/toxic) and glacial
acetic acid (corrosive)** ← keyed · 2. Both strong oxidizers · 3. Both
radioactive

**Rationale:** "3:1 methanol:glacial acetic acid is flammable/toxic and
corrosive — handle in a fume hood, store flammable."

**Distractor feedback:** 0 — "Both components are hazardous." 2 — "They
are not oxidizers in this context." 3 — "They are not radioactive."

## 12.2 Intended educational purpose

Laboratory-safety knowledge: correctly identifying the standard cytogenetic
fixative's two components and their real hazard classes, essential before a
technologist handles it. Cognitive level: recall. Domain/topic
(operations/lab-ops), difficulty 1, are supportable.

## 12.3 Source dossier

| Field | Value |
| --- | --- |
| Field | Value (methanol) | Value (glacial acetic acid) |
| --- | --- | --- |
| Product name | Methanol | Acetic acid, glacial |
| Product number | 34860 | ARK2183 |
| Brand | Sigma-Aldrich | Sigma-Aldrich |
| CAS number | 67-56-1 | 64-19-7 |
| Index number | 603-001-00-X | 607-002-00-6 |
| SDS version (of the exact document directly inspected) | 6.4 | 6.1 |
| Revision date (of the exact document directly inspected) | 03/13/2015 | 10/17/2019 |
| Exact document actually fetched and read this round | Third-party archival mirror: `https://dept.harpercollege.edu/chemistry/sds/Methanol.pdf` | Third-party archival mirror: `https://isolab.ess.washington.edu/laboratory/safety/sds/acetic-acid.pdf` |
| Canonical current manufacturer locator (for this exact product number) | `https://www.sigmaaldrich.com/US/en/sds/sigald/34860` | `https://www.sigmaaldrich.com/US/en/sds/sial/ark2183` |
| Section 2 (Hazards Identification) content, quoted verbatim | GHS Classification: Flammable liquids (Category 2), H225; Acute toxicity, Oral (Category 3), H301; Acute toxicity, Inhalation (Category 3), H331; Acute toxicity, Dermal (Category 3), H311; STOT SE (Category 1), H370. Hazard statements: H225 "Highly flammable liquid and vapour"; H301+H311+H331 "Toxic if swallowed, in contact with skin or if inhaled"; H370 "Causes damage to organs." Signal word: Danger. | GHS Classification: Flammable liquids (Category 3), H226; Skin corrosion (Category 1A), H314; Serious eye damage (Category 1), H318. Hazard statements: H226 "Flammable liquid and vapour"; H314 "Causes severe skin burns and eye damage." Signal word: Danger. |
| Retrieved | 2026-08-10 (prior correction round) | 2026-08-10 (prior correction round) |

**Correction (this round, per Finding 1): the prior round's dossier mixed
two different pairs of records.** The prose above (product 34860, ARK2183)
and the classification data quoted were correctly transcribed from the
documents actually fetched and read — but the "URL" field wrongly cited
`sigmaaldrich.com/US/en/sds/sigma/m3641` and `sigmaaldrich.com/US/en/sds/
sigald/a6283`, the *manufacturer* SDS locators for two **different**
products (M3641, A6283), which were never successfully fetched (both
attempts returned unreadable/compressed content). The document genuinely
inspected — via third-party academic mirrors of Sigma-Aldrich's own SDS —
was for products 34860 and ARK2183, matching the prose. That mismatch is
corrected above: the table now records, separately, (a) the exact mirror
URL actually fetched and read, and (b) the correct canonical
`sigmaaldrich.com` locator for the *same* product number, not a different
product.

**Currency: this round's independent review observed newer official
revisions exist** — ARK2183 version 7.1, revised March 5, 2026, at
`sigmaaldrich.com/US/en/sds/sial/ark2183`. That observation is attributed
to Austin's own supplied finding, not to this session's own verification:
this round made **eight separate direct-fetch attempts** against
`sigmaaldrich.com` (both the M3641/A6283 URLs the prior round wrongly cited
and the corrected 34860/ARK2183/sigald-A6283 URLs), spaced across the
session, and every attempt timed out or failed to connect — the host was
not reachable by this session's tooling this round, despite genuine,
repeated effort. **This document does not call the 2015/2019 documents
"current."** They are recorded as exactly what they are: the specific,
reproducible documents directly inspected, dated as shown, with no
confirmation this round of whether their classification content has since
changed in the newer revision Austin observed. |
| Source status (taxonomy, § Finding 3) | **`directly-inspected-but-secondary-or-incomplete`** — downgraded this round from `directly-inspected-and-adequate`. The documents genuinely inspected are real, primary manufacturer SDS content (not a search snippet, not a non-official specialist site) and their metadata now reproducibly matches the exact records actually read — but they are third-party-mirrored, dated (2015/2019) copies, not confirmed against the current manufacturer page this round despite eight direct-fetch attempts, and a newer official ARK2183 revision is known (per Austin's observation) to exist. That currency gap is real and unresolved, not merely a formatting nicety, so `directly-inspected-and-adequate` is not retained. |
| Narrow claim supported | Per the exact documents inspected: methanol is classified flammable **and** acutely toxic (Category 2 flammable liquid; Category 3 acute toxicity by three routes: oral, dermal, inhalation) — matching the item's "flammable/toxic" descriptor. Glacial acetic acid is classified corrosive (Category 1A skin corrosion, Category 1 serious eye damage) — matching the item's "corrosive" descriptor. **Explicitly acknowledged, and material to § 12.7's revised feedback below: glacial acetic acid is *also* independently classified flammable (Category 3, H226).** "Flammable/toxic" and "corrosive" are not being treated as mutually exclusive, exhaustive categories — methanol and glacial acetic acid share the flammable classification; what distinguishes them, per the exact SDS text quoted above, is that methanol carries a GHS **acute-toxicity** classification (Acute Tox. 3, three routes) that glacial acetic acid's SDS does **not** carry, while glacial acetic acid carries a GHS **corrosion/eye-damage** classification that methanol's SDS does **not** carry. |
| Edition/jurisdiction sensitivity | GHS classification under 29 CFR 1910 (OSHA HCS). The underlying hazard classes for these two long-studied chemicals are stable and not expected to have changed in substance between the 2015/2019 documents inspected and the current revision, but this document does not assert that as confirmed — it is a plausibility judgment, not a verified fact, given the currency gap above. |
| Unresolved problem | **Restored, per Finding 1: a genuine, honestly unresolved currency gap.** This document could not confirm this round whether the current official Sigma-Aldrich SDS revisions for products 34860 and ARK2183 (the latter observed by Austin to now be version 7.1, revised 2026-03-05) carry identical Section 2 classification data to the 2015/2019 documents actually inspected. Recommended next step: re-fetch `sigmaaldrich.com/US/en/sds/sigald/34860` and `sigmaaldrich.com/US/en/sds/sial/ark2183` directly when tooling/network access allows, and confirm the classification data is unchanged (or update it if it has changed) before this dossier is used to populate `QUESTION_GOVERNANCE`. |

## 12.4 Scientific-analysis proposal

Keyed answer is correct against the exact directly-inspected manufacturer
SDS documents (§ 12.3), not general converging secondary knowledge, though
this round found and corrected a provenance defect in how those documents
were cited (§ 12.3) and could not confirm their currency despite genuine
effort. Distractors as originally authored (inert; strong oxidizers;
radioactive) are all clearly, unambiguously wrong. § 12.7 proposes a
complete distractor revision using real, plausible hazard-*pairing* errors
grounded specifically in the toxic-vs-corrosive distinction the two SDS
documents actually support (methanol: acute-toxicity classified, not
corrosion classified; glacial acetic acid: corrosion classified, not
acute-toxicity classified — both independently flammable), which
simultaneously improves distractor plausibility and substantially closes
the item's length gap as a natural consequence of using real, matched-length
hazard phrases, not padding. **Confidence: moderate-high** — the underlying
GHS classification is well-supported by genuine primary SDS content and
internally consistent, but this round's provenance correction (§ 12.3)
means confidence is not "high" pending re-confirmation against the current
manufacturer revision.

## 12.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | **fails preliminary review — corrected this round** | The three distractors (inert / oxidizers / radioactive) were all too implausible relative to the correct, specific, real hazard description — eliminable by absurdity alone. § 12.7 replaces them with plausible mispaired-hazard distractors built from the same real SDS-derived terms, resolving this per Finding 5 rather than deferring it |
| 4 | Parallel construction | appears satisfied | |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | **fails preliminary review — corrected this round** | Original: `uniquely-longest`, the largest absolute gap in this batch (62 vs. 10/21/16 chars). § 12.7's revision reuses the same two real hazard-phrase tokens ("flammable/toxic," 15 characters; "corrosive," 9 characters) across all four options, which mechanically narrows the spread to roughly 56–68 characters and ties the key with one distractor for longest — a direct, non-padded consequence of testing the real pairing rather than four unrelated absurd claims |
| 9 | Absolute words | appears satisfied | "Both" appears in two wrong options (0, 2) and is accurate scoping, not an unintended cue |
| 10 | Paired/opposite-option patterns | appears satisfied | |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft; additionally, the SDS currency gap (§ 12.3) must be closed before any source-check |

## 12.6 Recommended disposition

**Edit in place.** The distractor/feedback revision itself (§ 12.7) is
retained this round, re-verified against the corrected source dossier
(§ 12.3) and re-checked line by line for the specific concerns raised in
Finding 1 (mutual-exclusivity implication, distractor falsity, single
defensible answer, feedback-to-option alignment, exact lengths). The
stem, rationale, and keyed answer (option 1) are unchanged. The
disposition itself does not depend on resolving the SDS currency gap
(§ 12.3) — the classification facts used are internally consistent and
grounded in genuine primary SDS content — but Austin's final sign-off
should note that gap before formal `QUESTION_GOVERNANCE` entry.

## 12.7 Proposed revision

**Proposed (packet-only; not applied to `index.html` or
`QUESTION_GOVERNANCE` by this document — Austin's edit, if approved).
Re-verified this round against Finding 1's specific requirements:**

| Option | Current | Proposed | Length (chars) |
| --- | --- | --- | ---: |
| 0 | Both inert (10) | Methanol (corrosive) and glacial acetic acid (flammable/toxic) | 62 |
| 1 (keyed) | Methanol (flammable/toxic) and glacial acetic acid (corrosive) (62) | *(unchanged)* | 62 |
| 2 | Both strong oxidizers (21) | Methanol (flammable/toxic) and glacial acetic acid (flammable/toxic) | 68 |
| 3 | Both radioactive (16) | Methanol (corrosive) and glacial acetic acid (corrosive) | 56 |

Lengths recalculated by direct character count this round: 62/62/68/56 —
the key (62) is tied with option 0 for longest, not uniquely longest,
replacing the original 62/10/21/16 spread (largest gap in the pilot batch).

Proposed distractor feedback — revised this round to rebut the literal
proposed option text precisely, and to avoid implying "flammable/toxic"
and "corrosive" are mutually exclusive (both chemicals are independently
flammable; what distinguishes them is acute toxicity vs. corrosion/eye
damage, not flammability):

- 0 — "This reverses which specific hazard each chemical carries. Methanol
  is not classified corrosive (no skin/eye-damage category on its SDS);
  glacial acetic acid is (Skin Corr. 1A, H314) — though, like methanol, it
  is also independently classified flammable (Flam. Liq. 3, H226)."
- 2 — "Glacial acetic acid carries no acute-toxicity classification. Its
  distinguishing hazard beyond flammability (which it shares with
  methanol) is corrosivity (Skin Corr. 1A, H314), not toxicity."
- 3 — "Methanol carries no corrosion classification. Its distinguishing
  hazard beyond flammability (which it shares with glacial acetic acid) is
  acute toxicity (Acute Tox. 3, H301/H311/H331), not corrosivity."

**Falsity, single-answer, and alignment check (per Finding 1's explicit
requirements):**
- *Every distractor remains scientifically false as a complete pairing
  claim, not merely less complete than the key.* Option 0 and option 3
  each assert methanol is "corrosive" — false outright; methanol's SDS
  carries no corrosion/eye-damage classification at any concentration
  tested. Option 2 asserts glacial acetic acid is "toxic" — false as a GHS
  classification claim; its SDS carries no acute-toxicity category. Each
  distractor's falsity does not depend on treating "flammable" as
  exclusive to one chemical (both share it) — it depends on a
  classification category (corrosion for methanol; acute toxicity for
  glacial acetic acid) that the inspected SDS documents affirmatively do
  not assign.
- *Exactly one defensible best answer remains.* Option 1 is the only
  option where both assigned descriptors are fully supported by the
  inspected SDS documents (methanol: Flam. Liq. 2 + Acute Tox. 3;
  glacial acetic acid: Skin Corr. 1A). No other option has both
  descriptors correct.
- *Each feedback statement rebuts the literal option, not a generic
  restatement of the key.* Each of the three revised feedback strings
  names the specific classification category the option's claim lacks,
  addressed to that option's specific wrong assignment.

Rationale for the revision: replacing the absurd inert/oxidizer/radioactive
distractors with plausible *mispaired* hazard descriptions (built from the
same two real, SDS-confirmed hazard categories, swapped or duplicated
across the two chemicals) requires the learner to know the actual
category-to-chemical pairing, not just recognize which claims are absurd —
directly addressing Gate B item 3. Because all four options now reuse the
same two hazard-phrase tokens, the length spread narrows and the key is no
longer uniquely longest, addressing Gate B item 8 as a byproduct of
accuracy, not padding. The rationale, stem, and keyed answer are unchanged,
preserving the item's stable ID and assessed intent.

## 12.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** *(re-fetch
`sigmaaldrich.com/US/en/sds/sigald/34860` and
`sigmaaldrich.com/US/en/sds/sial/ark2183` directly and confirm Section 2 is
unchanged from the 2015/2019 documents inspected before formal
`QUESTION_GOVERNANCE` entry — see § 12.3)* · Scientific conclusion
accepted/rejected/revised: **PENDING** · Intended learning objective:
**PENDING** · Final item disposition: **PENDING** · Gate B decisions:
**PENDING** · Edition/SOP sensitivity decision: **PENDING** · Proposed
wording accepted/rejected/revised: **PENDING** · Austin review date:
**PENDING** · Austin notes: **PENDING**

## 12.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# 13. `final-q33`

## 13.1 Identity and current snapshot

| Field | Value |
| --- | --- |
| Stable ID | `final-q33` |
| Module / form | final — Final cumulative exam pool |
| Domain | molecular |
| Topic | fish |
| Difficulty | 1 |
| Cue classification | `tied-longest`, options 0/1 tied at 21 characters (correct option is index 1) |
| Governance status | `draft`; same blocker set |
| Content fingerprint | `6aa8de3633bfe9acf7f6c09c100b2a77e83f626b6c15aebe3f1efccb5632d26c` |

**Stem:** "'nuc ish' denotes ___ and 'ish' denotes ___ FISH."

**Options:** 0. metaphase; interphase · 1. **interphase; metaphase** ←
keyed · 2. array; sequencing · 3. two stains

**Rationale:** "'nuc ish' is interphase (nuclear) FISH; 'ish' is metaphase
FISH."

**Distractor feedback:** 0 — "This reverses the two terms." 2 — "Neither is
microarray or sequencing." 3 — "They are FISH cell-state designations, not
stains."

## 13.2 Intended educational purpose

Tests correct recall of ISCN FISH-result nomenclature — specifically that
`nuc ish` prefixes an interphase (nuclear) FISH result and `ish` alone
prefixes a metaphase FISH result. This is precise standard-nomenclature
knowledge, directly relevant to reading/writing real cytogenetics reports.
Cognitive level: recall (fine-grained nomenclature memorization). Domain/
topic (molecular/fish), difficulty 1, are supportable.

## 13.3 Source dossier

| Field | Value |
| --- | --- |
| Title | "ISCN" |
| Publisher | *CG - Cytogenetics* (same independently authored ASCP-BOC-CG-exam study resource cited for `m4-q1`/`m6-q1`/`m6-q4`) |
| Edition/date | Live web page, no printed revision date; retrieved 2026-08-10 |
| Locator | ISCN FISH-nomenclature page, "nuc ish"/"ish" definitions |
| URL | `https://cytogenetics.mlsascp.com/iscn.html` |
| Retrieved | 2026-08-10 |
| Source status (taxonomy, § Finding 3) | **`directly-inspected-but-secondary-or-incomplete`** — fully and directly fetched, but a secondary restatement of ISCN convention, not the ISCN primary text itself. |
| Directly inspected? | **Yes**, fetched and quoted directly: *"FISH results have their own specific nomenclature, starting with `nuc ish` (Nuclear Interphase FISH) or `ish` (Metaphase FISH)."* |
| Narrow claim supported | `nuc ish` denotes nuclear/interphase FISH; `ish` alone denotes metaphase FISH — matching the keyed answer exactly and directly. |
| Edition/jurisdiction sensitivity | **High in principle** — this is literally ISCN (*International System for Human Cytogenomic Nomenclature*) notation, an internationally standardized, periodically revised nomenclature system (current edition: ISCN 2024). The *specific* `nuc ish`/`ish` convention tested here has been stable across recent editions to this document's knowledge, but that continuity was **not independently verified against the actual ISCN 2024 text**, which is a paid Karger publication and was not accessible this session. |
| Unresolved problem | **The single most authoritative possible source for this exact claim — the ISCN book itself — was not directly inspected.** This item relies entirely on a secondary, independently-authored study-site's restatement of ISCN convention, not the primary nomenclature standard. This is flagged explicitly, not treated as equivalent to a primary-source citation. |

## 13.4 Scientific-analysis proposal

The keyed answer matches the one directly-inspected secondary source
exactly, and this specific `nuc ish`/`ish` distinction is also widely and
consistently described the same way across general cytogenetics/FISH
literature encountered during this session's broader research (e.g., the
`m15-q1` source also referenced ISCN's `nuc ish` convention consistently).
Distractors are each clearly wrong (reversed; wrong modality entirely;
mischaracterized as "stains"). **Confidence: moderate-high** — the specific
fact is corroborated by convergent secondary description, but this document
explicitly does **not** claim to have inspected the ISCN primary text
itself, which would be the ideal citation for `QUESTION_GOVERNANCE` given
this is precisely a nomenclature-standard claim. **Austin must
independently evaluate this conclusion**, ideally against his own ISCN 2024
copy directly.

## 13.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | appears satisfied | Option 0 (the exact reversal) is a highly realistic learner error; 2/3 are plausible surface-level guesses |
| 4 | Parallel construction | appears satisfied *(reviewed under Finding 5, no revision)* | Options 0/1 share the fill-in-the-blank format; options 2/3 break that format (2 supplies unrelated terms, 3 restates the pair as "two stains" rather than filling both blanks) — reviewed and judged acceptable: each remains clearly and unambiguously wrong regardless of format, and 2/3 are correctly testing a different kind of misconception (wrong modality; wrong category) than the 0/1 reversal pair, not a construction defect; no revision proposed |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | "FISH" appears in the stem itself, applying equally to all options, not a one-sided clue |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied | Tied-longest with option 0 (the exact reversal) — the two most-confusable options are also the two longest, which is a *good* sign (the key is not distinguishable from its most realistic distractor by length) |
| 9 | Absolute words | appears satisfied | |
| 10 | Paired/opposite-option patterns | appears satisfied | Options 0/1 are a deliberate, legitimate exact-reversal pair — appropriate for testing this specific confusion, not a stray unintended pairing |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 13.6 Recommended disposition

**Leave unchanged**, with the missing primary-ISCN-text citation (13.3)
flagged as the priority source-completion task for whoever performs formal
source-checking on this item — this is a nomenclature-standard claim, and
the actual standard, not a secondary description of it, is the correct
eventual citation.

## 13.7 Proposed revision

None proposed.

## 13.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** *(ISCN
primary-text citation needed)* · Scientific conclusion accepted/rejected/
revised: **PENDING** · Intended learning objective: **PENDING** · Final
item disposition: **PENDING** · Gate B decisions: **PENDING** · Edition/SOP
sensitivity decision: **PENDING** *(which ISCN edition should be cited)* ·
Proposed wording accepted/rejected/revised: **PENDING** · Austin review
date: **PENDING** · Austin notes: **PENDING**

## 13.9 Independent-review fields (pending)

Reviewer identity: **PENDING** (registry empty) · Qualification/approval
basis: **PENDING** · Review date: **PENDING** · Review scope: **PENDING** ·
Complete independent checklist: **PENDING** · Authorship/conflict
declaration: **PENDING** · Findings: **PENDING** · Approval/rejection:
**PENDING**

---

# Packet-wide summaries

## Independent-review correction round (2026-08-10, session 2)

This section, and every "corrected this round" / "revised this round" note
throughout sections 1–13 above, was added in a second, independent-review
correction pass over the original packet (session 1, 2026-08-10). That
first pass is preserved as history everywhere it was still accurate; where
it was wrong or incomplete, this pass says so explicitly rather than
silently overwriting it. Seven specific findings drove this pass:
`m15-q1` had a defensible second answer (Gate B item 1 defect, now fixed);
`m1-q1`'s Molecular-percentage discrepancy needed resolving against the
primary ASCP guideline; the original "5 of 13 unresolved" source count did
not reconcile with its own summary; four items' source dossiers were
incomplete (`m1-q3`, `m12-q6`, `m16-q1`, `m2-q3`); the "12 of 13 leave
unchanged" disposition table was too permissive given the concerns already
on record; the proposed Austin-review order had a factual error; and the
committed packet had trailing whitespace with an inadequate diff-check.
The corrected disposition table, source-status taxonomy, and all other
packet-wide summaries below reflect the **current, corrected state** —
mechanically recomputed from the 13 per-item sections above, not carried
forward from session 1.

## Final source-provenance correction round (2026-08-10, session 3)

A third, independent, narrowly scoped review found two provenance defects
introduced or left unresolved by the second round (immediately above),
corrected in this pass:

- **`m16-q1`'s SDS source dossier mixed two different pairs of records**
  (Finding 1 of this round): its prose and quoted classification data
  correctly described products 34860 (methanol) and ARK2183 (glacial
  acetic acid), but its recorded "URL" field pointed to the manufacturer
  locators for two *different* products (M3641, A6283) that were never
  actually fetched. Corrected: the dossier (§ 12.3) now records, per
  product, the exact product name/number/brand/CAS/version/revision date
  of the document actually inspected, the exact mirror URL that document
  was fetched from, and the correct canonical manufacturer locator for
  that same product. The prior round's SDS documents (2015/2019) are no
  longer called "current" — this round made eight direct-fetch attempts
  against `sigmaaldrich.com` (all timed out) and could not independently
  confirm whether the current official revision (Austin observed ARK2183
  is now v7.1, revised 2026-03-05) carries identical classification data.
  Source status downgraded from `directly-inspected-and-adequate` to
  `directly-inspected-but-secondary-or-incomplete`. The proposed
  distractor revision (§ 12.7) is retained, re-verified line by line
  against Finding 1's explicit requirements (every distractor remains
  false as a complete claim, not merely incomplete; "flammable/toxic" and
  "corrosive" are not treated as mutually exclusive since both chemicals
  are independently flammable; exactly one fully-correct option remains;
  every feedback string rebuts its own option's literal claim; option
  lengths recalculated precisely as 62/62/68/56 characters).
- **`m1-q3` overstated what 42 CFR §§ 493.1276 and 493.1253 establish**
  (Finding 2 of this round): the second round's dossier claimed these two
  CLIA sections "directly and specifically" support the claim that
  colcemid time, KCl molarity, and cell-count targets are
  laboratory/SOP-validated rather than externally fixed. Direct inspection
  of both sections in full this round (§ 3.3) confirms they establish only
  general documentation/validation duties (banding-quality documentation
  and appropriate-resolution determination; general performance-
  specification verification) — neither names or addresses reagent-
  exposure-time or hypotonic-molarity parameters specifically. A further
  search this round (the same specialist cytogenetics site used elsewhere
  in this packet, and a CAP validation-and-verification checklist, both
  directly fetched) also did not adequately establish the item's narrow
  claim. Corrected: `m1-q3` is marked `source unresolved` (not
  `directly-inspected-and-adequate`); its disposition reverts from "Edit
  in place" to "Leave unchanged"; the prior round's CLIA-grounded proposed
  feedback revision is withdrawn rather than left in place with an
  inaccurate citation; confidence is lowered; and the unresolved-source
  limitation is restored and stated plainly, not described as "closed."

Both corrections were made only after directly reproducing the finding
(genuine WebFetch/Read-tool inspection of the actual sources named above),
not by assuming the reviewer's premise. The packet-wide totals below are
recomputed a second time to reflect these two changes on top of the second
round's corrections.

## Source-status taxonomy (Finding 3)

Every item now carries exactly one of four mutually exclusive labels,
applied per-item in each item's own § *N*.3 "Source status (taxonomy)"
row. A WebSearch result summary is never counted as "directly inspected" —
only a genuine fetch-and-read of the actual source text counts.

- **`directly-inspected-and-adequate`** — the actual source text was
  fetched and read this correction round (or, for `m4-q1`/`m6-q1`/`m6-q4`,
  in session 1, with the fetch quoted verbatim), and the source itself is a
  primary/official/authoritative reference for the claim.
- **`directly-inspected-but-secondary-or-incomplete`** — the actual source
  text was fetched and read, but the source itself is a non-official,
  independently-authored, or single-institution secondary reference, or
  only partially covers the claim.
- **`repository-source-appropriate`** — the claim is about this
  application's own behavior; this repository's own docs/implementation
  are the correct and sufficient source type.
- **`source unresolved`** — no source adequate to the claim was directly
  inspected this session; a real, named gap remains, not filled by
  inference.

| ID | Source status | Notes |
| --- | --- | --- |
| `m1-q1` | `source unresolved` | Content resolved via Austin-supplied primary-source citation (§ 1.3), not by this document's own inspection — see that section for the distinction |
| `m1-q2` | `repository-source-appropriate` | This repository's own `README.md`/`docs/ARCHITECTURE.md` and implementation |
| `m1-q3` | **`source unresolved`** *(corrected this round, was `directly-inspected-and-adequate`)* | 42 CFR §§ 493.1276/493.1253, and two further searched sources, were directly inspected but none adequately establishes the item's specific narrow claim (§ 3.3, Finding 2) |
| `m2-q1` | `directly-inspected-but-secondary-or-incomplete` | Meadville Medical Center's own specimen-requirement page, directly fetched, but one hospital's local policy, not a national standard |
| `m2-q3` | `directly-inspected-and-adequate` | Joint Commission NPSG.01.01.01, primary document directly fetched this round (§ 5.3) |
| `m4-q1` | `directly-inspected-but-secondary-or-incomplete` | `cytogenetics.mlsascp.com`, directly fetched, independently-authored specialist supplement |
| `m6-q1` | `directly-inspected-but-secondary-or-incomplete` | Same site, single source only |
| `m6-q4` | `directly-inspected-but-secondary-or-incomplete` | Same site, closest one-to-one match found in the pilot |
| `m7-q2` | `source unresolved` | No source located for the exact three-term hierarchy; quarantined |
| `m12-q6` | `directly-inspected-and-adequate` | Kang et al. 2016, *Chin J Cancer*, PMC4896164, one specific peer-reviewed locator directly fetched this round (§ 10.3) |
| `m15-q1` | `directly-inspected-and-adequate` | Wolff et al. 2007, *J Mol Diagn*, PMC1867444, full text directly fetched this round (§ 11.3) |
| `m16-q1` | **`directly-inspected-but-secondary-or-incomplete`** *(corrected this round, was `directly-inspected-and-adequate`)* | Genuine primary Sigma-Aldrich SDS content, but from third-party 2015/2019 mirrors with an unconfirmed currency gap against the current manufacturer revision (§ 12.3, Finding 1) |
| `final-q33` | `directly-inspected-but-secondary-or-incomplete` | Same specialist site; ISCN primary text itself not accessed |

**Mechanically recomputed totals (this round): 3 of 13
`directly-inspected-and-adequate` (`m2-q3`, `m12-q6`, `m15-q1`); 6 of 13
`directly-inspected-but-secondary-or-incomplete` (`m2-q1`, `m4-q1`,
`m6-q1`, `m6-q4`, `m16-q1`, `final-q33`); 1 of 13
`repository-source-appropriate` (`m1-q2`); 3 of 13 `source unresolved`
(`m1-q1`, `m1-q3`, `m7-q2`).** 3+6+1+3 = 13, matching
`FROZEN_PILOT_MANIFEST` exactly, counted by distinct stable ID. **This is a
second correction to these totals** (Finding 2 of this round moved `m1-q3`
from `directly-inspected-and-adequate` to `source unresolved` after
independent review found the prior round's CLIA citation did not establish
what it was cited for; Finding 1 of this round moved `m16-q1` from
`directly-inspected-and-adequate` to `directly-inspected-but-secondary-or-
incomplete` after independent review found an unresolved SDS-currency gap).
The prior round's totals (5/5/1/2) are superseded by the totals above.

## Disposition table (13 rows, recomputed this round)

| ID | Disposition | Primary open item |
| --- | --- | --- |
| `m1-q1` | Leave unchanged | Resolved this round via Austin-supplied primary-source figures (§ 1.3/1.6); this document's own PDF fetch still fails (403) |
| `m1-q2` | Leave unchanged | None material |
| `m1-q3` | **Leave unchanged** *(reverted this round, was Edit in place)* | Source unresolved (§ 3.3); the prior round's proposed feedback revision is withdrawn because it overstated what its cited CLIA sections establish (Finding 2) |
| `m2-q1` | Leave unchanged | None material |
| `m2-q3` | Leave unchanged | None material |
| `m4-q1` | Leave unchanged | None material |
| `m6-q1` | Leave unchanged | Length/pairing concerns resolved this round with evidence-backed explanations (§ 7.5), no revision needed |
| `m6-q4` | Leave unchanged | No public official (e.g. CAP) citation located; specialist site remains the closest match found |
| `m7-q2` | **Quarantine pending evidence** | No source confirms the exact three-term nested hierarchy |
| `m12-q6` | **Edit in place (structural only)** | Stray empty-feedback-key removal proposed (§ 10.7); zero learner-visible content change |
| `m15-q1` | **Edit in place** | Option 2 and its feedback revised (§ 11.7) — former option had a second defensible answer (Finding 1, prior round) |
| `m16-q1` | **Edit in place** *(retained this round, source dossier corrected)* | Distractors 0/2/3 and feedback revised and re-verified (§ 12.7), grounded in directly-inspected but currency-unconfirmed SDS data (§ 12.3) |
| `final-q33` | Leave unchanged | ISCN primary text itself not directly inspected (paywalled); secondary source adequate for now |

**Recomputed totals: 9 of 13 items Leave unchanged (`m1-q1`, `m1-q2`,
`m1-q3`, `m2-q1`, `m2-q3`, `m4-q1`, `m6-q1`, `m6-q4`, `final-q33`). 3 of 13
items Edit in place (`m12-q6`, `m15-q1`, `m16-q1`), each with a complete
proposed revision in its own § *N*.7. 1 of 13 items Quarantine pending
evidence (`m7-q2`).** 9+3+1 = 13. **This is a second correction to these
totals** — `m1-q3` moves back from "Edit in place" to "Leave unchanged"
this round (Finding 2); `m16-q1` stays "Edit in place" with its source
dossier corrected rather than its disposition changed (Finding 1). No item
is recommended for "Supersede with a new stable ID" or "Insufficient
evidence to recommend" — every proposed revision preserves its item's
stable ID, stem, rationale, and keyed answer, changing only a distractor,
its feedback, or (for `m12-q6`) a non-displayed data key.

## Sources used, grouped by authority level (recomputed this round)

**1. Current primary standards / official examination guidance:**
- ASCP BOC *CG(ASCP) and CG(ASCPi) Examination Content Guideline*, rev.
  2025-09-25 (`m1-q1` — Austin-supplied figure relied upon this round;
  this document's own fetch still returns 403, three attempts)
- The Joint Commission, *National Patient Safety Goals — Effective January
  2026 for the Laboratory Program*, NPSG.01.01.01 (`m2-q3` — primary PDF
  directly fetched and quoted this round)

**2. Primary federal/regulatory text, directly inspected but not adequate
to the specific narrow claim cited (`m1-q3`), and primary manufacturer SDS
documents with an unresolved currency gap (`m16-q1`):**
- 42 CFR § 493.1276, "Standard: Clinical cytogenetics," and § 493.1253,
  "Standard: Establishment and verification of performance specifications"
  (CLIA) (`m1-q3` — both directly fetched in full this round; neither
  establishes that colcemid time/KCl molarity/cell-count targets
  specifically are laboratory-validated rather than externally fixed — see
  § 3.3, Finding 2. `m1-q3` is accordingly labeled `source unresolved`, not
  listed under tier 1/3 above)
- Manufacturer Safety Data Sheets, Sigma-Aldrich: Methanol, Product 34860,
  Version 6.4, Revision Date 03/13/2015; Acetic acid glacial, Product
  ARK2183, Version 6.1, Revision Date 10/17/2019 (`m16-q1` — genuine
  primary content, directly read via third-party archival mirrors this
  session; the current manufacturer revision — observed by Austin to now
  be ARK2183 v7.1, revised 2026-03-05 — was not independently confirmed
  this round despite eight direct-fetch attempts against
  `sigmaaldrich.com`; see § 12.3)

**3. Peer-reviewed primary literature, directly inspected:**
- Kang ZJ, et al., "The Philadelphia chromosome in leukemogenesis,"
  *Chinese Journal of Cancer*, 2016, PMC4896164 (`m12-q6` — full text
  directly fetched this round, one specific locator)
- Wolff DJ, et al., "Guidance for Fluorescence in Situ Hybridization
  Testing in Hematologic Disorders," *J Mol Diagn* 2007;9(2):134–143,
  PMC1867444, DOI 10.2353/jmoldx.2007.060128 (`m15-q1` — full text
  directly fetched twice this round)

**4. Established specialist references / this repository's own
documentation:**
- This repository's own `README.md`/`docs/ARCHITECTURE.md` (`m1-q2` —
  explicitly appropriate for a repository-behavior question)
- `cytogenetics.mlsascp.com` ("CG - Cytogenetics," independently authored
  by Brett M. Rice, explicitly a *supplement* to the official ASCP BOC
  reading list, not an ASCP publication) — the single most-used source in
  this packet (`m4-q1`, `m6-q1`, `m6-q4`, `final-q33`)
- Meadville Medical Center's own public specimen-requirement page, directly
  fetched (`m2-q1`); OhioHealth/Wake Forest Baptist corroborating search
  snippets only, not separately fetched

**Not used / not locatable in accessible public form this session:** the
*AGT Cytogenetics Laboratory Manual* (Wiley/Association of Genetic
Technologists — subscription-gated); an official CAP Cytogenetics
Checklist (member/subscriber-gated); the ISCN 2024 book itself (Karger,
purchased publication); the ASCP BOC content-guideline PDF itself (403
Forbidden on every direct-fetch attempt, three rounds now). **New this
round:** `sigmaaldrich.com` was not reachable by this session's tooling at
all this round — eight separate direct-fetch attempts (both the incorrect
M3641/A6283 URLs the prior round cited and the corrected
34860/`sigald`-`ark2183` URLs) all timed out, so the current official
methanol-34860 and acetic-acid-ARK2183 SDS revisions could not be directly
confirmed this round (`m16-q1`, § 12.3).

## Unresolved source questions (recomputed this round, strict definition)

Strictly the items labeled `source unresolved` in the taxonomy above — now
**three**, not two, after this round's Finding 2 correction. This remains
the mechanically correct count; see the taxonomy table for why the
session-1 packet's original "5 of 13" figure was wrong, and why the
immediately preceding round's "2 of 13" figure is itself now corrected to
3.

1. **`m7-q2`** — no source located confirms the exact
   "countable > analyzable > karyotypable" three-term nested hierarchy.
   Quarantined pending evidence.
2. **`m1-q1`** — this document's own tooling cannot directly fetch the
   primary ASCP PDF (403 Forbidden, three attempts across two rounds); the
   item's content is treated as resolved only via Austin's directly
   supplied primary-source figures (§ 1.3), a distinct and narrower
   resolution than this document independently verifying the source
   itself.
3. **`m1-q3`** *(newly added this round, per Finding 2)* — 42 CFR §§
   493.1276 and 493.1253 were directly inspected in full but establish
   only general validation/documentation duties, not the specific claim
   that colcemid time, KCl molarity, or cell-count targets are
   laboratory/SOP-validated rather than externally fixed; a further search
   of a specialist cytogenetics site and a CAP validation checklist,
   directly inspected this round, also did not adequately establish that
   narrow claim (§ 3.3). The prior round's `directly-inspected-and-adequate`
   label and its CLIA-grounded proposed revision are both withdrawn.

**Separately, six items carry a directly-inspected but secondary/
incomplete source** (`m2-q1`, `m4-q1`, `m6-q1`, `m6-q4`, `m16-q1`,
`final-q33` — see the taxonomy table above) — each has adequate direct
evidence for its narrow claim (for `m16-q1`, genuine primary SDS content
with an unconfirmed currency gap, not a search-snippet gap), and none is
"unresolved" in the sense of the three items above; a stronger or more
current formal citation would still improve each for eventual
`QUESTION_GOVERNANCE` entry.

## Questions needing the most Austin judgment (recomputed this round)

Ranked by remaining judgment burden after this round's corrections — most
prior judgment calls were resolved to a concrete revision or an
evidence-backed explanation (Finding 5), so this list is shorter than
session 1's:

1. **`m7-q2`** — still the quarantined item; needs Austin's direct domain
   knowledge to confirm or correct the terminology itself, likely faster
   than further literature search.
2. **`m1-q3`** *(re-added this round)* — genuinely needs Austin's own
   domain expertise: is "colcemid time/KCl molarity/cell-count targets are
   laboratory/SOP-validated" a fact he recognizes as standard cytogenetics
   practice (in which case he can approve a revision grounded in his own
   confirmation rather than a citation), or does he want further sourcing
   first (§ 3.3, § 3.7)?
3. **`m12-q6`, `m15-q1`, `m16-q1`** — each now carries a complete proposed
   revision (§ *N*.7); Austin's judgment is accept / reject / revise on
   specific proposed text. For `m16-q1` specifically, also confirm whether
   the current (2026) manufacturer SDS revision changes any classification
   used (§ 12.3).
4. **`m6-q4`** — the difficulty-tag question (§ 8.2, whether it should be
   difficulty ≥2) remains open and unaffected by this round's sourcing
   work.

## Questions likely safe to leave unchanged (recomputed this round)

`m1-q1`, `m1-q2`, `m1-q3`, `m2-q1`, `m2-q3`, `m4-q1`, `m6-q1`, `m6-q4`,
`final-q33` — matching the disposition table's "Leave unchanged" rows
exactly (`m1-q3` re-added this round). Each has at least one
directly-inspected or multiply-corroborated source *or*, for `m1-q1` and
`m1-q3` specifically, an explicitly documented sourcing limitation rather
than a false claim of adequacy; each has a single clearly defensible
keyed answer, and no open Gate B concern left unresolved to a concrete
explanation. `m4-q1` remains the strongest positive example (perfectly
length-balanced, zero possible length cue, clean sourcing).

## Questions likely requiring revision (recomputed this round)

**`m12-q6`, `m15-q1`, `m16-q1`** — matching the disposition table's "Edit
in place" rows exactly (`m1-q3` removed this round — its prior-round
proposed revision is withdrawn per Finding 2, see the "Unresolved source
questions" section above). This still replaces session 1's original "None,
on this document's preliminary analysis" claim, which the first correction
round found too permissive (Finding 5). Each item's own § *N*.7 contains
the complete proposed revision for Austin's accept/reject/revise decision;
none of the three proposed revisions changes a stem, rationale, keyed
answer, or stable ID.

## Questions potentially requiring supersession or quarantine

- **`m7-q2`** — recommended **Quarantine pending evidence** (source gap,
  not a suspected content error). Unchanged this round.
- No item is recommended for supersession (a new stable ID) — every
  proposed revision this round preserves its item's assessed intent
  exactly.

## Proposed order for Austin's review (Finding 6 correction)

Deliberately not easiest-first — starts with a small mix chosen to
pressure-test the review process itself before committing to a fixed order
for the rest. **Correction (this round): the session-1 list wrongly
labeled `m4-q1` "(already covered above)" among the remaining ten items —
`m4-q1` was never among the first three. That incorrect note is removed
below; all 13 stable IDs now appear exactly once, matching
`FROZEN_PILOT_MANIFEST`.**

1. `m2-q1` — simple, cleanly sourced, a good process warm-up.
2. `m7-q2` — the hardest case, reviewed early rather than saved for last,
   so any needed re-research can happen while the rest of the review is
   still in progress rather than blocking the very end.
3. `m6-q4` — the best-sourced, most complex item (negative stem, richest
   source match) — a good test of whether the packet's format holds up for
   a "everything mostly works" case, not just simple ones.
4. Remaining 10 items in canonical frozen-pilot order: `m1-q1`, `m1-q2`,
   `m1-q3`, `m2-q3`, `m4-q1`, `m6-q1`, `m12-q6`, `m15-q1`, `m16-q1`,
   `final-q33`. Several of these ten carry either a proposed revision
   requiring an accept/reject/revise decision, or an unresolved sourcing
   question requiring Austin's own domain judgment rather than a text
   revision — see "Questions needing the most Austin judgment" above for
   the current, corrected list of which is which, so Austin can budget
   time accordingly without this list reordering the canonical pass
   itself.

## Estimated review burden per question (recomputed this round)

**Planning estimates only — not measured, not a commitment, and likely to
be wrong in either direction once Austin actually starts. Updated this
round where sourcing work is now complete but a proposed revision now
needs a decision instead:**

| ID | Estimate | Basis |
| --- | ---: | --- |
| `m1-q2` | 5–10 min | Repo-behavior fact, already directly verifiable |
| `m2-q1` | 10–15 min | Clean single-answer clinical fact |
| `m2-q3` | 10–15 min | Primary NPSG document now directly inspected; clean single-answer safety standard |
| `m4-q1` | 10–15 min | Clean, well-sourced, no flags |
| `m6-q1` | 10–15 min | Length/pairing concerns resolved this round with explanations, no revision to review |
| `m1-q1` | 10–15 min | Resolved this round via Austin-supplied figure; confirm the § 1.3 caveat reads clearly |
| `m12-q6` | 10–15 min | Peer-reviewed locator now in hand; review is a one-line structural-cleanup accept/reject |
| `final-q33` | 15–20 min | ISCN primary-text check still recommended |
| `m1-q3` | 15–20 min | No revision to review; confirm whether Austin's own domain knowledge can resolve the source-unresolved gap (§ 3.3/3.7) faster than further search |
| `m16-q1` | 15–20 min | Review the proposed distractor/feedback revision (§ 12.7) against the SDS data; separately confirm whether the current (2026) manufacturer SDS revision changes anything (§ 12.3) |
| `m15-q1` | 20–25 min | Review the proposed option-2/feedback revision (§ 11.7) against Wolff et al.; this is the item with the corrected scientific error (Finding 1) |
| `m6-q4` | 20–25 min | Richest item; difficulty-tag question; CAP citation search |
| `m7-q2` | 40+ min | Source resolution likely requires Austin's own expertise or new research, not just review |

**Total planning estimate: roughly 3–4 hours across all 13 items**,
excluding any time spent actually populating `QUESTION_GOVERNANCE` records
or applying accepted revisions once Austin's conclusions are final
(separate, later steps).

## Stop/go recommendation (recomputed this round)

**Recommendation: proceed to Austin's question-by-question review of this
corrected packet, focusing first on the one still-quarantined item
(`m7-q2`), the three items now carrying a concrete proposed revision
(`m12-q6`, `m15-q1`, `m16-q1`), and `m1-q3`'s newly restored unresolved
sourcing question. Do not proceed to actual content editing,
`QUESTION_GOVERNANCE` population, or any lifecycle promotion until that
review is complete for all 13 items** — including the nine "Leave
unchanged" items, which still need Austin's explicit sign-off per the
pending fields in each item's sections 8–9, not just this document's
preliminary analysis.

This document has now been through two independent-review correction
rounds. The first found one genuine scientific/item-validity error
(`m15-q1`, Finding 1), one important primary-source resolution (`m1-q1`,
Finding 2), a source-accounting error in the original packet's own counts
(Finding 3), four incomplete source dossiers apparently closed with
directly-inspected sources (Finding 4), several deferred judgment calls
made concrete (Finding 5), one review-order factual error (Finding 6), and
one committed whitespace/diff-check defect (Finding 7). **This second
round found that two of the first round's own "closed" source dossiers
were themselves flawed**: `m16-q1`'s SDS citation mixed the URLs of one
pair of products with the metadata of a different pair (Finding 1 of this
round — corrected, with the underlying scientific content retained but its
source status downgraded and a currency gap honestly flagged), and
`m1-q3`'s CLIA citation was invoked for a specific claim its cited sections
do not actually make (Finding 2 of this round — corrected by withdrawing
the over-attributed proposed revision and restoring `source unresolved`).
**This pattern is itself worth Austin's attention: an AI-assisted
correction round can introduce its own new provenance errors while fixing
prior ones, which is exactly why an independent, human, second-person
review — not a further AI-assisted pass — is the appropriate next step,
not a third self-correction cycle.** **None of this constitutes SME
review, independent review, or `QUESTION_GOVERNANCE` population — the
approved-independent-reviewer registry remains empty, all 153 questions
remain `draft`, and no item in this pack, however clean its analysis, can
reach `release-qualified` until that separate, real second-person review
exists.**
