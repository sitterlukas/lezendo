import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser, canModify, getUser } from "@/lib/api/auth";
import { sectorWriteSchema } from "@whipperbook/validation";
import { getSectorDetail } from "@/lib/queries/sectors";
import { setEntityDeleted } from "@/lib/soft-delete";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/sectors/[id]?cragId= — full sector detail bundle. 404 when the
// sector doesn't exist under that crag.
export const GET = route<Ctx>(async (request, { params }) => {
  const sectorId = Number((await params).id);
  const cragId = Number(new URL(request.url).searchParams.get("cragId"));
  if (!Number.isInteger(sectorId) || !Number.isInteger(cragId)) {
    return fail("Invalid sector.", 400);
  }
  const viewer = await getUser(request);
  const data = await getSectorDetail(
    cragId,
    sectorId,
    viewer ? { id: viewer.id, role: viewer.role } : null,
  );
  if (!data) return fail("Sector not found.", 404);
  return ok(data);
});

// PATCH /api/sectors/[id] — edit a sector's name/description/details (replaces
// updateSector).
export const PATCH = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const sectorId = Number((await params).id);
  if (!Number.isInteger(sectorId)) return fail("Invalid sector.", 400);

  const data = await readJson(request, sectorWriteSchema);

  const sector = await db
    .selectFrom("sectors")
    .select(["id", "created_by"])
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector) return fail("Sector not found.", 404);
  if (!canModify(user, sector.created_by)) return fail("Not allowed.", 403);

  await db
    .updateTable("sectors")
    .set({
      name: data.name,
      description: data.description,
      approach_minutes: data.approach_minutes,
      aspect: data.aspect,
    })
    .where("id", "=", sectorId)
    .execute();

  return ok({ ok: true });
});

// DELETE /api/sectors/[id] — soft-delete a sector (replaces deleteSector).
// Returns the crag path to navigate to.
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const sectorId = Number((await params).id);
  if (!Number.isInteger(sectorId)) return fail("Invalid sector.", 400);

  const sector = await db
    .selectFrom("sectors")
    .select("crag_id")
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector) return fail("Sector not found.", 404);

  await setEntityDeleted("sectors", "sector", sectorId, true, user);
  return ok({ redirect: `/crags/${sector.crag_id}` });
});
