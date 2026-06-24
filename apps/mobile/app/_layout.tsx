import "../global.css";
import { useState, useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "../lib/query-client";
import { ToastProvider } from "../components/toast";
import {
  loadThemeMode,
  applyThemeMode,
  navLightTheme,
  navDarkTheme,
} from "../lib/theme";

export default function RootLayout() {
  // One QueryClient per mounted app, kept stable across re-renders.
  const [queryClient] = useState(makeQueryClient);
  // Resolved scheme (NativeWind tracks the saved mode / OS appearance) so the
  // navigation chrome — headers and tab bar — follows the same `dark:` switch.
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    loadThemeMode().then(applyThemeMode);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? navDarkTheme : navLightTheme}
        >
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </ToastProvider>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
