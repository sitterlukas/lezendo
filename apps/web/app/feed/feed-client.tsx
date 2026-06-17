"use client";

import { useQuery } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { feedPageQuery } from "@whipperbook/api-client";
import { type FeedPageData } from "@whipperbook/db";
import FeedList from "@/app/ui/feed-list";
import StatusComposer from "@/app/ui/status-composer";
import PeopleSearch from "@/app/ui/people-search";
import UserRow from "@/app/ui/user-row";
import { Skeleton } from "@/app/ui/skeleton";

export type FeedResponse = FeedPageData;

export default function FeedClient() {
  const { data, isPending, error } = useQuery(
    feedPageQuery<FeedResponse>(browserApi),
  );

  if (isPending) return <FeedSkeleton />;

  if (error) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <p
          role="alert"
          className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
        >
          {(error as Error).message}
        </p>
      </main>
    );
  }

  const { viewer, items, nextCursor, sectors, followsNobody, suggestions } =
    data;
  const isAdmin = viewer.role === "admin";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Feed</h1>
        <StatusComposer sectors={sectors} />
      </header>

      <section className="mt-6 rounded border border-zinc-200 p-5 dark:border-zinc-800">
        <p className="mb-2 font-medium">Discover people</p>
        <PeopleSearch />
      </section>

      {/* Until you follow someone, keep the "who to follow" prompt above your
          feed — even after you've posted your own statuses. */}
      {followsNobody && <SuggestedToFollow suggestions={suggestions} />}

      {items.length > 0 ? (
        <FeedList
          initialItems={items}
          initialCursor={nextCursor}
          viewerId={viewer.id}
          isAdmin={isAdmin}
          sectors={sectors}
        />
      ) : (
        <div className="mt-8 border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="font-medium">Your feed is empty</p>
          <p className="mt-1 text-sm text-zinc-500">
            Routes you log and statuses you post will show up here, along with
            activity from the climbers you follow. Add a status or log a route
            to get started.
          </p>
        </div>
      )}
    </main>
  );
}

function SuggestedToFollow({
  suggestions,
}: {
  suggestions: { id: number; name: string; avatarUrl: string | null }[];
}) {
  return (
    <div className="mt-8 rounded border border-zinc-200 p-5 dark:border-zinc-800">
      <p className="font-medium">Find climbers to follow</p>
      <p className="mt-1 text-sm text-zinc-500">
        Follow people to fill your feed with their statuses and ascents.
      </p>
      {suggestions.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {suggestions.map((u) => (
            <UserRow
              key={u.id}
              id={u.id}
              name={u.name}
              avatarUrl={u.avatarUrl}
              initialFollowing={false}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">No other climbers yet.</p>
      )}
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-9 w-28" />
      </header>
      <Skeleton variant="card" className="mt-6 h-24" />
      <ul className="mt-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <Skeleton variant="card" className="h-28" />
          </li>
        ))}
      </ul>
    </main>
  );
}
