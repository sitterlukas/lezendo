import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { deleteTargetInteractions } from "@/lib/feed-interactions";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/ascents/[id] — remove one of the caller's ascents (replaces
// deleteAscent). Only the owner may delete their tick.
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const ascentId = Number((await params).id);
  if (!Number.isInteger(ascentId)) return fail("Invalid ascent.", 400);

  const owned = await db
    .selectFrom("ascents")
    .select(["id", "activity_id"])
    .where("id", "=", ascentId)
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (!owned) return fail("Ascent not found.", 404);

  await db.deleteFrom("ascents").where("id", "=", ascentId).execute();

  // If that was the last ascent in its activity, remove the now-empty activity
  // and its feed interactions (likes/comments target the activity).
  if (owned.activity_id !== null) {
    const remaining = await db
      .selectFrom("ascents")
      .select("id")
      .where("activity_id", "=", owned.activity_id)
      .limit(1)
      .executeTakeFirst();
    if (!remaining) {
      await deleteTargetInteractions("activity", owned.activity_id);
      await db
        .deleteFrom("ascent_activities")
        .where("id", "=", owned.activity_id)
        .execute();
    }
  }

  revalidatePath("/profile");
  revalidatePath("/crags");
  revalidatePath("/feed");
  return ok({ ok: true });
});
