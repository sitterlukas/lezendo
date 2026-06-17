import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { readForm, likeTargetTypes } from "@/lib/forms";
import db, { type LikeTargetType } from "@/lib/db";

// POST /api/likes — toggle a like on a status, activity, or comment (replaces
// toggleLike).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const form = await readForm(request);

  const targetType = String(form.get("target_type")) as LikeTargetType;
  const targetId = Number(form.get("target_id"));
  if (!likeTargetTypes.includes(targetType)) {
    return fail("Invalid like target.", 400);
  }
  if (!Number.isInteger(targetId)) return fail("Invalid like target.", 400);

  const existing = await db
    .selectFrom("likes")
    .select("id")
    .where("user_id", "=", user.id)
    .where("target_type", "=", targetType)
    .where("target_id", "=", targetId)
    .executeTakeFirst();

  if (existing) {
    await db.deleteFrom("likes").where("id", "=", existing.id).execute();
  } else {
    await db
      .insertInto("likes")
      .values({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
      })
      .onConflict((oc) =>
        oc.columns(["user_id", "target_type", "target_id"]).doNothing(),
      )
      .execute();
  }

  revalidatePath("/feed");
  revalidatePath("/users", "layout");
  return ok({ liked: !existing });
});
