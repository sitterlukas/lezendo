import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signInWithGoogle, GoogleSignInCancelled } from "../lib/google-auth";

// "Continue with Google" — an "or" divider plus the Google button, with its own
// busy/error state. Shared by the login and register screens; on success it
// lands on the tabs like the email login does.
export function GoogleButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace("/(tabs)/crags");
    } catch (e) {
      if (e instanceof GoogleSignInCancelled) return;
      setError(
        e instanceof Error ? e.message : "Could not sign in with Google.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <Text className="text-xs text-zinc-400">or</Text>
        <View className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </View>
      <Pressable
        accessibilityLabel="Continue with Google"
        onPress={onPress}
        disabled={busy}
        className="flex-row items-center justify-center gap-2 rounded-lg border border-zinc-300 py-3 active:opacity-80 disabled:opacity-50 dark:border-zinc-700"
      >
        {busy ? (
          <ActivityIndicator color="#71717a" />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#71717a" />
            <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Continue with Google
            </Text>
          </>
        )}
      </Pressable>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
