// JSON sent over the API serializes Date columns as ISO strings. `reviveDates`
// walks a parsed value and turns ISO-8601 *datetime* strings back into Date
// objects, so server components and the mobile client can keep using Date
// methods (`.toLocaleDateString()`, `<TimeAgo>`) unchanged.
//
// Revival is gated on BOTH the key name and the value shape: only properties
// whose key looks like a timestamp column (`created_at`, `ascent_date`,
// `purchased_on`, `deletedAt`, …) are revived. This stops a user-authored text
// field (a forum post body, status, comment, name) whose content happens to be
// exactly an ISO datetime from being silently turned into a Date.
//
// Date-only strings like the `activity_date` column (`YYYY-MM-DD`) never match
// the datetime regex, so they stay strings, which is what the code expects.
const ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// Matches snake_case (`_at`, `_on`, `_date`) and camelCase (`At`, `On`, `Date`)
// timestamp field names.
const DATE_KEY = /(?:_at|_on|_date|At|On|Date)$/;

export function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => reviveDates(v)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] =
        typeof v === "string"
          ? DATE_KEY.test(k) && ISO_DATETIME.test(v)
            ? new Date(v)
            : v
          : reviveDates(v);
    }
    return out as T;
  }
  return value;
}
