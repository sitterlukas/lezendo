import * as SecureStore from "expo-secure-store";

const ACCESS = "wb.access";
const REFRESH = "wb.refresh";

// Access/refresh token storage backed by the device keychain/keystore.
export const tokens = {
  get: () => SecureStore.getItemAsync(ACCESS),
  getRefresh: () => SecureStore.getItemAsync(REFRESH),
  set: async (a: string, r: string) => {
    await SecureStore.setItemAsync(ACCESS, a);
    await SecureStore.setItemAsync(REFRESH, r);
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};
