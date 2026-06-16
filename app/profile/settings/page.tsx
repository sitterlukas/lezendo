import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout, updateName } from "@/app/actions/auth";
import ProfileTabs from "@/app/profile/tabs";
import AvatarUpload from "@/app/ui/avatar-upload";
import Avatar from "@/app/ui/avatar";
import FollowButton from "@/app/ui/follow-button";
import PeopleSearch from "@/app/ui/people-search";
import GradingSystemForm from "./grading-system-form";
import db from "@/lib/db";
import { loadGradeEquivalencies } from "@/lib/grade-data";

type FollowUser = { id: number; name: string; avatar_url: string | null };

export default async function SettingsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const [user, gradingSystems, gradeEquivalencies] = await Promise.all([
    db
      .selectFrom("users")
      .select([
        "id",
        "name",
        "email",
        "password_hash",
        "avatar_url",
        "preferred_rope_grading_system_id",
        "preferred_boulder_grading_system_id",
        "created_at",
      ])
      .where("email", "=", email.toLowerCase())
      .executeTakeFirst(),
    db
      .selectFrom("grading_systems")
      .select(["id", "name", "slug"])
      .orderBy("id")
      .execute(),
    loadGradeEquivalencies(),
  ]);
  if (!user) {
    redirect("/login");
  }

  const [following, followers] = await Promise.all([
    db
      .selectFrom("follows")
      .innerJoin("users", "users.id", "follows.followee_id")
      .select(["users.id", "users.name", "users.avatar_url"])
      .where("follows.follower_id", "=", user.id)
      .orderBy("users.name")
      .execute(),
    db
      .selectFrom("follows")
      .innerJoin("users", "users.id", "follows.follower_id")
      .select(["users.id", "users.name", "users.avatar_url"])
      .where("follows.followee_id", "=", user.id)
      .orderBy("users.name")
      .execute(),
  ]);
  const followingIds = new Set(following.map((u) => u.id));

  const memberSince = user.created_at.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <ProfileTabs active="settings" />

      <section className="mt-6 rounded border border-zinc-200 dark:border-zinc-800">
        <h2 className="border-b border-zinc-200 px-6 py-4 text-lg font-semibold dark:border-zinc-800">
          Settings
        </h2>
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <span className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Photo
          </span>
          <AvatarUpload name={user.name} avatarUrl={user.avatar_url} />
        </div>
        <form
          action={updateName}
          className="flex items-end gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800"
        >
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Display name
            </span>
            <input
              name="name"
              defaultValue={user.name}
              required
              maxLength={100}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Save
          </button>
        </form>
        <GradingSystemForm
          gradingSystems={gradingSystems}
          equivalencies={gradeEquivalencies}
          ropeDefault={user.preferred_rope_grading_system_id}
          boulderDefault={user.preferred_boulder_grading_system_id}
        />
        <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
          <div className="flex items-center justify-between px-6 py-4">
            <dt className="text-sm text-zinc-500">Email</dt>
            <dd className="text-sm font-medium">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <dt className="text-sm text-zinc-500">Member since</dt>
            <dd className="text-sm font-medium">{memberSince}</dd>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <dt className="text-sm text-zinc-500">Log-in method</dt>
            <dd className="text-sm font-medium">
              {user.password_hash ? "Email & password" : "Google"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <FollowSection
          title="Following"
          users={following}
          followingIds={followingIds}
          empty="You're not following anyone yet."
        />
        <FollowSection
          title="Followers"
          users={followers}
          followingIds={followingIds}
          empty="No followers yet."
        />
      </div>

      <section className="mt-6 rounded border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-2 text-sm font-semibold">Discover people</h2>
        <PeopleSearch />
      </section>

      <form action={logout} className="mt-8">
        <button
          type="submit"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          Log out
        </button>
      </form>
    </main>
  );
}

function FollowSection({
  title,
  users,
  followingIds,
  empty,
}: {
  title: string;
  users: FollowUser[];
  followingIds: Set<number>;
  empty: string;
}) {
  return (
    <section className="rounded border border-zinc-200 dark:border-zinc-800">
      <h2 className="border-b border-zinc-200 px-5 py-3 text-sm font-semibold dark:border-zinc-800">
        {title}
        <span className="ml-1.5 font-normal text-zinc-400">{users.length}</span>
      </h2>
      {users.length === 0 ? (
        <p className="px-5 py-4 text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <Link
                href={`/users/${u.id}`}
                className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                <Avatar name={u.name} src={u.avatar_url} size={28} />
                <span className="truncate">{u.name}</span>
              </Link>
              <FollowButton
                followeeId={u.id}
                initialFollowing={followingIds.has(u.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
