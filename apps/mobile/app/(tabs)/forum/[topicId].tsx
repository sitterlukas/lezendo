import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { forumTopicQuery, ApiError } from "@whipperbook/api-client";
import { forumPostBodySchema } from "@whipperbook/validation";
import { timeAgo } from "@whipperbook/core";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { canModify } from "../../../lib/permissions";
import { Field, Button } from "../../../components/form";
import { Loading, ErrorState } from "../../../components/states";
import { Avatar } from "../../../components/avatar";
import { DeleteButton } from "../../../components/delete-button";

// Minimal local shape of GET /api/forum/topics/:id.
type Viewer = { id: number; role: string } | null;
type ForumTopic = {
  id: number;
  title: string;
  created_at: Date;
  user_id: number;
  author: string;
};
type ForumPost = {
  id: number;
  body: string;
  created_at: Date;
  user_id: number;
  author: string;
  author_avatar: string | null;
};
type TopicResponse = {
  viewer: Viewer;
  topic: ForumTopic;
  posts: ForumPost[];
};

export default function TopicDetail() {
  const { topicId: topicIdRaw } = useLocalSearchParams<{ topicId: string }>();
  const topicId = Number(topicIdRaw);
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch } = useQuery(
    forumTopicQuery<TopicResponse>(api, topicId),
  );

  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const reply = useMutation({
    mutationFn: (payload: unknown) =>
      api.send(`/api/forum/topics/${topicId}/posts`, "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum", "topics", topicId] });
      queryClient.invalidateQueries({ queryKey: ["forum", "topics"] });
      setBody("");
    },
    onError: (e) =>
      setFormError(e instanceof ApiError ? e.message : "Could not post reply."),
  });

  const deleteTopic = useMutation({
    mutationFn: () => api.send(`/api/forum/topics/${topicId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum", "topics"] });
      router.replace("/(tabs)/forum");
    },
    onError: (e) =>
      Alert.alert(
        "Could not delete",
        e instanceof ApiError ? e.message : "Please try again.",
      ),
  });

  function submitReply() {
    setFormError(null);
    const parsed = forumPostBodySchema.safeParse({ body });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Write a reply.");
      return;
    }
    reply.mutate(parsed.data);
  }

  if (isPending) return <Loading />;
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <ErrorState
        message={
          notFound
            ? "This topic no longer exists."
            : error instanceof ApiError
              ? error.message
              : "Could not load this topic."
        }
        onRetry={refetch}
      />
    );
  }

  const { viewer, topic, posts } = data;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-zinc-950"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: topic.title }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-3"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {topic.title}
            </Text>
            <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Started by{" "}
              <Text
                className="font-medium text-zinc-700 dark:text-zinc-300"
                onPress={() =>
                  router.push(`/(tabs)/forum/users/${topic.user_id}`)
                }
              >
                {topic.author}
              </Text>{" "}
              · {posts.length} {posts.length === 1 ? "post" : "posts"}
            </Text>
          </View>
          {canModify(viewer, topic.user_id) ? (
            <DeleteButton
              accessibilityLabel="Delete topic"
              title="Delete topic?"
              message="This removes the topic and all its replies."
              size={20}
              onConfirm={() => deleteTopic.mutate()}
            />
          ) : null}
        </View>

        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            topicId={topicId}
            isOp={index === 0}
            canManage={canModify(viewer, post.user_id)}
          />
        ))}

        <View className="mt-2 gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Reply
          </Text>
          <Field label="" value={body} onChangeText={setBody} multiline />
          {formError ? (
            <Text className="text-sm text-red-600">{formError}</Text>
          ) : null}
          <Button
            label="Post reply"
            onPress={submitReply}
            busy={reply.isPending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PostCard({
  post,
  topicId,
  isOp,
  canManage,
}: {
  post: ForumPost;
  topicId: number;
  isOp: boolean;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [editError, setEditError] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["forum", "topics", topicId] });
    queryClient.invalidateQueries({ queryKey: ["forum", "topics"] });
  }

  const save = useMutation({
    mutationFn: (payload: unknown) =>
      api.send(`/api/forum/posts/${post.id}`, "PATCH", payload),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
    onError: (e) =>
      setEditError(e instanceof ApiError ? e.message : "Could not save."),
  });

  const remove = useMutation({
    mutationFn: () => api.send(`/api/forum/posts/${post.id}`, "DELETE"),
    onSuccess: invalidate,
    onError: (e) =>
      Alert.alert(
        "Could not delete",
        e instanceof ApiError ? e.message : "Please try again.",
      ),
  });

  function saveEdit() {
    setEditError(null);
    const parsed = forumPostBodySchema.safeParse({ body: draft });
    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message ?? "Write something first.");
      return;
    }
    save.mutate(parsed.data);
  }

  return (
    <View
      className={
        isOp
          ? "rounded-xl border border-l-4 border-zinc-200 border-l-zinc-900 bg-white p-4 dark:border-zinc-800 dark:border-l-zinc-100 dark:bg-zinc-900"
          : "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      }
    >
      <View className="mb-2 flex-row items-center gap-2">
        <Pressable
          className="flex-1 flex-row items-center gap-2 active:opacity-70"
          onPress={() => router.push(`/(tabs)/forum/users/${post.user_id}`)}
        >
          <Avatar name={post.author} src={post.author_avatar} size={28} />
          <View className="flex-1">
            <Text className="font-semibold text-zinc-900 dark:text-zinc-50">
              {post.author}
              {isOp ? (
                <Text className="text-xs font-normal text-zinc-400"> · OP</Text>
              ) : null}
            </Text>
            <Text className="text-xs text-zinc-400">
              {timeAgo(post.created_at)}
            </Text>
          </View>
        </Pressable>
        {canManage && !editing ? (
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityLabel="Edit post"
              hitSlop={8}
              onPress={() => {
                setDraft(post.body);
                setEditing(true);
              }}
            >
              <Ionicons name="create-outline" size={18} color="#a1a1aa" />
            </Pressable>
            <DeleteButton
              accessibilityLabel="Delete post"
              title="Delete post?"
              message="This can't be undone."
              onConfirm={() => remove.mutate()}
            />
          </View>
        ) : null}
      </View>

      {editing ? (
        <View className="gap-2">
          <Field label="" value={draft} onChangeText={setDraft} multiline />
          {editError ? (
            <Text className="text-sm text-red-600">{editError}</Text>
          ) : null}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label="Save" onPress={saveEdit} busy={save.isPending} />
            </View>
            <View className="flex-1">
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setEditing(false)}
              />
            </View>
          </View>
        </View>
      ) : (
        <Text className="text-zinc-700 dark:text-zinc-300">{post.body}</Text>
      )}
    </View>
  );
}
