import Link from "next/link";
import { redirect } from "next/navigation";
import ActionButton from "@/app/ui/action-button";
import ProfileTabs from "@/app/profile/tabs";
import { serverFetch } from "@/lib/api/server-fetch";
import { type GearData, type GearItemDto } from "@/lib/queries/gear";
import { type GearCategory } from "@/lib/db";

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

function daysBetween(from: Date, to: Date): number {
  return Math.max(1, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

function ownedFor(from: Date, to: Date): string {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    to.getMonth() -
    from.getMonth();
  if (to.getDate() < from.getDate()) months--;

  if (months < 1) {
    const days = daysBetween(from, to);
    return days === 1 ? "1 day" : `${days} days`;
  }

  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [
    years > 0 ? `${years} ${years === 1 ? "year" : "years"}` : null,
    rest > 0 ? `${rest} ${rest === 1 ? "month" : "months"}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

function GearRow({ item }: { item: GearItemDto }) {
  const from = item.purchased_on ?? item.created_at;
  const to = item.retired_on ?? new Date();
  const duration = ownedFor(from, to);
  const days = daysBetween(from, to);
  const retired = item.retired_on !== null;

  return (
    <li
      className={`flex items-center gap-4 px-6 py-4 ${retired ? "opacity-60" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.name}</span>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {categoryMeta[item.category].label}
          </span>
          {item.brand && (
            <span className="text-xs text-zinc-500">{item.brand}</span>
          )}
          {retired && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">
              retired{" "}
              {item.retired_on?.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        {item.notes && (
          <p className="mt-0.5 truncate text-sm text-zinc-500">{item.notes}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold">{duration}</div>
        <div className="text-xs text-zinc-500">
          {days} {days === 1 ? "day" : "days"}
          {item.purchased_on
            ? ` · since ${item.purchased_on.toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })}`
            : " · no purchase date"}
        </div>
        <div className="mt-1.5">
          <ActionButton
            endpoint={`/api/gear/${item.id}`}
            method="PATCH"
            body={{ retired: !retired }}
            className="text-xs font-medium text-zinc-500 underline-offset-2 transition hover:text-zinc-900 hover:underline disabled:opacity-50 dark:hover:text-zinc-100"
          >
            {retired ? "Bring back" : "Retire"}
          </ActionButton>
        </div>
      </div>
    </li>
  );
}

export default async function ProfileGearPage() {
  const { viewerId, items } = await serverFetch<GearData>("/api/gear");
  if (viewerId === null) {
    redirect("/login");
  }

  // Mirror the old query order: purchased date ascending (no-date last), then
  // creation time ascending.
  const gearItems = [...items].sort((a, b) => {
    const pa = a.purchased_on ? a.purchased_on.getTime() : Infinity;
    const pb = b.purchased_on ? b.purchased_on.getTime() : Infinity;
    if (pa !== pb) return pa - pb;
    return a.created_at.getTime() - b.created_at.getTime();
  });

  const activeItems = gearItems.filter((item) => item.retired_on === null);
  const retiredItems = gearItems.filter((item) => item.retired_on !== null);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <ProfileTabs active="gear" />

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Your gear</h2>
        <Link
          href="/gear"
          className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Manage gear →
        </Link>
      </div>

      {activeItems.length === 0 ? (
        <div className="mt-4 border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
          <p className="mx-auto max-w-sm text-sm text-zinc-500">
            {gearItems.length > 0
              ? "Everything in your rack is retired — add fresh gear on the "
              : "Your rack is empty — add your gear on the "}
            <Link href="/gear" className="underline">
              Gear page
            </Link>{" "}
            to start tracking its age.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {activeItems.map((item) => (
            <GearRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      {retiredItems.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Retired</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Served their time — {retiredItems.length}{" "}
            {retiredItems.length === 1 ? "item" : "items"} off the rack.
          </p>
          <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {retiredItems.map((item) => (
              <GearRow key={item.id} item={item} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
