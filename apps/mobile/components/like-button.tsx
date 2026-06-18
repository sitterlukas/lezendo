import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// Likes target a feed status, an ascent activity, or a comment — the same toggle
// endpoint and the same little heart-with-count affordance, so it lives here and
// is reused by the feed list, the feed detail, and each comment.
export type LikeTarget = "status" | "activity" | "comment";

type Likeable = { likeCount: number; likedByMe: boolean };
type FeedCacheComment = Likeable & { id: number };
type FeedCacheItem = Likeable & {
  id: number;
  kind: "status" | "ascent";
  comments: FeedCacheComment[];
};
type FeedCachePage = { items: FeedCacheItem[] };

// Flip the liked flag and nudge the count, returning a new object so React Query
// sees the change.
function flip<T extends Likeable>(t: T): T {
  return {
    ...t,
    likedByMe: !t.likedByMe,
    likeCount: t.likeCount + (t.likedByMe ? -1 : 1),
  };
}

// Apply an optimistic toggle to the matching target inside a cached feed page —
// either a top-level item (status/activity) or one of its comments.
function toggleLike(
  page: FeedCachePage,
  type: LikeTarget,
  id: number,
): FeedCachePage {
  return {
    ...page,
    items: page.items.map((item) => {
      const itemType = item.kind === "ascent" ? "activity" : "status";
      if (type === "comment") {
        return {
          ...item,
          comments: item.comments.map((c) => (c.id === id ? flip(c) : c)),
        };
      }
      return type === itemType && item.id === id ? flip(item) : item;
    }),
  };
}

export function LikeButton({
  targetType,
  targetId,
  likeCount,
  likedByMe,
}: {
  targetType: LikeTarget;
  targetId: number;
} & Likeable) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      api.send("/api/likes", "POST", {
        target_type: targetType,
        target_id: targetId,
      }),
    // Optimistically toggle so the heart responds instantly; reconcile on settle.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["feed", "page"] });
      const prev = queryClient.getQueryData<FeedCachePage>(["feed", "page"]);
      if (prev) {
        queryClient.setQueryData(
          ["feed", "page"],
          toggleLike(prev, targetType, targetId),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["feed", "page"], ctx.prev);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["feed", "page"] }),
  });

  return (
    <Pressable
      onPress={() => mutation.mutate()}
      hitSlop={8}
      className="flex-row items-center gap-1 active:opacity-60"
    >
      <Ionicons
        name={likedByMe ? "heart" : "heart-outline"}
        size={18}
        color={likedByMe ? "#e11d48" : "#a1a1aa"}
      />
      <Text
        className={
          likedByMe
            ? "text-xs text-rose-600 dark:text-rose-400"
            : "text-xs text-zinc-400"
        }
      >
        {likeCount}
      </Text>
    </Pressable>
  );
}
