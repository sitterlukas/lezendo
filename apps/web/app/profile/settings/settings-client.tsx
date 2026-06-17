"use client";

import { useQuery } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { settingsQuery } from "@whipperbook/api-client";
import { type SettingsData } from "@whipperbook/db";
import ProfileTabs from "@/app/profile/tabs";
import AvatarUpload from "@/app/ui/avatar-upload";
import PeopleSearch from "@/app/ui/people-search";
import UserRow from "@/app/ui/user-row";
import GradingSystemForm from "./grading-system-form";
import NameForm from "./name-form";
import LogoutButton from "./logout-button";

type FollowUser = { id: number; name: string; avatar_url: string | null };

export type SettingsResponse = SettingsData & { provider: string | null };

export default function SettingsClient() {
  const { data, isPending, error } = useQuery(
    settingsQuery<SettingsResponse>(browserApi),
  );

  if (isPending) return <SettingsSkeleton />;

  if (error) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <p
          role="alert"
          className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
        >
          {(error as Error).message}
        </p>
      </main>
    );
  }

  const {
    user,
    gradingSystems,
    gradeEquivalencies,
    following,
    followers,
    provider,
  } = data;
  const followingIds = new Set(following.map((u) => u.id));

  const memberSince = new Date(user.created_at).toLocaleDateString("en-GB", {
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
        <NameForm defaultName={user.name} />
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
              {provider === "google" ? "Google" : "Email & password"}
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

      <div className="mt-8">
        <LogoutButton />
      </div>
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
            <UserRow
              key={u.id}
              id={u.id}
              name={u.name}
              avatarUrl={u.avatar_url}
              initialFollowing={followingIds.has(u.id)}
              className="px-5 py-3"
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function SettingsSkeleton() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="h-8 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-10 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 h-72 animate-pulse rounded border border-zinc-200 dark:border-zinc-800" />
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded border border-zinc-200 dark:border-zinc-800" />
        <div className="h-40 animate-pulse rounded border border-zinc-200 dark:border-zinc-800" />
      </div>
    </main>
  );
}
