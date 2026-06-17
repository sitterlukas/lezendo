import { timeAgo } from "@/lib/time-ago";

// Renders relative time inside a <time> with a full-date tooltip. Server
// component: the feed is `force-dynamic`, so the server timestamp is fine and
// avoids client clock skew.
export default function TimeAgo({ date }: { date: Date }) {
  return (
    <time
      dateTime={date.toISOString()}
      title={date.toLocaleString("en-GB")}
      className="text-zinc-400"
    >
      {timeAgo(date)}
    </time>
  );
}
