import Link from "next/link";
import { auth } from "@/auth";
import db from "@/lib/db";
import { buildFeed, suggestedUsers } from "@/lib/feed";
import FeedItemCard from "@/app/ui/feed-item";
import StatusComposer from "@/app/ui/status-composer";
import FollowButton from "@/app/ui/follow-button";
import LoginToAdd from "@/app/ui/login-to-add";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await auth();
  const viewer = session?.user?.email
    ? ((await db
        .selectFrom("users")
        .select(["id", "role"])
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()) ?? null)
    : null;

  if (!viewer) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight">Feed</h1>
        <div className="mt-8 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">Follow climbers and see their activity.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            <LoginToAdd to="to post statuses and follow people" />
          </p>
        </div>
      </main>
    );
  }

  const isAdmin = viewer.role === "admin";
  const [{ items }, crags] = await Promise.all([
    buildFeed(db, viewer.id),
    db
      .selectFrom("crags")
      .select(["id", "name"])
      .where("deleted", "=", false)
      .orderBy("name")
      .execute(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Feed</h1>
        <StatusComposer crags={crags} />
      </header>

      {items.length === 0 ? (
        <FeedEmptyState viewerId={viewer.id} />
      ) : (
        <div className="mt-8 space-y-4">
          {items.map((item) => (
            <FeedItemCard
              key={`${item.kind}:${item.id}`}
              item={item}
              viewerId={viewer.id}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </main>
  );
}

async function FeedEmptyState({ viewerId }: { viewerId: number }) {
  const suggestions = await suggestedUsers(db, viewerId);
  return (
    <div className="mt-8 border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
      <p className="font-medium">Your feed is empty.</p>
      <p className="mt-1 text-sm text-zinc-500">
        Follow some climbers to see their statuses and ascents here.
      </p>
      {suggestions.length > 0 && (
        <ul className="mx-auto mt-6 max-w-sm space-y-3 text-left">
          {suggestions.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3">
              <Link
                href={`/users/${u.id}`}
                className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                {u.name}
              </Link>
              <FollowButton followeeId={u.id} initialFollowing={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
