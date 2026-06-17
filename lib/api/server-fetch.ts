import { headers } from "next/headers";
import { reviveDates } from "@/lib/api/json";

export class ServerFetchError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ServerFetchError";
  }
}

// Fetch one of our own GET endpoints from a Server Component. Builds an absolute
// URL from the incoming request headers and forwards the cookie so the route's
// `auth()` resolves the same session. Parsed JSON has its ISO datetime strings
// revived to Date (see reviveDates) so page code keeps using Date methods.
// Throws ServerFetchError on non-2xx (pages can map 404 → notFound()).
export async function serverFetch<T>(path: string): Promise<T> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}`;

  const res = await fetch(`${base}${path}`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
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
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ServerFetchError(res.status, message);
  }

  return reviveDates(data) as T;
}
