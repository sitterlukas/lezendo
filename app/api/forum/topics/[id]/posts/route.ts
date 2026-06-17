import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { forumPostBodySchema } from "@/lib/forms";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/forum/topics/[id]/posts — reply to a topic (replaces createPost).
export const POST = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const topicId = Number((await params).id);
  if (!Number.isInteger(topicId)) return fail("Invalid topic.", 400);

  const data = await readJson(request, forumPostBodySchema);

  const topic = await db
    .selectFrom("forum_topics")
    .select("id")
    .where("id", "=", topicId)
    .executeTakeFirst();
  if (!topic) return fail("Topic not found.", 404);

  await db
    .insertInto("forum_posts")
    .values({ topic_id: topicId, user_id: user.id, body: data.body })
    .execute();

  return ok({ ok: true }, 201);
});
