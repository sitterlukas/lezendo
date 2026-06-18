import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colorScheme } from "nativewind";
import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

export type ThemeMode = "system" | "light" | "dark";

// React Navigation themes for the chrome the `dark:` classes can't reach — the
// stack headers (top) and the tab bar (bottom). Colours mirror the zinc palette
// the screens use so the chrome matches the content in both modes.
export const navLightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#18181b", // zinc-900
    background: "#ffffff",
    card: "#ffffff",
    text: "#18181b", // zinc-900
    border: "#e4e4e7", // zinc-200
  },
};

export const navDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#fafafa", // zinc-50
    background: "#09090b", // zinc-950
    card: "#18181b", // zinc-900 — header + tab bar surface
    text: "#fafafa", // zinc-50
    border: "#27272a", // zinc-800
  },
};

const KEY = "wb.theme";

// Same storage shape as lib/auth.ts: device keychain on native, localStorage on web.
const store =
  Platform.OS === "web"
    ? {
        getItemAsync: async (k: string) => localStorage.getItem(k),
        setItemAsync: async (k: string, v: string) =>
          localStorage.setItem(k, v),
      }
    : SecureStore;

function isMode(v: string | null): v is ThemeMode {
  return v === "system" || v === "light" || v === "dark";
}

export async function loadThemeMode(): Promise<ThemeMode> {
  try {
    const v = await store.getItemAsync(KEY);
    return isMode(v) ? v : "system";
  } catch {
    return "system";
  }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await store.setItemAsync(KEY, mode);
}

// NativeWind drives the `dark:` variant. "system" makes it track the OS appearance.
export function applyThemeMode(mode: ThemeMode): void {
  colorScheme.set(mode);
}
