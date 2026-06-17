import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { feedPageQuery, ApiError } from "@whipperbook/api-client";
import LoginToAdd from "@/app/ui/login-to-add";
import FeedClient, { type FeedResponse } from "./feed-client";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const qc = makeQueryClient();
  const api = await serverApi();
  try {
    await qc.fetchQuery(feedPageQuery<FeedResponse>(api));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return (
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
          <h1 className="text-4xl font-bold tracking-tight">Feed</h1>
          <div className="mt-8 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
            <p className="font-medium">
              Follow climbers and see their activity.
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              <LoginToAdd to="to post statuses and follow people" />
            </p>
          </div>
        </main>
      );
    }
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <FeedClient />
    </HydrationBoundary>
  );
}
