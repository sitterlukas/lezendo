import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sectorDetailQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../../lib/api";
import { canModify } from "../../../../lib/permissions";
import { Loading, ErrorState } from "../../../../components/states";
import { DeleteButton } from "../../../../components/delete-button";
import { RouteRow } from "../../../../components/route-row";
import { ReviewForm } from "../../../../components/review-form";

// Minimal local shape of GET /api/sectors/:id?cragId= — the handler returns
// more (crag, images, grading systems, viewer); we only read what this renders.
// `routes[].grade` is already resolved to the viewer's preferred system.
type SectorDetail = {
  sector: {
    id: number;
    name: string;
    description: string | null;
    approach_minutes: number | null;
    aspect: string | null;
    created_by: number | null;
  };
  viewer: { id: number; role: string } | null;
  routes: { id: number; name: string; grade: string; style: string }[];
};

export default function SectorDetailScreen() {
  const { sectorId, cragId } = useLocalSearchParams<{
    sectorId: string;
    cragId: string;
  }>();
  const crag = Number(cragId);
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    sectorDetailQuery<SectorDetail>(api, crag, Number(sectorId)),
  );

  const remove = useMutation({
    mutationFn: () => api.send(`/api/sectors/${sectorId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crags", "detail", crag] });
      queryClient.invalidateQueries({ queryKey: ["crags"] });
      router.replace(`/(tabs)/crags/${crag}`);
    },
    onError: (e) =>
      Alert.alert(
        "Could not delete",
        e instanceof ApiError ? e.message : "Please try again.",
      ),
  });

  if (isPending) return <Loading />;

  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError ? error.message : "Could not load sector."
        }
        onRetry={refetch}
      />
    );
  }

  const { sector, viewer, routes } = data;
  const meta = [
    sector.approach_minutes != null
      ? `${sector.approach_minutes} min approach`
      : null,
    sector.aspect,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-3"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View className="mb-1 flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {sector.name}
          </Text>
          {meta ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              {meta}
            </Text>
          ) : null}
          {sector.description ? (
            <Text className="mt-1 text-zinc-700 dark:text-zinc-300">
              {sector.description}
            </Text>
          ) : null}
        </View>
        {canModify(viewer, sector.created_by) ? (
          <DeleteButton
            accessibilityLabel="Delete sector"
            title="Delete sector?"
            message={`This removes “${sector.name}” and its routes.`}
            size={20}
            onConfirm={() => remove.mutate()}
          />
        ) : null}
      </View>

      <Link
        href={`/(tabs)/crags/route/new?cragId=${crag}&sectorId=${sector.id}`}
        asChild
      >
        <Pressable className="self-start rounded-lg border border-zinc-300 px-3 py-2 active:opacity-80 dark:border-zinc-700">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            + Add route
          </Text>
        </Pressable>
      </Link>

      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Routes ({routes.length})
      </Text>
      {routes.length === 0 ? (
        <Text className="text-center text-zinc-500">No routes yet.</Text>
      ) : (
        routes.map((route) => (
          <RouteRow key={route.id} route={route} cragId={crag} />
        ))
      )}

      <ReviewForm
        entityType="sector"
        entityId={Number(sectorId)}
        invalidateKey={["sectors", "detail", Number(sectorId)]}
      />
    </ScrollView>
  );
}
