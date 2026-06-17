import { route, ok, readJson } from "@/lib/api/respond";
import { requireUser, getUser } from "@/lib/api/auth";
import { forumTopicCreateSchema } from "@whipperbook/validation";
import { getForumTopics } from "@/lib/queries/forum";
import db from "@/lib/db";

// GET /api/forum/topics — the topic list plus the viewer (to gate "New topic").
export const GET = route(async (request) => {
  const viewer = await getUser(request);
  const topics = await getForumTopics();
  return ok({
    viewer: viewer ? { id: viewer.id, role: viewer.role } : null,
    topics,
  });
});

// POST /api/forum/topics — start a topic with its first post (replaces
// createTopic). Returns { redirect } to the new topic.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const data = await readJson(request, forumTopicCreateSchema);

  const topic = await db
    .insertInto("forum_topics")
    .values({ title: data.title, user_id: user.id })
    .returning("id")
    .executeTakeFirstOrThrow();

  await db
    .insertInto("forum_posts")
    .values({ topic_id: topic.id, user_id: user.id, body: data.body })
    .execute();

  return ok({ id: topic.id, redirect: `/forum/${topic.id}` }, 201);
});
