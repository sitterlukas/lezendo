import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import db from "@/lib/db";
import FollowButton from "@/app/ui/follow-button";
import TimeAgo from "@/app/ui/time-ago";

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
    .select(["id", "name"])
    .where("id", "=", profileId)
    .executeTakeFirst();
  if (!profile) notFound();

  const session = await auth();
  const viewer = session?.user?.email
    ? ((await db
        .selectFrom("users")
        .select(["id"])
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()) ?? null)
    : null;

  const [{ followers }, { following }] = await Promise.all([
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
  ]);

  const isSelf = viewer?.id === profileId;
  let viewerFollows = false;
  if (viewer && !isSelf) {
    const row = await db
      .selectFrom("follows")
      .select("follower_id")
      .where("follower_id", "=", viewer.id)
      .where("followee_id", "=", profileId)
      .executeTakeFirst();
    viewerFollows = !!row;
  }

  const ascents = await db
    .selectFrom("ascents")
    .innerJoin("routes", "routes.id", "ascents.route_id")
    .innerJoin("crags", "crags.id", "routes.crag_id")
    .select([
      "ascents.id",
      "ascents.tick_type",
      "ascents.created_at",
      "routes.id as route_id",
      "routes.name as route_name",
      "routes.grade",
      "crags.id as crag_id",
      "crags.name as crag_name",
    ])
    .where("ascents.user_id", "=", profileId)
    .orderBy("ascents.created_at", "desc")
    .limit(50)
    .execute();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {following}
            </span>{" "}
            following ·{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {followers}
            </span>{" "}
            {followers === 1 ? "follower" : "followers"}
          </p>
        </div>
        {viewer && !isSelf && (
          <FollowButton followeeId={profileId} initialFollowing={viewerFollows} />
        )}
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-bold tracking-tight">Recent ascents</h2>
        {ascents.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No ascents logged yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {ascents.map((a) => (
              <li key={a.id} className="flex items-baseline gap-2 py-3 text-sm">
                <span className="font-medium capitalize">{a.tick_type}</span>
                <Link
                  href={`/crags/${a.crag_id}/routes/${a.route_id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {a.route_name}
                </Link>
                <span className="text-zinc-500">{a.grade}</span>
                <span className="text-zinc-400">· {a.crag_name}</span>
                <span className="ml-auto">
                  <TimeAgo date={a.created_at} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
