import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import db from "@/lib/db";
import { createPost } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const session = await auth();

  const { topicId } = await params;
  const id = Number(topicId);
  if (!Number.isInteger(id)) notFound();

  const topic = await db
    .selectFrom("forum_topics")
    .innerJoin("users", "users.id", "forum_topics.user_id")
    .select([
      "forum_topics.id",
      "forum_topics.title",
      "forum_topics.created_at",
      "users.name as author",
    ])
    .where("forum_topics.id", "=", id)
    .executeTakeFirst();

  if (!topic) notFound();

  const posts = await db
    .selectFrom("forum_posts")
    .innerJoin("users", "users.id", "forum_posts.user_id")
    .select([
      "forum_posts.id",
      "forum_posts.body",
      "forum_posts.created_at",
      "forum_posts.user_id",
      "users.name as author",
    ])
    .where("forum_posts.topic_id", "=", id)
    .orderBy("forum_posts.created_at", "asc")
    .execute();

  const currentUser = session?.user?.email
    ? ((await db
        .selectFrom("users")
        .select("id")
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()) ?? null)
    : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href="/forum"
          className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Forum
        </Link>
        <span>/</span>
        <span className="truncate text-zinc-900 dark:text-zinc-100">
          {topic.title}
        </span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">{topic.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Started by {topic.author} ·{" "}
        {topic.created_at.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}{" "}
        · {posts.length} {posts.length === 1 ? "post" : "posts"}
      </p>

      {/* Posts */}
      <div className="mt-8 space-y-4">
        {posts.map((post, index) => {
          const isOp = index === 0;
          const isMine = currentUser && post.user_id === currentUser.id;
          return (
            <article
              key={post.id}
              className={`rounded border p-5 ${
                isOp
                  ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-transparent"
              }`}
            >
              <header className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{post.author}</span>
                {isOp && (
                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                    OP
                  </span>
                )}
                {isMine && !isOp && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
                    You
                  </span>
                )}
                <span className="ml-auto text-xs text-zinc-400">
                  {post.created_at.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </header>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {post.body}
              </div>
            </article>
          );
        })}
      </div>

      {/* Reply form */}
      <section className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Reply
        </h2>
        {currentUser ? (
          <form action={createPost} className="mt-4 grid gap-3">
            <input type="hidden" name="topic_id" value={topic.id} />
            <textarea
              name="body"
              placeholder="Write your reply…"
              rows={5}
              required
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div>
              <button
                type="submit"
                className="rounded bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Post reply
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            <Link
              href="/login"
              className="font-medium text-zinc-900 underline underline-offset-2 transition hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
            >
              Sign in
            </Link>{" "}
            to join the discussion.
          </p>
        )}
      </section>
    </main>
  );
}
