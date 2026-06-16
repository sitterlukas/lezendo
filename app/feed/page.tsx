import { auth } from "@/auth";
import db from "@/lib/db";
import { buildFeed, suggestedUsers, loadSectorOptions } from "@/lib/feed";
import FeedList from "@/app/ui/feed-list";
import StatusComposer from "@/app/ui/status-composer";
import LoginToAdd from "@/app/ui/login-to-add";
import PeopleSearch from "@/app/ui/people-search";
import UserRow from "@/app/ui/user-row";

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
  const [{ items, nextCursor }, sectors, followRow] = await Promise.all([
    buildFeed(db, viewer.id),
    loadSectorOptions(db),
    db
      .selectFrom("follows")
      .select("followee_id")
      .where("follower_id", "=", viewer.id)
      .limit(1)
      .executeTakeFirst(),
  ]);
  const followsNobody = !followRow;

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
      {followsNobody && <SuggestedToFollow viewerId={viewer.id} />}

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

async function SuggestedToFollow({ viewerId }: { viewerId: number }) {
  const suggestions = await suggestedUsers(db, viewerId);
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
