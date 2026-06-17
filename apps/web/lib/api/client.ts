import { createApiClient } from "@whipperbook/api-client";
import { headers } from "next/headers";

const base = () => process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";

// Browser: same-origin relative fetch.
export const browserApi = createApiClient((path, init) =>
  fetch(path, {
    method: init.method ?? "GET",
    headers:
      init.body !== undefined
        ? { "Content-Type": "application/json" }
        : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  }),
);

// Server (RSC): absolute URL + forwarded cookie so the route's auth() resolves the session.
export async function serverApi() {
  const h = await headers();
  return createApiClient((path, init) =>
    fetch(`${base()}${path}`, {
      method: init.method ?? "GET",
      headers: {
        cookie: h.get("cookie") ?? "",
        ...(init.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    }),
  );
}
