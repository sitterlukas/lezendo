import { useState } from "react";
import { Pressable, Text } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// Follow/unfollow pill with an optimistic toggle. Shared by the people search
// rows and the user-profile header. A new follow changes whose activity shows up
// in the feed and the followee's follower count, so both queries are invalidated.
export function FollowButton({
  userId,
  initialFollowing,
}: {
  userId: number;
  initialFollowing: boolean;
}) {
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState(initialFollowing);
  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      api.send(`/api/users/${userId}/follow`, next ? "POST" : "DELETE"),
    onMutate: (next) => setFollowing(next),
    onError: (_e, next) => setFollowing(!next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed", "page"] });
      queryClient.invalidateQueries({ queryKey: ["users", "detail", userId] });
    },
  });

  return (
    <Pressable
      onPress={() => mutation.mutate(!following)}
      className={
        following
          ? "rounded-full border border-zinc-300 px-4 py-1.5 active:opacity-80 dark:border-zinc-700"
          : "rounded-full border border-zinc-900 bg-zinc-900 px-4 py-1.5 active:opacity-80 dark:border-zinc-100 dark:bg-zinc-100"
      }
    >
      <Text
        className={
          following
            ? "text-sm font-medium text-zinc-700 dark:text-zinc-300"
            : "text-sm font-medium text-white dark:text-zinc-900"
        }
      >
        {following ? "Following" : "Follow"}
      </Text>
    </Pressable>
  );
}
