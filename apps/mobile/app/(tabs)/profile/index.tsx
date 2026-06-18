import { useState, useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { meQuery, statisticsQuery, ApiError } from "@whipperbook/api-client";
import { api, uploadAvatar } from "../../../lib/api";
import { tokens } from "../../../lib/auth";
import { Loading, ErrorState } from "../../../components/states";
import { SegmentedPicker } from "../../../components/form";
import { Avatar } from "../../../components/avatar";
import {
  type ThemeMode,
  loadThemeMode,
  saveThemeMode,
  applyThemeMode,
} from "../../../lib/theme";

// Minimal local shapes of GET /api/me and GET /api/me/statistics.
type Me = {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
} | null;
type Statistics = {
  uniqueRoutes: number;
  uniqueCrags: number;
  points: { combined: number; rope: number; boulder: number };
};

export default function Profile() {
  const queryClient = useQueryClient();
  const me = useQuery(meQuery<Me>(api));
  const stats = useQuery(statisticsQuery<Statistics>(api));

  const [theme, setTheme] = useState<ThemeMode>("system");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  useEffect(() => {
    loadThemeMode().then(setTheme);
  }, []);
  function changeTheme(mode: ThemeMode) {
    setTheme(mode);
    applyThemeMode(mode);
    void saveThemeMode(mode);
  }

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
      <View className="flex-row items-center gap-4">
        <Avatar
          name={me.data?.name ?? "?"}
          src={me.data?.avatar_url}
          size={72}
        />
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {me.data?.name ?? "—"}
          </Text>
          <Text className="text-zinc-500 dark:text-zinc-400">
            {me.data?.email}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row gap-2">
          <Pressable
            className="rounded-lg border border-zinc-300 px-3 py-2 active:opacity-80 disabled:opacity-50 dark:border-zinc-700"
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
              className="rounded-lg px-3 py-2 active:opacity-80 disabled:opacity-50"
              onPress={removePhoto}
              disabled={photoBusy}
            >
              <Text className="text-sm font-medium text-red-600">Remove</Text>
            </Pressable>
          ) : null}
        </View>
        {photoError ? (
          <Text className="text-sm text-red-600">{photoError}</Text>
        ) : null}
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
