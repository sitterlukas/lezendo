import { useEffect, useState } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { feedPageQuery, meQuery, ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Loading, ErrorState, EmptyState } from "../../../components/states";
import { Fab } from "../../../components/fab";
import { FeedCard, type FeedPage } from "../../../components/feed-card";
import {
  StatusComposer,
  type StatusEdit,
} from "../../../components/status-composer";

export default function Feed() {
  // The "+" lives in the feed screen (above the tab bar); the composer popover
  // lives in a full-screen overlay (over the tab bar). Offset it by the tab bar
  // height so it sits just above the "+".
  const tabBarHeight = useBottomTabBarHeight();
  // null = closed, "new" = compose, object = edit that status.
  const [composer, setComposer] = useState<"new" | StatusEdit | null>(null);
  // Entrance for the compose popover: rises + pops up from the "+" button.
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (composer === null) return;
    pop.setValue(0);
    Animated.spring(pop, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [composer, pop]);

  const me = useQuery(meQuery<{ id: number } | null>(api));
  const myId = me.data?.id ?? null;
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    feedPageQuery<FeedPage>(api),
  );

  if (isPending) return <Loading />;

  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError ? error.message : "Could not load the feed."
        }
        onRetry={refetch}
      />
    );
  }

  const editing = composer && composer !== "new" ? composer : undefined;

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      <FlatList
        className="flex-1"
        contentContainerClassName="p-4 gap-3 pb-24"
        data={data.items}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState
            icon="newspaper-outline"
            title="Your feed is empty"
            message="Routes you log and statuses you post show up here, along with activity from climbers you follow."
            actionLabel="Find climbers"
            onAction={() => router.push("/(tabs)/feed/people")}
          />
        }
        renderItem={({ item }) => (
          <FeedCard item={item} myId={myId} onEdit={setComposer} />
        )}
      />

      {/* Floating compose button — opens the status popover above it. */}
      <Fab
        accessibilityLabel="Post a status"
        onPress={() => setComposer("new")}
      />

      {/* Compose / edit popover: a card anchored just above the "+". Tap the
          dimmed backdrop to dismiss. */}
      <Modal
        visible={composer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setComposer(null)}
      >
        <View className="flex-1">
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={() => setComposer(null)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            pointerEvents="box-none"
            className="flex-1 justify-end px-4"
            style={{ paddingBottom: tabBarHeight + 92 }}
          >
            <Animated.View
              style={{
                opacity: pop,
                transform: [
                  {
                    translateY: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                  {
                    scale: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              }}
            >
              <View className="rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-900">
                <Text className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {editing ? "Edit status" : "New status"}
                </Text>
                <StatusComposer
                  status={editing}
                  onPosted={() => setComposer(null)}
                />
              </View>
              {/* Caret pointing down toward the "+". */}
              <View className="absolute -bottom-1.5 right-7 h-4 w-4 rotate-45 bg-white dark:bg-zinc-900" />
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
