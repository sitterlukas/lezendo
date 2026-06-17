import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import {
  readForm,
  styles,
  gradeSystemError,
  parseBolting,
  parseRouteDetails,
} from "@/lib/forms";
import db, { type ClimbStyle } from "@/lib/db";

// POST /api/routes — create a route. Returns { id } (replaces addRoute).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const form = await readForm(request);

  const name = String(form.get("name") ?? "").trim();
  const cragId = Number(form.get("crag_id"));
  const sectorIdRaw = String(form.get("sector_id") ?? "").trim();
  const sectorId = sectorIdRaw ? Number(sectorIdRaw) : null;
  const grade = String(form.get("grade") ?? "").trim();
  const style = String(form.get("style") ?? "sport") as ClimbStyle;
  const heightRaw = String(form.get("height_m") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const gradingSystemId = Number(
    String(form.get("grading_system_id") ?? "").trim(),
  );

  if (!name) return fail("Name is required.", 400);
  if (!grade) return fail("Grade is required.", 400);
  if (!Number.isInteger(cragId)) return fail("Invalid crag.", 400);
  if (!styles.includes(style)) return fail("Invalid type.", 400);
  if (!Number.isInteger(gradingSystemId) || gradingSystemId <= 0) {
    return fail("Pick a grading system.", 400);
  }
  const gradeError = await gradeSystemError(gradingSystemId, grade, style);
  if (gradeError) return fail(gradeError, 400);

  const crag = await db
    .selectFrom("crags")
    .select("id")
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return fail("Crag not found.", 404);

  if (sectorId) {
    const sector = await db
      .selectFrom("sectors")
      .select("id")
      .where("id", "=", sectorId)
      .where("crag_id", "=", cragId)
      .executeTakeFirst();
    if (!sector) return fail("Sector not found.", 404);
  }

  const height = heightRaw ? Number.parseInt(heightRaw, 10) : null;
  const { boltCount, protection } = parseBolting(form);
  const { firstAscensionist, firstAscentYear, pitches, gearNotes } =
    parseRouteDetails(form);

  const row = await db
    .insertInto("routes")
    .values({
      name,
      crag_id: cragId,
      sector_id: sectorId,
      grade,
      grading_system_id: gradingSystemId,
      style,
      height_m: height && !Number.isNaN(height) ? height : null,
      bolt_count: boltCount,
      protection,
      first_ascensionist: firstAscensionist,
      first_ascent_year: firstAscentYear,
      pitches,
      gear_notes: gearNotes,
      description: description || null,
      created_by: user.id,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  revalidatePath("/crags", "layout");
  revalidatePath("/");
  return ok({ id: row.id }, 201);
});
