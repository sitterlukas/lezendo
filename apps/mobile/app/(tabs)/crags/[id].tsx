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
import { cragDetailQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { canModify } from "../../../lib/permissions";
import { Loading, ErrorState } from "../../../components/states";
import { DeleteButton } from "../../../components/delete-button";
import { EditButton } from "../../../components/edit-button";
import { FabMenu } from "../../../components/fab-menu";
import { RouteRow } from "../../../components/route-row";
import { ReviewForm } from "../../../components/review-form";

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
    created_by: number | null;
  };
  viewer: { id: number; role: string } | null;
  sectors: Sector[];
  routes: CragRoute[];
};

export default function CragDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cragId = Number(id);
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    cragDetailQuery<CragDetail>(api, cragId),
  );

  const remove = useMutation({
    mutationFn: () => api.send(`/api/crags/${cragId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crags"] });
      router.replace("/(tabs)/crags");
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
          error instanceof ApiError ? error.message : "Could not load crag."
        }
        onRetry={refetch}
      />
    );
  }

  const { crag, viewer, sectors, routes } = data;
  const unsectored = routes.filter((r) => r.sector_id === null);
  const sectorRouteCount = (sectorId: number) =>
    routes.filter((r) => r.sector_id === sectorId).length;

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-3 pb-24"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <View className="mb-1 flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
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
          {canModify(viewer, crag.created_by) ? (
            <View className="flex-row items-center gap-3">
              <EditButton
                accessibilityLabel="Edit crag"
                onPress={() =>
                  router.push(`/(tabs)/crags/new?editId=${cragId}`)
                }
              />
              <DeleteButton
                accessibilityLabel="Delete crag"
                title="Delete crag?"
                message={`This removes “${crag.name}” and its sectors and routes.`}
                size={20}
                onConfirm={() => remove.mutate()}
              />
            </View>
          ) : null}
        </View>

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

        <ReviewForm
          entityType="crag"
          entityId={cragId}
          invalidateKey={["crags", "detail", cragId]}
        />
      </ScrollView>

      <FabMenu
        accessibilityLabel="Add to crag"
        actions={[
          {
            icon: "layers-outline",
            label: "Add sector",
            onPress: () =>
              router.push(`/(tabs)/crags/sector/new?cragId=${cragId}`),
          },
          {
            icon: "trail-sign-outline",
            label: "Add route",
            onPress: () =>
              router.push(`/(tabs)/crags/route/new?cragId=${cragId}`),
          },
        ]}
      />
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </Text>
  );
}
