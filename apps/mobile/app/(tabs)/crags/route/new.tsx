import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { routeWriteSchema } from "@whipperbook/validation";
import { settingsQuery, ApiError } from "@whipperbook/api-client";
import {
  gradesForSystem,
  disciplineOf,
  type GradeEquivalency,
} from "@whipperbook/core";
import { api } from "../../../../lib/api";
import { Field, Button, SegmentedPicker } from "../../../../components/form";
import { Loading, ErrorState } from "../../../../components/states";

type GradingSystem = { id: number; name: string; slug: string };
type Settings = {
  gradingSystems: GradingSystem[];
  gradeEquivalencies: GradeEquivalency[];
} | null;

type Style = "sport" | "trad" | "boulder";

export default function NewRoute() {
  const { cragId, sectorId } = useLocalSearchParams<{
    cragId: string;
    sectorId?: string;
  }>();
  const crag = Number(cragId);
  const queryClient = useQueryClient();
  const me = useQuery(settingsQuery<Settings>(api));

  const [name, setName] = useState("");
  const [style, setStyle] = useState<Style>("sport");
  const [systemId, setSystemId] = useState<number | null>(null);
  const [grade, setGrade] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wantedDiscipline = style === "boulder" ? "boulder" : "rope";
  const eqs = useMemo(
    () => me.data?.gradeEquivalencies ?? [],
    [me.data?.gradeEquivalencies],
  );
  const systems = useMemo(
    () => me.data?.gradingSystems ?? [],
    [me.data?.gradingSystems],
  );

  // Only grading systems whose discipline matches the chosen style.
  const validSystems = useMemo(
    () => systems.filter((s) => disciplineOf(s.slug, eqs) === wantedDiscipline),
    [systems, eqs, wantedDiscipline],
  );
  const effectiveSystemId =
    validSystems.find((s) => s.id === systemId)?.id ?? validSystems[0]?.id ?? null;
  const slug = validSystems.find((s) => s.id === effectiveSystemId)?.slug ?? "";
  const gradeOptions = useMemo(() => gradesForSystem(slug, eqs), [slug, eqs]);

  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api.send<{ id: number }>("/api/routes", "POST", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crags", "detail", crag] });
      if (sectorId) {
        queryClient.invalidateQueries({
          queryKey: ["sectors", "detail", Number(sectorId)],
        });
      }
      router.back();
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not create route."),
  });

  function submit() {
    setError(null);
    const parsed = routeWriteSchema.safeParse({
      name,
      grade,
      style,
      grading_system_id: effectiveSystemId,
      crag_id: crag,
      sector_id: sectorId ? Number(sectorId) : null,
      description,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid route.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  if (me.isPending) return <Loading />;
  if (me.error) {
    return (
      <ErrorState
        message={
          me.error instanceof ApiError ? me.error.message : "Could not load grades."
        }
        onRetry={me.refetch}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-4"
    >
      <Stack.Screen options={{ title: "Add route", presentation: "modal" }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Route name" />

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Style
        </Text>
        <SegmentedPicker<Style>
          value={style}
          onChange={(v) => {
            setStyle(v);
            setGrade("");
          }}
          options={[
            { label: "Sport", value: "sport" },
            { label: "Trad", value: "trad" },
            { label: "Boulder", value: "boulder" },
          ]}
        />
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Grading system
        </Text>
        <SegmentedPicker<number>
          value={effectiveSystemId ?? -1}
          onChange={(v) => {
            setSystemId(v);
            setGrade("");
          }}
          options={validSystems.map((s) => ({ label: s.name, value: s.id }))}
        />
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Grade
        </Text>
        <SegmentedPicker<string>
          value={grade}
          onChange={setGrade}
          options={gradeOptions.map((g) => ({ label: g, value: g }))}
        />
      </View>

      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button label="Create route" onPress={submit} busy={mutation.isPending} />
    </ScrollView>
  );
}
