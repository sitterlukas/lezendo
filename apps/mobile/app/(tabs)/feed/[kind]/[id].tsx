import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { feedPageQuery, ApiError } from "@whipperbook/api-client";
import { commentCreateSchema } from "@whipperbook/validation";
import { timeAgo } from "@whipperbook/core";
import { api } from "../../../../lib/api";
import { Field, Button } from "../../../../components/form";
import { Loading, ErrorState } from "../../../../components/states";

type FeedAuthor = { id: number; name: string };
type FeedComment = { id: number; body: string; author: FeedAuthor; createdAt: Date };
type FeedItem = {
  id: number;
  kind: "status" | "ascent";
  createdAt: Date;
  author: FeedAuthor;
  body?: string;
  comments: FeedComment[];
};
type FeedPage = { items: FeedItem[] };

export default function FeedItemDetail() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const itemId = Number(id);
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    feedPageQuery<FeedPage>(api),
  );
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Map the feed kind to the comments target_type.
  const targetType = kind === "ascent" ? "activity" : "status";

  const mutation = useMutation({
    mutationFn: (payload: unknown) =>
      api.send("/api/comments", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed", "page"] });
      setBody("");
    },
    onError: (e) =>
      setFormError(e instanceof ApiError ? e.message : "Could not post comment."),
  });

  function submit() {
    setFormError(null);
    const parsed = commentCreateSchema.safeParse({
      target_type: targetType,
      target_id: itemId,
      body,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Write a comment.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  if (isPending) return <Loading />;
  if (error) {
    return (
      <ErrorState
        message={error instanceof ApiError ? error.message : "Could not load."}
        onRetry={refetch}
      />
    );
  }

  const item = data.items.find((i) => i.kind === kind && i.id === itemId);
  if (!item) {
    return <ErrorState message="This item is no longer in your feed." onRetry={refetch} />;
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-3"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <Stack.Screen options={{ title: "Comments" }} />
      <View className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Text className="font-semibold text-zinc-900 dark:text-zinc-50">
          {item.author.name}
        </Text>
        {item.body ? (
          <Text className="mt-1 text-zinc-700 dark:text-zinc-300">{item.body}</Text>
        ) : null}
        <Text className="mt-1 text-xs text-zinc-400">{timeAgo(item.createdAt)}</Text>
      </View>

      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Comments ({item.comments.length})
      </Text>
      {item.comments.length === 0 ? (
        <Text className="text-zinc-500">No comments yet.</Text>
      ) : (
        item.comments.map((c) => (
          <View
            key={c.id}
            className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {c.author.name}
            </Text>
            <Text className="text-zinc-700 dark:text-zinc-300">{c.body}</Text>
          </View>
        ))
      )}

      <Field label="Add a comment" value={body} onChangeText={setBody} multiline />
      {formError ? <Text className="text-sm text-red-600">{formError}</Text> : null}
      <Button label="Post comment" onPress={submit} busy={mutation.isPending} />
    </ScrollView>
  );
}
