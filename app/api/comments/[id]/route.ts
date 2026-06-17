import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser, canModify } from "@/lib/api/auth";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/comments/[id] — delete a comment and its likes (replaces
// deleteComment).
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const commentId = Number((await params).id);
  if (!Number.isInteger(commentId)) return fail("Invalid comment.", 400);

  const comment = await db
    .selectFrom("comments")
    .select(["id", "user_id"])
    .where("id", "=", commentId)
    .executeTakeFirst();
  if (!comment) return fail("Comment not found.", 404);
  if (!canModify(user, comment.user_id)) return fail("Not allowed.", 403);

  // Drop the comment's likes first (polymorphic, no FK), then the comment.
  await db
    .deleteFrom("likes")
    .where("target_type", "=", "comment")
    .where("target_id", "=", commentId)
    .execute();
  await db.deleteFrom("comments").where("id", "=", commentId).execute();

  revalidatePath("/feed");
  revalidatePath("/users", "layout");
  return ok({ ok: true });
});
