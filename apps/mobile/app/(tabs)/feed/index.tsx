import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useQuery } from "@tanstack/react-query";
import { feedPageQuery, ApiError } from "@whipperbook/api-client";
import { timeAgo } from "@whipperbook/core";
import { api } from "../../../lib/api";
import { Loading, ErrorState } from "../../../components/states";
import { Avatar } from "../../../components/avatar";
import { LikeButton } from "../../../components/like-button";
import { StatusComposer } from "../../../components/status-composer";

// Minimal local shape of GET /api/feed/page — we render statuses and the
// batched ascent activities; the web payload also carries likes/comments/
// suggestions we don't surface yet. `createdAt` arrives as a Date (revived by
// the api client) so timeAgo() can consume it directly.
type FeedAuthor = { id: number; name: string; avatarUrl: string | null };
type FeedComment = {
  id: number;
  body: string;
  author: FeedAuthor;
  createdAt: Date;
};
type FeedBase = {
  id: number;
  createdAt: Date;
  author: FeedAuthor;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  comments: FeedComment[];
};
type FeedItem =
  | (FeedBase & {
      kind: "status";
      body: string;
    })
  | (FeedBase & {
      kind: "ascent";
      climbs: {
        id: number;
        tickType: string;
        route: { id: number; name: string; grade: string };
        crag: { id: number; name: string };
        points: number | null;
      }[];
    });
type FeedPage = { items: FeedItem[] };

// Past-tense verbs matching the web feed; attempts don't score points.
const tickVerb: Record<string, string> = {
  onsight: "Onsighted",
  flash: "Flashed",
  redpoint: "Redpointed",
  toprope: "Top-roped",
  attempt: "Tried",
};

export default function Feed() {
  const { colorScheme } = useColorScheme();
  const [composing, setComposing] = useState(false);
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
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <FlatList
        className="flex-1"
        contentContainerClassName="p-4 gap-3 pb-24"
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

      {/* Floating compose button — opens the status modal in place. */}
      <Pressable
        accessibilityLabel="Post a status"
        onPress={() => setComposing(true)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-zinc-900 shadow-lg active:opacity-80 dark:bg-zinc-100"
      >
        <Ionicons
          name="add"
          size={30}
          color={colorScheme === "dark" ? "#18181b" : "#ffffff"}
        />
      </Pressable>

      {/* Status composer as an in-place overlay (tap the backdrop to dismiss). */}
      <Modal
        visible={composing}
        transparent
        animationType="fade"
        onRequestClose={() => setComposing(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <Pressable
            className="flex-1 justify-end bg-black/40"
            onPress={() => setComposing(false)}
          >
            {/* Stop taps on the sheet from bubbling to the dismiss backdrop. */}
            <Pressable
              onPress={() => {}}
              className="rounded-t-2xl bg-white p-4 dark:bg-zinc-900"
            >
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  New status
                </Text>
                <Pressable
                  accessibilityLabel="Close"
                  onPress={() => setComposing(false)}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colorScheme === "dark" ? "#a1a1aa" : "#71717a"}
                  />
                </Pressable>
              </View>
              <StatusComposer onPosted={() => setComposing(false)} />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  return (
    <Link href={`/(tabs)/feed/${item.kind}/${item.id}`} asChild>
      <Pressable className="rounded-xl border border-zinc-200 bg-white p-4 active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900">
        <View className="mb-1 flex-row items-center gap-2">
          <Avatar
            name={item.author.name}
            src={item.author.avatarUrl}
            size={28}
          />
          <Text className="flex-1 font-semibold text-zinc-900 dark:text-zinc-50">
            {item.author.name}
          </Text>
          <Text className="text-xs text-zinc-400">
            {timeAgo(item.createdAt)}
          </Text>
        </View>
        {item.kind === "status" ? (
          <Text className="text-zinc-700 dark:text-zinc-300">{item.body}</Text>
        ) : (
          <AscentBody climbs={item.climbs} />
        )}
        <View className="mt-2 flex-row items-center gap-4">
          <LikeButton
            targetType={item.kind === "ascent" ? "activity" : "status"}
            targetId={item.id}
            likeCount={item.likeCount}
            likedByMe={item.likedByMe}
          />
          <Text className="text-xs text-zinc-400">
            {item.commentCount} comment{item.commentCount === 1 ? "" : "s"}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

type AscentClimb = Extract<FeedItem, { kind: "ascent" }>["climbs"][number];

// Mirrors the web feed's AscentBody: a lone tick reads as a sentence with its
// points; a day with several climbs lists each one and sums the total. Attempts
// don't score, so they're left out of the points math.
function AscentBody({ climbs }: { climbs: AscentClimb[] }) {
  const badge =
    "self-start rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

  if (climbs.length === 1) {
    const c = climbs[0];
    const scored = c.points != null && c.tickType !== "attempt";
    return (
      <View className="gap-2">
        <Text className="text-zinc-700 dark:text-zinc-300">
          <Text className="font-medium">
            {tickVerb[c.tickType] ?? "Climbed"}
          </Text>{" "}
          {c.route.name} ({c.route.grade}) · {c.crag.name}
        </Text>
        {scored ? <Text className={badge}>+{c.points} pts</Text> : null}
      </View>
    );
  }

  const total = climbs
    .filter((c) => c.tickType !== "attempt")
    .reduce((sum, c) => sum + (c.points ?? 0), 0);

  return (
    <View className="gap-1">
      <Text className="text-zinc-800 dark:text-zinc-200">
        Logged {climbs.length} climbs
      </Text>
      <View className="gap-0.5 border-l-2 border-zinc-100 pl-3 dark:border-zinc-800">
        {climbs.map((c) => (
          <Text key={c.id} className="text-sm text-zinc-600 dark:text-zinc-400">
            {tickVerb[c.tickType] ?? "Climbed"} {c.route.name} ({c.route.grade})
            · {c.crag.name}
            {c.points != null && c.tickType !== "attempt" ? (
              <Text className="text-emerald-600 dark:text-emerald-400">
                {" "}
                +{c.points}
              </Text>
            ) : null}
          </Text>
        ))}
      </View>
      {total > 0 ? (
        <Text className={`mt-1 ${badge}`}>+{total} pts total</Text>
      ) : null}
    </View>
  );
}
