import { route, ok } from "@/lib/api/respond";
import { getUser } from "@/lib/api/auth";
import { buildFeed } from "@/lib/feed";
import db from "@/lib/db";

// GET /api/feed?before=<iso> — a page of the home feed (replaces loadFeedPage).
// `before` is the cursor (oldest createdAt shown). Dates serialize as ISO
// strings; the client revives them. Empty for signed-out callers.
export const GET = route(async (request) => {
  const user = await getUser(request);
  if (!user) return ok({ items: [], nextCursor: null });

  const beforeRaw = new URL(request.url).searchParams.get("before");
  const before = beforeRaw ? new Date(beforeRaw) : null;
  const page = await buildFeed(
    db,
    user.id,
    before && !Number.isNaN(before.getTime()) ? before : null,
  );
  return ok(page);
});
