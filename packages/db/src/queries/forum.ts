import db from "../client";
import { sql } from "kysely";

export type ForumTopicListItem = {
  id: number;
  title: string;
  created_at: Date;
  author: string;
  author_avatar: string | null;
  post_count: number;
  last_post_at: Date | null;
};

export type ForumTopicDto = {
  id: number;
  title: string;
  created_at: Date;
  user_id: number;
  author: string;
};

export type ForumPostDto = {
  id: number;
  body: string;
  created_at: Date;
  user_id: number;
  author: string;
  author_avatar: string | null;
};

export type ForumTopicDetail = {
  topic: ForumTopicDto;
  posts: ForumPostDto[];
};

export async function getForumTopics(): Promise<ForumTopicListItem[]> {
  const rows = await db
    .selectFrom("forum_topics")
    .innerJoin("users", "users.id", "forum_topics.user_id")
    .leftJoin("forum_posts", "forum_posts.topic_id", "forum_topics.id")
    .select((eb) => [
      "forum_topics.id",
      "forum_topics.title",
      "forum_topics.created_at",
      "users.name as author",
      "users.avatar_url as author_avatar",
      eb.fn.count<number>("forum_posts.id").as("post_count"),
      sql<Date | null>`MAX(forum_posts.created_at)`.as("last_post_at"),
    ])
    .groupBy([
      "forum_topics.id",
      "forum_topics.title",
      "forum_topics.created_at",
      "users.name",
      "users.avatar_url",
    ])
    .orderBy("forum_topics.created_at", "desc")
    .execute();
  return rows.map((r) => ({ ...r, post_count: Number(r.post_count) }));
}

// A topic with its posts (oldest first). Null when the topic doesn't exist.
export async function getForumTopic(
  id: number,
): Promise<ForumTopicDetail | null> {
  const topic = await db
    .selectFrom("forum_topics")
    .innerJoin("users", "users.id", "forum_topics.user_id")
    .select([
      "forum_topics.id",
      "forum_topics.title",
      "forum_topics.created_at",
      "forum_topics.user_id",
      "users.name as author",
    ])
    .where("forum_topics.id", "=", id)
    .executeTakeFirst();
  if (!topic) return null;

  const posts = await db
    .selectFrom("forum_posts")
    .innerJoin("users", "users.id", "forum_posts.user_id")
    .select([
      "forum_posts.id",
      "forum_posts.body",
      "forum_posts.created_at",
      "forum_posts.user_id",
      "users.name as author",
      "users.avatar_url as author_avatar",
    ])
    .where("forum_posts.topic_id", "=", id)
    .orderBy("forum_posts.created_at", "asc")
    .execute();

  return { topic, posts };
}
