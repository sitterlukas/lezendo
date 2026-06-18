import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colorScheme } from "nativewind";

export type ThemeMode = "system" | "light" | "dark";

const KEY = "wb.theme";

// Same storage shape as lib/auth.ts: device keychain on native, localStorage on web.
const store =
  Platform.OS === "web"
    ? {
        getItemAsync: async (k: string) => localStorage.getItem(k),
        setItemAsync: async (k: string, v: string) => localStorage.setItem(k, v),
      }
    : SecureStore;

function isMode(v: string | null): v is ThemeMode {
  return v === "system" || v === "light" || v === "dark";
}

export async function loadThemeMode(): Promise<ThemeMode> {
  const v = await store.getItemAsync(KEY);
  return isMode(v) ? v : "system";
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await store.setItemAsync(KEY, mode);
}

// NativeWind drives the `dark:` variant. "system" makes it track the OS appearance.
export function applyThemeMode(mode: ThemeMode): void {
  colorScheme.set(mode);
}
