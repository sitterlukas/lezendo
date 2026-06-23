import { Image, Pressable, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { timeAgo } from "@whipperbook/core";
import { Avatar } from "./avatar";
import { LikeButton } from "./like-button";
import type { StatusEdit } from "./status-composer";

// Minimal local shape of a GET /api/feed/page item — also the shape of the
// activity items in GET /api/users/:id. We render statuses (with photos) and the
// batched ascent activities. `createdAt` arrives as a Date (revived by the api
// client) so timeAgo() can consume it directly.
export type FeedAuthor = { id: number; name: string; avatarUrl: string | null };
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
export type FeedItem =
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
export type FeedPage = { items: FeedItem[] };

// Past-tense verbs matching the web feed; attempts don't score points.
const tickVerb: Record<string, string> = {
  onsight: "Onsighted",
  flash: "Flashed",
  redpoint: "Redpointed",
  toprope: "Top-roped",
  attempt: "Tried",
};

// One feed/activity card. The whole card opens the comments view; the author
// chip is a nested press that jumps to that climber's profile. `onEdit` is only
// passed where the status composer lives (the feed tab), so it's optional.
export function FeedCard({
  item,
  myId,
  onEdit,
}: {
  item: FeedItem;
  myId: number | null;
  onEdit?: (status: StatusEdit) => void;
}) {
  const statusData =
    item.kind === "status"
      ? { id: item.id, body: item.body, photos: item.photos }
      : null;
  const canEdit =
    onEdit != null &&
    statusData != null &&
    myId != null &&
    item.author.id === myId;
  const isSend = item.kind === "ascent";

  return (
    <Link href={`/(tabs)/feed/${item.kind}/${item.id}`} asChild>
      <Pressable
        className={
          isSend
            ? "rounded-xl border border-l-4 border-zinc-200 border-l-blue-500 bg-white p-4 active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900"
            : "rounded-xl border border-zinc-200 bg-white p-4 active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900"
        }
      >
        <View className="mb-1 flex-row items-center gap-2">
          <Pressable
            className="flex-1 flex-row items-center gap-2 active:opacity-70"
            onPress={() => router.push(`/(tabs)/feed/users/${item.author.id}`)}
          >
            <Avatar
              name={item.author.name}
              src={item.author.avatarUrl}
              size={28}
            />
            <View className="flex-1">
              <Text className="font-semibold text-zinc-900 dark:text-zinc-50">
                {item.author.name}
              </Text>
              {isSend ? (
                <View className="mt-0.5 flex-row items-center gap-1">
                  <Ionicons name="trending-up" size={12} color="#3b82f6" />
                  <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Logged a climb
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          {canEdit && statusData ? (
            <Pressable
              accessibilityLabel="Edit status"
              hitSlop={8}
              onPress={() => onEdit?.(statusData)}
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
