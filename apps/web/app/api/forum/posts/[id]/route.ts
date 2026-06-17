import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser, canModify } from "@/lib/api/auth";
import { forumPostBodySchema } from "@whipperbook/validation";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/forum/posts/[id] — edit a post body (replaces editPost).
export const PATCH = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const postId = Number((await params).id);
  if (!Number.isInteger(postId)) return fail("Invalid post.", 400);

  const data = await readJson(request, forumPostBodySchema);

  const post = await db
    .selectFrom("forum_posts")
    .select(["id", "user_id", "topic_id"])
    .where("id", "=", postId)
    .executeTakeFirst();
  if (!post) return fail("Post not found.", 404);
  if (!canModify(user, post.user_id)) return fail("Not allowed.", 403);

  await db
    .updateTable("forum_posts")
    .set({ body: data.body })
    .where("id", "=", postId)
    .execute();

  return ok({ ok: true });
});

// DELETE /api/forum/posts/[id] — delete a post (replaces deletePost).
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const postId = Number((await params).id);
  if (!Number.isInteger(postId)) return fail("Invalid post.", 400);

  const post = await db
    .selectFrom("forum_posts")
    .select(["id", "user_id", "topic_id"])
    .where("id", "=", postId)
    .executeTakeFirst();
  if (!post) return fail("Post not found.", 404);
  if (!canModify(user, post.user_id)) return fail("Not allowed.", 403);

  await db.deleteFrom("forum_posts").where("id", "=", postId).execute();
  return ok({ ok: true });
});
