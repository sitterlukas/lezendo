import Link from "next/link";
import { auth } from "@/auth";
import { sql } from "kysely";
import db from "@/lib/db";
import { createTopic } from "@/app/actions";
import Modal from "@/app/ui/modal";
import LoginToAdd from "@/app/ui/login-to-add";
import { inputClass } from "@/app/ui/style";

export const dynamic = "force-dynamic";

export default async function ForumPage() {
  const session = await auth();
  const currentUser = session?.user?.email
    ? ((await db
        .selectFrom("users")
        .select(["id", "role"])
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()) ?? null)
    : null;

  const topics = await db
    .selectFrom("forum_topics")
    .innerJoin("users", "users.id", "forum_topics.user_id")
    .leftJoin("forum_posts", "forum_posts.topic_id", "forum_topics.id")
    .select((eb) => [
      "forum_topics.id",
      "forum_topics.title",
      "forum_topics.created_at",
      "users.name as author",
      eb.fn.count<number>("forum_posts.id").as("post_count"),
      sql<Date | null>`MAX(forum_posts.created_at)`.as("last_post_at"),
    ])
    .groupBy([
      "forum_topics.id",
      "forum_topics.title",
      "forum_topics.created_at",
      "users.name",
    ])
    .orderBy("forum_topics.created_at", "desc")
    .execute();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Forum</h1>
          <p className="mt-2 text-zinc-500">
            {topics.length === 0
              ? "No topics yet — start the conversation."
              : `${topics.length} ${topics.length === 1 ? "topic" : "topics"}`}
          </p>
        </div>

        {currentUser ? (
          <Modal
            triggerLabel="New topic"
            title="Start a new topic"
            subtitle="Ask a question, share beta, or start a discussion."
          >
            <form action={createTopic} className="grid gap-4">
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Title
                </span>
                <input
                  name="title"
                  placeholder="e.g. Best sport crags in Czech Republic?"
                  required
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Body
                </span>
                <textarea
                  name="body"
                  placeholder="Write your post here…"
                  rows={5}
                  required
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Post topic
              </button>
            </form>
          </Modal>
        ) : (
          <LoginToAdd to="to start a topic" />
        )}
      </header>

      {topics.length === 0 ? (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No topics yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Be the first to start a discussion.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {topics.map((topic) => (
            <li key={topic.id}>
              <Link
                href={`/forum/${topic.id}`}
                className="flex items-center justify-between gap-6 px-4 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold leading-snug">
                    {topic.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {topic.author} ·{" "}
                    {topic.created_at.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium">
                    {Number(topic.post_count)}{" "}
                    <span className="font-normal text-zinc-500">
                      {Number(topic.post_count) === 1 ? "post" : "posts"}
                    </span>
                  </p>
                  {topic.last_post_at && (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Last{" "}
                      {(topic.last_post_at as Date).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                        },
                      )}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
