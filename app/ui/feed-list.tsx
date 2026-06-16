"use client";

import { useState, useTransition } from "react";
import type { FeedItem } from "@/lib/feed";
import FeedItemCard from "@/app/ui/feed-item";
import { loadFeedPage } from "@/app/actions";

// Renders the feed and appends older items via "Load more", consuming the
// cursor (oldest createdAt shown) that buildFeed returns.
export default function FeedList({
  initialItems,
  initialCursor,
  viewerId,
  isAdmin,
}: {
  initialItems: FeedItem[];
  initialCursor: Date | null;
  viewerId: number | null;
  isAdmin: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const page = await loadFeedPage(cursor);
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
