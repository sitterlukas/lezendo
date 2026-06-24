import { useEffect } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, router, type Href } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsQuery, ApiError } from "@whipperbook/api-client";
import { timeAgo } from "@whipperbook/core";
import { api } from "../../../lib/api";
import { Loading, ErrorState, EmptyState } from "../../../components/states";
import { Avatar } from "../../../components/avatar";

type Notification = {
  id: number;
  type: string;
  target_type: string | null;
  target_id: number | null;
  read_at: Date | null;
  created_at: Date;
  actor_id: number | null;
  actor_name: string | null;
  actor_avatar: string | null;
};
type NotificationsData = { items: Notification[]; unreadCount: number };

const VERB: Record<string, string> = {
  follow: "started following you",
  like: "liked your post",
  comment: "commented on your post",
  forum_reply: "replied to your topic",
};

// Where tapping a notification takes you, or null when there's nowhere useful.
function hrefFor(n: Notification): Href | null {
  if (n.type === "follow" && n.actor_id)
    return `/(tabs)/feed/users/${n.actor_id}`;
  if (n.type === "forum_reply" && n.target_id)
    return `/(tabs)/forum/${n.target_id}`;
  if ((n.type === "like" || n.type === "comment") && n.target_id) {
    if (n.target_type === "status") return `/(tabs)/feed/status/${n.target_id}`;
    if (n.target_type === "activity")
      return `/(tabs)/feed/ascent/${n.target_id}`;
  }
  return null;
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    notificationsQuery<NotificationsData>(api),
  );

  // Mark everything read when the screen opens, then refresh the header badge.
  useEffect(() => {
    api
      .send("/api/notifications/read", "POST")
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .catch(() => {});
  }, [queryClient]);

  if (isPending) return <Loading />;
  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError
            ? error.message
            : "Could not load notifications."
        }
        onRetry={refetch}
      />
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <Stack.Screen options={{ title: "Notifications" }} />
      <FlatList
        className="flex-1"
        contentContainerClassName="p-4 gap-2"
        data={data.items}
        keyExtractor={(n) => String(n.id)}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No notifications yet"
            message="Likes, comments, follows and replies will show up here."
          />
        }
        renderItem={({ item }) => {
          const href = hrefFor(item);
          const unread = !item.read_at;
          return (
            <Pressable
              disabled={!href}
              onPress={() => href && router.push(href)}
              className={`flex-row items-center gap-3 rounded-xl border border-zinc-200 p-3 active:opacity-80 dark:border-zinc-800 ${
                unread ? "bg-zinc-50 dark:bg-zinc-900" : ""
              }`}
            >
              <Avatar
                name={item.actor_name ?? ""}
                src={item.actor_avatar}
                size={36}
              />
              <View className="flex-1">
                <Text className="text-sm text-zinc-900 dark:text-zinc-50">
                  <Text className="font-semibold">
                    {item.actor_name ?? "Someone"}
                  </Text>{" "}
                  {VERB[item.type] ?? "sent you a notification"}
                </Text>
                <Text className="mt-0.5 text-xs text-zinc-400">
                  {timeAgo(item.created_at)}
                </Text>
              </View>
              {unread ? (
                <View className="h-2 w-2 rounded-full bg-blue-500" />
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
