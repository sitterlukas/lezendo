import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import db from "@whipperbook/db";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { forumTopicQuery, ApiError } from "@whipperbook/api-client";
import TopicClient, { type TopicResponse } from "./topic-client";

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

  const qc = makeQueryClient();
  const api = await serverApi();
  try {
    await qc.fetchQuery(forumTopicQuery<TopicResponse>(api, id));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <TopicClient topicId={id} />
    </HydrationBoundary>
  );
}
