"use client";

import { useQuery } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { userProfileQuery } from "@whipperbook/api-client";
import { type UserProfileData } from "@whipperbook/db";
import FollowButton from "@/app/ui/follow-button";
import FeedItemCard from "@/app/ui/feed-item";
import Avatar from "@/app/ui/avatar";
import { Skeleton } from "@/app/ui/skeleton";

export type UserProfileResponse = UserProfileData;

export default function UserProfileClient({
  profileId,
}: {
  profileId: number;
}) {
  const { data, isPending, error } = useQuery(
    userProfileQuery<UserProfileResponse>(browserApi, profileId),
  );

  if (isPending) return <UserProfileSkeleton />;

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
    profile,
    viewer,
    isSelf,
    viewerFollows,
    followers,
    following,
    items,
    sectors,
  } = data;

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

export function UserProfileSkeleton() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
      </header>
      <section className="mt-10">
        <Skeleton className="h-6 w-24" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-28" />
          ))}
        </div>
      </section>
    </main>
  );
}
