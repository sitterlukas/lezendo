import { HttpError } from "@/lib/api/respond";

// Lightweight in-memory fixed-window rate limiter for the public auth endpoints
// (login, register, refresh, resend-verification) so they can't be trivially
// scripted for credential-stuffing or verification-email spam.
//
// Caveat: state lives in this process only, so on a multi-instance deployment
// the effective limit is per instance. That's an accepted trade-off for a
// best-effort throttle without extra infrastructure; tighten with a shared
// store (e.g. Postgres/Redis) if the app scales horizontally.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Derive a client key from the standard proxy headers. Falls back to a shared
// bucket when no IP is available (still bounds total throughput).
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Throws HttpError(429) when more than `limit` calls for `key` arrive within
// `windowMs`. `route()` turns the throw into a clean JSON 429.
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  // Opportunistically evict stale buckets so the map doesn't grow unbounded.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  if (bucket.count >= limit) {
    throw new HttpError(429, "Too many requests. Please try again in a bit.");
  }
  bucket.count += 1;
}
