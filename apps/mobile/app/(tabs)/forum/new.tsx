import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { forumTopicCreateSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Field, Button } from "../../../components/form";

export default function NewTopic() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: unknown) =>
      api.send<{ id: number }>("/api/forum/topics", "POST", payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["forum", "topics"] });
      router.replace(`/(tabs)/forum/${res.id}`);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not create topic."),
  });

  function submit() {
    setError(null);
    const parsed = forumTopicCreateSchema.safeParse({ title, body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid topic.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-4"
    >
      <Stack.Screen options={{ title: "New topic", presentation: "modal" }} />
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Best sport crags in Czechia?"
      />
      <Field
        label="Body"
        value={body}
        onChangeText={setBody}
        placeholder="Write your post here…"
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button label="Post topic" onPress={submit} busy={mutation.isPending} />
    </ScrollView>
  );
}
