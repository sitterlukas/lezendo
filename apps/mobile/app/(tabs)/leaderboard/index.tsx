import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { leaderboardQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { ErrorState } from "../../../components/states";
import { Avatar } from "../../../components/avatar";
import { RankCrown } from "../../../components/rank-crown";
import { SegmentedPicker } from "../../../components/form";

// GET /api/leaderboards — top 25 climbers for the period/discipline, plus the
// viewer's own rank when they fall outside the top 25.
type Row = {
  user_id: number;
  name: string;
  avatar_url: string | null;
  points: number;
};
type LeaderboardData = {
  viewerId: number | null;
  rows: Row[];
  myRow: { rank: number; total: number } | null;
};

const periods = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "All", value: "all" },
];
const disciplines = [
  { label: "All", value: "combined" },
  { label: "Rope", value: "rope" },
  { label: "Boulder", value: "boulder" },
];

export default function Leaderboard() {
  const [period, setPeriod] = useState("month");
  const [discipline, setDiscipline] = useState("combined");
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    leaderboardQuery<LeaderboardData>(api, { period, discipline }),
  );

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      {/* Filters stay mounted; only the list body below swaps to a loader so
          changing a category doesn't blank the whole screen. */}
      <View className="gap-3 p-4">
        <SegmentedPicker
          value={period}
          onChange={setPeriod}
          options={periods}
        />
        <SegmentedPicker
          value={discipline}
          onChange={setDiscipline}
          options={disciplines}
        />
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <ErrorState
          message={
            error instanceof ApiError
              ? error.message
              : "Could not load the leaderboard."
          }
          onRetry={refetch}
        />
      ) : (
        <FlatList
          className="flex-1"
          contentContainerClassName="gap-2 px-4 pb-4"
          data={data.rows}
          keyExtractor={(r) => String(r.user_id)}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text className="mt-8 text-center text-zinc-500">
              No climbers ranked yet for this period.
            </Text>
          }
          renderItem={({ item, index }) => (
            <LeaderRow
              row={item}
              rank={index + 1}
              isViewer={item.user_id === data.viewerId}
            />
          )}
          ListFooterComponent={
            data.myRow ? (
              <View className="mt-3 flex-row items-center gap-3 rounded-xl border border-zinc-900 px-3 py-3 dark:border-zinc-100">
                <Text className="w-8 text-center text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  #{data.myRow.rank}
                </Text>
                <Text className="flex-1 font-medium text-zinc-900 dark:text-zinc-50">
                  You
                </Text>
                <Text className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {data.myRow.total} pts
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function LeaderRow({
  row,
  rank,
  isViewer,
}: {
  row: Row;
  rank: number;
  isViewer: boolean;
}) {
  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/leaderboard/users/${row.user_id}`)}
      className={
        isViewer
          ? "flex-row items-center gap-3 rounded-xl border border-zinc-900 bg-zinc-50 px-3 py-3 active:opacity-80 dark:border-zinc-100 dark:bg-zinc-900"
          : "flex-row items-center gap-3 rounded-xl border border-zinc-200 px-3 py-3 active:opacity-80 dark:border-zinc-800"
      }
    >
      <View className="w-8 items-center">
        {rank <= 3 ? (
          <RankCrown rank={rank} size={22} />
        ) : (
          <Text className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
            #{rank}
          </Text>
        )}
      </View>
      <Avatar name={row.name} src={row.avatar_url} size={36} />
      <Text className="flex-1 font-medium text-zinc-900 dark:text-zinc-50">
        {row.name}
        {isViewer ? " (you)" : ""}
      </Text>
      <Text className="font-semibold text-zinc-900 dark:text-zinc-50">
        {row.points} pts
      </Text>
    </Pressable>
  );
}
