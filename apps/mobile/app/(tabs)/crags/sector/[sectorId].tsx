import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { sectorDetailQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../../lib/api";
import { Loading, ErrorState } from "../../../../components/states";
import { RouteRow } from "../../../../components/route-row";

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
  };
  routes: { id: number; name: string; grade: string; style: string }[];
};

export default function SectorDetailScreen() {
  const { sectorId, cragId } = useLocalSearchParams<{
    sectorId: string;
    cragId: string;
  }>();
  const crag = Number(cragId);
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    sectorDetailQuery<SectorDetail>(api, crag, Number(sectorId)),
  );

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

  const { sector, routes } = data;
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
      <View className="mb-1 gap-1">
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
    </ScrollView>
  );
}
