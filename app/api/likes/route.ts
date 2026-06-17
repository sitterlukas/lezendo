import { route, ok, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { likeSchema } from "@/lib/forms";
import db from "@/lib/db";

// POST /api/likes — toggle a like on a status, activity, or comment (replaces
// toggleLike).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const data = await readJson(request, likeSchema);

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
  }

  return ok({ liked: !existing });
});
