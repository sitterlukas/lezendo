import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cragWriteSchema } from "@whipperbook/validation";
import { ApiError, cragDetailQuery } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Field, Button } from "../../../components/form";
import { Loading } from "../../../components/states";

type CragEdit = {
  crag: {
    name: string;
    area: string | null;
    country: string | null;
    description: string | null;
    rock_type: string | null;
    aspect: string | null;
    best_season: string | null;
    access_notes: string | null;
  };
};

type Initial = {
  name: string;
  area: string;
  country: string;
  description: string;
  rock_type: string;
  aspect: string;
  best_season: string;
  access_notes: string;
};

// Add a crag, or edit one when `editId` is present. The fields live in an inner
// component so editing can seed their initial state directly from the loaded
// crag (no setState-in-effect).
export default function CragForm() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEdit = !!editId;
  // Same query key the crag detail screen uses, so this is a cache hit.
  const existing = useQuery({
    ...cragDetailQuery<CragEdit>(api, Number(editId)),
    enabled: isEdit,
  });

  if (isEdit && existing.isPending) return <Loading />;

  const c = existing.data?.crag;
  return (
    <CragFields
      editId={editId}
      initial={{
        name: c?.name ?? "",
        area: c?.area ?? "",
        country: c?.country ?? "",
        description: c?.description ?? "",
        rock_type: c?.rock_type ?? "",
        aspect: c?.aspect ?? "",
        best_season: c?.best_season ?? "",
        access_notes: c?.access_notes ?? "",
      }}
    />
  );
}

function CragFields({
  editId,
  initial,
}: {
  editId?: string;
  initial: Initial;
}) {
  const isEdit = !!editId;
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial.name);
  const [area, setArea] = useState(initial.area);
  const [country, setCountry] = useState(initial.country);
  const [description, setDescription] = useState(initial.description);
  const [rockType, setRockType] = useState(initial.rock_type);
  const [aspect, setAspect] = useState(initial.aspect);
  const [bestSeason, setBestSeason] = useState(initial.best_season);
  const [accessNotes, setAccessNotes] = useState(initial.access_notes);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: unknown): Promise<{ id?: number }> =>
      isEdit
        ? api.send(`/api/crags/${editId}`, "PATCH", body)
        : api.send("/api/crags", "POST", body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["crags"] });
      // Land on the crag detail (where photos can be added) after either op.
      if (isEdit) router.back();
      else router.replace(`/(tabs)/crags/${res.id}`);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not save crag."),
  });

  function submit() {
    setError(null);
    const parsed = cragWriteSchema.safeParse({
      name,
      area,
      country,
      description,
      rock_type: rockType,
      aspect,
      best_season: bestSeason,
      access_notes: accessNotes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid crag.");
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
          title: isEdit ? "Edit crag" : "Add crag",
          presentation: "modal",
        }}
      />
      <Field
        label="Name"
        hint
        required
        value={name}
        onChangeText={setName}
        placeholder="Crag name"
      />
      <Field
        label="Area"
        hint
        value={area}
        onChangeText={setArea}
        placeholder="Region / area"
      />
      <Field label="Country" hint value={country} onChangeText={setCountry} />
      <Field
        label="Rock type"
        hint
        value={rockType}
        onChangeText={setRockType}
        placeholder="e.g. Limestone"
      />
      <Field
        label="Aspect"
        hint
        value={aspect}
        onChangeText={setAspect}
        placeholder="e.g. South-facing"
      />
      <Field
        label="Best season"
        hint
        value={bestSeason}
        onChangeText={setBestSeason}
        placeholder="e.g. Spring & Autumn"
      />
      <Field
        label="Description"
        hint
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <Field
        label="Access notes"
        hint
        value={accessNotes}
        onChangeText={setAccessNotes}
        placeholder="Parking, restrictions, seasonal bans…"
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button
        label={isEdit ? "Save changes" : "Create crag"}
        onPress={submit}
        busy={mutation.isPending}
      />
    </ScrollView>
  );
}
