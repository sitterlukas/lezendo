import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { entityReviewCreateSchema } from "@whipperbook/validation";
import { ApiError, reviewsQuery } from "@whipperbook/api-client";
import { api } from "../lib/api";
import { Field, Button, SegmentedPicker } from "./form";
import { Avatar } from "./avatar";

type EntityReview = {
  id: number;
  user_id: number;
  rating: number;
  body: string | null;
  created_at: string | Date;
  author: string;
  author_avatar: string | null;
};

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
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reviews = useQuery(
    reviewsQuery<EntityReview[]>(api, entityType, entityId),
  );

  const mutation = useMutation({
    mutationFn: (payload: unknown) => api.send("/api/reviews", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      queryClient.invalidateQueries({
        queryKey: ["reviews", entityType, entityId],
      });
      // Collapse back to the compact list once the review is saved.
      setOpen(false);
      setRating(0);
      setBody("");
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

  const reviewList = reviews.data ?? [];

  return (
    <View className="mt-2 gap-1.5">
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Reviews ({reviewList.length})
      </Text>
      {reviewList.length === 0 ? (
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          No reviews yet.
        </Text>
      ) : (
        reviewList.map((r) => (
          <View key={r.id} className="flex-row items-start gap-2 py-1">
            <Avatar name={r.author} src={r.author_avatar} size={20} />
            <View className="flex-1">
              <Text className="text-sm text-zinc-900 dark:text-zinc-50">
                <Text className="text-amber-500">
                  {"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}
                </Text>{" "}
                <Text className="font-medium">{r.author}</Text>
              </Text>
              {r.body ? (
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                  {r.body}
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}

      {open ? (
        <View className="mt-1 gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <SegmentedPicker<number>
            value={rating}
            onChange={setRating}
            options={[1, 2, 3, 4, 5].map((n) => ({
              label: "★".repeat(n),
              value: n,
            }))}
          />
          <Field
            label="Notes (optional)"
            value={body}
            onChangeText={setBody}
            multiline
          />
          {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label="Save review"
                onPress={submit}
                busy={mutation.isPending}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setOpen(false)}
              />
            </View>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          className="mt-1 self-start rounded-lg border border-zinc-300 px-3 py-1.5 active:opacity-80 dark:border-zinc-700"
        >
          <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Write a review
          </Text>
        </Pressable>
      )}
    </View>
  );
}
