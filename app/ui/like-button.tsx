"use client";

import { useState, useTransition } from "react";
import { toggleLike } from "@/app/actions";
import type { FeedTargetType } from "@/lib/db";

export default function LikeButton({
  targetType,
  targetId,
  initialLiked,
  initialCount,
  disabled,
}: {
  targetType: FeedTargetType;
  targetId: number;
  initialLiked: boolean;
  initialCount: number;
  disabled?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const fd = new FormData();
      fd.set("target_type", targetType);
      fd.set("target_id", String(targetId));
      await toggleLike(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || pending}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1 transition disabled:opacity-50 ${
        liked ? "text-red-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {liked ? "♥" : "♡"} {count}
    </button>
  );
}
