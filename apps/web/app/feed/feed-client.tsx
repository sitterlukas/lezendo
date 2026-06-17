"use client";

import { useQuery } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { feedPageQuery } from "@whipperbook/api-client";
import { type FeedPageData } from "@whipperbook/db";
import FeedList from "@/app/ui/feed-list";
import StatusComposer from "@/app/ui/status-composer";
import PeopleSearch from "@/app/ui/people-search";
import UserRow from "@/app/ui/user-row";

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
        !followsNobody && (
          <div className="mt-8 border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="font-medium">No activity yet.</p>
            <p className="mt-1 text-sm text-zinc-500">
              The climbers you follow haven&apos;t posted anything yet.
            </p>
          </div>
        )
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
        <div className="h-10 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </header>
      <div className="mt-6 h-24 animate-pulse rounded border border-zinc-200 dark:border-zinc-800" />
      <ul className="mt-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="h-28 animate-pulse rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50"
          />
        ))}
      </ul>
    </main>
  );
}
