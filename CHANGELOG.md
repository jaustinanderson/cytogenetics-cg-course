# Changelog

All notable repository changes are recorded here.

## [Unreleased]

### Added

- Added `docs/ASSESSMENT_VALIDITY.md` and `scripts/assessment-cue-audit.mjs`
  (Issue #24, `docs/LEARNING_PLATFORM_ROADMAP.md` Phase 0 steps 1-3, draft
  PR): the QL-033 assessment-cue foundation. Independently reproduces the
  frozen QL-033 baseline (position counts 11/139/3/0, uniquely-longest
  114/153, longest-or-tied 133/153) directly against the live authored
  bank; **(superseded below — see "Corrected (QL-037)": this reproduces
  the frozen results, it does not prove what the original one-off script
  actually did)** identifies QL-033's original length metric as raw
  JavaScript `.length` and defines a more robust canonical metric
  **(superseded below — the entity-decoding/tag-stripping/punctuation-
  stripping design measured a different string than `index.html` actually
  renders to learners)** (entity decoding, tag stripping, NFC
  normalization, whitespace/punctuation handling, grapheme-cluster
  counting) that currently reproduces identical counts on the unchanged
  bank; defines Gate A (bank/form-level statistical position- and
  length-balance thresholds, with two cited, directly inspected sources
  **(superseded below — only one source was actually directly verified;
  see "Corrected (QL-037)")**, an explicit numeric margin, and a
  documented inconclusive state for small forms **(superseded below —
  this state made every real small form and the pilot unable to ever
  pass)**) and Gate B (a 17-point item-level human-review rubric); and
  selects a deterministic, cherry-pick-resistant
  13-question pilot batch. `scripts/assessment-cue-audit.mjs` is the
  single implementation behind the new `npm run audit:assessment-cues`
  CLI, `tests/assessment-cue-audit.mjs` (53 new dependency-free checks,
  now part of `npm test`), and `tests/e2e/assessment-cue-audit.spec.mjs`
  (10 new real-browser cross-check tests). A genuine implementation bug
  (an entity-decode/tag-strip ordering issue that could have mismeasured
  a future option) was found and fixed before it shipped, with a
  dedicated regression test. **No question content changed, `index.html`
  is unmodified, the bank and every one of its 17 forms is confirmed to
  still fail Gate A, and QL-033 is not marked corrected** — this is
  foundation only; the actual pilot-batch rewrite remains separately
  scoped, later work. See `docs/QUALITY_LOG.md` QL-036 for the full
  record.
  **Corrected (QL-037):** independent review found Gate A's original
  design made every real 5-9 item course form and the 13-item pilot
  mathematically unable to ever pass, even perfectly balanced — replaced
  with a two-regime model (a zero-free-parameter "exact pigeonhole"
  structural rule below `5n` observations, the prior practical-margin/
  chi-square approach at or above it, both driven by one shared
  threshold). The canonical length metric was found to strip tags,
  decode entities, and strip punctuation that `index.html`'s actual
  `esc()`/`textContent` rendering displays to learners as literal
  characters — corrected to measure exactly the rendered text, verified
  by a new real-browser rendered-text oracle test. The length-cueing
  check was found to ignore tie structure (a bank could key the correct
  answer to a tied-maximum-length option and evade a uniquely-longest-only
  check) and to go inconclusive for any mixed option-count scope —
  replaced with a tie-aware, per-item, exact Poisson-binomial association
  test valid at any sample size, needing no option-count grouping.
  Seven further reproducibility gaps were also corrected: pilot selection
  now sorts into a canonical, id-derived order before selecting, so
  reversing or shuffling the input array reproduces the identical pilot
  (the prior determinism test used a helper that could not have caught
  the bug it was named for); the frozen baseline now includes an exact,
  independently-frozen 153-id manifest with a SHA-256 digest, not just
  aggregate counts (`noDuplicateOrOmittedIds` renamed to the accurately
  scoped `noDuplicateIds`); historical-method and NBME-citation claims
  were corrected to the exact strength the retained evidence supports;
  and the `--json` output no longer embeds a wall-clock timestamp.
  `tests/assessment-cue-audit.mjs` grew from 53 to 82 dependency-free
  checks; `tests/e2e/assessment-cue-audit.spec.mjs` grew to 7 real-browser
  checks. Still no question content changed, still Gate A correctly fails
  the bank and every form, still QL-033 not marked corrected. See
  `docs/QUALITY_LOG.md` QL-037 and `docs/ASSESSMENT_VALIDITY.md` for the
  full record.
  **Corrected (QL-038):** a second independent review found QL-037's own
  size-loop tests only ever proved `evaluatePositionBalance()` in
  isolation, never the combined `evaluateGateA()` (including the
  tie-aware length component) — now directly proven for every required
  size via independently constructed full-form fixtures with position-only
  and length-only perturbations each isolated. Aggregate position balance
  alone was found not to catch a mechanically predictable answer-key
  sequence (`A,B,C,D,A,B,C,D,A` satisfies exact pigeonhole balance
  perfectly) — a new deterministic (not statistical) sequence-pattern
  detector now catches repeating cycles, palindromes, and excessive runs,
  reported separately from position and length. A statistically
  significant but practically trivial large-N deviation was found able to
  fail Gate A on significance alone — the practical margin is now the
  sole authoritative fail driver, with significance-alone raising an
  explicit review flag instead. The exact two-sided Poisson-binomial
  p-value convention was found unnamed and not the only defensible one —
  switched to the precisely-named probability-ordering convention,
  verified against independently hand-computed fixtures. Mutation count
  reconciled from retained evidence: round 1 (QL-036) 8, round 2 (QL-037)
  8, round 3 (QL-038) 4 — **cumulative 20**, correcting an earlier PR-body
  draft that undercounted this as "8 across two rounds."
  `tests/assessment-cue-audit.mjs` grew from 82 to 127 dependency-free
  checks; `tests/e2e/assessment-cue-audit.spec.mjs` stayed at 7 (no new
  browser-specific behavior this round). Still no question content
  changed, still Gate A correctly fails the bank and every form, still
  QL-033 not marked corrected. See `docs/QUALITY_LOG.md` QL-038 and
  `docs/ASSESSMENT_VALIDITY.md` for the full record.
  **Corrected (QL-039):** a third independent review found the large-N
  practical decision examined only the single largest answer position —
  at N=20 (n=4), distributions `[7,7,6,0]`, `[8,6,6,0]`, `[8,8,4,0]`
  (each leaving one position at zero correct answers) all passed —
  replaced with Cohen's w, the standard scale-free multinomial effect
  size (Cohen, 1988), using Cohen's own published medium-effect threshold
  (0.3), verified to fail all three (w = 0.583, 0.600, 0.663) while a
  balanced N=20 distribution still passes and the N=19/20/21 regime
  boundary behaves consistently. Position balance was found to report
  only a chi-square statistic and a critical-value-table Boolean, never
  an actual p-value — corrected with an exact chi-square p-value via the
  regularized incomplete gamma function, verified against published
  critical-value tables at α=0.01 and α=0.05. `compareToIdManifest()`'s
  own comment was found to claim it detected id reordering, directly
  contradicted by its own next clause explaining the digest is
  order-independent by construction — corrected, and a genuinely
  separate, order-sensitive per-form encounter-order manifest added,
  since the sequence check (QL-038) made each form's authored order a
  real contract; the whole-bank aggregate is no longer treated as one
  learner-facing sequence for gate purposes. NBME source-provenance
  wording was found to describe the two official NBME URLs less
  precisely than directly re-inspecting them supports — corrected: the
  institutions page is the actual request-form page, and the
  file/pdf-shaped URL serves only an HTML page shell with no PDF and no
  request form of its own. Mutation count reconciled across all four
  rounds: 8 + 8 + 4 + 7 = **27**; two of round 4's mutations surfaced
  genuine test-coverage gaps, both closed with permanent tests before
  being counted as passing. `tests/assessment-cue-audit.mjs` grew from
  127 to 157 dependency-free checks; `tests/e2e/assessment-cue-audit.spec.mjs`
  stayed at 7. A complete `npx playwright test` run at a deterministic
  fixed worker count produced a fully clean result: 252 passed, 6
  skipped, 0 failed. Still no question content changed, still Gate A
  correctly fails the bank and every form, still QL-033 not marked
  corrected. See `docs/QUALITY_LOG.md` QL-039 and
  `docs/ASSESSMENT_VALIDITY.md` for the full record.
- Added `docs/LEARNING_PLATFORM_ROADMAP.md`, a durable planning document
  (Issue #24, carried by PR #25): a long-term roadmap toward a
  trustworthy, adaptive, subject-independent learning platform — guiding
  principles and safeguards, assessment-validity prerequisites (naming the
  confirmed QL-033 cueing defect as a hard blocker for any diagnostic use
  of the bank), a subject-independent concept/evidence/learner-state model,
  seven distinct diagnostic learner experiences, a four-phase adaptive-
  sequencing progression, a concept graph design, spaced-retention study
  planning, subject-pack portability prerequisites (cytogenetics as the
  reference pack, molecular biology as the first portability pilot),
  candidate commercial paths and their operational requirements (no
  pricing or market claims made), a privacy/security/ethics section, a
  full test-and-audit matrix, success metrics with explicit
  learning-vs-engagement separation, an 11-phase roadmap with exit
  criteria and rollback plans for each, and a decision log of
  intentionally open questions. **Nothing described in the document is
  implemented** — no accounts, telemetry, cloud storage, pricing, adaptive
  algorithm, framework migration, or content-pack system is authorized by
  it. `docs/ROADMAP.md` gains a concise "Milestone 5" pointer/summary
  section; `README.md`, `docs/ARCHITECTURE.md`, and `docs/CLAUDE_HANDOFF.md`
  gain short discoverability pointers distinguishing current behavior from
  this future proposal. No product code, scientific content, or existing
  issue was changed.
  **Corrected during PR #25's independent-review correction pass:** independent review found ten
  substantive validity problems — most significantly, the plan conflated
  QL-033's bank/form-level cueing statistic with a per-item validity
  judgment (implying every B-keyed or longest-correct-answer question was
  individually invalid, which QL-033 does not establish); allowed a merely
  source-checked item to support a public diagnostic claim instead of
  requiring `release-qualified`; claimed Phase 0 needed no further design
  work; said early below-threshold attempts carry zero information;
  understated how session difficulty/scaffolding affects evidence weight;
  overstated what IRT can do to "fix" distractors; left a real contradiction
  between Phase 11's real-data requirement and the decision log's "no
  consent model required through Phase 11"; made hosted accounts (Phase 9)
  a blanket prerequisite for every commercial path (Phase 10) rather than
  only paths needing hosted identity/sync; and called the public
  repository/deployed course "private" rather than local-first/account-free.
  All corrected in place across `docs/LEARNING_PLATFORM_ROADMAP.md`,
  `docs/ROADMAP.md`, `README.md`, and `docs/CLAUDE_HANDOFF.md`; see PR #25's
  body for the full record. Still nothing implemented; still no product
  code, scientific content, or existing issue changed.
- Added a strict, auditable question-provenance and scientific-review
  governance model (`index.html`, Issue #3, carried by PR #23): a
  separate `QUESTION_GOVERNANCE` registry, keyed by each authored
  question's existing stable id, holds a 17-field evidence record —
  `lifecycle`, `drafter`, structured `sources`, source-check identity/date
  (`sourceCheckedBy`/`sourceCheckedDate`), `reviewer`/`reviewDate`/
  `reviewScope`, structured `reviewChecks`, and a documented independent
  review with its own separately recorded evidence
  (`independentReviewDocumented`, `independentReviewer`,
  `independentReviewDate`, `independentReviewScope`,
  `independentReviewChecks`, `independentReviewNoConflictDeclared`),
  plus `editionSensitive` and `notes` — kept entirely separate from
  question content and learner progress (`SCHEMA_V` unchanged). An
  earlier draft of this registry held only 14 fields, omitting the three
  separately recorded independent-review evidence fields entirely; see
  the QL-034/QL-035 corrections below for why those fields were added and
  then tightened. A question's lifecycle label
  (`draft`/`source-checked`/`sme-reviewed`/`release-qualified`, matching
  `docs/CONTENT_GOVERNANCE.md`'s four content states) cannot be promoted
  without its documented prerequisites — enforced at script-load time by
  `assertGovernanceRegistryIntegrity()`, which throws on a missing,
  stale, or self-contradictory record. New read-only
  `CytoCourse.getQuestionGovernance(id?)` returns a question's status
  plus two freshly computed fields, `releaseQualified` and `blockers`
  (naming exactly what is missing toward release-qualification, e.g.
  `missing-reviewer`, `missing-review-date`,
  `unresolved-edition-sensitivity`, `release-approval-pending`); an
  unknown id — including any runtime-injected question's id, since
  `addQuestions()` never touches this registry and rejects
  governance-shaped fields outright — returns `null`. All 153 current
  authored questions remain Draft; nothing is fabricated. Also adds a
  persistent, non-modal, non-dismissible in-course disclosure
  (`#reviewDisclosure`, inside the hero) stating the
  structural-vs-scientific-review distinction and linking to the
  rendered `docs/SCIENTIFIC_REVIEW.md` view; the existing `README.md`
  beta warning is unchanged. Performs no scientific review, source
  attribution, or content correction. See `docs/QUALITY_LOG.md` QL-030
  and `docs/ARCHITECTURE.md` "Question provenance and scientific-review
  governance" for the full record.
  **Corrected (QL-031):** independent review found duplicate governance
  ids could silently collapse in the original object-literal registry
  (now rejected at construction by an ordered-entries builder); a bare
  organization-name citation satisfied "source-checked" (now requires an
  exact edition/date and a specific locator/url); any non-empty reviewer
  string satisfied "SME-reviewed" (now checked against an approved
  reviewer identity); a review-scope length heuristic stood in for
  verifying the mandatory checklist (now a closed, structured
  `reviewChecks` enum matching `docs/CONTENT_GOVERNANCE.md`'s
  "Review must verify" list exactly); a Draft record with complete
  evidence reported zero blockers (now carries `release-approval-pending`
  and `releaseQualified:false` until explicitly promoted); and
  independent-review evidence fields were not bidirectionally consistent
  (now enforced both directions, including same-person rejection). Also
  corrected the disclosure's wording and its link (now the rendered
  GitHub view, not raw markdown). Test coverage updated to 46 dependency-
  free tests and 10 real-browser Playwright tests, mutation-tested across
  the 10 required correction scenarios plus the original 6.
  **Corrected again (QL-032):** a third round of independent review found
  a duplicate AUTHORED question id (in `QUIZZES`, not the governance
  registry) still went undetected — fixed by counting the flat authored-
  question list against the unique id set at load time; the citation-
  length heuristic was itself an arbitrary proxy — replaced with a
  required, separate, non-placeholder `publisher` field; the approved-
  reviewer set is now keyed by an explicit `GOVERNANCE_SUBJECT_PACK` for
  future extensibility; the review-checklist enum is now versioned
  (`GOVERNANCE_REVIEW_CHECKS_V1`); and, for a public, potentially
  commercial product, `release-qualified` now explicitly requires a
  documented independent second-person review (`docs/CONTENT_GOVERNANCE.md`
  and `docs/SCIENTIFIC_REVIEW.md` updated accordingly), with a new
  `missing-independent-review` blocker. Also recorded, as a separate,
  bank-level (not per-question) confirmed known risk: independently
  reproduced answer-choice cueing statistics across the 153-question
  bank (correct answer is index B in 90.8% of questions; the longest
  option in 74.5%) — tracked in `docs/QUALITY_LOG.md` QL-033 and
  `docs/ROADMAP.md`, not fixed in this PR. Test coverage updated to 54
  dependency-free tests, mutation-tested across 7 further reversions.
  **Corrected again (QL-034):** a fourth round of independent review
  found the new independent-review requirement did not actually enforce
  its own documented evidence contract — an arbitrary, unqualified,
  unapproved reviewer name with only an identity and a date satisfied
  `release-qualified` with zero blockers. Corrected: three new record
  fields (`independentReviewScope`, `independentReviewChecks`,
  `independentReviewNoConflictDeclared`, separate instances from the SME
  review's own fields) and a separate `APPROVED_INDEPENDENT_REVIEWERS_BY_PACK`
  registry, **deliberately empty for the current pack** (no real
  independent reviewer or credential is invented). `meetsIndependentReview()`
  now requires approval, a recorded scope, a complete separate checklist,
  and an explicit `independentReviewNoConflictDeclared === true`
  declaration. New granular blocker codes
  (`missing-independent-reviewer`, `missing-independent-review-scope`,
  `incomplete-independent-review-checks`,
  `missing-independent-review-conflict-declaration`) apply once
  `independentReviewDocumented` is `true`; the aggregate
  `missing-independent-review` code remains for when it is `false`. Also
  corrected a stale in-source comment claiming independent review was
  "intentionally NOT required for any lifecycle state." Test coverage
  updated to 68 dependency-free tests, mutation-tested across 5 further
  reversions.
  **Corrected again (QL-035):** a fifth round of independent review found
  the QL-034 fields were checked for release-qualification but never
  required by the load-time structural validity check — a record could
  set `independentReviewDocumented: true` with only a reviewer name and
  date, leaving scope, checklist, and conflict-declaration unset, and it
  still loaded. Corrected: `independentReviewDocumented: true` now
  requires the COMPLETE record (identity, date, non-empty scope, a
  complete checklist, and an actual boolean conflict declaration) in the
  same step, or the record is rejected at script load, not merely
  flagged. The four QL-034 granular "missing-*" blocker codes are now
  unreachable dead code and were removed; two new codes distinguish a
  complete-but-disqualified record from a missing one:
  `unapproved-independent-reviewer` (identity present, not approved) and
  `independent-review-conflict-declared` (declaration present, value
  `false`) — replacing `missing-independent-reviewer`,
  `missing-independent-review-scope`,
  `incomplete-independent-review-checks`, and
  `missing-independent-review-conflict-declaration`. `meetsIndependentReview()`
  and `computeGovernanceBlockers()` simplified accordingly; the main
  in-source schema comment corrected from "14" to "17" own properties
  with full field-by-field documentation. Test coverage updated to 70
  dependency-free tests (net, after removing one obsolete test whose
  expectation was itself the defect), mutation-tested across 7 further
  reversions, two of which surfaced and closed a genuine coverage gap
  (no prior test proved `meetsReleaseQualified()` itself, not only the
  blocker-display logic, rejects an unapproved or conflicted-but-complete
  independent review at load time).
- Defined and enforced the runtime-injected-question lifecycle
  (`index.html`, Issue #2, **merged**): adopted a
  deliberate **split lifecycle** — a question definition added via
  `addQuestions()` remains session-only (never written to
  `localStorage`, `state`, `exportJSON()`, or accepted back in by
  `importJSON()`), but its recorded answer OUTCOME, once recorded, is
  durable in existing v2 progress by stable id, exactly like an
  authored question's outcome; reintroducing the same id later revives
  the preserved outcome via the existing stale-ID policy, with no
  injection-specific code. The caller owns semantic id stability — the
  app cannot detect reuse of an id for materially different content
  across sessions, since a v2 outcome carries no definition/fingerprint
  to compare against, stated honestly rather than assumed away. New
  `CytoCourse.getRuntimeContentPolicy()` exposes this contract
  machine-readably (a fresh, 7-field object every call). Also fixed a
  real, independently reproduced defect: `addQuestions()` previously
  stored the caller's own object reference, so mutating the source
  object or its options array after a successful call changed the
  live, accepted question; it now commits a fresh, canonical, fully
  detached snapshot. Validation was strengthened to the same
  cross-realm-safe standard already used for progress import,
  rejecting accessor properties, symbol keys, dangerous keys, sparse
  arrays, non-record objects, and unrecognized fields, without ever
  invoking a caller getter. The previously-unvalidated optional `w`
  (wrong-answer feedback) field now has a complete, defined, validated
  schema. Does NOT build a persistent/versioned content-pack format —
  only documents its prerequisites for a later, separately scoped
  design. `SCHEMA_V` stays `2`. 11 new dependency-free tests and 6 new
  real-browser Playwright tests in
  `tests/e2e/runtime-content-lifecycle.spec.mjs`, mutation-tested
  across 4 reversions. See `docs/QUALITY_LOG.md` QL-028 and
  `docs/ARCHITECTURE.md` "Runtime-injected content lifecycle" for the
  full record. Also corrected a misleading README statement implying
  injected questions "unless external tooling exports and preserves
  the result" could be preserved through the built-in export — the
  built-in export/import never carries a definition through; external
  capture of `getQuestions()`'s output is not a supported versioned
  format.
  **Corrected (QL-029):** an explicit own `w: undefined` field passed
  optional-field validation (which conflated "absent" with "present but
  undefined") and then crashed `addQuestions()` with an uncaught
  `TypeError` instead of the documented structured `{ok:false, ...}`
  rejection; fixed by deciding absent-vs-present once, explicitly, via
  `hasOwn.call(q, 'w')`. 1 new dependency-free test (172 total) and 1
  new Playwright test (14 total in
  `tests/e2e/runtime-content-lifecycle.spec.mjs`) cover the full
  accepted/rejected matrix plus a real-browser recovery proof;
  mutation-tested. See `docs/QUALITY_LOG.md` QL-029.
- Named, documented, and tested the course's actual analytics model —
  **last-attempt mastery** — instead of leaving `getStats()`'s field
  names (`questionsCorrect`, `overallPct`) to be mistaken for
  total-attempt accuracy (`index.html`, Issue #2, **merged**): a v2
  outcome record `{c, n, ts}` stores only the latest
  correctness and a total attempt count, never a per-attempt history —
  confirmed by direct execution that two genuinely different attempt
  histories (2-of-3 attempts correct vs. 1-of-3, both ending on a
  correct attempt) produce a byte-identical stored record, so
  total-attempt accuracy is not implemented and cannot be derived from
  existing data. `getStats()` adds `analyticsModel:
  'last-attempt-mastery-v1'`, `questionsMastered`, and
  `lastAttemptMasteryPct`; `questionsCorrect`/`overallPct` remain as
  compatibility aliases with identical values. Every `byDomain`/
  `byTopic`/`byDifficulty` row and `getWeakAreas()` row gains
  `mastered`/`masteryPct` alongside existing `correct`/`pct` aliases.
  A correctness-changing reattempt (only reachable across a real
  reload) now provably changes that one question's mastery immediately
  without inflating the distinct-answered count or blending attempt
  count into the mastery percentage (0%/100%, never 50%). Stale
  records, exercise records, and module-completion records remain
  excluded from question analytics, unchanged. `SCHEMA_V` stays `2` —
  no historical record is rewritten or fabricated. 12 new
  dependency-free tests and 4 new real-browser Playwright tests in
  `tests/e2e/analytics-semantics.spec.mjs`, mutation-tested across 4
  reversions. See `docs/QUALITY_LOG.md` QL-027 and
  `docs/ARCHITECTURE.md` "Analytics semantics: last-attempt mastery"
  for the full record.
- Storage-failure detection and an honest session-only warning
  (`index.html`, Issue #2, **merged**): `saveProgress()`
  previously caught every `localStorage` write error silently and still
  advanced/reported progress as if it had been saved, `loadProgress()`
  treated a genuine read failure identically to "no progress yet" with
  no warning, and the UI Reset handler reloaded unconditionally even
  when the storage removal it depended on had failed — all three
  confirmed as real, pre-fix defects by direct execution. A new
  `persistState` state machine now distinguishes a write-only failure
  (self-heals the moment any later save succeeds, since every save
  serializes the complete current state) from a read failure at
  initialization (sticky for the session, since the app cannot rule out
  unseen prior progress); a non-modal, `role="status"` warning banner
  (`#storageWarning`) communicates session-only mode without stealing
  focus mid-answer, deduplicated so repeated failures produce exactly
  one warning; `CytoCourse.getPersistenceStatus()` and a new
  `persistence` event expose the status publicly, with no raw browser
  exception text ever surfaced; `reset()` now returns `{ok:false}`
  honestly on a storage failure instead of an unconditional
  `{ok:true}`; `importJSON()`'s existing all-or-nothing atomicity
  guarantee is unweakened, with only the shared persistence status
  reflecting a genuinely observed write failure. Does not change
  `SCHEMA_V`, stable-ID formats, migration policy, the stale-ID policy,
  scoring, or existing `progress`/`answer`/`exercise` event semantics.
  15 new dependency-free regression tests in `tests/dom-behavior.mjs`
  (124 → 139) and 6 new real-browser Playwright tests in
  `tests/e2e/storage-failure-warning.spec.mjs`, mutation-tested across
  4 reversions. See `docs/QUALITY_LOG.md` QL-026 and
  `docs/ARCHITECTURE.md` "Storage-failure detection and session-only
  mode" for the full record. **Corrected** after independent review of
  the draft PR found three blocking defects, all fixed before merge
  (`docs/QUALITY_LOG.md` QL-026's addendum): (1) a failed `importJSON()`
  attempt could downgrade the sticky `'unavailable'` read-failure status
  to the non-sticky `'write-failed'`, letting a later ordinary action
  silently write over genuine prior progress a read failure at init had
  never actually seen — fixed by never letting a *failed* import weaken
  `'unavailable'` (a *successful* one may still clear it); (2)
  `#storageWarning` was an ordinary in-flow element that could scroll far
  outside the viewport in a long page — changed to `position:fixed` at
  the viewport's bottom edge, verified with Playwright's
  `toBeInViewport()` rather than `toBeVisible()`; (3) the API `reset()`
  path's persistence status falsely reported session-only when only the
  already-inert legacy `PKEY_V1` key failed to remove while the
  canonical v2 state was genuinely durable — status logic is now
  path-dependent between the API and UI Reset paths, while `reset()`'s
  `{ok:...}` return value is unchanged. 6 additional dependency-free
  tests (139 → 145) and 3 additional real-browser Playwright tests
  (6 → 9, both configured projects), mutation-tested across 3 further
  reversions (7 total). **Corrected again** after a second round of
  independent review found the fixed-position banner itself could
  obstruct content (`docs/QUALITY_LOG.md` QL-026's second addendum):
  `position:fixed` removes the banner from document flow, so nothing
  reserved room for it — it could sit on top of the page's own
  bottom-most content and, at narrow widths, on top of the mobile
  sidebar's own bottom-most nav links, both still clickable underneath
  it. Fixed with a `--storage-warning-h` custom property kept in sync
  with the banner's live rendered height, which `.content`'s bottom
  padding and `.sidebar`'s own height (desktop and mobile) both reserve
  space for whenever it is shown; `pointer-events:none` alone was
  considered and rejected, since it would let clicks through without
  removing the visual obstruction. Verified with real
  `document.elementFromPoint()` hit-testing and rectangle-intersection
  checks. 3 additional dependency-free tests (145 → 148) and 6
  additional real-browser Playwright tests (9 → 15), mutation-tested
  across 1 further reversion (8 total for this feature).
- Exercise widgets now correctly re-render after `CytoCourse.importJSON()`
  and `CytoCourse.reset()` (`index.html`, Issue #2): both previously
  rebuilt only `.quiz-mount` widgets, never `.exer` (exercise) ones, so a
  rendered exercise widget's score, status, and controls silently
  disagreed with `getProgress()` immediately after either call —
  confirmed as a real, currently-shipped defect by direct execution
  before any fix was written. Fixed by adding `rebuildContentWidgets()`
  and routing `init()`, `importJSON()`, and `reset()` through it instead
  of three separately maintained selector loops; `buildExercise()`'s own
  rendering logic (including its existing reattempt-after-reload
  behavior — an exercise widget always restarts at item 0 with fresh,
  unlocked controls on any rebuild, letting a learner correct a previous
  answer) is unchanged. A resume-position variant of this fix was tried
  and reverted before committing after it broke a pre-existing, shipped
  Playwright test depending on that exact reattempt behavior; see
  `docs/QUALITY_LOG.md` QL-025 for the full account. 9 new dependency-free
  regression tests in `tests/dom-behavior.mjs` (115 → 124) and 6 new
  real-browser Playwright tests in
  `tests/e2e/progress-and-reset.spec.mjs` — including one that calls
  `window.CytoCourse.reset()` directly, with no page reload or
  navigation, specifically to prove the public API method itself (not a
  subsequent reload) rebuilds the exercise widget — mutation-tested. Does
  not change stable-ID formats, migration policy, `SCHEMA_V`, or the
  stale-ID policy (Issue #2)
- Stale question/exercise/module ID policy (`index.html`, Issue #2): a
  `modules`/`answers`/`exercises` key that no longer corresponds to
  current `MODULES`/`QUIZZES`/`EXERCISES` data (a renumbered or removed
  question, a dropped exercise item, a deleted module, or a
  runtime-injected question whose session ended) is preserved under its
  original id — never deleted, moved, or quarantined by
  `loadProgress()`, `migrateExerciseIds()`, or `importJSON()` — and
  simply excluded from every current-facing figure at read time, decided
  fresh by checking membership in the live content each time rather than
  trusting a stored map's own keys. Reintroducing the same id later
  revives its preserved history automatically, with no migration code.
  Fixed a real, pre-existing bug found while defining this: `getStats()`'s
  top-level `questionsAnswered`/`questionsCorrect`/`overallPct` counted
  every key in `state.answers` regardless of whether the course still
  recognized it — a state holding only a fabricated question id reported
  a fabricated 100% overall accuracy, confirmed by direct execution
  before the fix; `tally()` (`byDomain`/`byTopic`/`byDifficulty`) already
  filtered correctly and the fix mirrors its exact pattern. Does not
  decide whether runtime-injected content should persist (the separate,
  still-open content-pack item) and does not bump `SCHEMA_V` (no stored
  field's shape or meaning changes). An explicit, user-confirmed Reset
  (`#resetBtn`/`reset()`) remains the one deliberate exception — it
  deletes everything, current or stale, in both storage keys, as already
  implemented; a dedicated test now proves that combination explicitly.
  14 new dependency-free regression tests in `tests/dom-behavior.mjs`
  (101 → 115), mutation-tested across three mutations. See
  `docs/QUALITY_LOG.md` QL-024 and its addendum, and
  `docs/ARCHITECTURE.md` "Stale question/exercise/module ID policy" for
  the full decision record and rejected alternatives (Issue #2)
- `validateImportedState()`/`validateImportEnvelope()` in `index.html`:
  `importJSON()` now validates the complete import — either a bare state
  object or an export wrapper whose own keys are exactly
  `exported`/`state`/`stats` — checking every required field (including
  `c`/`n`/`ts` inside each outcome record) as an OWN property, not merely
  one reachable via the prototype chain, plus a documented size limit
  (262,144 characters — a JS string-length/code-unit count, not a byte or
  KiB limit — checked before `JSON.parse`) and entry-count cap (2000),
  both grounded in a real measured full-course export (~8.7 KB, 200
  entries) — before anything observable changes. Rejects unsupported
  schema versions, unrecognized or inherited-only top-level/wrapper
  fields, incorrect nested types (nulls, arrays, wrong primitives),
  invalid counters/timestamps/correctness values, extra/missing/inherited-
  only outcome-record fields, and dangerous map keys
  (`__proto__`/`constructor`/`prototype`) wherever they appear, including
  on the wrapper itself. Builds an entirely new, deep-cloned object graph,
  so mutating the caller's source object after a successful import
  (including when `importJSON()` is called with a plain object rather
  than a JSON string, which previously aliased that object directly into
  live state) cannot affect course progress. Accepted objects (the state,
  the wrapper, the `modules`/`answers`/`exercises` containers, and every
  outcome record) must also be genuine RECORD objects — an ordinary plain
  object or an explicit null-prototype object, in any realm, never an
  exotic built-in like `Date`/`Map`/`Set`/`RegExp` (which previously
  passed the weaker `typeof x === 'object'` check while carrying no data
  reachable through normal own-property enumeration) — and every one of
  their own properties must be a plain, enumerable, string-keyed DATA
  property, rejecting any own symbol key, non-enumerable extra, or
  accessor (getter/setter) property outright. The full transaction —
  validate, migrate the candidate, serialize, then attempt the
  `localStorage` write — runs to completion *before* live state is ever
  committed, so a rejected import, and now also one whose persistence
  itself fails (full quota, private browsing), both leave `getProgress()`,
  `localStorage`, the rendered UI, and public API events completely
  unchanged. Does not bump `SCHEMA_V`. 49 dependency-free regression tests
  in `tests/dom-behavior.mjs` (27 from the initial pass, 13 from a
  correction pass after independent review found three further gaps —
  persistence-failure atomicity, own-property vs. inherited-property
  validation, and the wrapper contract — plus a terminology fix, and 9
  more from a further correction pass closing the record-object gap
  above), mutation-tested across nine separate mutations in total. Found
  and fixed a real self-contained bug in the process: a
  `{'__proto__':true, ...}`-shaped blocklist never actually contained
  `__proto__` as an own key (object-literal syntax silently drops it when
  the value isn't itself an object), replaced with a plain array. See
  `docs/QUALITY_LOG.md` QL-006 and its addenda, and QL-023, and
  `docs/VALIDATION.md` "Progress-import validation and cloning" (Issue #2)
- Explicit, stable `id` fields, plus a literal frozen `legacyId` recording
  each item's original position-derived key, on all 30 exercise items
  (`EXERCISES.ex7`/`ex9group`/`ex9chrom`/`ex10`/`ex14`/`ex15` in
  `index.html`), and `migrateExerciseIds()`, a deterministic, idempotent
  migration that renames any surviving legacy key — read from each item's
  own frozen `legacyId`, never recomputed from its current array position
  — to its item's real stable id on every load and after every import.
  When both a legacy and stable record already exist for the same item,
  migration keeps the entire record (`c`, `n`, and `ts` together) from
  whichever key was written more recently, deterministic ties favoring the
  canonical stable-key record — a conservative snapshot policy, not an
  arithmetic merge, because these records carry no attempt-level
  provenance and their histories cannot be assumed disjoint. Does not
  require a `SCHEMA_V` bump. 17 new dependency-free regression tests in
  `tests/dom-behavior.mjs` plus a structural check in
  `tests/validate-course.mjs` that verifies all 30 `id`/`legacyId` pairs
  against an independently hard-coded, frozen historical mapping table —
  exact key-for-key and value-for-value equality, not merely that every
  value happens to be unique, which a swap between two items' `legacyId`
  values would still satisfy. Also includes a true end-to-end reordering
  proof and a reorder-before-migration proof that both run the real
  product script with `EXERCISES.ex7.items.reverse()` injected into a copy
  of the exact inline script text. Mutation-tested. See
  `docs/QUALITY_LOG.md` QL-005 and `docs/VALIDATION.md` "Stable
  exercise-item identity" (Issue #2)
- `tests/e2e/figure-9-1-morphology.spec.mjs`: real-browser bounding-box
  regression coverage (not screenshots) for Figure 9.1's centromere-morphology
  labels — each label's containment inside its own card and inside the
  figure, no pairwise label-bounding-box intersection, no label text
  clipping, and no page-level horizontal overflow, across all five
  acceptance-criteria viewports (1440×900, 1280×900, 768×1024, 390×844,
  360×800). Mutation-verified: reverted against the pre-fix markup, 10 of 12
  test runs failed for the expected reason (zero `.morph-label`/`.morph-item`
  elements found), confirming the suite actually depends on the fix. See
  `docs/QUALITY_LOG.md` for the full diagnosis
- `assets/images/wellcome-b0000249-trisomy21-karyotype-47xy.jpg`: replaces
  the removed CDC PHIL trisomy-21 image as Figure 10.1 — a genuine,
  individually numbered (1–22, X, Y) G-banded karyogram labeled
  "47,XY,+21 TRISOMY 21 (DOWN'S SYNDROME)" on the plate itself, with an
  arrow marking the third chromosome-21 copy, from Wellcome Collection
  (credit: Wessex Regional Genetics Centre), CC BY 4.0, 1176×1158 pixels.
  Selected only after decoding and visually inspecting it directly (not
  from its filename or listing text) and after the same direct-inspection
  step rejected a same-collection, similarly named Wikimedia Commons
  candidate that turned out to be an unsorted, overlapping metaphase spread
  rather than an arranged karyogram. See `THIRD_PARTY_NOTICES.md` for the
  full provenance/license record

- `tests/e2e/progressive-disclosure.spec.mjs`: real-browser regression
  coverage for the quiz/exercise progressive-disclosure redesign below —
  default collapsed state with an informative summary, click/keyboard/touch
  expand and collapse, status/score correctly derived from persisted
  progress after reload (partial and completed, for both a quiz and an
  exercise), a correctness-changing reattempt replacing rather than
  double-counting a prior result, toggling and loading never touching
  stored progress or firing a `progress` event, Reset behavior, print
  exposure (including a pre-existing case-study `details.card` regression
  check), and no narrow-viewport overflow. See `docs/QUALITY_LOG.md`
  QL-021 and its addendum, and `docs/VALIDATION.md` "Quiz/exercise
  progressive-disclosure suite"
- `tests/e2e/visual-polish.spec.mjs`: real-browser regression coverage (46
  runs across both Playwright projects, plus 1440×900/768×1024/360×800
  exercised directly within the file) for the visual-polish fixes below —
  no horizontal overflow, no mobile-header control overlap/clipping, the
  hamburger/Print/Reset controls each independently proven Tab-reachable,
  visibly focused, keyboard-operable, and touch-operable (Reset additionally
  seeding and clearing disposable progress via both paths), zero "Image
  needed" placeholder text, figures constrained to the viewport, captions
  that stay attached and readable, and representative components (callouts,
  case studies, quick-reference cards, disclaimers, the source note) proven
  unaffected by the reading-measure rule. See `docs/QUALITY_LOG.md` QL-020
  and its addendum, and `docs/VALIDATION.md` "Visual-polish regression
  suite"

- `assets/images/`: the two previously remote, approved course images —
  `nhgri-human-male-karyotype-46xy.png` and
  `cdc-phil-12504-trisomy21-karyotype.jpg` — committed byte-for-byte as
  fetched from the exact URLs the page already displayed remotely (no
  re-encoding or editing). See `THIRD_PARTY_NOTICES.md` for retrieval dates,
  SHA-256 hashes, and license basis
- `assets/fonts/ibm-plex-sans/` and `assets/fonts/ibm-plex-mono/`: the exact
  IBM Plex Sans (400/500/600/700) and IBM Plex Mono (400/500/600) weights
  the course uses, as unmodified WOFF2 files from the official
  [IBM/plex](https://github.com/IBM/plex) GitHub release assets
  (`@ibm/plex-sans@1.1.0`, `@ibm/plex-mono@2.5.0`), under the bundled SIL
  Open Font License 1.1 (license text and file hashes recorded in
  `THIRD_PARTY_NOTICES.md`)
- A structural check (`tests/validate-course.mjs`) proving every `@font-face`
  `src` and both embedded figures' `<img src>` resolve to a local
  `assets/` path, that no reference to `fonts.googleapis.com`/
  `fonts.gstatic.com` remains, that every referenced local asset actually
  exists on disk with nonzero size, and that the figures' external
  source-page/credit links are unchanged. Mutation-tested
- `tests/e2e/local-images.spec.mjs`: a local real-browser check (both
  viewport projects) that both embedded images load with nonzero natural
  dimensions from the local static server — previously untestable without
  network access, now possible because the images are local
- `docs/SCIENTIFIC_REVIEW.md`: the current scientific-review status record.
  States plainly that no question, exercise, flashcard, or case content has
  an independently recorded scientific review yet (Draft, per
  `docs/CONTENT_GOVERNANCE.md`'s content-state definitions); only the exam
  blueprint's domain names and published target ranges are source-checked
  against the dated ASCP BOC content guideline — the current question
  distribution against those ranges is a separate, mechanically measured
  fact, and only the specimen domain currently falls within its published
  range (analysis, molecular, and operations do not; see `README.md`
  "Course coverage"). Reconciles its use of "SME-reviewed" with
  `docs/CONTENT_GOVERNANCE.md`'s existing definition (review by Austin
  specifically) rather than silently broadening it, and distinguishes
  Austin's future documented review from independent second-person review.
  Separates scientific/content review from software validation,
  accessibility testing, source/provenance review, and image/licensing
  (rights) review, each pointing to where its own evidence lives. Covers
  all 17 modules and the 42-question final-exam pool in a status table
  (153 total: 111 across modules + 42 in the separate final pool; counts
  read directly from the committed course data, not estimated), states
  explicitly that passing automated tests establishes structural/behavioral
  consistency and not scientific correctness, and includes a practical
  per-item review checklist and a reusable review-log table format for
  recording future reviews. A structural check (`tests/validate-course.mjs`)
  parses the status table and verifies: the total row count equals the
  live module count plus exactly one; the module-row count alone matches
  the live module count; module IDs are unique (checked explicitly, not
  inferred from `Set`/`Map` construction, which silently collapses
  duplicates); the module-ID set exactly matches the live module set (no
  missing or stale rows); every title matches `getModules()`; every
  per-module question count matches `getQuestions()`; exactly one
  final-pool row exists, identified by an exact `*(pool)*` Module-cell
  match (not by exclusion) with its title verified as exactly "Final
  cumulative exam" and its count matching `getQuestions("final")`; and
  module counts plus the final-pool count reconcile to the live total —
  so future module or content changes, including a duplicated row or a
  renamed pool identifier, can't silently leave the document stale or
  pass an unearned check
- `docs/assets/course-overview.png`: a course-only README screenshot
  (1440x1430, ~274KB), embedded near the top of `README.md` with alt text
  and a link to the full-size image. Generated by `npm run
  capture:readme-screenshot` (`scripts/capture-readme-screenshot.mjs`),
  which captures a fresh ("0 of 17 modules complete") localStorage state at
  the top of the page with transitions disabled (`reducedMotion: "reduce"`),
  and — before capturing — asserts the expected title, hero heading, and
  exactly 17 dashboard cards, and confirms the IBM Plex webfonts actually
  reached `status: "loaded"` (not merely that `document.fonts.ready`
  resolved, which can also happen after a failed font request). Uses an
  OS-assigned ephemeral local-server port and treats an early server exit as
  a conclusive startup failure. This is a generation script, not a test —
  no pixel-comparison assertion was added. Same-environment reproducibility
  is verified with `sha256sum`, not file size. The documented optional
  lossless-PNG-optimization commands install `sharp` into an isolated
  temporary directory (`npm install --no-save --prefix`, `NODE_PATH`) and
  create their working directories with `mktemp -d`, so they run correctly
  on a clean clone with nothing globally pre-installed and no assumed
  pre-existing `/tmp` state — see `docs/QUALITY_LOG.md` QL-017
- `tests/e2e/dashboard-layout.spec.mjs`: a real-browser regression test
  (bounding-box/computed-line-height assertions, not pixel snapshots) added
  after the screenshot itself exposed a genuine dashboard-card layout defect
  (title text running into "Module N" on one line; status text able to
  wrap). Asserts all 17 cards render with title/subtitle on separate
  non-overlapping lines and single-line, non-overlapping status text, at
  both viewports
- Automated WCAG scanning via `@axe-core/playwright`
  (`tests/e2e/accessibility.spec.mjs`), run against the real course at
  desktop and narrow/mobile viewports in five states (fresh load, mobile
  nav open, quiz answered, exercise answered, module complete + flashcard
  flipped); zero violations after fixes
- A representative real-browser keyboard interaction suite
  (`tests/e2e/keyboard-navigation.spec.mjs`) covering the skip link, visible
  sidebar nav, mobile menu, quizzes, exercises, module completion, Print,
  and Reset. Every claimed-reachable control is proven so via real `Tab`
  key presses to the exact target element (never programmatic `.focus()`,
  which would pass on an unreachable `tabindex="-1"` element), with a
  `toHaveAccessibleName()` check against real expected content, a shared
  `assertVisibleFocus()` check (non-`none` outline style, non-zero width,
  non-transparent color) applied uniformly to all nine covered controls, and
  a keyboard-trap check for the mobile menu
- `@axe-core/playwright` as a development-only dependency
- A dependency-free DOM behavior suite covering navigation, quizzes,
  exercises, migration, persistence, Reset, import/export, print, the public
  API, API events, analytics, and implemented keyboard/accessibility affordances
- A minimal DOM harness so behavior checks run on stock Node without adding a
  dependency or CI install step
- Mutation checks proving that regressions in migration, legacy Reset cleanup,
  answer recording, and import-version validation are detected
- A real-browser Playwright/Chromium smoke suite (`tests/e2e/`, `npm run
  test:e2e`) covering page initialization, navigation and mobile-sidebar
  behavior, scroll-driven active-nav highlighting, correct/incorrect quiz
  interaction, exercise interaction, module-completion persistence across a
  real reload, v1-to-v2 migration, Reset clearing both storage keys (accept
  and decline paths), import/export, the public API and its events, print
  invocation, and page-origin console cleanliness, at desktop and
  narrow/mobile viewports
- `@playwright/test` as a development-only dependency, plus a `package-lock.json`
- `playwright.config.mjs` and a local static-server (`python3 -m http.server`)
  arrangement Playwright and GitHub Actions both use to serve the course
- A dedicated deployed-site Playwright smoke suite (`tests/e2e-deployed/`,
  `npm run test:deployed`, `playwright.deployed.config.mjs`) targeting the
  real HTTPS GitHub Pages deployment (URL configurable via
  `DEPLOYED_BASE_URL`, default
  `https://jaustinanderson.github.io/cytogenetics-cg-course/`) at the same
  1280x900 and 390x844 viewports as the local suite. Verifies a successful
  HTTPS response, expected title/heading, the 17 quiz mounts / 17 modules / 6
  exercise sets, page-origin console cleanliness, absence of horizontal
  overflow at the narrow viewport, touch-emulated (`hasTouch`/`.tap()`)
  mobile-navigation open/close/backdrop/module-link behavior with
  `aria-expanded` checked against the sidebar's actual on/off-canvas
  position, a touch-emulated quiz interaction, module-completion persistence
  across a real reload in an isolated browser context (`browser.newContext({
  baseURL })`, with an explicit assertion that navigation reached the
  expected deployed origin/path), and the natural decoded dimensions of the
  two approved remote images. Entirely separate from `tests/e2e/`: it has no
  `webServer`, is never invoked by `npm test` or `npm run test:e2e`, and
  requires outbound internet access only when explicitly run
- `scripts/verify-deployed-revision.mjs` (`npm run
  verify:deployed-revision`), which requires **both** of two checks to agree
  before treating a deployment as verified: GitHub's deployments API record
  for the `github-pages` environment (commit SHA + status) for the target
  commit, and a cache-busted, no-cache SHA-256 comparison of the live
  `index.html` at the exact `DEPLOYED_BASE_URL` against the checked-out
  `index.html`. Each check's precise, narrower scope — the API proves a
  registered build record, the hash proves current live-artifact equivalence,
  neither alone proves "the currently served commit" — is stated in the
  script's own comments and log output, not only in documentation. Warns
  explicitly if `DEPLOYED_BASE_URL` doesn't match the canonical Pages URL
  derived from `GITHUB_REPOSITORY`, so overriding the target URL without
  also binding the repository/commit it verifies cannot silently claim a
  meaningless result
- `tests/verify-deployed-revision.mjs` (part of `npm test`): focused,
  loopback-only checks of the hashing/fetch logic (identical/differing
  content hashes, and a local HTTP server standing in for "the live URL"
  fetched with a distinct cache-busting query parameter each time), requiring
  no external network access
- `.github/workflows/deployed-smoke.yml`: a separate, network-dependent
  workflow (manual `workflow_dispatch`, plus automatic `workflow_run` after
  GitHub's own `pages-build-deployment` completes on `main`) that runs the
  revision check and the deployed suite against the same `DEPLOYED_BASE_URL`
  (bound once at job level); requests `deployments: read` alongside
  `contents: read`. `ci.yml` is unchanged and still requires no external
  network access

### Changed

- Figure 9.1 (centromere morphology) no longer renders its three labels as
  embedded SVG `<text>` inside one fixed viewBox — the layout that produced
  "Metacentric" overlapping "Submetacentric" and "Acrocentric + satellite"
  extending outside the figure at real widths. Each morphology is now a
  separate, individually contained card in a responsive CSS grid
  (`.fig-morph-grid`, `repeat(auto-fit,minmax(150px,1fr))`) with the label as
  ordinary wrapping HTML text below a small, label-free drawing. Stacks to a
  single column at narrow widths, verified at all five acceptance-criteria
  viewports with no overlap, no clipping, and no horizontal page overflow.
  The figure keeps its "(schematic)" title and caption badge unchanged
- Figure 10.1 (trisomy 21 karyotype) replaced: removed the CDC PHIL image
  (heavily thresholded, chromosomes grouped but not individually numbered,
  and — confirmed by reading its own printed group label rather than
  assumed — an XX-derived karyotype that did not match the course's own
  primary `47,XY,+21` worked ISCN example directly beneath it) and embedded
  a Wellcome Collection karyogram instead (CC BY 4.0, Wessex Regional
  Genetics Centre; see "Added" above). Figure title, alt text, caption, and
  the `IMAGES` manifest record were all updated to match; no ISCN notation,
  question, or scoring content changed
- Every quiz and exercise widget (`.quiz`, `.exer`) is now a native
  `<details>`/`<summary>` element, collapsed by default, instead of an
  always-fully-expanded block — the same disclosure pattern already used
  for case-study reveal cards. The summary communicates activity type,
  title, item count, and a "Not started"/"In progress"/"Completed" status
  word; the pre-existing `.qh-score`/`.eh-score` "X / Y" text is unchanged.
  Because the widget is collapsed by default, this summary is the
  learner's primary status indicator, so status and score are derived from
  `state.answers`/`state.exercises` on every render rather than reset to
  zero — a fresh activity reads "Not started — 0 / N," one with existing
  records reads "In progress — X / N" or "Completed — N / N" immediately
  on load, and reattempting a previously recorded item replaces its latest
  result instead of double-counting it. Measured at 1440×900: document
  height dropped 45.2% (110,209px → 60,386px), quiz/exercise share of
  document height dropped from 46.6% to 2.5%, and answer buttons
  simultaneously visible on a fresh load dropped from 636 to 0. Question
  text, answers, rationales, scoring, completion rules, stable question/
  exercise IDs, progress storage schema, analytics semantics, and the
  public API are unchanged; opening/closing a disclosure, and loading a
  page with existing progress records, is never recorded as new progress
  and fires no API event. See `docs/QUALITY_LOG.md` QL-021 and its
  addendum, and `docs/VALIDATION.md` "Quiz/exercise progressive-disclosure
  suite"
- Fixed a print-exposure defect affecting both the new quiz/exercise
  disclosures and the pre-existing case-study reveal cards: the
  `display:block !important` CSS override for closed `<details>` content
  did not actually work under real print media (Chromium suppresses that
  content via an internal rendering behavior, not a plain `display`
  value). `beforeprint`/`afterprint` now force-open every `<details>` for
  the duration of printing and restore each one's true prior state
  afterward
- Removed the five learner-facing "Image needed" authoring/search placeholder
  figures from Modules 8–12. No new scientific explanation was added in their
  place — where the surrounding lesson text did not already stand alone, the
  placeholder was simply deleted, identical treatment across all five. No new
  imagery was fabricated, generated, downloaded, or embedded — only the two
  already-approved local images remain embedded, and the image manifest's
  provenance records are unchanged. The "Image credits & licensing" section's
  remaining prose was reworded to describe the same unfilled candidates
  without shipping search instructions in the learner UI
- Capped embedded figure images at `max-height:min(52vh,460px)` so they stay
  proportionate to surrounding content instead of dominating most of a
  screen before their caption is visible
- Raised figcaption/`.src`/`.lic` font sizes (.92rem/.85rem/.78rem) and
  recolored `.src` from `--ink-faint` to the already-AA-passing `--ink-soft`
  for more comfortable reading
- Added a `max-width:70ch` reading-measure cap scoped to genuine long-form
  lesson prose (`.module p:not(.callout p):not(.case-body p):
  not(.grid-card p):not(.source-note)`, derived from a real-DOM survey of
  every paragraph in the document); tables, quizzes, exercises, callouts,
  case studies, quick-reference cards, disclaimers, and the exam-weighting
  source note are confirmed unaffected — see `docs/QUALITY_LOG.md` QL-020's
  addendum
- Fixed a mobile-header flexbox bug where the brand-name wrapper's default
  `min-width:auto` refused to shrink, causing the course name to visually
  overlap the Print button around 390px/360px; the brand text now shrinks
  and ellipsizes correctly. At ≤560px, Print/Reset become icon-only with an
  explicit `aria-label` matching their visible text, preserving their
  accessible name
- The course no longer requests any third-party font or image host at
  runtime: the Google Fonts `<link>`/`preconnect` tags are replaced with
  local `@font-face` rules, and both figures' `<img src>` and the
  `IMAGES` data array now point at the local `assets/images/` files
  (external source-page/credit links are unchanged). See
  `docs/ARCHITECTURE.md` "External resources" and `docs/VALIDATION.md`
  "Asset localization"
- `tests/e2e-deployed/remote-images.spec.mjs` renamed to
  `local-images.spec.mjs` and updated to assert same-origin delivery, now
  that the images it checks are localized rather than third-party
- `docs/assets/course-overview.png` regenerated after self-hosting the
  fonts: a pixel-buffer diff against the previous version showed only
  text-glyph anti-aliasing differences (a different font binary rendering
  the same text), no layout/content change — see `docs/VALIDATION.md`
  "README screenshot"
- `npm test` now runs structural validation followed by 36 DOM behavior checks
- Validation documentation now distinguishes the DOM harness from the
  real-browser Playwright suite, and both from the accessibility, screen-reader,
  and rights-review gates that remain open
- CI now installs dependencies and a Chromium binary and runs the Playwright
  suite after `npm test`, uploading the HTML report as a build artifact on
  failure
- Darkened the `--ink-faint`, `--accent`, and `--ok-ink` CSS color variables to
  meet WCAG AA 4.5:1 text contrast (no other visual change)
- Corrected 22 heading-order violations (17 "Learning objectives" headings
  plus 5 others) to the correct heading level, with a matching CSS override
  so their visible size and weight are unchanged
- Added an accessible name (or `aria-hidden`, where the image is purely
  redundant with adjacent quiz/exercise text) to instructional/quiz/exercise
  SVGs via a new optional parameter on the shared `svgWrap()` helper
- Added a visually hidden label to the two comparison-table corner cells
  that previously had no accessible header text
- Made the 18 scrollable data-table containers keyboard-focusable

### Fixed

- The skip link's target (`#main`) is now focusable, so keyboard-activating
  "Skip to content" moves focus into the content instead of silently
  returning it to `<body>`
- Progress-dashboard cards no longer run the module title directly into
  "Module N" on one line, and the "To do"/"Done" status text can no longer
  wrap — found from the committed README screenshot itself, confirmed
  against `index.html`, and fixed with a scoped CSS/markup change (a new
  `.dc-body` wrapper class with flex/column layout, `display:block` on the
  title/subtitle, `flex:0 0 auto`/`white-space:nowrap` on the status). No
  scientific content changed
- The new quiz/exercise disclosure summary text (`.qh-meta`/`.eh-meta`)
  initially used `--ink-faint`, which measured 4.31–4.41:1 against its
  background — just under the WCAG AA 4.5:1 threshold, found by the
  existing axe-core suite on the very first run. Changed to `--ink-soft`
  (6.23–6.39:1)
- Independent review of the still-open, unmerged progressive-disclosure PR
  found that a collapsed quiz/exercise summary reset to "Not started —
  0 / N" after a page reload even when `getProgress()` still held correct
  answer records, because `buildQuiz`/`buildExercise` always initialized
  score/answered to zero instead of deriving them from persisted state.
  Fixed by seeding both from `state.answers`/`state.exercises` before
  rendering; see `docs/QUALITY_LOG.md` QL-021's addendum

## [1.1.1] - 2026-07-30

### Added

- Professional repository documentation and collaboration guidance
- Structural and content-contract validator
- GitHub Actions validation workflow
- Content, licensing, validation, architecture, and quality-governance records
- Live GitHub Pages deployment and deployed-course validation record

### Changed

- Renamed the distributable course artifact to `index.html`
- Removed the unused Tailwind browser-CDN dependency
- Corrected the exercise-set count from five to six
- Added explicit button types and removed avoidable static inline styles
- Strengthened `addQuestions()` with full schema checks, global duplicate-ID
  detection, answer-bound validation, and atomic batch rejection
- Added module-ID validation to `markModule()`
- Clarified the local-progress privacy statement
- Added an independent-project and no-recalled-exam-questions disclaimer

### Fixed

- Reset now clears both v2 state and the legacy v1 migration source

## [1.1] - 2026-07-30

- Imported Claude's Phase 0 course baseline with 153 tagged questions,
  progress-schema v2, analytics, a public integration API, and the image
  manifest.
