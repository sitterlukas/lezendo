import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser, canModify, getUser } from "@/lib/api/auth";
import { forumTitleSchema } from "@/lib/forms";
import { getForumTopic } from "@/lib/queries/forum";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/forum/topics/[id] — topic + posts plus the viewer. 404 when missing.
export const GET = route<Ctx>(async (request, { params }) => {
  const topicId = Number((await params).id);
  if (!Number.isInteger(topicId)) return fail("Invalid topic.", 400);
  const viewer = await getUser(request);
  const data = await getForumTopic(topicId);
  if (!data) return fail("Topic not found.", 404);
  return ok({
    viewer: viewer ? { id: viewer.id, role: viewer.role } : null,
    ...data,
  });
});

// PATCH /api/forum/topics/[id] — rename a topic (replaces editTopic).
export const PATCH = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const topicId = Number((await params).id);
  if (!Number.isInteger(topicId)) return fail("Invalid topic.", 400);

  const data = await readJson(request, forumTitleSchema);

  const topic = await db
    .selectFrom("forum_topics")
    .select(["id", "user_id"])
    .where("id", "=", topicId)
    .executeTakeFirst();
  if (!topic) return fail("Topic not found.", 404);
  if (!canModify(user, topic.user_id)) return fail("Not allowed.", 403);

  await db
    .updateTable("forum_topics")
    .set({ title: data.title })
    .where("id", "=", topicId)
    .execute();

  return ok({ ok: true });
});

// DELETE /api/forum/topics/[id] — delete a topic and its posts (replaces
// deleteTopic). Returns { redirect } to the forum index.
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const topicId = Number((await params).id);
  if (!Number.isInteger(topicId)) return fail("Invalid topic.", 400);

  const topic = await db
    .selectFrom("forum_topics")
    .select(["id", "user_id"])
    .where("id", "=", topicId)
    .executeTakeFirst();
  if (!topic) return fail("Topic not found.", 404);
  if (!canModify(user, topic.user_id)) return fail("Not allowed.", 403);

  // forum_posts cascade-delete with the topic (FK on delete cascade).
  await db.deleteFrom("forum_topics").where("id", "=", topicId).execute();
  return ok({ redirect: "/forum" });
});
