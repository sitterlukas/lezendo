import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cragWriteSchema } from "@whipperbook/validation";
import { ApiError, cragDetailQuery } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Field, Button } from "../../../components/form";
import { Loading } from "../../../components/states";

// Fields cragWriteSchema carries that this form doesn't expose — preserved
// as-is on edit so a PATCH doesn't wipe them.
type CragExtras = {
  rock_type: string | null;
  aspect: string | null;
  best_season: string | null;
  access_notes: string | null;
};
type CragEdit = {
  crag: {
    name: string;
    area: string | null;
    country: string | null;
    description: string | null;
  } & CragExtras;
};

// Add a crag, or edit one when `editId` is present. The form fields live in an
// inner component so editing can seed their initial state directly from the
// loaded crag (no setState-in-effect).
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
      extras={{
        rock_type: c?.rock_type ?? null,
        aspect: c?.aspect ?? null,
        best_season: c?.best_season ?? null,
        access_notes: c?.access_notes ?? null,
      }}
      initial={{
        name: c?.name ?? "",
        area: c?.area ?? "",
        country: c?.country ?? "",
        description: c?.description ?? "",
      }}
    />
  );
}

function CragFields({
  editId,
  extras,
  initial,
}: {
  editId?: string;
  extras: CragExtras;
  initial: { name: string; area: string; country: string; description: string };
}) {
  const isEdit = !!editId;
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial.name);
  const [area, setArea] = useState(initial.area);
  const [country, setCountry] = useState(initial.country);
  const [description, setDescription] = useState(initial.description);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: unknown): Promise<{ id?: number }> =>
      isEdit
        ? api.send(`/api/crags/${editId}`, "PATCH", body)
        : api.send("/api/crags", "POST", body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["crags"] });
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
      ...extras,
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
        value={name}
        onChangeText={setName}
        placeholder="Crag name"
      />
      <Field
        label="Area"
        value={area}
        onChangeText={setArea}
        placeholder="Region / area"
      />
      <Field label="Country" value={country} onChangeText={setCountry} />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
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
