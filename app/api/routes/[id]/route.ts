import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser, canModify, getUser } from "@/lib/api/auth";
import {
  readForm,
  styles,
  gradeSystemError,
  parseBolting,
  parseRouteDetails,
} from "@/lib/forms";
import { getRouteDetail } from "@/lib/queries/routes";
import { logDeletion } from "@/lib/deletion-log";
import db, { type ClimbStyle } from "@/lib/db";

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

  const form = await readForm(request);
  const cragId = Number(form.get("crag_id"));
  const sectorIdRaw = String(form.get("sector_id") ?? "").trim();
  const sectorId = sectorIdRaw ? Number(sectorIdRaw) : null;
  const name = String(form.get("name") ?? "").trim();
  const grade = String(form.get("grade") ?? "").trim();
  const style = String(form.get("style") ?? "") as ClimbStyle;
  const heightRaw = String(form.get("height_m") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const gradingSystemId = Number(
    String(form.get("grading_system_id") ?? "").trim(),
  );

  if (!name) return fail("Name is required.", 400);
  if (!grade) return fail("Grade is required.", 400);
  if (!styles.includes(style)) return fail("Invalid type.", 400);
  if (!Number.isInteger(gradingSystemId) || gradingSystemId <= 0) {
    return fail("Pick a grading system.", 400);
  }
  const gradeError = await gradeSystemError(gradingSystemId, grade, style);
  if (gradeError) return fail(gradeError, 400);

  const existing = await db
    .selectFrom("routes")
    .select(["id", "created_by"])
    .where("id", "=", routeId)
    .executeTakeFirst();
  if (!existing) return fail("Route not found.", 404);
  if (!canModify(user, existing.created_by)) return fail("Not allowed.", 403);

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

  await db
    .updateTable("routes")
    .set({
      name,
      grade,
      grading_system_id: gradingSystemId,
      style,
      sector_id: sectorId,
      height_m: height && !Number.isNaN(height) ? height : null,
      bolt_count: boltCount,
      protection,
      first_ascensionist: firstAscensionist,
      first_ascent_year: firstAscentYear,
      pitches,
      gear_notes: gearNotes,
      description: description || null,
    })
    .where("id", "=", routeId)
    .execute();

  revalidatePath("/crags", "layout");
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
    .select(["id", "name", "crag_id", "created_by"])
    .where("id", "=", routeId)
    .executeTakeFirst();
  if (!existing) return fail("Route not found.", 404);
  if (!canModify(user, existing.created_by)) return fail("Not allowed.", 403);

  await db
    .updateTable("routes")
    .set({ deleted: true })
    .where("id", "=", routeId)
    .execute();
  await logDeletion("route", routeId, existing.name, "delete", user.id);

  revalidatePath("/crags", "layout");
  return ok({ redirect: `/crags/${existing.crag_id}` });
});
