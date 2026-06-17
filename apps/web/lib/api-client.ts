// Client-side helper for calling the REST API from the web app. Serializes the
// body as JSON, sends the session cookie (same-origin default), and throws a
// typed ApiError carrying the server's `{ error }` message on any non-2xx so
// components can show it inline. Successful responses have ISO datetime strings
// revived to Date (see reviveDates).
import { ApiError, reviveDates } from "@whipperbook/api-client";

export { ApiError } from "@whipperbook/api-client";

export async function apiFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const { method = "GET", body, signal } = options;
  const res = await fetch(path, {
    method,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  return reviveDates(data) as T;
}
