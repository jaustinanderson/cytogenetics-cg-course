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
| Retrieved | Existence, title, and September 25, 2025 revision date confirmed via web search 2026-08-10. A direct fetch of the PDF itself, attempted 2026-08-10, returned **HTTP 403 Forbidden** — the PDF's exact percentage table was **not directly re-inspected by this document**. |
| Directly inspected? | **No, not by this document.** This repository's own `README.md` and `docs/SCIENTIFIC_REVIEW.md` already cite this exact guideline, dated and linked, as the basis for the "Course coverage" percentage table — that is an existing, separate repository citation, not established fresh here. |
| Narrow claim supported | That an ASCP BOC content guideline exists, is dated September 25, 2025, and defines four weighted content domains for this exam — confirmed. The *exact* percentage figures were not independently re-verified against the primary PDF by this document (see limitation below). |
| Edition/jurisdiction sensitivity | High — ASCP revises this guideline periodically; the rationale's percentages are only accurate for the currently cited revision. |
| Unresolved problem | **A source discrepancy was found and is NOT resolved.** A secondary, non-ASCP study-aid site (`cytogenetics.mlsascp.com/ascp-boc.html`, an independently authored exam-prep resource explicitly positioned as a *supplement* to, not a republication of, the official ASCP BOC reading list) states the domain ranges as Specimen 20–25%, **Molecular 15–20%**, Analysis/Imaging 45–50%, Operations 10–15%. This repository's existing citation (`README.md`) states Molecular as **15–25%**. The Analysis/Imaging, Specimen, and Operations figures agree across both; only the Molecular range differs by its lower bound (20% vs. 25%). This document could not resolve which is current because the primary PDF was not directly fetchable this session. **This is exactly the kind of discrepancy Austin should resolve by opening the primary PDF directly**, not by this document guessing. |

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

**Leave unchanged**, pending Austin's direct confirmation of the current
Molecular-domain percentage range against the primary ASCP guideline (a
source-verification task, not a content-rewrite task — this item's own text
does not spell out the disputed figure).

## 1.7 Proposed revision

None proposed. The item's content is not the source of the open question;
the open question is which published percentage table is current, and that
is resolved by inspecting a document, not by editing this item.

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
| Title | CLIA regulatory framework for laboratory-developed test validation (general principle, not a single named document) |
| Publisher | Centers for Medicare & Medicaid Services (CMS), administering 42 CFR Part 493 (CLIA) |
| Edition/date | Current CLIA regulatory framework; specific secondary summary consulted 2026-08-10 |
| Locator | CMS CLIA LDT validation FAQ; general summary of 42 CFR § 493.1253 analytical-validation requirements |
| URL | `https://www.cms.gov/regulations-and-guidance/legislation/clia/downloads/ldt-and-clia_faqs.pdf` (CMS FAQ, general summary consulted, not the full regulation text) |
| Retrieved | 2026-08-10 |
| Directly inspected? | A CMS FAQ summary was directly reviewed via search result; the full regulation text (42 CFR § 493.1253) itself was **not** separately opened this session. |
| Narrow claim supported | CLIA analytical validation is performed and is only meaningful *within* the specific laboratory, staff, equipment, and patient population that validated it — supporting the general principle that a numeric procedural parameter is locally validated, not a universal constant. |
| Edition/jurisdiction sensitivity | Applies to U.S. CLIA-certified laboratories; a learner practicing outside U.S. CLIA jurisdiction would need the locally equivalent framework (e.g., a different national accreditation body) — not addressed by this source. |
| Unresolved problem | **This is a general CLIA validation principle, not a cytogenetics-specific citation.** The ideal source for this exact claim would be a cytogenetics-specific specialist reference (e.g., the *AGT Cytogenetics Laboratory Manual*, current edition, Wiley/Association of Genetic Technologists) confirming that colcemid exposure time, hypotonic molarity, and cell-count targets are conventionally treated as SOP-validated ranges in practice, not fixed values. That reference's existence was confirmed via search, but its text is **subscription-gated (Wiley Online Library)** and was **not directly inspected** this session. Marked as a genuine, named gap, not filled by inference. |

## 3.4 Scientific-analysis proposal

The keyed answer is directionally well-supported by the general regulatory
principle found, and is consistent with how this repository's own
`docs/ROADMAP.md`/`docs/CONTENT_GOVERNANCE.md` already talk about
edition-/SOP-sensitive content throughout. One nuance worth Austin's
attention: distractor 3 ("A regulatory requirement") is *almost* defensible
in a different sense — CLIA **does** regulate that a laboratory *must*
validate and document such parameters, so a learner could argue "it IS
regulated." The distractor is correct as **currently scoped** (the exact
numeric *value* is not fixed by regulation; only the *duty to validate* is)
but this is a genuinely subtle distinction that a strong learner might
contest. Not a defect, but worth Austin's explicit confirmation that the
distinction reads clearly rather than as a trick. No unsupported absolute
wording. **Confidence: moderate** — content direction is well-supported;
the cytogenetics-specific citation gap (above) is the main open item.
**Austin must independently evaluate this conclusion**, including the
subtle-distractor point.

## 3.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | With the nuance in 3.4 noted |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | possible concern | Distractor 3's subtlety (3.4) — plausible in a way that could confuse rather than only test understanding; Austin judgment requested |
| 4 | Parallel construction | appears satisfied | All four are noun-phrase characterizations |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | appears satisfied | Key is tied-longest with option 0, not uniquely longest |
| 9 | Absolute words | appears satisfied | "universal," "exactly" appear in a *wrong* option, correctly used to signal implausibility, not in the key |
| 10 | Paired/opposite-option patterns | possible concern | Options 0 and 3 both gesture at "fixed/universal," options 1 and 2 both gesture at "not fixed" — a possible two-pair structure worth a second look, though not an obvious "pick one of these two" telegraph |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | Content itself not deemed unsupportable; only the specialist citation is incomplete |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 3.6 Recommended disposition

**Leave unchanged**, with the specialist-source gap (3.3) flagged as the
open item for whoever performs formal source-checking, and items 3/10 above
flagged for Austin's Gate B attention. None of this indicates a scientific
error — only an incomplete citation and two judgment calls a human reviewer
should make deliberately.

## 3.7 Proposed revision

None proposed. If Austin's review concludes distractor 3 needs
disambiguation, that would be a targeted wording change to option 3 and/or
its feedback only — not attempted here without that judgment call.

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
| 8 | Conspicuously longer/more-qualified correct answer | possible concern | `uniquely-longest`, though only marginally (26 vs. 19/25/20) — Gate A/bank-level judgment, not flagged as a content defect |
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
| Title | National Patient Safety Goal NPSG.01.01.01 — "Use at least two patient identifiers" |
| Publisher | The Joint Commission |
| Edition/date | Current standing goal; standards-interpretation FAQ pages consulted 2026-08-10 |
| Locator | NPSG.01.01.01, specimen-labeling/collection application |
| URL | `https://www.jointcommission.org/en-us/knowledge-library/support-center/standards-interpretation/standards-faqs/000001463` |
| Retrieved | 2026-08-10 |
| Directly inspected? | Reviewed via search-result summary of the official Joint Commission standards-FAQ page; the FAQ page itself was not separately re-fetched in full this session (summary quality is high and directly attributable to the named official page, but full independent re-fetch was not performed). |
| Narrow claim supported | At least two patient identifiers are required when collecting a specimen, and specimen containers must be labeled with two identifiers in the patient's presence; room number/location is explicitly *not* an acceptable identifier. |
| Edition/jurisdiction sensitivity | Applies to Joint Commission–accredited U.S. facilities; other accreditors/countries may phrase the requirement differently, though "at least two independent identifiers" is a broadly convergent international patient-safety norm (not independently verified outside the U.S. context this session). |
| Unresolved problem | None material — this is a well-established, widely publicized safety standard; the specific "two independent identifiers" framing matches the question directly. |

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
| 8 | Conspicuously longer/more-qualified correct answer | possible concern | `uniquely-longest` and by a wide margin (50 vs. 32/12/13 chars) — the key is nearly 4× the shortest distractor. This is the most pronounced length gap of any item in this pilot batch and merits explicit Gate B attention, though the extra length is substantive ("e.g., 10×" qualifier), not filler |
| 9 | Absolute words | appears satisfied | |
| 10 | Paired/opposite-option patterns | possible concern | Options 2 and 3 are a clean "same power for both" pair (10× vs. 100×) — a plausible telegraph that "the answer differs between the two" once a learner notices 2 and 3 are a matched pair; worth Austin's eye |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 7.6 Recommended disposition

**Leave unchanged**, with the length gap (item 8) and paired-option pattern
(item 10) explicitly flagged for Austin's Gate B judgment — this is
precisely the kind of item-level call Gate B exists for, and this packet
does not treat either observation as disqualifying on its own.

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
| 11 | "All/none," negative stems | possible concern | The stem is a **negatively phrased "does NOT include"** item. It is clearly marked (capitalized "NOT"), matching the rubric's own requirement that negative stems be "clearly marked as such" — appears to already satisfy the rubric's own stated bar, flagged here only so Austin explicitly confirms it, per the rubric's own emphasis on this exact pattern |
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
| Title | Multiple converging sources on t(9;22)/BCR-ABL1 structural cytogenetics (no single title — see below) |
| Publisher | PLOS Genetics; PMC (PubMed Central, NIH); ScienceDirect Topics (Elsevier) |
| Edition/date | Peer-reviewed literature, various publication dates; consulted via search 2026-08-10 |
| Locator | General overview statements on t(9;22)(q34;q11.2) reciprocal translocation products |
| URL | e.g., `https://journals.plos.org/plosgenetics/article?id=10.1371%2Fjournal.pgen.1005144`; `https://www.sciencedirect.com/topics/biochemistry-genetics-and-molecular-biology/philadelphia-chromosome`; `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4412790/` |
| Retrieved | 2026-08-10 |
| Directly inspected? | Reviewed via search-result summaries drawing directly from these named peer-reviewed/PMC sources; full-text of any single article was **not** separately opened and re-read in full this session — summary-level inspection only. |
| Narrow claim supported | The Philadelphia chromosome is the derivative chromosome 22 (the smaller reciprocal product) carrying the BCR-ABL1 fusion, produced by t(9;22)(q34;q11.2); the reciprocal der(9) is the other, larger product. Multiple independent peer-reviewed-literature-derived summaries converge on this exactly. |
| Edition/jurisdiction sensitivity | None — this is a foundational, stable structural-cytogenetics fact (first described by Nowell and Hungerford, 1960; molecularly characterized by Rowley, 1973), not subject to edition/jurisdiction variation. |
| Unresolved problem | Summary-level (not full-text) inspection only, as noted above — a stronger citation would name one specific peer-reviewed source with an exact locator (e.g., a specific review article and page/section) rather than converging general summaries. Low practical risk given how well-established and undisputed this specific fact is in the field. |

## 10.4 Scientific-analysis proposal

Keyed answer is correct and well-established; not a disputed or
edition-sensitive fact. Distractors are each wrong for a specific, correct
reason. **One structural/authoring observation, not a scientific one:** the
wrong-answer-feedback object carries an explicit but **empty string** keyed
to index `1` — the correct answer's own index. Functionally harmless (the
correct answer does not need "wrong" feedback and the UI does not display
this), but it is untidy authored data that a rewrite or governance
source-check pass should clean up (drop the stray `"1": ""` key entirely)
per Gate B item 13's alignment concern. **Confidence: high** on the
scientific content; this is a trivial housekeeping note, not a defensibility
concern.

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
| 13 | Rationale/feedback alignment | possible concern | Stray empty-string feedback entry keyed to the correct answer's own index (10.4) — minor housekeeping, not a content defect |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 10.6 Recommended disposition

**Leave unchanged**, with the stray empty-string feedback key (10.4/item
13) noted as a minor, low-priority cleanup item for whoever next edits this
question's data — not a reason to change disposition on its own, and
explicitly not proposed as a content rewrite here.

## 10.7 Proposed revision

None proposed for content. If Austin wants the stray `"1": ""` key removed
as routine hygiene, that is a zero-content-impact structural cleanup, not a
scientific revision, and can be done independently of this packet's review
cycle.

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
| Title | "Guidance for Fluorescence in Situ Hybridization Testing in Hematologic Disorders" |
| Publisher | *The Journal of Molecular Diagnostics* (official journal of the Association for Molecular Pathology, published by Elsevier) |
| Edition/date | Peer-reviewed guidance article; exact publication year not independently re-confirmed this session |
| Locator | General guidance content on interphase FISH's non-culture-dependent, rapid-enumeration use case, and its regulatory-context relationship to CLIA/ACMG/CAP |
| URL | `https://www.jmdjournal.org/article/S1525-1578(10)60373-X/fulltext` |
| Retrieved | 2026-08-10 |
| Directly inspected? | Reviewed via search-result summary drawing from this named peer-reviewed guidance article; the full article was **not** separately opened and read in full this session. |
| Narrow claim supported | Interphase FISH's major advantage is that it works on non-dividing/interphase cells without requiring cell culture, enabling faster, more numerous cell analysis than metaphase-dependent methods — directly matching the keyed answer and rationale. |
| Edition/jurisdiction sensitivity | Low for the core biological/technical claim; FISH panel-specific regulatory guidance can evolve, not directly relevant to this item's narrow claim. |
| Unresolved problem | Summary-level inspection only (same limitation noted for `m12-q6`). This is nonetheless a genuinely authoritative, on-topic, official-society-journal source (AMP/JMD), a stronger citation tier than the independently-authored study-site sources used for several other items in this batch. A full-text re-read with an exact page/section locator would still strengthen the eventual formal `QUESTION_GOVERNANCE` citation. |

## 11.4 Scientific-analysis proposal

Keyed answer is well-supported by an authoritative, on-topic peer-reviewed
guidance source. Each distractor represents a real, common overclaim about
FISH that the rationale/feedback correctly and specifically rejects (no
morphology without metaphase; targeted, not general-screening, detection;
complements rather than replaces karyotyping) — genuinely well-constructed
distractors that test understanding of FISH's actual scope, not just its
one advantage. No unsupported absolute wording ("replaces all karyotyping"
appears in a *wrong* option, correctly flagged as false). **Confidence:
high.**

## 11.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | appears satisfied | Each is a real, common misconception about FISH's scope |
| 4 | Parallel construction | appears satisfied | All four complete "...because it:" as a verb-phrase claim |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | possible concern | `uniquely-longest` (53 vs. 32/40/24 chars) — the key is the longest option by a clear margin; Gate A/Gate B judgment, the extra length reflects two genuine substantive claims (no culture + fast enumeration) rather than obvious padding |
| 9 | Absolute words | appears satisfied | "all" appears in a wrong option (3), correctly signaling implausibility |
| 10 | Paired/opposite-option patterns | appears satisfied | |
| 11 | "All/none," negative stems | not applicable | Option 3 uses "all" but is not an "all of the above"-style option |
| 12 | Implausible padding | appears satisfied | Key's extra length is substantive, not filler |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 11.6 Recommended disposition

**Leave unchanged**, with the length gap (item 8) flagged for Austin's
Gate B attention, consistent with this packet's general practice of not
treating a single item's length signal as disqualifying on its own.

## 11.7 Proposed revision

None proposed.

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
| Title | Multiple safety-data/reference sources on Carnoy's/methanol:acetic-acid fixative composition and hazard classification |
| Publisher | Various — a university teaching-lab fixative reference (Lewis University), a chemical-safety-data aggregator (LobaChemie MSDS), general chemical-hazard references | 
| Edition/date | Various; consulted via search 2026-08-10 |
| Locator | General fixative-composition and hazard-classification statements |
| URL | e.g., `https://www.lewisu.edu/academics/biology/pdf/Carnoy%20Fixative.pdf`; `https://www.lobachemie.com/lab-chemical-msds/MSDS-carnoys-solution-02558-EN.aspx` |
| Retrieved | 2026-08-10 |
| Directly inspected? | Reviewed via search-result summaries; no single manufacturer/vendor Safety Data Sheet for methanol and glacial acetic acid specifically was opened and read in full this session — this claim rests on **converging general chemical-safety knowledge** (methanol: flammable, toxic; glacial acetic acid: corrosive) rather than one directly-inspected primary SDS. |
| Narrow claim supported | Methanol is classified as flammable and toxic; glacial acetic acid is classified as corrosive — both are standard, well-established, uncontroversial hazard classifications for these two specific, widely used chemicals. |
| Edition/jurisdiction sensitivity | Low — these are basic, stable chemical-hazard facts (GHS classification), not subject to meaningful regional/edition variation for the core claim (flammable/toxic/corrosive), though exact GHS hazard-statement codes were not looked up. |
| Unresolved problem | No single, official, directly-inspected SDS was cited. **Recommend attaching a specific manufacturer SDS (e.g., Fisher Scientific or Sigma-Aldrich, for both methanol and glacial acetic acid) as the formal `QUESTION_GOVERNANCE` source** rather than the general references used for this preliminary pass — a low-risk, easy fix since these are basic, undisputed hazard facts. |

## 12.4 Scientific-analysis proposal

Keyed answer is correct under basic, well-established chemical-safety
knowledge; not a scientifically disputed claim. Distractors (inert; strong
oxidizers; radioactive) are all clearly, unambiguously wrong — arguably the
least subtle distractor set in this pilot batch, which is appropriate for a
difficulty-1 safety-recall item. **Confidence: high** on content;
**moderate** on citation formality (general knowledge converging across
several secondary sources, not one directly-opened primary SDS).

## 12.5 Gate B preliminary worksheet

| # | Criterion | Verdict | Note |
| ---: | --- | --- | --- |
| 1 | Exactly one defensible best answer | appears satisfied | |
| 2 | Scientific correctness is separate | not applicable | |
| 3 | Distractor plausibility | possible concern | The three distractors (inert / oxidizers / radioactive) are all quite implausible relative to the correct, specific, real hazard description — a strong learner could likely eliminate all three without knowing the specific correct hazards, by elimination/absurdity alone rather than by recalling the actual fact. Worth Austin's judgment on whether one distractor should be more subtly wrong (e.g., a plausible-but-incorrect *hazard pairing*, such as swapping which component is flammable vs. corrosive) |
| 4 | Parallel construction | appears satisfied | |
| 5 | Mutual distinguishability | appears satisfied | |
| 6 | Grammar/stem-completion clues | appears satisfied | |
| 7 | Repeated stem wording | appears satisfied | |
| 8 | Conspicuously longer/more-qualified correct answer | possible concern | `uniquely-longest`, and the largest absolute gap in this batch (62 vs. 10/21/16 chars) — the key is roughly 3–6× longer than each distractor. Gate A/Gate B judgment call; the extra length is substantive (naming both components and both hazard classes precisely) rather than obvious padding, but this is the item where the length signal is most pronounced |
| 9 | Absolute words | appears satisfied | "Both" appears in two wrong options (0, 2) and is accurate scoping, not an unintended cue |
| 10 | Paired/opposite-option patterns | appears satisfied | |
| 11 | "All/none," negative stems | not applicable | |
| 12 | Implausible padding | appears satisfied | |
| 13 | Rationale/feedback alignment | appears satisfied | |
| 14 | Preserves assessed intent | requires Austin judgment | |
| 15 | Edit-in-place vs. supersede | requires Austin judgment | |
| 16 | Quarantine when unsupportable | not applicable | |
| 17 | Evidence before release-qualification | fails preliminary review | Expected at Draft |

## 12.6 Recommended disposition

**Leave unchanged**, with item 3 (distractor plausibility — all three are
quite easy to eliminate by elimination alone) and item 8 (largest length
gap in the batch) both flagged explicitly for Austin's Gate B judgment.
Per the task's own instruction, this packet does **not** recommend editing
to rebalance length — item 3's plausibility question is a genuinely
separate, content-quality consideration Austin may want to weigh
independently of the length observation.

## 12.7 Proposed revision

None proposed. If Austin's Gate B review concludes the distractors should
be made more subtly incorrect (item 3), that is a deliberate item-writing
judgment call this packet defers to him rather than pre-empting.

## 12.8 Austin SME decision fields (pending)

Source accepted/rejected/additional source required: **PENDING** *(a formal
SDS citation recommended)* · Scientific conclusion accepted/rejected/revised:
**PENDING** · Intended learning objective: **PENDING** · Final item
disposition: **PENDING** · Gate B decisions: **PENDING** · Edition/SOP
sensitivity decision: **PENDING** · Proposed wording accepted/rejected/
revised: **PENDING** · Austin review date: **PENDING** · Austin notes:
**PENDING**

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
| 4 | Parallel construction | possible concern | Options 0/1 share the fill-in-the-blank format; options 2/3 break that format (2 supplies unrelated terms, 3 restates the pair as "two stains" rather than filling both blanks) — worth a look, though each remains clearly wrong regardless |
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

## Disposition table (13 rows)

| ID | Preliminary disposition | Primary open item |
| --- | --- | --- |
| `m1-q1` | Leave unchanged | Blueprint-percentage source discrepancy (Molecular range) unresolved |
| `m1-q2` | Leave unchanged | None material |
| `m1-q3` | Leave unchanged | Cytogenetics-specific specialist citation not directly inspected (paywalled) |
| `m2-q1` | Leave unchanged | None material |
| `m2-q3` | Leave unchanged | None material |
| `m4-q1` | Leave unchanged | None material |
| `m6-q1` | Leave unchanged | Only one specialist source found; a second would strengthen |
| `m6-q4` | Leave unchanged | No public official (e.g. CAP) citation located; specialist site is strong secondary |
| `m7-q2` | **Quarantine pending evidence** | No source confirms the exact three-term nested hierarchy |
| `m12-q6` | Leave unchanged | Trivial stray empty-feedback-key cleanup only |
| `m15-q1` | Leave unchanged | Summary-level source inspection only, not full-text |
| `m16-q1` | Leave unchanged | No primary SDS directly inspected; general chemical-safety knowledge only |
| `final-q33` | Leave unchanged | ISCN primary text itself not directly inspected (paywalled) |

**12 of 13 items: Leave unchanged (preliminary). 1 of 13 items
(`m7-q2`): Quarantine pending evidence.** No item is recommended for
"Edit in place," "Supersede with a new stable ID," or "Insufficient
evidence to recommend" — the pilot batch's content, as currently authored,
appears preliminarily well-constructed and scientifically defensible across
every item this document could research. This is a narrower, more
favorable finding than QL-033 itself might suggest, and is exactly why the
distinction between item-level scientific defensibility (this document's
subject) and bank/form-level statistical cueing (`docs/ASSESSMENT_VALIDITY.md`
Gate A, unaffected by this document) matters: an item can be scientifically
sound and still contribute to a bank-level cueing pattern, and Gate A's
correction is separate, later work this document does not perform or
substitute for.

## Sources used, grouped by authority level

**1. Current primary standards / official examination guidance:**
- ASCP BOC *CG(ASCP) and CG(ASCPi) Examination Content Guideline*, rev.
  2025-09-25 (`m1-q1` — existing repository citation relied upon; primary
  PDF not directly re-fetched this session, 403)
- The Joint Commission NPSG.01.01.01 (`m2-q3` — official standards-FAQ
  summary reviewed)

**2. Regulatory guidance:**
- CMS/CLIA laboratory-developed-test validation framework, general
  principle (`m1-q3`)

**3. Peer-reviewed primary/secondary literature (summary-level review):**
- PLOS Genetics, PMC/NIH, ScienceDirect Topics on t(9;22)/Philadelphia
  chromosome structural cytogenetics (`m12-q6`)
- *Journal of Molecular Diagnostics* (AMP) FISH testing guidance
  (`m15-q1`)

**4. Established specialist references / this repository's own
documentation:**
- This repository's own `README.md`/`docs/ARCHITECTURE.md` (`m1-q2` —
  explicitly appropriate for a repository-behavior question)
- `cytogenetics.mlsascp.com` ("CG - Cytogenetics," independently authored
  by Brett M. Rice, explicitly a *supplement* to the official ASCP BOC
  reading list, not an ASCP publication) — the single most-used source in
  this packet (`m4-q1`, `m6-q1`, `m6-q4`, `final-q33`)
- Public clinical-laboratory specimen-requirement pages (Meadville Medical
  Center, directly fetched; OhioHealth/Wake Forest Baptist, corroborating
  search snippets only) (`m2-q1`)
- General chemical-safety/fixative-composition references (`m16-q1`)

**Not used / not locatable in accessible public form this session:** the
*AGT Cytogenetics Laboratory Manual* (Wiley/Association of Genetic
Technologists — subscription-gated); an official CAP Cytogenetics
Checklist (member/subscriber-gated); the ISCN 2024 book itself (Karger,
purchased publication).

## Unresolved source questions

1. **`m7-q2`** — no source located confirms the exact
   "countable > analyzable > karyotypable" three-term nested hierarchy.
2. **`m1-q1`** — a genuine discrepancy between this repository's existing
   Molecular-domain citation (15–25%) and a third-party site's figure
   (15–20%) was found and is not resolved; the primary PDF could not be
   directly re-fetched this session (403 Forbidden).
3. **`final-q33`** — relies on a secondary description of ISCN convention,
   not the ISCN text itself.
4. **`m1-q3`, `m2-q1`, `m4-q1`, `m6-q1`** — the ideal cytogenetics-specific
   specialist reference (*AGT Cytogenetics Laboratory Manual*) exists but
   is subscription-gated and was not directly inspected; each of these
   items currently rests on a corroborated but non-primary citation.
5. **`m6-q4`, `m16-q1`** — an official CAP checklist item / a manufacturer
   SDS respectively would be stronger formal citations than what was
   located; neither was accessible in public form this session.

**5 of 13 items carry at least one honestly unresolved sourcing question.**
None of the five is treated as resolved by inference — each is stated
plainly above and in the item's own section 3.

## Questions needing the most Austin judgment

Ranked by this document's own assessment of judgment burden, not just
sourcing gaps:

1. **`m7-q2`** — the quarantined item; needs Austin's direct domain
   knowledge to confirm or correct the terminology itself, likely faster
   than further literature search.
2. **`m1-q3`** — the subtle "regulatory requirement" distractor nuance
   (3.4) benefits from a working item-writer's judgment on whether it
   reads as a fair test or a trick.
3. **`m16-q1`** — whether the three current distractors are appropriately
   plausible or too easily eliminated by elimination alone (12.5, item 3).
4. **`m1-q1`** — resolving the blueprint-percentage discrepancy against
   the primary guideline directly.
5. **`m6-q1`, `m15-q1`, `m16-q1`** (length-gap items) — each flagged for a
   Gate B judgment call on whether the correct answer's extra length is
   substantive (this document's preliminary view) or should be tightened.

## Questions likely safe to leave unchanged

`m1-q2`, `m2-q1`, `m2-q3`, `m4-q1`, `m12-q6` — each has at least one
directly-inspected or multiply-corroborated source, a single clearly
defensible answer, and no material open question beyond routine formal
source-checking. `m4-q1` in particular is a strong positive example
(perfectly length-balanced across all four options, zero possible length
cue, clean sourcing).

## Questions likely requiring revision

None, on this document's preliminary analysis — see the disposition table
above. If Austin's actual review disagrees with any preliminary
"appears satisfied" verdict above, that disagreement itself is valuable
signal about where this document's AI-assisted analysis needs correction,
not evidence the item is fine.

## Questions potentially requiring supersession or quarantine

- **`m7-q2`** — recommended **Quarantine pending evidence** (source gap,
  not a suspected content error).
- No item is recommended for supersession (a new stable ID) — nothing
  found in this research suggests any item's assessed intent needs to
  change, only (for one item) that its evidentiary support needs to be
  established or (for several items) formally strengthened.

## Proposed order for Austin's review

Deliberately not easiest-first — starts with a small mix chosen to
pressure-test the review process itself before committing to a fixed order
for the rest:

1. `m2-q1` — simple, cleanly sourced, a good process warm-up.
2. `m7-q2` — the hardest case, reviewed early rather than saved for last,
   so any needed re-research can happen while the rest of the review is
   still in progress rather than blocking the very end.
3. `m6-q4` — the best-sourced, most complex item (negative stem, richest
   source match) — a good test of whether the packet's format holds up for
   a "everything mostly works" case, not just simple ones.
4. Remaining 10 items in canonical frozen-pilot order (`m1-q1`, `m1-q2`,
   `m1-q3`, `m2-q3`, `m4-q1` *(already covered above)*, `m6-q1`, `m12-q6`,
   `m15-q1`, `m16-q1`, `final-q33`), so the rest of the pass is
   predictable and easy to track against the table above.

## Estimated review burden per question

**Planning estimates only — not measured, not a commitment, and likely to
be wrong in either direction once Austin actually starts:**

| ID | Estimate | Basis |
| --- | ---: | --- |
| `m1-q2` | 5–10 min | Repo-behavior fact, already directly verifiable |
| `m2-q1` | 10–15 min | Clean single-answer clinical fact |
| `m2-q3` | 10–15 min | Clean single-answer safety standard |
| `m4-q1` | 10–15 min | Clean, well-sourced, no flags |
| `m12-q6` | 10–15 min | Clean content + trivial cleanup note |
| `m1-q1` | 15–20 min | Needs primary-PDF re-verification |
| `m6-q1` | 15–20 min | Needs a second corroborating source |
| `m15-q1` | 15–20 min | Full-text re-check of one guidance article recommended |
| `m16-q1` | 15–20 min | Distractor-plausibility judgment + SDS citation |
| `final-q33` | 15–20 min | ISCN primary-text check recommended |
| `m1-q3` | 20–25 min | Distractor-nuance judgment + specialist citation |
| `m6-q4` | 20–25 min | Richest item; difficulty-tag question; CAP citation search |
| `m7-q2` | 40+ min | Source resolution likely requires Austin's own expertise or new research, not just review |

**Total planning estimate: roughly 3.5–4.5 hours across all 13 items**,
excluding any time spent actually populating `QUESTION_GOVERNANCE` records
once Austin's conclusions are final (a separate, later step).

## Stop/go recommendation

**Recommendation: proceed to Austin's question-by-question review of this
packet. Do not proceed to actual content editing, `QUESTION_GOVERNANCE`
population, or any lifecycle promotion until that review is complete for
all 13 items**, and do not treat this document's "Leave unchanged"
preliminary calls as authorization to skip Austin's review of those items
— every one still needs his explicit sign-off per the pending fields in
each item's sections 8–9.

This packet's own preliminary finding — that 12 of 13 pilot items appear
scientifically defensible as currently written, with the 13th needing a
sourcing answer rather than a content fix — is a **reason for cautious
optimism about batched-remediation step 4 ("rewrite only where
justified")**, not a signal to skip Gate B or independent review. The
approved-independent-reviewer registry remains empty; **no item in this
pack, however clean its preliminary analysis, can reach `release-qualified`
until that separate, real second-person review exists.**
