import db from "@/lib/db";

// Remove a feed target's polymorphic interactions before the row itself: likes
// on it, its comments, and the likes on those comments (none are tied by a DB
// foreign key, so they'd otherwise orphan). Shared by the ascent and status
// delete handlers.
export async function deleteTargetInteractions(
  targetType: "status" | "activity",
  targetId: number,
): Promise<void> {
  const commentRows = await db
    .selectFrom("comments")
    .select("id")
    .where("target_type", "=", targetType)
    .where("target_id", "=", targetId)
    .execute();
  const commentIds = commentRows.map((r) => r.id);
  if (commentIds.length > 0) {
    await db
      .deleteFrom("likes")
      .where("target_type", "=", "comment")
      .where("target_id", "in", commentIds)
      .execute();
  }
  await db
    .deleteFrom("comments")
    .where("target_type", "=", targetType)
    .where("target_id", "=", targetId)
    .execute();
  await db
    .deleteFrom("likes")
    .where("target_type", "=", targetType)
    .where("target_id", "=", targetId)
    .execute();
}
