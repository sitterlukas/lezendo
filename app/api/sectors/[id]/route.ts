import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser, canModify, getUser } from "@/lib/api/auth";
import { readForm, parseSectorDetails } from "@/lib/forms";
import { getSectorDetail } from "@/lib/queries/sectors";
import { logDeletion } from "@/lib/deletion-log";
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

  const form = await readForm(request);
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const details = parseSectorDetails(form);

  if (!name) return fail("Name is required.", 400);

  const sector = await db
    .selectFrom("sectors")
    .select(["id", "created_by"])
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector) return fail("Sector not found.", 404);
  if (!canModify(user, sector.created_by)) return fail("Not allowed.", 403);

  await db
    .updateTable("sectors")
    .set({ name, description: description || null, ...details })
    .where("id", "=", sectorId)
    .execute();

  revalidatePath("/crags", "layout");
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
    .select(["id", "name", "crag_id", "created_by"])
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector) return fail("Sector not found.", 404);
  if (!canModify(user, sector.created_by)) return fail("Not allowed.", 403);

  await db
    .updateTable("sectors")
    .set({ deleted: true })
    .where("id", "=", sectorId)
    .execute();
  await logDeletion("sector", sectorId, sector.name, "delete", user.id);

  revalidatePath("/crags", "layout");
  return ok({ redirect: `/crags/${sector.crag_id}` });
});
