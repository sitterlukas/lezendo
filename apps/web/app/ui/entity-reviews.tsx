import Link from "next/link";
import { type ReviewEntityType } from "@whipperbook/db";
import { serverFetch } from "@/lib/api/server-fetch";
import { type EntityReviewDto } from "@whipperbook/db";
import Stars from "@/app/ui/stars";
import StarRatingInput from "@/app/ui/star-rating-input";
import ApiForm from "@/app/ui/api-form";
import DeleteButton from "@/app/ui/delete-button";
import Avatar from "@/app/ui/avatar";
import { inputClass } from "@/app/ui/style";

const dateOpts: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

export default async function EntityReviews({
  entityType,
  entityId,
  currentUserId,
  isAdmin,
}: {
  entityType: ReviewEntityType;
  entityId: number;
  currentUserId: number | null;
  isAdmin: boolean;
}) {
  const reviews = await serverFetch<EntityReviewDto[]>(
    `/api/reviews?entityType=${entityType}&entityId=${entityId}`,
  );

  const count = reviews.length;
  const avg = count
    ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / count
    : 0;
  const myReview = currentUserId
    ? (reviews.find((r) => r.user_id === currentUserId) ?? null)
    : null;
  // The current user's own review lives in the editable form, so keep it out of
  // the list to avoid showing it twice.
  const others = reviews.filter((r) => r.user_id !== currentUserId);

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-bold tracking-tight">Reviews</h2>
        {count > 0 ? (
          <span className="flex items-center gap-2 text-sm text-zinc-500">
            <Stars rating={avg} className="text-sm" />
            <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
              {avg.toFixed(1)}
            </span>
            <span>
              · {count} {count === 1 ? "review" : "reviews"}
            </span>
          </span>
        ) : (
          <span className="text-sm text-zinc-500">No reviews yet.</span>
        )}
      </div>

      {/* Add / edit form, or a prompt to log in */}
      {currentUserId ? (
        <div className="mt-5 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <ApiForm endpoint="/api/reviews">
            <input type="hidden" name="entity_type" value={entityType} />
            <input type="hidden" name="entity_id" value={entityId} />
            <p className="text-sm font-medium">
              {myReview ? "Your review" : "Leave a review"}
            </p>
            <div className="mt-2">
              <StarRatingInput defaultValue={myReview?.rating ?? 0} />
            </div>
            <textarea
              name="body"
              rows={3}
              defaultValue={myReview?.body ?? ""}
              placeholder="Share your thoughts (optional)…"
              className={`mt-3 ${inputClass}`}
            />
            <button
              type="submit"
              className="mt-3 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {myReview ? "Update review" : "Post review"}
            </button>
          </ApiForm>
          {myReview && (
            <div className="mt-2">
              <DeleteButton
                endpoint={`/api/reviews/${myReview.id}`}
                title="Remove your review?"
                message="This permanently deletes your review."
                confirmLabel="Remove review"
                ariaLabel="Remove your review"
                label="Remove review"
              />
            </div>
          )}
        </div>
      ) : (
        <p className="mt-5 text-sm text-zinc-500">
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            Log in
          </Link>{" "}
          to leave a review.
        </p>
      )}

      {/* Everyone else's reviews */}
      {others.length > 0 && (
        <ul className="mt-6 space-y-4">
          {others.map((review) => (
            <li
              key={review.id}
              className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/users/${review.user_id}`} className="shrink-0">
                  <Avatar
                    name={review.author}
                    src={review.author_avatar}
                    size={24}
                  />
                </Link>
                <Link
                  href={`/users/${review.user_id}`}
                  className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {review.author}
                </Link>
                <Stars rating={review.rating} className="text-sm" />
                <span className="ml-auto text-xs text-zinc-500">
                  {review.created_at.toLocaleDateString("en-GB", dateOpts)}
                </span>
                {isAdmin && (
                  <DeleteButton
                    endpoint={`/api/reviews/${review.id}`}
                    variant="icon"
                    title="Delete review?"
                    message="This permanently deletes this review."
                    confirmLabel="Delete review"
                    ariaLabel="Delete review"
                  />
                )}
              </div>
              {review.body && (
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {review.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
