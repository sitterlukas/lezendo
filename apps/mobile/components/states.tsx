import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ACCENT, primaryBtnClass } from "../lib/styles";

// Shared full-screen loading / error / empty states so every query screen
// renders the same way.

export function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950">
      <ActivityIndicator color={ACCENT} />
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white px-6 dark:bg-zinc-950">
      <Text className="text-center text-red-600">{message}</Text>
      <Pressable className={`${primaryBtnClass} px-5`} onPress={onRetry}>
        <Text className="font-semibold text-white">Retry</Text>
      </Pressable>
    </View>
  );
}

// A friendly empty state: a soft icon circle, a title, a muted line, and an
// optional accent call-to-action. Drop into a list's `ListEmptyComponent`.
export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mt-12 items-center gap-3 px-6">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Ionicons name={icon} size={28} color="#a1a1aa" />
      </View>
      <Text className="text-center text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </Text>
      {message ? (
        <Text className="text-center text-sm text-zinc-500">{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          className={`${primaryBtnClass} mt-1 px-5`}
          onPress={onAction}
        >
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
