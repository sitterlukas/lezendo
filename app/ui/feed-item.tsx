import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import TimeAgo from "@/app/ui/time-ago";
import ImageGallery from "@/app/ui/image-gallery";
import DeleteButton from "@/app/ui/delete-button";
import LikeButton from "@/app/ui/like-button";
import { deleteStatus } from "@/app/actions";

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
}: {
  item: FeedItem;
  viewerId: number | null;
  isAdmin: boolean;
}) {
  const canDelete =
    item.kind === "status" && (isAdmin || viewerId === item.author.id);

  return (
    <article className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-baseline gap-2 text-sm">
        <Link
          href={`/users/${item.author.id}`}
          className="font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
        >
          {item.author.name}
        </Link>
        <span className="text-zinc-400">·</span>
        <TimeAgo date={item.createdAt} />
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
          <Link
            href={`/crags/${item.crag.id}`}
            className="hover:underline"
          >
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
        <span>💬 {item.commentCount}</span>
      </div>
    </article>
  );
}
