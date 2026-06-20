import { FlatList, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { meQuery, userProfileQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../lib/api";
import { Loading, ErrorState } from "./states";
import { Avatar } from "./avatar";
import { FollowButton } from "./follow-button";
import { FeedCard, type FeedItem } from "./feed-card";

// Minimal local shape of GET /api/users/:id — the public profile bundle. `items`
// reuses the same feed-item shape the feed screen renders.
type ProfileResponse = {
  profile: { id: number; name: string; avatar_url: string | null };
  viewer: { id: number } | null;
  isSelf: boolean;
  viewerFollows: boolean;
  followers: number;
  following: number;
  items: FeedItem[];
};

// A climber's public profile: header (avatar, name, follow counts, follow
// toggle) plus their activity timeline. Lives in components so each tab stack
// (feed, leaderboard) can mount it via a thin route file and keep navigation
// in-tab.
export function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profileId = Number(id);
  const me = useQuery(meQuery<{ id: number } | null>(api));
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    userProfileQuery<ProfileResponse>(api, profileId),
  );

  if (isPending) return <Loading />;

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <ErrorState
        message={
          notFound
            ? "This climber doesn't exist."
            : error instanceof ApiError
              ? error.message
              : "Could not load this profile."
        }
        onRetry={refetch}
      />
    );
  }

  const { profile, isSelf, viewerFollows, followers, following, items } = data;

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <Stack.Screen options={{ title: profile.name }} />
      <FlatList
        className="flex-1"
        contentContainerClassName="p-4 gap-3"
        data={items}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <View className="gap-4 pb-1">
            <View className="flex-row items-center gap-4">
              <Avatar name={profile.name} src={profile.avatar_url} size={64} />
              <View className="flex-1 gap-1">
                <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {profile.name}
                </Text>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  <Text className="font-medium text-zinc-700 dark:text-zinc-300">
                    {following}
                  </Text>{" "}
                  following ·{" "}
                  <Text className="font-medium text-zinc-700 dark:text-zinc-300">
                    {followers}
                  </Text>{" "}
                  {followers === 1 ? "follower" : "followers"}
                </Text>
              </View>
              {!isSelf ? (
                <FollowButton
                  userId={profileId}
                  initialFollowing={viewerFollows}
                />
              ) : null}
            </View>
            <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Activity
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text className="mt-2 text-sm text-zinc-500">Nothing here yet.</Text>
        }
        renderItem={({ item }) => (
          <FeedCard item={item} myId={me.data?.id ?? null} />
        )}
      />
    </View>
  );
}
