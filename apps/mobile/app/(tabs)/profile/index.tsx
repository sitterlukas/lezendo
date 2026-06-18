import { useState, useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { meQuery, statisticsQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { tokens } from "../../../lib/auth";
import { Loading, ErrorState } from "../../../components/states";
import { SegmentedPicker } from "../../../components/form";
import { type ThemeMode, loadThemeMode, saveThemeMode, applyThemeMode } from "../../../lib/theme";

// Minimal local shapes of GET /api/me and GET /api/me/statistics.
type Me = { id: number; name: string; email: string } | null;
type Statistics = {
  uniqueRoutes: number;
  uniqueCrags: number;
  points: { combined: number; rope: number; boulder: number };
};

export default function Profile() {
  const me = useQuery(meQuery<Me>(api));
  const stats = useQuery(statisticsQuery<Statistics>(api));

  const [theme, setTheme] = useState<ThemeMode>("system");
  useEffect(() => {
    loadThemeMode().then(setTheme);
  }, []);
  function changeTheme(mode: ThemeMode) {
    setTheme(mode);
    applyThemeMode(mode);
    void saveThemeMode(mode);
  }

  async function logOut() {
    await tokens.clear();
    router.replace("/(auth)/login");
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

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-6 gap-6"
    >
      <View className="gap-1">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {me.data?.name ?? "—"}
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400">
          {me.data?.email}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Stat label="Routes" value={stats.data.uniqueRoutes} />
        <Stat label="Crags" value={stats.data.uniqueCrags} />
        <Stat label="Points" value={stats.data.points.combined} />
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Appearance
        </Text>
        <SegmentedPicker
          value={theme}
          onChange={changeTheme}
          options={[
            { label: "System", value: "system" },
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" },
          ]}
        />
      </View>

      <Pressable
        className="mt-2 items-center rounded-lg border border-zinc-300 py-3 active:opacity-80 dark:border-zinc-700"
        onPress={logOut}
      >
        <Text className="text-base font-semibold text-red-600">Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 items-center rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </Text>
      <Text className="text-xs uppercase tracking-wide text-zinc-400">
        {label}
      </Text>
    </View>
  );
}
