import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import TimeAgo from "@/app/ui/time-ago";
import ImageGallery from "@/app/ui/image-gallery";
import DeleteButton from "@/app/ui/delete-button";
import LikeButton from "@/app/ui/like-button";
import Avatar from "@/app/ui/avatar";
import { deleteStatus } from "@/app/actions";
import db from "@/lib/db";
import { loadComments } from "@/lib/feed";
import CommentList from "@/app/ui/comment-list";

const tickVerb: Record<string, string> = {
  onsight: "Onsighted",
  flash: "Flashed",
  redpoint: "Redpointed",
  toprope: "Top-roped",
  attempt: "Tried",
};

export default async function FeedItemCard({
  item,
  viewerId,
  isAdmin,
}: {
  item: FeedItem;
  viewerId: number | null;
  isAdmin: boolean;
}) {
  const comments =
    item.commentCount > 0
      ? (await loadComments(db, item.kind, item.id)).map((c) => ({
          id: c.id,
          authorId: c.author.id,
          authorName: c.author.name,
          authorAvatar: c.author.avatarUrl,
          body: c.body,
        }))
      : [];

  const canDelete =
    item.kind === "status" && (isAdmin || viewerId === item.author.id);

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
        {canDelete && (
          <span className="ml-auto">
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
          {item.route && (
            <Link
              href={`/crags/${item.route.crag.id}/routes/${item.route.id}`}
              className="mt-2 flex flex-wrap items-center gap-x-2 rounded border border-zinc-200 px-3 py-2 text-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60"
            >
              <span className="text-zinc-400">🧗</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {item.route.name}
              </span>
              <span className="text-zinc-500">{item.route.grade}</span>
              <span className="text-zinc-400">· {item.route.crag.name}</span>
            </Link>
          )}
          {item.crag && (
            <Link
              href={`/crags/${item.crag.id}`}
              className="mt-2 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              📍 {item.crag.name}
            </Link>
          )}
          {item.photos.length > 0 && (
            <ImageGallery
              images={item.photos}
              currentUserId={viewerId}
              isAdmin={isAdmin}
              entityType="status"
              entityId={item.id}
              canUpload={false}
            />
          )}
        </>
      ) : (
        <p className="mt-2 text-zinc-800 dark:text-zinc-200">
          {tickVerb[item.tickType] ?? "Climbed"}{" "}
          <Link
            href={`/crags/${item.crag.id}/routes/${item.route.id}`}
            className="font-medium hover:underline"
          >
            {item.route.name}
          </Link>{" "}
          <span className="text-zinc-500">{item.route.grade}</span>{" "}
          <span className="text-zinc-400">at</span>{" "}
          <Link href={`/crags/${item.crag.id}`} className="hover:underline">
            {item.crag.name}
          </Link>
        </p>
      )}

      <div className="mt-3 flex items-center gap-4 text-sm text-zinc-500">
        <LikeButton
          targetType={item.kind}
          targetId={item.id}
          initialLiked={item.likedByMe}
          initialCount={item.likeCount}
          disabled={viewerId === null}
        />
      </div>
      <CommentList
        targetType={item.kind}
        targetId={item.id}
        comments={comments}
        canComment={viewerId !== null}
      />
    </article>
  );
}
