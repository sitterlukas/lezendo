import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { routeWriteSchema } from "@whipperbook/validation";
import { gradeSystemError } from "@/lib/forms";
import db from "@/lib/db";

// POST /api/routes — create a route. Returns { id } (replaces addRoute).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const data = await readJson(request, routeWriteSchema);

  const err = await gradeSystemError(
    data.grading_system_id,
    data.grade,
    data.style,
  );
  if (err) return fail(err, 400);

  const crag = await db
    .selectFrom("crags")
    .select("id")
    .where("id", "=", data.crag_id)
    .executeTakeFirst();
  if (!crag) return fail("Crag not found.", 404);

  if (data.sector_id) {
    const sector = await db
      .selectFrom("sectors")
      .select("id")
      .where("id", "=", data.sector_id)
      .where("crag_id", "=", data.crag_id)
      .executeTakeFirst();
    if (!sector) return fail("Sector not found.", 404);
  }

  const row = await db
    .insertInto("routes")
    .values({
      name: data.name,
      crag_id: data.crag_id,
      sector_id: data.sector_id,
      grade: data.grade,
      grading_system_id: data.grading_system_id,
      style: data.style,
      height_m: data.height_m,
      bolt_count: data.bolt_count,
      protection: data.protection,
      first_ascensionist: data.first_ascensionist,
      first_ascent_year: data.first_ascent_year,
      pitches: data.pitches,
      gear_notes: data.gear_notes,
      description: data.description,
      created_by: user.id,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return ok({ id: row.id }, 201);
});
