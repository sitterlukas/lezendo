import { FlatList, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { feedPageQuery, ApiError } from "@whipperbook/api-client";
import { timeAgo } from "@whipperbook/core";
import { api } from "../../../lib/api";
import { Loading, ErrorState } from "../../../components/states";

// Minimal local shape of GET /api/feed/page — we render statuses and the
// batched ascent activities; the web payload also carries likes/comments/
// suggestions we don't surface yet. `createdAt` arrives as a Date (revived by
// the api client) so timeAgo() can consume it directly.
type FeedAuthor = { id: number; name: string };
type FeedComment = { id: number; body: string; author: FeedAuthor; createdAt: Date };
type FeedItem =
  | {
      id: number;
      kind: "status";
      createdAt: Date;
      author: FeedAuthor;
      body: string;
      commentCount: number;
      comments: FeedComment[];
    }
  | {
      id: number;
      kind: "ascent";
      createdAt: Date;
      author: FeedAuthor;
      climbs: {
        id: number;
        tickType: string;
        route: { id: number; name: string; grade: string };
        crag: { id: number; name: string };
      }[];
      commentCount: number;
      comments: FeedComment[];
    };
type FeedPage = { items: FeedItem[] };

export default function Feed() {
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    feedPageQuery<FeedPage>(api),
  );

  if (isPending) return <Loading />;

  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError ? error.message : "Could not load the feed."
        }
        onRetry={refetch}
      />
    );
  }

  return (
    <FlatList
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-3"
      data={data.items}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      refreshing={isRefetching}
      onRefresh={refetch}
      ListEmptyComponent={
        <View className="mt-8 px-2">
          <Text className="text-center font-medium text-zinc-900 dark:text-zinc-50">
            Your feed is empty
          </Text>
          <Text className="mt-1 text-center text-sm text-zinc-500">
            Routes you log and statuses you post will show up here, along with
            activity from the climbers you follow.
          </Text>
        </View>
      }
      renderItem={({ item }) => <FeedRow item={item} />}
    />
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  return (
    <Link href={`/(tabs)/feed/${item.kind}/${item.id}`} asChild>
      <Pressable className="rounded-xl border border-zinc-200 bg-white p-4 active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="font-semibold text-zinc-900 dark:text-zinc-50">
            {item.author.name}
          </Text>
          <Text className="text-xs text-zinc-400">{timeAgo(item.createdAt)}</Text>
        </View>
        {item.kind === "status" ? (
          <Text className="text-zinc-700 dark:text-zinc-300">{item.body}</Text>
        ) : (
          <View className="gap-1">
            {item.climbs.map((c) => (
              <Text key={c.id} className="text-zinc-700 dark:text-zinc-300">
                <Text className="font-medium">{c.tickType}</Text> {c.route.name} (
                {c.route.grade}) · {c.crag.name}
              </Text>
            ))}
          </View>
        )}
        <Text className="mt-2 text-xs text-zinc-400">
          {item.commentCount} comment{item.commentCount === 1 ? "" : "s"}
        </Text>
      </Pressable>
    </Link>
  );
}
