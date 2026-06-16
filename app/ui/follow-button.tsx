"use client";

import { useState, useTransition } from "react";
import { followUser, unfollowUser } from "@/app/actions";

// Optimistic Follow/Unfollow toggle. `initialFollowing` comes from the server.
export default function FollowButton({
  followeeId,
  initialFollowing,
}: {
  followeeId: number;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("followee_id", String(followeeId));
      if (next) await followUser(fd);
      else await unfollowUser(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={
        following
          ? "rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          : "rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
