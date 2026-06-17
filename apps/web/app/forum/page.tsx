import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { forumTopicsQuery } from "@whipperbook/api-client";
import ForumClient, { type ForumResponse } from "./forum-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forum",
  description:
    "Ask questions, share beta and talk climbing with the Whipperbook community.",
  alternates: { canonical: "/forum" },
};

export default async function ForumPage() {
  const qc = makeQueryClient();
  const api = await serverApi();
  await qc.prefetchQuery(forumTopicsQuery<ForumResponse>(api));

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ForumClient />
    </HydrationBoundary>
  );
}
