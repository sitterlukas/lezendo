// JSON sent over the API serializes Date columns as ISO strings. `reviveDates`
// walks a parsed value and turns full ISO-8601 *datetime* strings back into
// Date objects, so server components and the mobile client can keep using Date
// methods (`.toLocaleDateString()`, `<TimeAgo>`) unchanged.
//
// Deliberately matches only full datetimes (with time + timezone). Date-only
// strings like the `activity_date` column (`YYYY-MM-DD`) are left as strings,
// which is what the code expects.
const ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function reviveDates<T>(value: T): T {
  if (typeof value === "string") {
    return (ISO_DATETIME.test(value) ? new Date(value) : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => reviveDates(v)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = reviveDates(v);
    }
    return out as T;
  }
  return value;
}
