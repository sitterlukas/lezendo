import { SectionList, Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { cragsListQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Loading, ErrorState } from "../../../components/states";
import { Fab } from "../../../components/fab";

// Minimal local shape of GET /api/crags — the web handler returns more (viewer,
// country tabs, pagination); we only read what this screen renders.
type Crag = {
  id: number;
  name: string;
  area: string | null;
  country: string | null;
  routeCount: number;
};
type CragsResponse = { crags: Crag[] };

export default function CragsList() {
  const router = useRouter();
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

  // Group crags under their country, preserving the API's country-ordered
  // sequence (NULLS LAST → an "Other" bucket falls at the end).
  const sections: { title: string; data: Crag[] }[] = [];
  for (const crag of data.crags) {
    const title = crag.country ?? "Other";
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.data.push(crag);
    else sections.push({ title, data: [crag] });
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <SectionList
        className="flex-1"
        contentContainerClassName="p-4 gap-2 pb-24"
        sections={sections}
        keyExtractor={(c) => String(c.id)}
        refreshing={isRefetching}
        onRefresh={refetch}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text className="mt-8 text-center text-zinc-500">No crags yet.</Text>
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Link href={`/(tabs)/crags/${item.id}`} asChild>
            <Pressable className="rounded-xl border border-zinc-200 bg-white p-4 active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900">
              <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {item.name}
              </Text>
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                {item.area ? `${item.area} · ` : ""}
                {item.routeCount} route{item.routeCount === 1 ? "" : "s"}
              </Text>
            </Pressable>
          </Link>
        )}
      />

      {/* Floating "add crag" button — the shared app FAB. */}
      <Fab
        accessibilityLabel="Add crag"
        onPress={() => router.push("/(tabs)/crags/new")}
      />
    </View>
  );
}
