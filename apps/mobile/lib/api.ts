import { createApiClient } from "@whipperbook/api-client";
import Constants from "expo-constants";
import { tokens } from "./auth";

// `extra.apiUrl` comes from app.json; EXPO_PUBLIC_API_URL is inlined at build
// time and is the real source for the URL (see .env). Either resolves here.
const base =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  process.env.EXPO_PUBLIC_API_URL ||
  "";

async function rawFetch(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal },
  access: string | null,
) {
  return fetch(`${base}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(init.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  });
}

// Bearer transport with transparent refresh-on-401: on a 401 we try the stored
// refresh token once, persist the new pair, and replay the original request.
export const api = createApiClient(async (path, init) => {
  const access = await tokens.get();
  let res = await rawFetch(path, init, access);
  if (res.status === 401) {
    const refresh = await tokens.getRefresh();
    if (refresh) {
      const r = await fetch(`${base}/api/auth/token/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (r.ok) {
        const pair = await r.json();
        await tokens.set(pair.accessToken, pair.refreshToken);
        res = await rawFetch(path, init, pair.accessToken);
      } else {
        await tokens.clear();
      }
    }
  }
  return res;
});
