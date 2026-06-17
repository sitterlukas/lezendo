import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser, canModify } from "@/lib/api/auth";
import { statusWriteSchema } from "@whipperbook/validation";
import { resolveSectorTag, INVALID_SECTOR } from "@whipperbook/db";
import { deleteTargetInteractions } from "@whipperbook/db";
import db from "@whipperbook/db";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/statuses/[id] — edit a status (replaces editStatus).
export const PATCH = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const statusId = Number((await params).id);
  if (!Number.isInteger(statusId)) return fail("Invalid status.", 400);

  const status = await db
    .selectFrom("statuses")
    .select(["id", "user_id"])
    .where("id", "=", statusId)
    .executeTakeFirst();
  if (!status) return fail("Status not found.", 404);
  if (!canModify(user, status.user_id)) return fail("Not allowed.", 403);

  const data = await readJson(request, statusWriteSchema);

  const sectorId = await resolveSectorTag(data.sector_id);
  if (sectorId === INVALID_SECTOR) {
    return fail("That sector no longer exists.", 400);
  }

  await db
    .updateTable("statuses")
    .set({ body: data.body, sector_id: sectorId })
    .where("id", "=", statusId)
    .execute();

  return ok({ ok: true });
});

// DELETE /api/statuses/[id] — delete a status, its photos, and its feed
// interactions (replaces deleteStatus).
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const statusId = Number((await params).id);
  if (!Number.isInteger(statusId)) return fail("Invalid status.", 400);

  const status = await db
    .selectFrom("statuses")
    .select(["id", "user_id"])
    .where("id", "=", statusId)
    .executeTakeFirst();
  if (!status) return fail("Status not found.", 404);
  if (!canModify(user, status.user_id)) return fail("Not allowed.", 403);

  const photos = await db
    .selectFrom("images")
    .select(["id", "url"])
    .where("entity_type", "=", "status")
    .where("entity_id", "=", statusId)
    .execute();
  if (photos.length > 0) {
    const { del } = await import("@vercel/blob");
    await del(photos.map((p) => p.url));
    await db
      .deleteFrom("images")
      .where("entity_type", "=", "status")
      .where("entity_id", "=", statusId)
      .execute();
  }
  await deleteTargetInteractions("status", statusId);
  await db.deleteFrom("statuses").where("id", "=", statusId).execute();

  return ok({ ok: true });
});
