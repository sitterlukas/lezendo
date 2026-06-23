import { FlatList, Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { forumTopicsQuery, ApiError } from "@whipperbook/api-client";
import { timeAgo } from "@whipperbook/core";
import { api } from "../../../lib/api";
import { Loading, ErrorState } from "../../../components/states";
import { Avatar } from "../../../components/avatar";
import { Fab } from "../../../components/fab";

// Minimal local shape of GET /api/forum/topics — the topic list plus the viewer
// (we only need to know whether anyone is signed in to gate the compose button,
// but the app is auth-gated so the FAB always shows).
type ForumTopic = {
  id: number;
  title: string;
  created_at: Date;
  author: string;
  author_avatar: string | null;
  post_count: number;
  last_post_at: Date | null;
};
type ForumResponse = { topics: ForumTopic[] };

export default function ForumList() {
  const router = useRouter();
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    forumTopicsQuery<ForumResponse>(api),
  );

  if (isPending) return <Loading />;

  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError
            ? error.message
            : "Could not load the forum."
        }
        onRetry={refetch}
      />
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <FlatList
        className="flex-1"
        contentContainerClassName="p-4 gap-2 pb-24"
        data={data.topics}
        keyExtractor={(t) => String(t.id)}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="mt-8 px-2">
            <Text className="text-center font-medium text-zinc-900 dark:text-zinc-50">
              No topics yet
            </Text>
            <Text className="mt-1 text-center text-sm text-zinc-500">
              Start the conversation — ask a question or share some beta.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Link href={`/(tabs)/forum/${item.id}`} asChild>
            <Pressable className="flex-row items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900">
              <Avatar name={item.author} src={item.author_avatar} size={36} />
              <View className="flex-1">
                <Text
                  className="font-semibold text-zinc-900 dark:text-zinc-50"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {item.author} · {item.post_count}{" "}
                  {item.post_count === 1 ? "post" : "posts"}
                  {item.last_post_at
                    ? ` · last ${timeAgo(item.last_post_at)}`
                    : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
            </Pressable>
          </Link>
        )}
      />

      {/* Floating "new topic" button — the shared app FAB. */}
      <Fab
        accessibilityLabel="New topic"
        onPress={() => router.push("/(tabs)/forum/new")}
      />
    </View>
  );
}
