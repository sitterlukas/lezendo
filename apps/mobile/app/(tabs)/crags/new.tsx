import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cragWriteSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Field, Button } from "../../../components/form";

export default function NewCrag() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api.send<{ id: number }>("/api/crags", "POST", body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["crags"] });
      router.replace(`/(tabs)/crags/${res.id}`);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not create crag."),
  });

  function submit() {
    setError(null);
    const parsed = cragWriteSchema.safeParse({
      name,
      area,
      country,
      description,
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
      <Stack.Screen options={{ title: "Add crag", presentation: "modal" }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Crag name" />
      <Field label="Area" value={area} onChangeText={setArea} placeholder="Region / area" />
      <Field label="Country" value={country} onChangeText={setCountry} />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button label="Create crag" onPress={submit} busy={mutation.isPending} />
    </ScrollView>
  );
}
