// Frozen, exact 153-question stable-ID manifest (docs/ASSESSMENT_VALIDITY.md
// section 2, "Frozen exact-identity manifest"; QL-033, docs/QUALITY_LOG.md).
//
// This list is intentionally NOT derived from the live bank at import
// time -- it is a point-in-time snapshot, reproduced once (via
// `npm run audit:assessment-cues -- --json` against the commit this file
// was authored on) and committed as a literal value. Its entire purpose
// is to let scripts/assessment-cue-audit.mjs detect a LATER change to
// which questions exist -- a removed id, an added id, or one id replaced
// by another -- even in the case where every AGGREGATE count in
// ORIGINAL_BASELINE (total, position counts, length-cue counts) would
// otherwise still match by coincidence. If this file derived its list
// from the live bank on every run, it could never detect that case.
//
// Do not edit this list to make a later comparison pass. If the live
// bank's authored-question identity genuinely changes for a legitimate
// reason (e.g. a future Phase 0 batch supersedes an id per
// docs/LEARNING_PLATFORM_ROADMAP.md Phase 0 step 4), this file is
// updated as part of that separately reviewed change, with the reason
// recorded in docs/QUALITY_LOG.md -- never edited silently alongside an
// unrelated change.
export const ORIGINAL_ID_MANIFEST_IDS = Object.freeze([
  "m1-q1", "m1-q2", "m1-q3", "m1-q4", "m1-q5",
  "m2-q1", "m2-q2", "m2-q3", "m2-q4", "m2-q5", "m2-q6",
  "m3-q1", "m3-q2", "m3-q3", "m3-q4", "m3-q5", "m3-q6",
  "m4-q1", "m4-q2", "m4-q3", "m4-q4", "m4-q5", "m4-q6",
  "m5-q1", "m5-q2", "m5-q3", "m5-q4", "m5-q5", "m5-q6",
  "m6-q1", "m6-q2", "m6-q3", "m6-q4", "m6-q5", "m6-q6", "m6-q7",
  "m7-q1", "m7-q2", "m7-q3", "m7-q4", "m7-q5", "m7-q6", "m7-q7",
  "m8-q1", "m8-q2", "m8-q3", "m8-q4", "m8-q5", "m8-q6",
  "m9-q1", "m9-q2", "m9-q3", "m9-q4", "m9-q5", "m9-q6", "m9-q7", "m9-q8",
  "m10-q1", "m10-q2", "m10-q3", "m10-q4", "m10-q5", "m10-q6", "m10-q7", "m10-q8",
  "m11-q1", "m11-q2", "m11-q3", "m11-q4", "m11-q5", "m11-q6", "m11-q7",
  "m12-q1", "m12-q2", "m12-q3", "m12-q4", "m12-q5", "m12-q6", "m12-q7", "m12-q8",
  "m13-q1", "m13-q2", "m13-q3", "m13-q4", "m13-q5", "m13-q6", "m13-q7",
  "m14-q1", "m14-q2", "m14-q3", "m14-q4", "m14-q5", "m14-q6", "m14-q7", "m14-q8", "m14-q9",
  "m15-q1", "m15-q2", "m15-q3", "m15-q4", "m15-q5", "m15-q6", "m15-q7", "m15-q8",
  "m16-q1", "m16-q2", "m16-q3", "m16-q4", "m16-q5", "m16-q6", "m16-q7",
  "final-q1", "final-q2", "final-q3", "final-q4", "final-q5", "final-q6", "final-q7",
  "final-q8", "final-q9", "final-q10", "final-q11", "final-q12", "final-q13", "final-q14",
  "final-q15", "final-q16", "final-q17", "final-q18", "final-q19", "final-q20", "final-q21",
  "final-q22", "final-q23", "final-q24", "final-q25", "final-q26", "final-q27", "final-q28",
  "final-q29", "final-q30", "final-q31", "final-q32", "final-q33", "final-q34", "final-q35",
  "final-q36", "final-q37", "final-q38", "final-q39", "final-q40", "final-q41", "final-q42",
]);

// Frozen, exact PER-FORM AUTHORED ENCOUNTER ORDER (docs/ASSESSMENT_VALIDITY.md
// section 2.2, "Per-form encounter-order manifest") -- a SEPARATE contract
// from ORIGINAL_ID_MANIFEST_IDS above. That list freezes WHICH 153
// questions exist (a set-identity check, order-independent by design).
// This one freezes, for each of the 17 forms, the EXACT ORDER `index.html`'s
// `buildQuiz()` renders that form's questions in -- order-SENSITIVE by
// design, because `buildQuiz()` renders `QUIZZES[key]` in exact array
// order with no shuffling of questions or options, making each form's
// authored order a genuine behavioral contract now that
// `evaluateAnswerSequence()` examines it (docs/ASSESSMENT_VALIDITY.md
// section 4.10). Same point-in-time-snapshot discipline as the id
// manifest above: captured once, not derived from the live bank at
// import time, and never edited silently alongside an unrelated change.
export const ORIGINAL_FORM_ORDER_IDS = Object.freeze({
  m1: Object.freeze(["m1-q1", "m1-q2", "m1-q3", "m1-q4", "m1-q5"]),
  m2: Object.freeze(["m2-q1", "m2-q2", "m2-q3", "m2-q4", "m2-q5", "m2-q6"]),
  m3: Object.freeze(["m3-q1", "m3-q2", "m3-q3", "m3-q4", "m3-q5", "m3-q6"]),
  m4: Object.freeze(["m4-q1", "m4-q2", "m4-q3", "m4-q4", "m4-q5", "m4-q6"]),
  m5: Object.freeze(["m5-q1", "m5-q2", "m5-q3", "m5-q4", "m5-q5", "m5-q6"]),
  m6: Object.freeze(["m6-q1", "m6-q2", "m6-q3", "m6-q4", "m6-q5", "m6-q6", "m6-q7"]),
  m7: Object.freeze(["m7-q1", "m7-q2", "m7-q3", "m7-q4", "m7-q5", "m7-q6", "m7-q7"]),
  m8: Object.freeze(["m8-q1", "m8-q2", "m8-q3", "m8-q4", "m8-q5", "m8-q6"]),
  m9: Object.freeze(["m9-q1", "m9-q2", "m9-q3", "m9-q4", "m9-q5", "m9-q6", "m9-q7", "m9-q8"]),
  m10: Object.freeze(["m10-q1", "m10-q2", "m10-q3", "m10-q4", "m10-q5", "m10-q6", "m10-q7", "m10-q8"]),
  m11: Object.freeze(["m11-q1", "m11-q2", "m11-q3", "m11-q4", "m11-q5", "m11-q6", "m11-q7"]),
  m12: Object.freeze(["m12-q1", "m12-q2", "m12-q3", "m12-q4", "m12-q5", "m12-q6", "m12-q7", "m12-q8"]),
  m13: Object.freeze(["m13-q1", "m13-q2", "m13-q3", "m13-q4", "m13-q5", "m13-q6", "m13-q7"]),
  m14: Object.freeze(["m14-q1", "m14-q2", "m14-q3", "m14-q4", "m14-q5", "m14-q6", "m14-q7", "m14-q8", "m14-q9"]),
  m15: Object.freeze(["m15-q1", "m15-q2", "m15-q3", "m15-q4", "m15-q5", "m15-q6", "m15-q7", "m15-q8"]),
  m16: Object.freeze(["m16-q1", "m16-q2", "m16-q3", "m16-q4", "m16-q5", "m16-q6", "m16-q7"]),
  final: Object.freeze([
    "final-q1", "final-q2", "final-q3", "final-q4", "final-q5", "final-q6", "final-q7",
    "final-q8", "final-q9", "final-q10", "final-q11", "final-q12", "final-q13", "final-q14",
    "final-q15", "final-q16", "final-q17", "final-q18", "final-q19", "final-q20", "final-q21",
    "final-q22", "final-q23", "final-q24", "final-q25", "final-q26", "final-q27", "final-q28",
    "final-q29", "final-q30", "final-q31", "final-q32", "final-q33", "final-q34", "final-q35",
    "final-q36", "final-q37", "final-q38", "final-q39", "final-q40", "final-q41", "final-q42",
  ]),
});
