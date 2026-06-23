import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gearReviewCreateSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import {
  Field,
  Button,
  SegmentedPicker,
  FieldHint,
} from "../../../components/form";

export default function NewGearReview() {
  const queryClient = useQueryClient();
  const [product, setProduct] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: unknown) =>
      api.send("/api/gear-reviews", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gear"] });
      router.back();
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not publish review."),
  });

  function submit() {
    setError(null);
    const parsed = gearReviewCreateSchema.safeParse({ product, rating, body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid review.");
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
        options={{ title: "Write review", presentation: "modal" }}
      />
      <Field
        label="Product"
        hint
        required
        value={product}
        onChangeText={setProduct}
        placeholder="e.g. La Sportiva Solution"
      />
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Rating
          <FieldHint required />
        </Text>
        <SegmentedPicker<number>
          value={rating}
          onChange={setRating}
          options={[1, 2, 3, 4, 5].map((n) => ({
            label: "★".repeat(n),
            value: n,
          }))}
        />
      </View>
      <Field
        label="Review"
        hint
        required
        value={body}
        onChangeText={setBody}
        placeholder="How does it climb? How has it held up?"
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button
        label="Publish review"
        onPress={submit}
        busy={mutation.isPending}
      />
    </ScrollView>
  );
}
