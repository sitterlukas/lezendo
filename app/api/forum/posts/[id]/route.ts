import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser, canModify } from "@/lib/api/auth";
import { readForm } from "@/lib/forms";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/forum/posts/[id] — edit a post body (replaces editPost).
export const PATCH = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const postId = Number((await params).id);
  if (!Number.isInteger(postId)) return fail("Invalid post.", 400);

  const form = await readForm(request);
  const body = String(form.get("body") ?? "").trim();
  if (!body) return fail("Write something first.", 400);

  const post = await db
    .selectFrom("forum_posts")
    .select(["id", "user_id", "topic_id"])
    .where("id", "=", postId)
    .executeTakeFirst();
  if (!post) return fail("Post not found.", 404);
  if (!canModify(user, post.user_id)) return fail("Not allowed.", 403);

  await db
    .updateTable("forum_posts")
    .set({ body })
    .where("id", "=", postId)
    .execute();

  revalidatePath(`/forum/${post.topic_id}`);
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
  revalidatePath(`/forum/${post.topic_id}`);
  return ok({ ok: true });
});
