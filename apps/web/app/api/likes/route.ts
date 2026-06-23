import { route, ok, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { assertTargetExists } from "@/lib/api/exists";
import { likeSchema } from "@whipperbook/validation";
import db, { createNotification, feedTargetOwner } from "@whipperbook/db";

// POST /api/likes — toggle a like on a status, activity, or comment (replaces
// toggleLike).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const data = await readJson(request, likeSchema);

  await assertTargetExists(data.target_type, data.target_id);

  const existing = await db
    .selectFrom("likes")
    .select("id")
    .where("user_id", "=", user.id)
    .where("target_type", "=", data.target_type)
    .where("target_id", "=", data.target_id)
    .executeTakeFirst();

  if (existing) {
    await db.deleteFrom("likes").where("id", "=", existing.id).execute();
  } else {
    await db
      .insertInto("likes")
      .values({
        user_id: user.id,
        target_type: data.target_type,
        target_id: data.target_id,
      })
      .onConflict((oc) =>
        oc.columns(["user_id", "target_type", "target_id"]).doNothing(),
      )
      .execute();

    // Notify the owner when a like is added (not when removed).
    const ownerId = await feedTargetOwner(data.target_type, data.target_id);
    if (ownerId !== null) {
      await createNotification({
        recipientId: ownerId,
        actorId: user.id,
        type: "like",
        targetType: data.target_type,
        targetId: data.target_id,
      });
    }
  }

  return ok({ liked: !existing });
});
