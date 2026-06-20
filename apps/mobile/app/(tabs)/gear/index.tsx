import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gearQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Loading, ErrorState } from "../../../components/states";
import { gearCategoryLabels, type GearCategory } from "../../../lib/gear";

// Minimal local shape of GET /api/gear — the caller's items plus community
// reviews; `viewerId` gates the delete affordances.
type GearItem = {
  id: number;
  name: string;
  category: GearCategory;
  brand: string | null;
  purchased_on: Date | null;
  retired_on: Date | null;
  notes: string | null;
};
type GearReview = {
  id: number;
  user_id: number;
  product: string;
  rating: number;
  body: string;
  author: string;
};
type GearResponse = {
  viewerId: number | null;
  items: GearItem[];
  reviews: GearReview[];
};

const monthYear = (d: Date) =>
  d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

export default function Gear() {
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    gearQuery<GearResponse>(api),
  );

  if (isPending) return <Loading />;

  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError ? error.message : "Could not load gear."
        }
        onRetry={refetch}
      />
    );
  }

  const { viewerId, items, reviews } = data;

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-3 pb-8"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <SectionHeader
        title="Your gear"
        subtitle={`${items.length} ${items.length === 1 ? "item" : "items"} in your rack`}
        actionLabel="Add gear"
        href="/(tabs)/gear/new"
      />
      {items.length === 0 ? (
        <Text className="text-sm text-zinc-500">
          Your rack is empty — add your rope, draws, and shoes to track their
          age and wear.
        </Text>
      ) : (
        items.map((item) => <GearItemCard key={item.id} item={item} />)
      )}

      <View className="mt-6">
        <SectionHeader
          title="Community reviews"
          subtitle={`${reviews.length} ${reviews.length === 1 ? "review" : "reviews"} from fellow climbers`}
          actionLabel="Write"
          href="/(tabs)/gear/review"
        />
      </View>
      {reviews.length === 0 ? (
        <Text className="text-sm text-zinc-500">
          No reviews yet — be the first to say what&apos;s worth the money.
        </Text>
      ) : (
        reviews.map((review) => (
          <GearReviewCard
            key={review.id}
            review={review}
            canDelete={review.user_id === viewerId}
          />
        ))
      )}
    </ScrollView>
  );
}

function SectionHeader({
  title,
  subtitle,
  actionLabel,
  href,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  href: "/(tabs)/gear/new" | "/(tabs)/gear/review";
}) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="flex-1">
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {title}
        </Text>
        <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </Text>
      </View>
      <Link href={href} asChild>
        <Pressable className="rounded-full border border-zinc-900 bg-zinc-900 px-4 py-1.5 active:opacity-80 dark:border-zinc-100 dark:bg-zinc-100">
          <Text className="text-sm font-medium text-white dark:text-zinc-900">
            {actionLabel}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

function GearItemCard({ item }: { item: GearItem }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.send(`/api/gear/${item.id}`, "DELETE"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gear"] }),
    onError: (e) =>
      Alert.alert(
        "Could not remove",
        e instanceof ApiError ? e.message : "Please try again.",
      ),
  });

  function confirmDelete() {
    Alert.alert("Remove gear?", `This removes “${item.name}” from your rack.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => remove.mutate() },
    ]);
  }

  return (
    <View className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 font-semibold text-zinc-900 dark:text-zinc-50">
          {item.name}
        </Text>
        <Pressable
          accessibilityLabel={`Remove ${item.name}`}
          hitSlop={8}
          onPress={confirmDelete}
          className="active:opacity-70"
        >
          <Ionicons name="trash-outline" size={18} color="#dc2626" />
        </Pressable>
      </View>
      <View className="mt-2 flex-row flex-wrap items-center gap-2">
        <Text className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {gearCategoryLabels[item.category]}
        </Text>
        {item.brand ? (
          <Text className="text-xs text-zinc-500">{item.brand}</Text>
        ) : null}
        {item.purchased_on ? (
          <Text className="text-xs text-zinc-500">
            since {monthYear(item.purchased_on)}
          </Text>
        ) : null}
        {item.retired_on ? (
          <Text className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">
            retired
          </Text>
        ) : null}
      </View>
      {item.notes ? (
        <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {item.notes}
        </Text>
      ) : null}
    </View>
  );
}

function GearReviewCard({
  review,
  canDelete,
}: {
  review: GearReview;
  canDelete: boolean;
}) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.send(`/api/gear-reviews/${review.id}`, "DELETE"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gear"] }),
    onError: (e) =>
      Alert.alert(
        "Could not delete",
        e instanceof ApiError ? e.message : "Please try again.",
      ),
  });

  function confirmDelete() {
    Alert.alert(
      "Delete review?",
      `This deletes your review of “${review.product}”.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => remove.mutate(),
        },
      ],
    );
  }

  return (
    <View className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 font-semibold text-zinc-900 dark:text-zinc-50">
          {review.product}
        </Text>
        {canDelete ? (
          <Pressable
            accessibilityLabel={`Delete review of ${review.product}`}
            hitSlop={8}
            onPress={confirmDelete}
            className="active:opacity-70"
          >
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
          </Pressable>
        ) : null}
      </View>
      <Text className="mt-0.5 text-sm text-amber-500">
        {"★".repeat(review.rating) + "☆".repeat(5 - review.rating)}
        <Text className="text-zinc-400"> · {review.author}</Text>
      </Text>
      <Text className="mt-1 text-zinc-700 dark:text-zinc-300">
        {review.body}
      </Text>
    </View>
  );
}
