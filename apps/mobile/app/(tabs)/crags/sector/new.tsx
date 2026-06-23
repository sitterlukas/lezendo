import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sectorCreateSchema, sectorWriteSchema } from "@whipperbook/validation";
import { ApiError, sectorDetailQuery } from "@whipperbook/api-client";
import { api } from "../../../../lib/api";
import { Field, Button } from "../../../../components/form";
import { Loading } from "../../../../components/states";

type SectorEdit = {
  sector: {
    name: string;
    description: string | null;
    approach_minutes: number | null;
    aspect: string | null;
  };
};

type Initial = {
  name: string;
  description: string;
  approach: string;
  aspect: string;
};

// Add a sector to a crag, or edit one when `editId` is present.
export default function SectorForm() {
  const { cragId, editId } = useLocalSearchParams<{
    cragId: string;
    editId?: string;
  }>();
  const crag = Number(cragId);
  const isEdit = !!editId;
  const existing = useQuery({
    ...sectorDetailQuery<SectorEdit>(api, crag, Number(editId)),
    enabled: isEdit,
  });

  if (isEdit && existing.isPending) return <Loading />;

  const s = existing.data?.sector;
  return (
    <SectorFields
      crag={crag}
      editId={editId}
      initial={{
        name: s?.name ?? "",
        description: s?.description ?? "",
        approach: s?.approach_minutes != null ? String(s.approach_minutes) : "",
        aspect: s?.aspect ?? "",
      }}
    />
  );
}

function SectorFields({
  crag,
  editId,
  initial,
}: {
  crag: number;
  editId?: string;
  initial: Initial;
}) {
  const isEdit = !!editId;
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [approach, setApproach] = useState(initial.approach);
  const [aspect, setAspect] = useState(initial.aspect);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      isEdit
        ? api.send(`/api/sectors/${editId}`, "PATCH", body)
        : api.send("/api/sectors", "POST", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crags", "detail", crag] });
      if (isEdit) {
        queryClient.invalidateQueries({
          queryKey: ["sectors", "detail", Number(editId)],
        });
      }
      router.back();
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not save sector."),
  });

  function submit() {
    setError(null);
    const fields = { name, description, approach_minutes: approach, aspect };
    const parsed = isEdit
      ? sectorWriteSchema.safeParse(fields)
      : sectorCreateSchema.safeParse({ ...fields, crag_id: crag });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid sector.");
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
          title: isEdit ? "Edit sector" : "Add sector",
          presentation: "modal",
        }}
      />
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Sector name"
      />
      <Field
        label="Approach (minutes)"
        value={approach}
        onChangeText={setApproach}
        keyboardType="numeric"
      />
      <Field
        label="Aspect"
        value={aspect}
        onChangeText={setAspect}
        placeholder="e.g. South-facing"
      />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button
        label={isEdit ? "Save changes" : "Create sector"}
        onPress={submit}
        busy={mutation.isPending}
      />
    </ScrollView>
  );
}
