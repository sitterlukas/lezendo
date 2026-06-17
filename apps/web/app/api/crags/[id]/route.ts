import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser, canModify, getUser } from "@/lib/api/auth";
import { cragWriteSchema } from "@whipperbook/validation";
import { getCragDetail } from "@/lib/queries/crags";
import { setEntityDeleted } from "@/lib/soft-delete";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/crags/[id] — full crag detail bundle (crag, sectors, routes with
// viewer-resolved grades, images, admin deleted lists). 404 when missing.
export const GET = route<Ctx>(async (request, { params }) => {
  const cragId = Number((await params).id);
  if (!Number.isInteger(cragId)) return fail("Invalid crag.", 400);
  const viewer = await getUser(request);
  const data = await getCragDetail(
    cragId,
    viewer ? { id: viewer.id, role: viewer.role } : null,
  );
  if (!data) return fail("Crag not found.", 404);
  return ok(data);
});

// PATCH /api/crags/[id] — edit a crag (replaces updateCrag).
export const PATCH = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const cragId = Number((await params).id);
  if (!Number.isInteger(cragId)) return fail("Invalid crag.", 400);

  const data = await readJson(request, cragWriteSchema);

  const crag = await db
    .selectFrom("crags")
    .select(["id", "created_by"])
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return fail("Crag not found.", 404);
  if (!canModify(user, crag.created_by)) return fail("Not allowed.", 403);

  await db
    .updateTable("crags")
    .set({
      name: data.name,
      area: data.area,
      country: data.country,
      description: data.description,
      rock_type: data.rock_type,
      aspect: data.aspect,
      best_season: data.best_season,
      access_notes: data.access_notes,
    })
    .where("id", "=", cragId)
    .execute();

  return ok({ ok: true });
});

// DELETE /api/crags/[id] — soft-delete a crag (replaces deleteCrag). Returns
// the path the client should navigate to.
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const cragId = Number((await params).id);
  if (!Number.isInteger(cragId)) return fail("Invalid crag.", 400);

  await setEntityDeleted("crags", "crag", cragId, true, user);
  return ok({ redirect: "/crags" });
});
