import { ActivityIndicator, Pressable, Text, View } from "react-native";

// Shared full-screen loading + error states so every query screen renders the
// same way (mirrors the inline pattern the crags screens started with).

export function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950">
      <ActivityIndicator />
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
      <Pressable
        className="rounded-lg bg-zinc-900 px-4 py-2 dark:bg-zinc-100"
        onPress={onRetry}
      >
        <Text className="font-semibold text-white dark:text-zinc-900">
          Retry
        </Text>
      </Pressable>
    </View>
  );
}
