import { FlatList, Pressable, Text } from "react-native";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { cragsListQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Loading, ErrorState } from "../../../components/states";

// Minimal local shape of GET /api/crags — the web handler returns more (viewer,
// country tabs, pagination); we only read what this screen renders. Refine as
// the mobile feature set grows.
type CragsResponse = {
  crags: {
    id: number;
    name: string;
    area: string | null;
    country: string | null;
    routeCount: number;
  }[];
};

export default function CragsList() {
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    cragsListQuery<CragsResponse>(api),
  );

  if (isPending) return <Loading />;

  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError ? error.message : "Could not load crags."
        }
        onRetry={refetch}
      />
    );
  }

  return (
    <FlatList
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-3"
      data={data.crags}
      keyExtractor={(c) => String(c.id)}
      refreshing={isRefetching}
      onRefresh={refetch}
      ListEmptyComponent={
        <Text className="mt-8 text-center text-zinc-500">No crags yet.</Text>
      }
      renderItem={({ item }) => (
        <Link href={`/(tabs)/crags/${item.id}`} asChild>
          <Pressable className="rounded-xl border border-zinc-200 bg-white p-4 active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900">
            <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {item.name}
            </Text>
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              {[item.area, item.country].filter(Boolean).join(", ") || "—"} ·{" "}
              {item.routeCount} routes
            </Text>
          </Pressable>
        </Link>
      )}
    />
  );
}
