// Compact relative time for feed timestamps: "just now", "5m", "3h", "2d".
// Past ~7 days it falls back to an absolute date. Pure so it can run on the
// server (initial render) and the client (no hydration mismatch when both are
// passed the same `now`).
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
  });
}
