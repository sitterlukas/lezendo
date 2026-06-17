import db from "@/lib/db";
import { gradesForSystem, disciplineOf } from "@whipperbook/core";
import { loadGradeEquivalencies } from "@/lib/grade-data";

// ── Cross-record validators (run after schema parsing) ───────────────────────

// Resolve the optional sector tag for a status: the sector id, null when no tag
// was chosen, or INVALID_SECTOR when the id is malformed or points at a
// missing/deleted sector.
export const INVALID_SECTOR = Symbol("invalid-sector");

export async function resolveSectorTag(
  raw: unknown,
): Promise<number | null | typeof INVALID_SECTOR> {
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return null;
  const id = Number(s);
  if (!Number.isInteger(id)) return INVALID_SECTOR;
  const sector = await db
    .selectFrom("sectors")
    .select("id")
    .where("id", "=", id)
    .where("deleted", "=", false)
    .executeTakeFirst();
  return sector ? id : INVALID_SECTOR;
}

// Bouldering is its own discipline; sport and trad are both roped.
const disciplineForStyle = (style: "sport" | "trad" | "boulder") =>
  style === "boulder" ? "boulder" : "rope";

// Validates the grading system + grade for a route. Returns an error message to
// surface, or null when valid.
export async function gradeSystemError(
  gradingSystemId: number,
  grade: string,
  style: "sport" | "trad" | "boulder",
): Promise<string | null> {
  const gs = await db
    .selectFrom("grading_systems")
    .select("slug")
    .where("id", "=", gradingSystemId)
    .executeTakeFirst();
  if (!gs) return "Unknown grading system.";

  const eqs = await loadGradeEquivalencies();
  const want = disciplineForStyle(style);
  if (disciplineOf(gs.slug, eqs) !== want) {
    return want === "boulder"
      ? "Boulders must use a boulder grading system (e.g. Font or V-scale)."
      : "Roped routes must use a roped grading system (e.g. French, YDS, UIAA, or British).";
  }
  if (!gradesForSystem(gs.slug, eqs).includes(grade)) {
    return `"${grade}" is not a valid grade for the selected grading system.`;
  }
  return null;
}
