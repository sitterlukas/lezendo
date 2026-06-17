import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser, getUser } from "@/lib/api/auth";
import { readForm } from "@/lib/forms";
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
  const form = await readForm(request);

  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!title) return fail("Title is required.", 400);
  if (!body) return fail("Write something first.", 400);

  const topic = await db
    .insertInto("forum_topics")
    .values({ title, user_id: user.id })
    .returning("id")
    .executeTakeFirstOrThrow();

  await db
    .insertInto("forum_posts")
    .values({ topic_id: topic.id, user_id: user.id, body })
    .execute();

  revalidatePath("/forum");
  return ok({ id: topic.id, redirect: `/forum/${topic.id}` }, 201);
});
