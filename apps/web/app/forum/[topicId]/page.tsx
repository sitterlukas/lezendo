import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import db from "@whipperbook/db";
import { serverFetch, ServerFetchError } from "@/lib/api/server-fetch";
import { type ForumTopicDetail } from "@whipperbook/db";
import ApiForm from "@/app/ui/api-form";
import ForumPost from "@/app/ui/forum-post";
import ForumTopicActions from "@/app/ui/forum-topic-actions";

type TopicResponse = ForumTopicDetail & {
  viewer: { id: number; role: string } | null;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topicId: string }>;
}): Promise<Metadata> {
  const id = Number((await params).topicId);
  if (!Number.isInteger(id)) return {};
  const topic = await db
    .selectFrom("forum_topics")
    .select("title")
    .where("id", "=", id)
    .executeTakeFirst();
  if (!topic) return {};
  const description = `${topic.title} — a discussion on the Whipperbook climbing forum.`;
  const url = `/forum/${id}`;
  return {
    title: topic.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: topic.title, description, url },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const id = Number(topicId);
  if (!Number.isInteger(id)) notFound();

  let data: TopicResponse;
  try {
    data = await serverFetch<TopicResponse>(`/api/forum/topics/${id}`);
  } catch (err) {
    if (err instanceof ServerFetchError && err.status === 404) notFound();
    throw err;
  }
  const { topic, posts, viewer: currentUser } = data;

  const canManageTopic =
    !!currentUser &&
    (currentUser.id === topic.user_id || currentUser.role === "admin");

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

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{topic.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            Started by{" "}
            <Link
              href={`/users/${topic.user_id}`}
              className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
            >
              {topic.author}
            </Link>{" "}
            ·{" "}
            {topic.created_at.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {posts.length} {posts.length === 1 ? "post" : "posts"}
          </p>
        </div>
        {canManageTopic && (
          <ForumTopicActions topicId={topic.id} title={topic.title} />
        )}
      </div>

      {/* Posts */}
      <div className="mt-8 space-y-4">
        {posts.map((post, index) => {
          const canManage =
            !!currentUser &&
            (currentUser.id === post.user_id || currentUser.role === "admin");
          return (
            <ForumPost
              key={post.id}
              postId={post.id}
              authorId={post.user_id}
              authorName={post.author}
              authorAvatar={post.author_avatar}
              body={post.body}
              createdAtLabel={post.created_at.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              isOp={index === 0}
              canManage={canManage}
            />
          );
        })}
      </div>

      {/* Reply form */}
      <section className="mt-8 pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Reply
        </h2>
        {currentUser ? (
          <ApiForm
            endpoint={`/api/forum/topics/${topic.id}/posts`}
            resetOnSuccess
            className="mt-4 grid gap-3"
          >
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
          </ApiForm>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            <Link
              href="/login"
              className="font-medium text-zinc-900 underline underline-offset-2 transition hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
            >
              Log in
            </Link>{" "}
            to join the discussion.
          </p>
        )}
      </section>
    </main>
  );
}
