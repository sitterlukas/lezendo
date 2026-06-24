import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsQuery, ApiError } from "@whipperbook/api-client";
import { disciplineOf, type GradeEquivalency } from "@whipperbook/core";
import { api } from "../../../lib/api";
import { tokens } from "../../../lib/auth";
import { Loading, ErrorState } from "../../../components/states";
import { Field, Button, SegmentedPicker } from "../../../components/form";
import {
  type ThemeMode,
  loadThemeMode,
  saveThemeMode,
  applyThemeMode,
} from "../../../lib/theme";

type GradingSystem = { id: number; name: string; slug: string };
type Settings = {
  user: {
    name: string;
    email: string;
    created_at: Date;
    preferred_rope_grading_system_id: number | null;
    preferred_boulder_grading_system_id: number | null;
  };
  gradingSystems: GradingSystem[];
  gradeEquivalencies: GradeEquivalency[];
  provider: string | null;
};

export default function SettingsScreen() {
  const { data, isPending, error, refetch } = useQuery(
    settingsQuery<Settings>(api),
  );

  if (isPending) return <Loading />;
  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError ? error.message : "Could not load settings."
        }
        onRetry={refetch}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-5"
    >
      <Stack.Screen options={{ title: "Settings" }} />
      <NameSection initialName={data.user.name} />
      <GradingSection
        systems={data.gradingSystems}
        equivalencies={data.gradeEquivalencies}
        ropeDefault={data.user.preferred_rope_grading_system_id}
        boulderDefault={data.user.preferred_boulder_grading_system_id}
      />
      <AppearanceSection />
      <AccountSection
        email={data.user.email}
        createdAt={data.user.created_at}
        provider={data.provider}
      />
      <Pressable
        className="mt-2 items-center rounded-lg border border-zinc-300 py-3 active:opacity-80 dark:border-zinc-700"
        onPress={async () => {
          await tokens.clear();
          router.replace("/(auth)/login");
        }}
      >
        <Text className="text-base font-semibold text-red-600">Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

function NameSection({ initialName }: { initialName: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.send("/api/me", "PATCH", { name: name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["me", "settings"] });
      setSaved(true);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not save name."),
  });

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Display name
      </Text>
      <Field
        value={name}
        onChangeText={(t) => {
          setName(t);
          setSaved(false);
          setError(null);
        }}
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      {saved ? <Text className="text-sm text-green-600">Saved.</Text> : null}
      <Button
        label="Save name"
        onPress={() => mutation.mutate()}
        busy={mutation.isPending}
        disabled={name.trim().length === 0 || name.trim() === initialName}
      />
    </View>
  );
}

function GradingSection({
  systems,
  equivalencies,
  ropeDefault,
  boulderDefault,
}: {
  systems: GradingSystem[];
  equivalencies: GradeEquivalency[];
  ropeDefault: number | null;
  boulderDefault: number | null;
}) {
  const queryClient = useQueryClient();
  const [rope, setRope] = useState<number | null>(ropeDefault);
  const [boulder, setBoulder] = useState<number | null>(boulderDefault);
  const [error, setError] = useState<string | null>(null);

  const ropeSystems = useMemo(
    () => systems.filter((s) => disciplineOf(s.slug, equivalencies) === "rope"),
    [systems, equivalencies],
  );
  const boulderSystems = useMemo(
    () =>
      systems.filter((s) => disciplineOf(s.slug, equivalencies) === "boulder"),
    [systems, equivalencies],
  );

  const mutation = useMutation({
    mutationFn: (body: Record<string, number>) =>
      api.send("/api/me", "PATCH", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["me", "settings"] });
    },
    onError: (e) =>
      setError(
        e instanceof ApiError ? e.message : "Could not save preference.",
      ),
  });

  function pickRope(id: number) {
    setError(null);
    setRope(id);
    mutation.mutate({ preferred_rope_grading_system_id: id });
  }
  function pickBoulder(id: number) {
    setError(null);
    setBoulder(id);
    mutation.mutate({ preferred_boulder_grading_system_id: id });
  }

  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Grading systems
      </Text>
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Preferred rope grades
        </Text>
        <SegmentedPicker<number>
          value={rope ?? ropeSystems[0]?.id ?? 0}
          onChange={pickRope}
          options={ropeSystems.map((s) => ({ label: s.name, value: s.id }))}
        />
      </View>
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Preferred boulder grades
        </Text>
        <SegmentedPicker<number>
          value={boulder ?? boulderSystems[0]?.id ?? 0}
          onChange={pickBoulder}
          options={boulderSystems.map((s) => ({ label: s.name, value: s.id }))}
        />
      </View>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  useEffect(() => {
    loadThemeMode().then(setTheme);
  }, []);
  function changeTheme(mode: ThemeMode) {
    setTheme(mode);
    applyThemeMode(mode);
    void saveThemeMode(mode);
  }
  return (
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
  );
}

function AccountSection({
  email,
  createdAt,
  provider,
}: {
  email: string;
  createdAt: Date;
  provider: string | null;
}) {
  const memberSince = createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Account
      </Text>
      <View className="rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Row label="Email" value={email} />
        <Row label="Member since" value={memberSince} border />
        <Row
          label="Log-in method"
          value={provider === "google" ? "Google" : "Email & password"}
          border
        />
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  border = false,
}: {
  label: string;
  value: string;
  border?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 ${
        border ? "border-t border-zinc-200 dark:border-zinc-800" : ""
      }`}
    >
      <Text className="text-sm text-zinc-500">{label}</Text>
      <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {value}
      </Text>
    </View>
  );
}
