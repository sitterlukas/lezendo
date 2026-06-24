import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { routeWriteSchema } from "@whipperbook/validation";
import {
  settingsQuery,
  routeDetailQuery,
  ApiError,
} from "@whipperbook/api-client";
import {
  gradesForSystem,
  disciplineOf,
  type GradeEquivalency,
} from "@whipperbook/core";
import { api } from "../../../../lib/api";
import { sectionLabelClass } from "../../../../lib/styles";
import {
  Field,
  Button,
  SegmentedPicker,
  FieldHint,
} from "../../../../components/form";
import { Loading, ErrorState } from "../../../../components/states";

type GradingSystem = { id: number; name: string; slug: string };
type Settings = {
  gradingSystems: GradingSystem[];
  gradeEquivalencies: GradeEquivalency[];
} | null;

type Style = "sport" | "trad" | "boulder";

type RouteEdit = {
  route: {
    name: string;
    grade: string;
    style: Style;
    grading_system_id: number;
    sector_id: number | null;
    description: string | null;
    height_m: number | null;
    bolt_count: number | null;
    protection: string | null;
    first_ascensionist: string | null;
    first_ascent_year: number | null;
    pitches: number | null;
    gear_notes: string | null;
  };
};

type Initial = {
  name: string;
  style: Style;
  systemId: number | null;
  grade: string;
  description: string;
  sectorId: number | null;
  heightM: string;
  boltCount: string;
  protection: string;
  firstAscensionist: string;
  firstAscentYear: string;
  pitches: string;
  gearNotes: string;
};

const num = (n: number | null) => (n != null ? String(n) : "");

// Add a route, or edit one when `editId` is present. The fields live in an
// inner component so editing can seed their initial state directly from the
// loaded route (no setState-in-effect).
export default function RouteForm() {
  const { cragId, sectorId, editId } = useLocalSearchParams<{
    cragId: string;
    sectorId?: string;
    editId?: string;
  }>();
  const crag = Number(cragId);
  const isEdit = !!editId;
  const me = useQuery(settingsQuery<Settings>(api));
  const existing = useQuery({
    ...routeDetailQuery<RouteEdit>(api, crag, Number(editId)),
    enabled: isEdit,
  });

  if (me.isPending || (isEdit && existing.isPending)) return <Loading />;
  if (me.error) {
    return (
      <ErrorState
        message={
          me.error instanceof ApiError
            ? me.error.message
            : "Could not load grades."
        }
        onRetry={me.refetch}
      />
    );
  }

  const r = existing.data?.route;
  return (
    <RouteFields
      crag={crag}
      editId={editId}
      sectorId={sectorId}
      systems={me.data?.gradingSystems ?? []}
      eqs={me.data?.gradeEquivalencies ?? []}
      initial={{
        name: r?.name ?? "",
        style: r?.style ?? "sport",
        systemId: r?.grading_system_id ?? null,
        grade: r?.grade ?? "",
        description: r?.description ?? "",
        sectorId: r?.sector_id ?? null,
        heightM: num(r?.height_m ?? null),
        boltCount: num(r?.bolt_count ?? null),
        protection: r?.protection ?? "",
        firstAscensionist: r?.first_ascensionist ?? "",
        firstAscentYear: num(r?.first_ascent_year ?? null),
        pitches: num(r?.pitches ?? null),
        gearNotes: r?.gear_notes ?? "",
      }}
    />
  );
}

function RouteFields({
  crag,
  editId,
  sectorId,
  systems,
  eqs,
  initial,
}: {
  crag: number;
  editId?: string;
  sectorId?: string;
  systems: GradingSystem[];
  eqs: GradeEquivalency[];
  initial: Initial;
}) {
  const isEdit = !!editId;
  const queryClient = useQueryClient();

  const [name, setName] = useState(initial.name);
  const [style, setStyle] = useState<Style>(initial.style);
  const [systemId, setSystemId] = useState<number | null>(initial.systemId);
  const [grade, setGrade] = useState(initial.grade);
  const [description, setDescription] = useState(initial.description);
  const [heightM, setHeightM] = useState(initial.heightM);
  const [boltCount, setBoltCount] = useState(initial.boltCount);
  const [firstAscensionist, setFirstAscensionist] = useState(
    initial.firstAscensionist,
  );
  const [firstAscentYear, setFirstAscentYear] = useState(
    initial.firstAscentYear,
  );
  const [pitches, setPitches] = useState(initial.pitches);
  const [gearNotes, setGearNotes] = useState(initial.gearNotes);
  const [error, setError] = useState<string | null>(null);

  const wantedDiscipline = style === "boulder" ? "boulder" : "rope";
  // Only grading systems whose discipline matches the chosen style.
  const validSystems = useMemo(
    () => systems.filter((s) => disciplineOf(s.slug, eqs) === wantedDiscipline),
    [systems, eqs, wantedDiscipline],
  );
  const effectiveSystemId =
    validSystems.find((s) => s.id === systemId)?.id ??
    validSystems[0]?.id ??
    null;
  const slug = validSystems.find((s) => s.id === effectiveSystemId)?.slug ?? "";
  const gradeOptions = useMemo(() => gradesForSystem(slug, eqs), [slug, eqs]);

  const mutation = useMutation({
    mutationFn: (body: unknown): Promise<{ id?: number }> =>
      isEdit
        ? api.send(`/api/routes/${editId}`, "PATCH", body)
        : api.send("/api/routes", "POST", body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["crags", "detail", crag] });
      if (sectorId) {
        queryClient.invalidateQueries({
          queryKey: ["sectors", "detail", Number(sectorId)],
        });
      }
      if (isEdit) {
        queryClient.invalidateQueries({
          queryKey: ["routes", "detail", Number(editId)],
        });
        router.back();
      } else {
        // Land on the new route detail (where photos can be added).
        router.replace(`/(tabs)/crags/route/${res.id}?cragId=${crag}`);
      }
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not save route."),
  });

  function submit() {
    setError(null);
    const parsed = routeWriteSchema.safeParse({
      name,
      grade,
      style,
      grading_system_id: effectiveSystemId,
      crag_id: crag,
      // On edit keep the route's sector; on create use the sector we came from.
      sector_id: isEdit ? initial.sectorId : sectorId ? Number(sectorId) : null,
      description,
      height_m: heightM,
      bolt_count: boltCount,
      // Folded into "Gear / protection" (gear_notes); preserve old data on edit.
      protection: initial.protection,
      first_ascensionist: firstAscensionist,
      first_ascent_year: firstAscentYear,
      pitches,
      gear_notes: gearNotes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid route.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-4"
    >
      <Stack.Screen
        options={{
          title: isEdit ? "Edit route" : "Add route",
          presentation: "modal",
        }}
      />
      <Text className={sectionLabelClass}>Basics</Text>
      <Field
        label="Name"
        hint
        required
        value={name}
        onChangeText={setName}
        placeholder="Route name"
      />

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Style
          <FieldHint required />
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
          <FieldHint required />
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
          <FieldHint required />
        </Text>
        <SegmentedPicker<string>
          value={grade}
          onChange={setGrade}
          options={gradeOptions.map((g) => ({ label: g, value: g }))}
        />
      </View>

      <Text className={`mt-2 ${sectionLabelClass}`}>Details</Text>
      <Field
        label="Height (m)"
        hint
        value={heightM}
        onChangeText={setHeightM}
        keyboardType="numeric"
      />
      <Field
        label="Bolts"
        hint
        value={boltCount}
        onChangeText={setBoltCount}
        keyboardType="numeric"
      />
      <Field
        label="Pitches"
        hint
        value={pitches}
        onChangeText={setPitches}
        keyboardType="numeric"
      />
      <Field
        label="First ascensionist"
        hint
        value={firstAscensionist}
        onChangeText={setFirstAscensionist}
      />
      <Field
        label="First ascent year"
        hint
        value={firstAscentYear}
        onChangeText={setFirstAscentYear}
        keyboardType="numeric"
      />
      <Field
        label="Gear / protection"
        hint
        value={gearNotes}
        onChangeText={setGearNotes}
        placeholder="e.g. Sport-bolted with lower-off, or single rack to 3 inches"
        multiline
      />
      <Field
        label="Description"
        hint
        value={description}
        onChangeText={setDescription}
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button
        label={isEdit ? "Save changes" : "Create route"}
        onPress={submit}
        busy={mutation.isPending}
      />
    </ScrollView>
  );
}
