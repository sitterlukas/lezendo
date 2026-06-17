"use client";

import { useRef, useState, useTransition } from "react";
import { apiFetch } from "@/lib/api-client";

// Optimistic Follow/Unfollow toggle. `initialFollowing` comes from the server.
// Following is one click; unfollowing asks for confirmation first.
export default function FollowButton({
  followeeId,
  initialFollowing,
}: {
  followeeId: number;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  function run(next: boolean) {
    setFollowing(next);
    startTransition(async () => {
      await apiFetch(`/api/users/${followeeId}/follow`, {
        method: next ? "POST" : "DELETE",
      });
    });
  }

  function onClick() {
    if (following) dialogRef.current?.showModal();
    else run(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={
          following
            ? "rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
            : "rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        }
      >
        {following ? "Following" : "Follow"}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded bg-white p-0 shadow-xl backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100 max-[544px]:max-w-[calc(100%-2rem)]"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold">Unfollow?</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Their statuses and ascents will no longer show in your feed.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
                run(false);
              }}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
            >
              Unfollow
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
