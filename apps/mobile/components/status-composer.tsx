import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { statusWriteSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../lib/api";
import { inputClass } from "../lib/styles";
import { Button } from "./form";

// Post a plain-text status to the feed (mirrors the web composer). Lives at the
// top of the feed so logging your thoughts is one tap away.
export function StatusComposer() {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: unknown) =>
      api.send("/api/statuses", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed", "page"] });
      setBody("");
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not post status."),
  });

  function submit() {
    setError(null);
    const parsed = statusWriteSchema.safeParse({ body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Write something first.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <View className="gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <TextInput
        className={`${inputClass} h-20`}
        placeholder="Share a status…"
        placeholderTextColor="#a1a1aa"
        value={body}
        onChangeText={setBody}
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button label="Post status" onPress={submit} busy={mutation.isPending} />
    </View>
  );
}
