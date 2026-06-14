import db from "@/lib/db";
import type { GradeEquivalency } from "@/lib/grade-conversion";

/**
 * Load all grade equivalencies (joined with their system slug) — the single
 * source of truth for grade conversion and valid-grade lists. The set is small
 * (~150 rows), so it's loaded in full and handed to the pure helpers in
 * `lib/grade-conversion.ts`.
 */
export async function loadGradeEquivalencies(): Promise<GradeEquivalency[]> {
  return db
    .selectFrom("grade_equivalencies as ge")
    .innerJoin("grading_systems as gs", "gs.id", "ge.grading_system_id")
    .select([
      "ge.grading_system_id as gradingSystemId",
      "gs.slug as slug",
      "ge.grade as grade",
      "ge.equivalency_id as rank",
      "ge.discipline as discipline",
    ])
    .execute();
}
