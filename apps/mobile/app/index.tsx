import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { tokens } from "../lib/auth";

// Splash gate: read the stored access token once, then redirect to the tabs if
// signed in, otherwise to the auth flow.
export default function Index() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    tokens.get().then((t) => setAuthed(Boolean(t)));
  }, []);

  if (authed === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950">
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={authed ? "/(tabs)/crags" : "/(auth)/login"} />;
}
