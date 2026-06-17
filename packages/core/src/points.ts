// Send scoring.
//
// Difficulty is perceived logarithmically, so points grow geometrically with
// grade: the easiest grade in a discipline is worth POINTS_BASE, and every
// harder grade step multiplies by POINTS_GROWTH. Grade "steps" are the ordinal
// positions on the shared difficulty scale (`grade_equivalencies.equivalency_id`),
// computed per discipline so rope and boulder each start their own ladder at 0.

export const POINTS_BASE = 10;
export const POINTS_GROWTH = 1.3;

/** Plain-language description of the scoring, shared across the UI. */
export const POINTS_EXPLAINER =
  `Each send earns points based on its grade: the easiest grade is worth ${POINTS_BASE}, ` +
  `and every harder grade step multiplies the score by ${POINTS_GROWTH}×. ` +
  `Rope and boulder are scored on separate ladders, and equal difficulty earns equal ` +
  `points regardless of grading system. Attempts don't count.`;

/** Points for a send at the given 0-based grade index within its discipline. */
export function gradePoints(index: number): number {
  return Math.round(POINTS_BASE * POINTS_GROWTH ** index);
}
