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

// Exchange the stored refresh token for a fresh access token, persisting the
// new pair. Returns the new access token, or null when refresh isn't possible.
async function refreshAccess(): Promise<string | null> {
  const refresh = await tokens.getRefresh();
  if (!refresh) return null;
  const r = await fetch(`${base}/api/auth/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!r.ok) {
    await tokens.clear();
    return null;
  }
  const pair = await r.json();
  await tokens.set(pair.accessToken, pair.refreshToken);
  return pair.accessToken as string;
}

// Bearer transport with transparent refresh-on-401: on a 401 we try the stored
// refresh token once, persist the new pair, and replay the original request.
export const api = createApiClient(async (path, init) => {
  const access = await tokens.get();
  let res = await rawFetch(path, init, access);
  if (res.status === 401) {
    const refreshed = await refreshAccess();
    if (refreshed) res = await rawFetch(path, init, refreshed);
  }
  return res;
});

// Upload an avatar image (from an expo-image-picker local URI) to the API, which
// stores it and sets it on the signed-in user. Returns the public blob URL.
// Uses multipart/form-data — React Native fetch streams the file from the URI —
// so it can't go through the JSON `api` client. Mirrors the refresh-on-401 dance.
export async function uploadAvatar(uri: string): Promise<string> {
  async function send(access: string | null) {
    const form = new FormData();
    // RN's FormData accepts this {uri,name,type} shape for file parts.
    form.append("file", {
      uri,
      name: "avatar.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
    return fetch(`${base}/api/me/avatar`, {
      method: "POST",
      headers: access ? { Authorization: `Bearer ${access}` } : {},
      body: form,
    });
  }

  let res = await send(await tokens.get());
  if (res.status === 401) {
    const refreshed = await refreshAccess();
    if (refreshed) res = await send(refreshed);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Upload failed.");
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}
