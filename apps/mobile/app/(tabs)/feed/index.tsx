import { useEffect, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useColorScheme } from "nativewind";
import { useQuery } from "@tanstack/react-query";
import { feedPageQuery, meQuery, ApiError } from "@whipperbook/api-client";
import { timeAgo } from "@whipperbook/core";
import { api } from "../../../lib/api";
import { Loading, ErrorState } from "../../../components/states";
import { Avatar } from "../../../components/avatar";
import { LikeButton } from "../../../components/like-button";
import {
  StatusComposer,
  type StatusEdit,
} from "../../../components/status-composer";

// Minimal local shape of GET /api/feed/page — we render statuses (with photos)
// and the batched ascent activities. `createdAt` arrives as a Date (revived by
// the api client) so timeAgo() can consume it directly.
type FeedAuthor = { id: number; name: string; avatarUrl: string | null };
type FeedPhoto = { id: number; url: string };
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
      photos: FeedPhoto[];
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
  const fabIconColor = colorScheme === "dark" ? "#18181b" : "#ffffff";
  // The "+" lives in the feed screen (above the tab bar); the composer popover
  // lives in a full-screen overlay (over the tab bar). Offset it by the tab bar
  // height so it sits just above the "+".
  const tabBarHeight = useBottomTabBarHeight();
  // null = closed, "new" = compose, object = edit that status.
  const [composer, setComposer] = useState<"new" | StatusEdit | null>(null);
  // Entrance for the compose popover: rises + pops up from the "+" button.
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (composer === null) return;
    pop.setValue(0);
    Animated.spring(pop, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [composer, pop]);

  const me = useQuery(meQuery<{ id: number } | null>(api));
  const myId = me.data?.id ?? null;
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

  const editing = composer && composer !== "new" ? composer : undefined;

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
        renderItem={({ item }) => (
          <FeedRow item={item} myId={myId} onEdit={setComposer} />
        )}
      />

      {/* Floating compose button — opens the status popover above it. */}
      <Pressable
        accessibilityLabel="Post a status"
        onPress={() => setComposer("new")}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-zinc-900 shadow-lg active:opacity-80 dark:bg-zinc-100"
      >
        <Ionicons name="add" size={30} color={fabIconColor} />
      </Pressable>

      {/* Compose / edit popover: a card anchored just above the "+". Tap the
          dimmed backdrop to dismiss. */}
      <Modal
        visible={composer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setComposer(null)}
      >
        <View className="flex-1">
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={() => setComposer(null)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            pointerEvents="box-none"
            className="flex-1 justify-end px-4"
            style={{ paddingBottom: tabBarHeight + 32 }}
          >
            <Animated.View
              style={{
                opacity: pop,
                transform: [
                  {
                    translateY: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                  {
                    scale: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              }}
            >
              <View className="rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-900">
                <Text className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {editing ? "Edit status" : "New status"}
                </Text>
                <StatusComposer
                  status={editing}
                  onPosted={() => setComposer(null)}
                />
              </View>
              {/* Caret pointing down toward the "+". */}
              <View className="absolute -bottom-1.5 right-7 h-4 w-4 rotate-45 bg-white dark:bg-zinc-900" />
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function FeedRow({
  item,
  myId,
  onEdit,
}: {
  item: FeedItem;
  myId: number | null;
  onEdit: (status: StatusEdit) => void;
}) {
  const statusData =
    item.kind === "status"
      ? { id: item.id, body: item.body, photos: item.photos }
      : null;
  const canEdit = statusData != null && myId != null && item.author.id === myId;

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
          {canEdit && statusData ? (
            <Pressable
              accessibilityLabel="Edit status"
              hitSlop={8}
              onPress={() => onEdit(statusData)}
            >
              <Ionicons name="create-outline" size={18} color="#a1a1aa" />
            </Pressable>
          ) : null}
          <Text className="text-xs text-zinc-400">
            {timeAgo(item.createdAt)}
          </Text>
        </View>
        {item.kind === "status" ? (
          <>
            {item.body ? (
              <Text className="text-zinc-700 dark:text-zinc-300">
                {item.body}
              </Text>
            ) : null}
            <StatusPhotos photos={item.photos} />
          </>
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

// Status photos: one large image for a single photo, a wrapped grid otherwise.
function StatusPhotos({ photos }: { photos: FeedPhoto[] }) {
  if (photos.length === 0) return null;
  if (photos.length === 1) {
    return (
      <Image
        source={{ uri: photos[0].url }}
        alt="Status photo"
        resizeMode="cover"
        className="mt-2 h-52 w-full rounded-lg"
      />
    );
  }
  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {photos.map((p) => (
        <Image
          key={p.id}
          source={{ uri: p.url }}
          alt="Status photo"
          style={{ width: 104, height: 104, borderRadius: 8 }}
        />
      ))}
    </View>
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
