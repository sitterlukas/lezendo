import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sectorCreateSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../../../../lib/api";
import { Field, Button } from "../../../../components/form";

export default function NewSector() {
  const { cragId } = useLocalSearchParams<{ cragId: string }>();
  const crag = Number(cragId);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [approach, setApproach] = useState("");
  const [aspect, setAspect] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api.send<{ id: number }>("/api/sectors", "POST", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crags", "detail", crag] });
      router.back();
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not create sector."),
  });

  function submit() {
    setError(null);
    const parsed = sectorCreateSchema.safeParse({
      name,
      description,
      approach_minutes: approach,
      aspect,
      crag_id: crag,
    });
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
      <Stack.Screen options={{ title: "Add sector", presentation: "modal" }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Sector name" />
      <Field
        label="Approach (minutes)"
        value={approach}
        onChangeText={setApproach}
        keyboardType="numeric"
      />
      <Field label="Aspect" value={aspect} onChangeText={setAspect} placeholder="e.g. South-facing" />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button label="Create sector" onPress={submit} busy={mutation.isPending} />
    </ScrollView>
  );
}
