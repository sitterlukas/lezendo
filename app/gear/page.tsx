import { redirect } from "next/navigation";
import { auth } from "@/auth";
import db, { type GearCategory } from "@/lib/db";
import {
  addGearItem,
  addGearReview,
  deleteGearItem,
  deleteGearReview,
} from "@/app/actions";
import Modal from "@/app/ui/modal";
import Select from "@/app/ui/select";
import ConfirmSubmit from "@/app/ui/confirm-submit";
import { inputClass } from "@/app/ui/style";

const categoryMeta: Record<GearCategory, { label: string }> = {
  rope: { label: "Rope" },
  quickdraws: { label: "Quickdraws" },
  harness: { label: "Harness" },
  shoes: { label: "Shoes" },
  protection: { label: "Protection" },
  bouldering: { label: "Bouldering" },
  safety: { label: "Safety" },
  other: { label: "Other" },
};

const trashTriggerClass =
  "rounded-md p-1 text-zinc-300 transition hover:bg-red-50 hover:text-red-600 group-hover:text-zinc-400 dark:text-zinc-600 dark:hover:bg-red-950/50 dark:hover:text-red-400";

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 5.5h13m-9-2h5m-7.5 2 .7 11a1.5 1.5 0 0 0 1.5 1.4h5.6a1.5 1.5 0 0 0 1.5-1.4l.7-11M8 9v5m4-5v5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="font-mono text-sm tracking-tight text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-zinc-300 dark:text-zinc-600">
        {"★".repeat(5 - rating)}
      </span>
    </span>
  );
}

export const dynamic = "force-dynamic";

export default async function GearPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const user = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();
  if (!user) {
    redirect("/login");
  }

  const [gearItems, reviews] = await Promise.all([
    db
      .selectFrom("gear_items")
      .select([
        "id",
        "name",
        "category",
        "brand",
        "purchased_on",
        "retired_on",
        "notes",
      ])
      .where("user_id", "=", user.id)
      .orderBy("created_at", "desc")
      .execute(),
    db
      .selectFrom("gear_reviews")
      .innerJoin("users", "users.id", "gear_reviews.user_id")
      .select([
        "gear_reviews.id",
        "gear_reviews.user_id",
        "gear_reviews.product",
        "gear_reviews.rating",
        "gear_reviews.body",
        "gear_reviews.created_at",
        "users.name as author",
      ])
      .orderBy("gear_reviews.created_at", "desc")
      .execute(),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Gear</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Your rack, ropes, and rubber — plus what other climbers think of
          theirs.
        </p>
      </header>

      {/* Gear tracking */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Your gear</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {gearItems.length}{" "}
              {gearItems.length === 1 ? "item" : "items"} in your rack.
            </p>
          </div>
          <Modal
            triggerLabel="Add gear"
            title="Add gear"
            subtitle="Track what's in your pack and how old it is."
          >
            <form action={addGearItem} className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Name
                </span>
                <input
                  name="name"
                  placeholder="e.g. 70m Mammut Crag Classic"
                  required
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Category
                </span>
                <Select name="category" defaultValue="rope">
                  {Object.entries(categoryMeta).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Brand
                </span>
                <input
                  name="brand"
                  placeholder="optional"
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Purchased on
                </span>
                <input type="date" name="purchased_on" className={inputClass} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Notes
                </span>
                <textarea
                  name="notes"
                  placeholder="Wear, falls taken, retirement plans… (optional)"
                  rows={2}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 sm:col-span-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Add gear
              </button>
            </form>
          </Modal>
        </div>

        {gearItems.length === 0 ? (
          <div className="mt-6 border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
            <p className="font-medium">Your rack is empty.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              Add your rope, draws, and shoes to keep track of their age and
              wear.
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gearItems.map((item) => (
              <li
                key={item.id}
                className="group flex flex-col rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold leading-snug">{item.name}</h3>
                  </div>
                  <form action={deleteGearItem}>
                    <input type="hidden" name="gear_id" value={item.id} />
                    <ConfirmSubmit
                      title="Remove gear?"
                      message={`This removes “${item.name}” from your rack. This can't be undone.`}
                      confirmLabel="Remove gear"
                      triggerAriaLabel={`Remove ${item.name}`}
                      triggerClassName={trashTriggerClass}
                    >
                      <TrashIcon />
                    </ConfirmSubmit>
                  </form>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {categoryMeta[item.category].label}
                  </span>
                  {item.brand && <span className="text-xs">{item.brand}</span>}
                  {item.purchased_on && (
                    <span className="text-xs">
                      since{" "}
                      {item.purchased_on.toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {item.retired_on && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">
                      retired
                    </span>
                  )}
                </div>
                {item.notes && (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Community reviews */}
      <section className="mt-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Community reviews
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}{" "}
              from fellow climbers.
            </p>
          </div>
          <Modal
            triggerLabel="Write review"
            title="Write a review"
            subtitle="Help other climbers pick their next piece of gear."
          >
            <form action={addGearReview} className="grid gap-4">
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Product
                </span>
                <input
                  name="product"
                  placeholder="e.g. La Sportiva Solution"
                  required
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Rating
                </span>
                <Select name="rating" defaultValue="5">
                  <option value="5">★★★★★ — excellent</option>
                  <option value="4">★★★★ — good</option>
                  <option value="3">★★★ — okay</option>
                  <option value="2">★★ — disappointing</option>
                  <option value="1">★ — avoid</option>
                </Select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Review
                </span>
                <textarea
                  name="body"
                  placeholder="How does it climb? How has it held up?"
                  required
                  rows={4}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Publish review
              </button>
            </form>
          </Modal>
        </div>

        {reviews.length === 0 ? (
          <div className="mt-6 border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
            <p className="font-medium">No reviews yet.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              Be the first to tell other climbers what&apos;s worth the money.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="group rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{review.product}</h3>
                  <Stars rating={review.rating} />
                  <span className="ml-auto text-sm text-zinc-500">
                    {review.author} ·{" "}
                    {review.created_at.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {review.user_id === user.id && (
                    <form action={deleteGearReview}>
                      <input type="hidden" name="review_id" value={review.id} />
                      <ConfirmSubmit
                        title="Delete review?"
                        message={`This deletes your review of “${review.product}”. This can't be undone.`}
                        confirmLabel="Delete review"
                        triggerAriaLabel={`Delete review of ${review.product}`}
                        triggerClassName={trashTriggerClass}
                      >
                        <TrashIcon />
                      </ConfirmSubmit>
                    </form>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {review.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
