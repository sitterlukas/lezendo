// Grade data lives in the `grade_equivalencies` DB table; the functions here are
// pure and operate on rows loaded from it (see `loadGradeEquivalencies` in
// `lib/grade-data.ts`). Keeping them free of any `db` import lets client
// components import them and pass the loaded rows in as a prop.
//
// Rope systems (french/yds/uiaa/british) share one rank scale; bouldering
// systems (font/v-scale) share another. The two overlap numerically but are
// different disciplines, so cross-discipline conversion is intentionally blocked.

export interface GradeEquivalency {
  gradingSystemId: number;
  slug: string;
  grade: string;
  rank: number;
  discipline: "rope" | "boulder";
}

interface GradingSystem {
  id: number;
  name: string;
  slug: string;
}

export function disciplineOf(
  slug: string,
  eqs: GradeEquivalency[],
): "rope" | "boulder" | null {
  return eqs.find((e) => e.slug === slug)?.discipline ?? null;
}

/**
 * Return all grades for a system in ascending difficulty order.
 */
export function gradesForSystem(
  slug: string,
  eqs: GradeEquivalency[],
): string[] {
  return eqs
    .filter((e) => e.slug === slug)
    .sort((a, b) => a.rank - b.rank)
    .map((e) => e.grade);
}

/**
 * Convert a grade from one system to another.
 * Returns null when the source grade is unknown or when converting between
 * disciplines (rope ↔ boulder), since those aren't meaningfully comparable.
 */
function convertGrade(
  grade: string,
  fromSlug: string,
  toSlug: string,
  eqs: GradeEquivalency[],
): string | null {
  if (fromSlug === toSlug) return grade;
  if (disciplineOf(fromSlug, eqs) !== disciplineOf(toSlug, eqs)) return null;

  const src = eqs.find(
    (e) =>
      e.slug === fromSlug &&
      e.grade.toLowerCase() === grade.trim().toLowerCase(),
  );
  if (!src) return null;

  const targets = eqs.filter((e) => e.slug === toSlug);
  if (!targets.length) return null;

  return targets.reduce((best, e) =>
    Math.abs(e.rank - src.rank) < Math.abs(best.rank - src.rank) ? e : best,
  ).grade;
}

/**
 * Resolve the grade to display for a route given the user's preferred system.
 * Returns the converted grade (or original if no conversion is possible) along
 * with the original grade and the name of the system being shown.
 */
export function resolveGrade(
  grade: string,
  routeSystemId: number,
  gradingSystems: GradingSystem[],
  prefs: { rope?: number | null; boulder?: number | null },
  eqs: GradeEquivalency[],
): { grade: string; originalGrade: string | null; systemName: string | null } {
  const routeSlug =
    gradingSystems.find((gs) => gs.id === routeSystemId)?.slug ?? null;

  // Pick the preference matching the route's own discipline.
  const routeDiscipline = routeSlug ? disciplineOf(routeSlug, eqs) : null;
  const preferredSystemId =
    routeDiscipline === "boulder"
      ? prefs.boulder
      : routeDiscipline === "rope"
        ? prefs.rope
        : null;
  const preferredSlug =
    gradingSystems.find((gs) => gs.id === preferredSystemId)?.slug ?? null;

  const converted =
    grade && routeSlug && preferredSlug
      ? convertGrade(grade, routeSlug, preferredSlug, eqs)
      : null;
  const isConverted = !!converted && converted !== grade;

  return {
    grade: isConverted ? converted! : grade,
    originalGrade: isConverted ? grade : null,
    systemName:
      gradingSystems.find(
        (gs) => gs.id === (isConverted ? preferredSystemId : routeSystemId),
      )?.name ?? null,
  };
}
