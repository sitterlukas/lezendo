import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser, canModify, getUser } from "@/lib/api/auth";
import { routeWriteSchema, gradeSystemError } from "@/lib/forms";
import { getRouteDetail } from "@/lib/queries/routes";
import { setEntityDeleted } from "@/lib/soft-delete";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/routes/[id]?cragId= — full route detail bundle. 404 when the route
// doesn't exist under that crag.
export const GET = route<Ctx>(async (request, { params }) => {
  const routeId = Number((await params).id);
  const cragId = Number(new URL(request.url).searchParams.get("cragId"));
  if (!Number.isInteger(routeId) || !Number.isInteger(cragId)) {
    return fail("Invalid route.", 400);
  }
  const viewer = await getUser(request);
  const data = await getRouteDetail(
    cragId,
    routeId,
    viewer ? { id: viewer.id, role: viewer.role } : null,
  );
  if (!data) return fail("Route not found.", 404);
  return ok(data);
});

// PATCH /api/routes/[id] — edit a route (replaces updateRoute).
export const PATCH = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const routeId = Number((await params).id);
  if (!Number.isInteger(routeId)) return fail("Invalid route.", 400);

  const data = await readJson(request, routeWriteSchema);

  const err = await gradeSystemError(
    data.grading_system_id,
    data.grade,
    data.style,
  );
  if (err) return fail(err, 400);

  const existing = await db
    .selectFrom("routes")
    .select(["id", "created_by"])
    .where("id", "=", routeId)
    .executeTakeFirst();
  if (!existing) return fail("Route not found.", 404);
  if (!canModify(user, existing.created_by)) return fail("Not allowed.", 403);

  if (data.sector_id) {
    const sector = await db
      .selectFrom("sectors")
      .select("id")
      .where("id", "=", data.sector_id)
      .where("crag_id", "=", data.crag_id)
      .executeTakeFirst();
    if (!sector) return fail("Sector not found.", 404);
  }

  await db
    .updateTable("routes")
    .set({
      name: data.name,
      grade: data.grade,
      grading_system_id: data.grading_system_id,
      style: data.style,
      sector_id: data.sector_id,
      height_m: data.height_m,
      bolt_count: data.bolt_count,
      protection: data.protection,
      first_ascensionist: data.first_ascensionist,
      first_ascent_year: data.first_ascent_year,
      pitches: data.pitches,
      gear_notes: data.gear_notes,
      description: data.description,
    })
    .where("id", "=", routeId)
    .execute();

  return ok({ ok: true });
});

// DELETE /api/routes/[id] — soft-delete a route (replaces deleteRoute). Returns
// the crag path to navigate to.
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const routeId = Number((await params).id);
  if (!Number.isInteger(routeId)) return fail("Invalid route.", 400);

  const existing = await db
    .selectFrom("routes")
    .select("crag_id")
    .where("id", "=", routeId)
    .executeTakeFirst();
  if (!existing) return fail("Route not found.", 404);

  await setEntityDeleted("routes", "route", routeId, true, user);
  return ok({ redirect: `/crags/${existing.crag_id}` });
});
