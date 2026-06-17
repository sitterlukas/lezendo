"use client";

import { useState, useTransition } from "react";
import { apiFetch } from "@/lib/api-client";
import type { LikeTargetType } from "@whipperbook/db";

export default function LikeButton({
  targetType,
  targetId,
  initialLiked,
  initialCount,
  disabled,
}: {
  targetType: LikeTargetType;
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
    // Optimistic update, rolled back if the request fails.
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      try {
        await apiFetch("/api/likes", {
          method: "POST",
          body: { target_type: targetType, target_id: targetId },
        });
      } catch {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || pending}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1 transition disabled:opacity-50 ${
        liked
          ? "text-red-500"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {/* SVG heart so the filled (liked) and outline (not liked) states are
          always the exact same size — unicode ♥/♡ render at different widths. */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          d="M12 21s-6.716-4.297-9.428-7.01C.86 12.28.86 9.22 2.572 7.51 4.284 5.8 7.05 5.8 8.76 7.51L12 10.75l3.24-3.24c1.71-1.71 4.476-1.71 6.188 0 1.712 1.71 1.712 4.77 0 6.48C18.716 16.703 12 21 12 21z"
          strokeLinejoin="round"
        />
      </svg>
      {count}
    </button>
  );
}
