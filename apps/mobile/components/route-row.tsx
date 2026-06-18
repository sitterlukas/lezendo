import { Pressable, Text } from "react-native";
import { Link } from "expo-router";

// A single route line linking to the route detail screen. Shared by the crag
// detail screen (unsectored routes) and the sector screen so both render and
// navigate identically. `grade` is the viewer's resolved display grade.
export function RouteRow({
  route,
  cragId,
}: {
  route: { id: number; name: string; grade: string; style: string };
  cragId: number;
}) {
  return (
    <Link href={`/(tabs)/crags/route/${route.id}?cragId=${cragId}`} asChild>
      <Pressable className="flex-row items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900">
        <Text className="text-base text-zinc-900 dark:text-zinc-50">
          {route.name}
        </Text>
        <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {route.grade} · {route.style}
        </Text>
      </Pressable>
    </Link>
  );
}
