import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { cragDetailQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";

// Minimal local shape of GET /api/crags/:id — the handler returns more
// (images, grading systems, sectors, viewer); we only read what this renders.
type CragDetail = {
  crag: {
    id: number;
    name: string;
    area: string | null;
    country: string | null;
    description: string | null;
  };
  routes: {
    id: number;
    name: string;
    grade: string;
    style: string;
  }[];
};

export default function CragDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    cragDetailQuery<CragDetail>(api, Number(id)),
  );

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950">
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6 dark:bg-zinc-950">
        <Text className="text-center text-red-600">
          {error instanceof ApiError ? error.message : "Could not load crag."}
        </Text>
        <Pressable
          className="rounded-lg bg-zinc-900 px-4 py-2 dark:bg-zinc-100"
          onPress={() => refetch()}
        >
          <Text className="font-semibold text-white dark:text-zinc-900">
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-3"
      data={data.routes}
      keyExtractor={(r) => String(r.id)}
      refreshing={isRefetching}
      onRefresh={refetch}
      ListHeaderComponent={
        <View className="mb-2 gap-1">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {data.crag.name}
          </Text>
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            {[data.crag.area, data.crag.country].filter(Boolean).join(", ") ||
              "—"}
          </Text>
          {data.crag.description ? (
            <Text className="mt-1 text-zinc-700 dark:text-zinc-300">
              {data.crag.description}
            </Text>
          ) : null}
          <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Routes ({data.routes.length})
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text className="text-center text-zinc-500">No routes yet.</Text>
      }
      renderItem={({ item }) => (
        <View className="flex-row items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <Text className="text-base text-zinc-900 dark:text-zinc-50">
            {item.name}
          </Text>
          <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {item.grade} · {item.style}
          </Text>
        </View>
      )}
    />
  );
}
