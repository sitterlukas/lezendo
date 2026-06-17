import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const ACCESS = "wb.access";
const REFRESH = "wb.refresh";

// On native we back tokens with the device keychain/keystore; on web SecureStore
// has no native module, so fall back to localStorage.
const store =
  Platform.OS === "web"
    ? {
        getItemAsync: async (k: string) => localStorage.getItem(k),
        setItemAsync: async (k: string, v: string) => localStorage.setItem(k, v),
        deleteItemAsync: async (k: string) => localStorage.removeItem(k),
      }
    : SecureStore;

// Access/refresh token storage.
export const tokens = {
  get: () => store.getItemAsync(ACCESS),
  getRefresh: () => store.getItemAsync(REFRESH),
  set: async (a: string, r: string) => {
    await store.setItemAsync(ACCESS, a);
    await store.setItemAsync(REFRESH, r);
  },
  clear: async () => {
    await store.deleteItemAsync(ACCESS);
    await store.deleteItemAsync(REFRESH);
  },
};