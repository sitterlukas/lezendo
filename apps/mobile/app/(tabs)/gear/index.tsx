import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gearQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Loading, ErrorState } from "../../../components/states";
import { FabMenu } from "../../../components/fab-menu";
import { DeleteButton } from "../../../components/delete-button";
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
  const router = useRouter();
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
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-3 pb-24"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <SectionHeader
          title="Your gear"
          subtitle={`${items.length} ${items.length === 1 ? "item" : "items"} in your rack`}
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

      {/* Shared FAB → action menu (gear has two add actions). */}
      <FabMenu
        accessibilityLabel="Add gear or review"
        actions={[
          {
            icon: "add-circle-outline",
            label: "Add gear",
            onPress: () => router.push("/(tabs)/gear/new"),
          },
          {
            icon: "star-outline",
            label: "Write review",
            onPress: () => router.push("/(tabs)/gear/review"),
          },
        ]}
      />
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        {title}
      </Text>
      <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
        {subtitle}
      </Text>
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

  return (
    <View className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 font-semibold text-zinc-900 dark:text-zinc-50">
          {item.name}
        </Text>
        <DeleteButton
          accessibilityLabel={`Remove ${item.name}`}
          title="Remove gear?"
          message={`This removes “${item.name}” from your rack.`}
          confirmLabel="Remove"
          onConfirm={() => remove.mutate()}
        />
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

  return (
    <View className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 font-semibold text-zinc-900 dark:text-zinc-50">
          {review.product}
        </Text>
        {canDelete ? (
          <DeleteButton
            accessibilityLabel={`Delete review of ${review.product}`}
            title="Delete review?"
            message={`This deletes your review of “${review.product}”.`}
            onConfirm={() => remove.mutate()}
          />
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
