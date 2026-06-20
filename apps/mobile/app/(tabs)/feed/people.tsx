import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { inputClass } from "../../../lib/styles";
import { Avatar } from "../../../components/avatar";
import { FollowButton } from "../../../components/follow-button";
import { ErrorState } from "../../../components/states";

// GET /api/people?q= — name search, excludes the viewer, flags who they follow.
type Person = {
  id: number;
  name: string;
  avatarUrl: string | null;
  following: boolean;
};

export default function People() {
  const [q, setQ] = useState("");
  const trimmed = q.trim();
  const query = useQuery({
    queryKey: ["people", trimmed] as const,
    queryFn: () =>
      api.get<Person[]>(`/api/people?q=${encodeURIComponent(trimmed)}`),
    enabled: trimmed.length >= 2,
  });

  const results = query.data ?? [];

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <View className="p-4">
        <TextInput
          className={inputClass}
          placeholder="Search climbers by name…"
          placeholderTextColor="#a1a1aa"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
      </View>

      {trimmed.length < 2 ? (
        <Text className="px-4 text-zinc-500">
          Type at least 2 characters to search.
        </Text>
      ) : query.isPending ? (
        <ActivityIndicator className="mt-6" />
      ) : query.error ? (
        <ErrorState
          message={
            query.error instanceof ApiError
              ? query.error.message
              : "Search failed."
          }
          onRetry={query.refetch}
        />
      ) : results.length === 0 ? (
        <Text className="px-4 text-zinc-500">No climbers found.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => String(p.id)}
          contentContainerClassName="px-4 gap-2 pb-4"
          renderItem={({ item }) => <PersonRow person={item} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

function PersonRow({ person }: { person: Person }) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <Pressable
        className="flex-1 flex-row items-center gap-3 active:opacity-70"
        onPress={() => router.push(`/(tabs)/feed/users/${person.id}`)}
      >
        <Avatar name={person.name} src={person.avatarUrl} size={40} />
        <Text className="flex-1 font-medium text-zinc-900 dark:text-zinc-50">
          {person.name}
        </Text>
      </Pressable>
      <FollowButton userId={person.id} initialFollowing={person.following} />
    </View>
  );
}
