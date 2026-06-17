import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser, canModify } from "@/lib/api/auth";
import { readForm, resolveSectorTag, INVALID_SECTOR } from "@/lib/forms";
import { deleteTargetInteractions } from "@/lib/feed-interactions";
import { STATUS_MAX_LEN } from "@/lib/constants";
import db from "@/lib/db";

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

  const form = await readForm(request);
  const body = String(form.get("body") ?? "").trim();
  if (!body) return fail("Write something first.", 400);
  if (body.length > STATUS_MAX_LEN) {
    return fail(`Keep it under ${STATUS_MAX_LEN} characters.`, 400);
  }

  const sectorId = await resolveSectorTag(form);
  if (sectorId === INVALID_SECTOR) {
    return fail("That sector no longer exists.", 400);
  }

  await db
    .updateTable("statuses")
    .set({ body, sector_id: sectorId })
    .where("id", "=", statusId)
    .execute();

  revalidatePath("/feed");
  revalidatePath("/users", "layout");
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

  revalidatePath("/feed");
  revalidatePath(`/users/${status.user_id}`);
  return ok({ ok: true });
});
