import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { meQuery, statisticsQuery, ApiError } from "@whipperbook/api-client";
import { POINTS_EXPLAINER } from "@whipperbook/core";
import { api, uploadAvatar } from "../../../lib/api";
import { Loading, ErrorState } from "../../../components/states";
import { Avatar } from "../../../components/avatar";
import { hardestGrade, sortGradesByDifficulty } from "../../../lib/grade-stats";

// Minimal local shapes of GET /api/me and GET /api/me/statistics.
type Me = {
  id: number;
  name: string;
  avatar_url: string | null;
} | null;
type Statistics = {
  tickRows: { tick_type: string; count: number }[];
  styleRows: { style: string; count: number }[];
  gradeRows: { grade: string; count: number }[];
  uniqueRoutes: number;
  uniqueCrags: number;
  points: { combined: number; rope: number; boulder: number };
};

const tickLabel: Record<string, string> = {
  onsight: "Onsight",
  flash: "Flash",
  redpoint: "Redpoint",
  toprope: "Toprope",
};
const tickBadge: Record<string, string> = {
  onsight:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  flash: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  redpoint: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  toprope: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};
const styleLabel: Record<string, string> = {
  sport: "Sport",
  trad: "Trad",
  boulder: "Boulder",
};
const styleBadge: Record<string, string> = {
  sport: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  trad: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  boulder:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
};

export default function Profile() {
  const queryClient = useQueryClient();
  const me = useQuery(meQuery<Me>(api));
  const stats = useQuery(statisticsQuery<Statistics>(api));

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function pickPhoto() {
    setPhotoError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPhotoError("Photo access is needed to set a picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoBusy(true);
    try {
      await uploadAvatar(result.assets[0].uri);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      await api.send("/api/me/avatar", "PATCH", { url: null });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      setPhotoError(e instanceof ApiError ? e.message : "Could not remove.");
    } finally {
      setPhotoBusy(false);
    }
  }

  if (me.isPending || stats.isPending) return <Loading />;

  if (me.error || stats.error) {
    const err = me.error ?? stats.error;
    return (
      <ErrorState
        message={
          err instanceof ApiError ? err.message : "Could not load profile."
        }
        onRetry={() => {
          me.refetch();
          stats.refetch();
        }}
      />
    );
  }

  const { tickRows, styleRows, gradeRows, uniqueRoutes, uniqueCrags, points } =
    stats.data;

  const byTick = Object.fromEntries(
    tickRows.map((r) => [r.tick_type, r.count]),
  );
  const totalSends = tickRows
    .filter((r) => r.tick_type !== "attempt")
    .reduce((s, r) => s + r.count, 0);
  const totalAttempts = byTick["attempt"] ?? 0;

  const sortedGrades = sortGradesByDifficulty(gradeRows);
  const hardest = hardestGrade(gradeRows.map((g) => g.grade));
  const maxGradeCount = gradeRows.reduce((m, r) => Math.max(m, r.count), 0);

  const sendTicks = ["onsight", "flash", "redpoint", "toprope"].filter(
    (t) => byTick[t] != null,
  );
  const styles = ["sport", "trad", "boulder"].filter((s) =>
    styleRows.some((r) => r.style === s),
  );
  const styleCount = (s: string) =>
    styleRows.find((r) => r.style === s)?.count ?? 0;

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-5"
    >
      <View className="flex-row items-center gap-4">
        <Avatar
          name={me.data?.name ?? "?"}
          src={me.data?.avatar_url}
          size={72}
        />
        <View className="flex-1 gap-2">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {me.data?.name ?? "—"}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              className="rounded-lg border border-zinc-300 px-3 py-1.5 active:opacity-80 disabled:opacity-50 dark:border-zinc-700"
              onPress={pickPhoto}
              disabled={photoBusy}
            >
              <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {photoBusy
                  ? "Working…"
                  : me.data?.avatar_url
                    ? "Change photo"
                    : "Upload photo"}
              </Text>
            </Pressable>
            {me.data?.avatar_url ? (
              <Pressable
                className="rounded-lg px-3 py-1.5 active:opacity-80 disabled:opacity-50"
                onPress={removePhoto}
                disabled={photoBusy}
              >
                <Text className="text-sm font-medium text-red-600">Remove</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      {photoError ? (
        <Text className="text-sm text-red-600">{photoError}</Text>
      ) : null}

      <Link href="/(tabs)/profile/settings" asChild>
        <Pressable className="flex-row items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 active:opacity-80 dark:border-zinc-800">
          <View className="flex-row items-center gap-2">
            <Ionicons name="settings-outline" size={18} color="#a1a1aa" />
            <Text className="font-medium text-zinc-900 dark:text-zinc-100">
              Settings
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
        </Pressable>
      </Link>

      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Your statistics
      </Text>

      {totalSends === 0 && totalAttempts === 0 ? (
        <Text className="text-sm text-zinc-500">No ascents logged yet.</Text>
      ) : (
        <>
          {/* Overview */}
          <View className="flex-row flex-wrap gap-3">
            <StatCard label="Sends" value={totalSends} />
            <StatCard label="Routes" value={uniqueRoutes} />
            <StatCard label="Crags" value={uniqueCrags} />
            <StatCard label="Attempts" value={totalAttempts} />
          </View>

          {/* Points + hardest */}
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <Text className="text-xs text-zinc-500">Points</Text>
              <Text className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {points.combined.toLocaleString()}
              </Text>
              <Text className="mt-1 text-xs text-zinc-500">
                Rope {points.rope.toLocaleString()} · Boulder{" "}
                {points.boulder.toLocaleString()}
              </Text>
            </View>
            {hardest ? (
              <View className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <Text className="text-xs text-zinc-500">Hardest send</Text>
                <Text className="mt-1 font-mono text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {hardest}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="text-xs leading-relaxed text-zinc-500">
            {POINTS_EXPLAINER}
          </Text>

          {/* By tick type */}
          {sendTicks.length > 0 ? (
            <View className="gap-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                By style
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {sendTicks.map((t) => (
                  <CountChip
                    key={t}
                    label={tickLabel[t]}
                    badge={tickBadge[t]}
                    count={byTick[t]}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* By discipline */}
          {styles.length > 0 ? (
            <View className="gap-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                By discipline
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {styles.map((s) => (
                  <CountChip
                    key={s}
                    label={styleLabel[s]}
                    badge={styleBadge[s]}
                    count={styleCount(s)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Grade breakdown — a horizontal-bar histogram, hardest first */}
          {sortedGrades.length > 0 ? (
            <View className="gap-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Grade breakdown
              </Text>
              <View className="gap-1.5">
                {sortedGrades.map((row) => (
                  <View key={row.grade} className="flex-row items-center gap-2">
                    <Text className="w-10 font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {row.grade}
                    </Text>
                    <View className="h-5 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                      <View
                        className="h-full rounded bg-zinc-900 dark:bg-zinc-100"
                        style={{
                          width: `${
                            maxGradeCount > 0
                              ? Math.max(6, (row.count / maxGradeCount) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </View>
                    <Text className="w-6 text-right text-sm tabular-nums text-zinc-500">
                      {row.count}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-[22%] flex-1 items-center rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </Text>
      <Text className="text-xs uppercase tracking-wide text-zinc-400">
        {label}
      </Text>
    </View>
  );
}

function CountChip({
  label,
  badge,
  count,
}: {
  label: string;
  badge: string;
  count: number;
}) {
  return (
    <View className="flex-row items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <Text className={`rounded px-1.5 py-0.5 text-xs font-medium ${badge}`}>
        {label}
      </Text>
      <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {count}
      </Text>
    </View>
  );
}
