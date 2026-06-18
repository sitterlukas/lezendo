import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { cragDetailQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Loading, ErrorState } from "../../../components/states";
import { RouteRow } from "../../../components/route-row";

// Minimal local shape of GET /api/crags/:id — the handler returns more (images,
// grading systems, viewer, deleted entities); we only read what this renders.
// `routes[].grade` is already resolved to the viewer's preferred system.
type CragRoute = {
  id: number;
  name: string;
  grade: string;
  style: string;
  sector_id: number | null;
};
type Sector = {
  id: number;
  name: string;
  description: string | null;
};
type CragDetail = {
  crag: {
    id: number;
    name: string;
    area: string | null;
    country: string | null;
    description: string | null;
  };
  sectors: Sector[];
  routes: CragRoute[];
};

export default function CragDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cragId = Number(id);
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    cragDetailQuery<CragDetail>(api, cragId),
  );

  if (isPending) return <Loading />;

  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError ? error.message : "Could not load crag."
        }
        onRetry={refetch}
      />
    );
  }

  const { crag, sectors, routes } = data;
  const unsectored = routes.filter((r) => r.sector_id === null);
  const sectorRouteCount = (sectorId: number) =>
    routes.filter((r) => r.sector_id === sectorId).length;

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
          {crag.name}
        </Text>
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          {[crag.area, crag.country].filter(Boolean).join(", ") || "—"}
        </Text>
        {crag.description ? (
          <Text className="mt-1 text-zinc-700 dark:text-zinc-300">
            {crag.description}
          </Text>
        ) : null}
      </View>

      <Link href={`/(tabs)/crags/sector/new?cragId=${cragId}`} asChild>
        <Pressable className="self-start rounded-lg border border-zinc-300 px-3 py-2 active:opacity-80 dark:border-zinc-700">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            + Add sector
          </Text>
        </Pressable>
      </Link>
      <Link href={`/(tabs)/crags/route/new?cragId=${cragId}`} asChild>
        <Pressable className="self-start rounded-lg border border-zinc-300 px-3 py-2 active:opacity-80 dark:border-zinc-700">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            + Add route
          </Text>
        </Pressable>
      </Link>

      {sectors.length === 0 && routes.length === 0 ? (
        <Text className="mt-4 text-center text-zinc-500">No routes yet.</Text>
      ) : null}

      {/* Sectors, each linking to its own screen. */}
      {sectors.length > 0 ? (
        <View className="gap-2">
          <SectionLabel>Sectors ({sectors.length})</SectionLabel>
          {sectors.map((sector) => (
            <Link
              key={sector.id}
              href={`/(tabs)/crags/sector/${sector.id}?cragId=${cragId}`}
              asChild
            >
              <Pressable className="rounded-xl border border-zinc-200 bg-white p-4 active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900">
                <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {sector.name}
                </Text>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  {sectorRouteCount(sector.id)} routes
                </Text>
                {sector.description ? (
                  <Text
                    numberOfLines={1}
                    className="mt-1 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    {sector.description}
                  </Text>
                ) : null}
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}

      {/* Routes without a sector — labelled "Other routes" when sectors exist,
          otherwise this is the crag's whole (flat) route list. */}
      {(sectors.length > 0 ? unsectored : routes).length > 0 ? (
        <View className="mt-2 gap-2">
          <SectionLabel>
            {sectors.length > 0
              ? `Other routes (${unsectored.length})`
              : `Routes (${routes.length})`}
          </SectionLabel>
          {(sectors.length > 0 ? unsectored : routes).map((route) => (
            <RouteRow key={route.id} route={route} cragId={cragId} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </Text>
  );
}
