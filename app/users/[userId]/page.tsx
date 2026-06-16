import { notFound } from "next/navigation";
import { auth } from "@/auth";
import db from "@/lib/db";
import FollowButton from "@/app/ui/follow-button";
import { buildProfileTimeline, loadSectorOptions } from "@/lib/feed";
import FeedItemCard from "@/app/ui/feed-item";
import Avatar from "@/app/ui/avatar";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdRaw } = await params;
  const profileId = Number(userIdRaw);
  if (!Number.isInteger(profileId)) notFound();

  const profile = await db
    .selectFrom("users")
    .select(["id", "name", "avatar_url"])
    .where("id", "=", profileId)
    .executeTakeFirst();
  if (!profile) notFound();

  const session = await auth();
  const viewer = session?.user?.email
    ? ((await db
        .selectFrom("users")
        .select(["id", "role"])
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()) ?? null)
    : null;

  const isSelf = viewer?.id === profileId;

  const [{ followers }, { following }, viewerFollowsRow] = await Promise.all([
    db
      .selectFrom("follows")
      .select((eb) => eb.fn.countAll<number>().as("followers"))
      .where("followee_id", "=", profileId)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("follows")
      .select((eb) => eb.fn.countAll<number>().as("following"))
      .where("follower_id", "=", profileId)
      .executeTakeFirstOrThrow(),
    viewer && !isSelf
      ? db
          .selectFrom("follows")
          .select("follower_id")
          .where("follower_id", "=", viewer.id)
          .where("followee_id", "=", profileId)
          .executeTakeFirst()
      : Promise.resolve(null),
  ]);
  const viewerFollows = !!viewerFollowsRow;

  const { items } = await buildProfileTimeline(
    db,
    viewer?.id ?? null,
    profileId,
  );

  // The edit dialog (own/admin statuses only) needs the sector options.
  const canEdit = isSelf || viewer?.role === "admin";
  const sectors = canEdit ? await loadSectorOptions(db) : [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={profile.name} src={profile.avatar_url} size={64} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {profile.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {following}
              </span>{" "}
              following ·{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {followers}
              </span>{" "}
              {Number(followers) === 1 ? "follower" : "followers"}
            </p>
          </div>
        </div>
        {viewer && !isSelf && (
          <FollowButton
            followeeId={profileId}
            initialFollowing={viewerFollows}
          />
        )}
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-bold tracking-tight">Activity</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nothing here yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {items.map((item) => (
              <FeedItemCard
                key={`${item.kind}:${item.id}`}
                item={item}
                viewerId={viewer?.id ?? null}
                isAdmin={viewer?.role === "admin"}
                sectors={sectors}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
