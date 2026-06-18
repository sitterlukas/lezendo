import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { entityReviewCreateSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../lib/api";
import { Field, Button, SegmentedPicker } from "./form";

export function ReviewForm({
  entityType,
  entityId,
  invalidateKey,
}: {
  entityType: "crag" | "sector" | "route";
  entityId: number;
  invalidateKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: unknown) =>
      api.send("/api/reviews", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      setDone(true);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not save review."),
  });

  function submit() {
    setError(null);
    const parsed = entityReviewCreateSchema.safeParse({
      entity_type: entityType,
      entity_id: entityId,
      rating,
      body,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Pick a rating 1–5.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <View className="mt-2 gap-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Your review
      </Text>
      <SegmentedPicker<number>
        value={rating}
        onChange={setRating}
        options={[1, 2, 3, 4, 5].map((n) => ({ label: "★".repeat(n), value: n }))}
      />
      <Field label="Notes (optional)" value={body} onChangeText={setBody} multiline />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      {done ? (
        <Text className="text-sm text-green-600">Review saved.</Text>
      ) : null}
      <Button label="Save review" onPress={submit} busy={mutation.isPending} />
    </View>
  );
}
