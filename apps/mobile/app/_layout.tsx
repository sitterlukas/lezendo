import "../global.css";
import { useState, useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "../lib/query-client";
import { loadThemeMode, applyThemeMode } from "../lib/theme";

export default function RootLayout() {
  // One QueryClient per mounted app, kept stable across re-renders.
  const [queryClient] = useState(makeQueryClient);

  useEffect(() => {
    loadThemeMode().then(applyThemeMode);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
