"use client";

import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import TimeAgo from "@/app/ui/time-ago";
import ImageGallery from "@/app/ui/image-gallery";
import DeleteButton from "@/app/ui/delete-button";
import LikeButton from "@/app/ui/like-button";
import Avatar from "@/app/ui/avatar";
import { deleteStatus } from "@/app/actions";
import CommentList from "@/app/ui/comment-list";
import StatusEditModal from "@/app/ui/status-edit-modal";
import { type SectorOption } from "@/app/ui/sector-select";

const tickVerb: Record<string, string> = {
  onsight: "Onsighted",
  flash: "Flashed",
  redpoint: "Redpointed",
  toprope: "Top-roped",
  attempt: "Tried",
};

export default function FeedItemCard({
  item,
  viewerId,
  isAdmin,
  sectors,
}: {
  item: FeedItem;
  viewerId: number | null;
  isAdmin: boolean;
  sectors: SectorOption[];
}) {
  const comments = item.comments.map((c) => ({
    id: c.id,
    authorId: c.author.id,
    authorName: c.author.name,
    authorAvatar: c.author.avatarUrl,
    body: c.body,
    likeCount: c.likeCount,
    likedByMe: c.likedByMe,
  }));

  // Ascent posts are grouped into an "activity"; likes/comments target that.
  const targetType = item.kind === "ascent" ? "activity" : "status";

  return (
    <article className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/users/${item.author.id}`} className="shrink-0">
          <Avatar
            name={item.author.name}
            src={item.author.avatarUrl}
            size={36}
          />
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            href={`/users/${item.author.id}`}
            className="font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
          >
            {item.author.name}
          </Link>
          <TimeAgo date={item.createdAt} />
        </div>
        {item.kind === "status" && (isAdmin || viewerId === item.author.id) && (
          <span className="ml-auto flex items-center gap-1">
            <StatusEditModal
              statusId={item.id}
              body={item.body}
              sectorId={item.sector?.id ?? null}
              sectors={sectors}
              photos={item.photos}
              viewerId={viewerId}
              isAdmin={isAdmin}
            />
            <form action={deleteStatus}>
              <input type="hidden" name="status_id" value={item.id} />
              <DeleteButton
                variant="icon"
                title="Delete status?"
                message="This permanently removes your post. This can't be undone."
                confirmLabel="Delete"
                ariaLabel="Delete status"
              />
            </form>
          </span>
        )}
      </div>

      {item.kind === "status" ? (
        <>
          <p className="mt-2 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
            {item.body}
          </p>
          {item.sector && (
            <Link
              href={`/crags/${item.sector.crag.id}/sectors/${item.sector.id}`}
              className="mt-2 flex flex-wrap items-center gap-x-2 rounded border border-zinc-200 px-3 py-2 text-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60"
            >
              <span className="text-zinc-400">📍</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {item.sector.name}
              </span>
              <span className="text-zinc-400">· {item.sector.crag.name}</span>
            </Link>
          )}
          {/* Read-only in the feed (no delete/upload affordances); the author
              manages photos via the Edit dialog. */}
          {item.photos.length > 0 && (
            <ImageGallery
              images={item.photos}
              currentUserId={null}
              isAdmin={false}
              entityType="status"
              entityId={item.id}
              canUpload={false}
              promptLogin={false}
            />
          )}
        </>
      ) : (
        <AscentBody item={item} />
      )}

      <div className="mt-3 flex items-center gap-4 text-sm text-zinc-500">
        <LikeButton
          targetType={targetType}
          targetId={item.id}
          initialLiked={item.likedByMe}
          initialCount={item.likeCount}
          disabled={viewerId === null}
        />
      </div>
      <CommentList
        targetType={targetType}
        targetId={item.id}
        comments={comments}
        canComment={viewerId !== null}
        viewerId={viewerId}
        isAdmin={isAdmin}
      />
    </article>
  );
}

// The body of an ascent post: a single tick reads as a sentence; a day with
// several climbs (across any crags) lists each one with a points total.
function AscentBody({ item }: { item: Extract<FeedItem, { kind: "ascent" }> }) {
  const pointsBadge =
    "rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

  if (item.climbs.length === 1) {
    const c = item.climbs[0];
    return (
      <>
        <p className="mt-2 text-zinc-800 dark:text-zinc-200">
          {tickVerb[c.tickType] ?? "Climbed"}{" "}
          <Link
            href={`/crags/${c.crag.id}/routes/${c.route.id}`}
            className="font-medium hover:underline"
          >
            {c.route.name}
          </Link>{" "}
          <span className="text-zinc-500">{c.route.grade}</span>{" "}
          <span className="text-zinc-400">at</span>{" "}
          <Link href={`/crags/${c.crag.id}`} className="hover:underline">
            {c.crag.name}
          </Link>
        </p>
        {c.points != null && c.tickType !== "attempt" && (
          <span className={`mt-2 inline-block ${pointsBadge}`}>
            +{c.points} pts
          </span>
        )}
      </>
    );
  }

  const total = item.climbs
    .filter((c) => c.tickType !== "attempt")
    .reduce((sum, c) => sum + (c.points ?? 0), 0);

  return (
    <>
      <p className="mt-2 text-zinc-800 dark:text-zinc-200">
        Logged {item.climbs.length} climbs
      </p>
      <ul className="mt-2 space-y-1 border-l-2 border-zinc-100 pl-3 text-sm dark:border-zinc-800">
        {item.climbs.map((c) => (
          <li key={c.id} className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-zinc-400">
              {tickVerb[c.tickType] ?? "Climbed"}
            </span>
            <Link
              href={`/crags/${c.crag.id}/routes/${c.route.id}`}
              className="font-medium text-zinc-800 hover:underline dark:text-zinc-200"
            >
              {c.route.name}
            </Link>
            <span className="text-zinc-500">{c.route.grade}</span>
            <Link
              href={`/crags/${c.crag.id}`}
              className="text-zinc-400 hover:underline"
            >
              · {c.crag.name}
            </Link>
            {c.points != null && c.tickType !== "attempt" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                +{c.points}
              </span>
            )}
          </li>
        ))}
      </ul>
      {total > 0 && (
        <span className={`mt-2 inline-block ${pointsBadge}`}>
          +{total} pts total
        </span>
      )}
    </>
  );
}
