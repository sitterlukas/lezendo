"use client";

import { useState, useTransition } from "react";
import type { FeedItem } from "@/lib/feed";
import FeedItemCard from "@/app/ui/feed-item";
import { type SectorOption } from "@/app/ui/sector-select";
import { apiFetch } from "@/lib/api-client";

// apiFetch revives ISO datetime strings to Date, so items arrive feed-ready.
type FeedPageJson = { items: FeedItem[]; nextCursor: Date | null };

// Renders the feed and appends older items via "Load more", consuming the
// cursor (oldest createdAt shown) that buildFeed returns.
export default function FeedList({
  initialItems,
  initialCursor,
  viewerId,
  isAdmin,
  sectors,
}: {
  initialItems: FeedItem[];
  initialCursor: Date | null;
  viewerId: number | null;
  isAdmin: boolean;
  sectors: SectorOption[];
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  // Re-sync when the server sends fresh data (router.refresh after posting,
  // editing, or managing photos). Adjusting state during render on a changed
  // prop is the React-recommended pattern; it resets to the first page, which
  // is fine. Client-only "load more" doesn't change the prop, so it's safe.
  const [syncedFrom, setSyncedFrom] = useState(initialItems);
  if (syncedFrom !== initialItems) {
    setSyncedFrom(initialItems);
    setItems(initialItems);
    setCursor(initialCursor);
  }

  function loadMore() {
    startTransition(async () => {
      const query = cursor
        ? `?before=${encodeURIComponent(cursor.toISOString())}`
        : "";
      const page = await apiFetch<FeedPageJson>(`/api/feed${query}`);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    });
  }

  return (
    <div className="mt-8 space-y-4">
      {items.map((item) => (
        <FeedItemCard
          key={`${item.kind}:${item.id}`}
          item={item}
          viewerId={viewerId}
          isAdmin={isAdmin}
          sectors={sectors}
        />
      ))}
      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          className="mx-auto block rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
        >
          {pending ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
