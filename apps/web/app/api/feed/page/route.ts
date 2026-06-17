import { route, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { getFeedPage } from "@/lib/queries/feed-page";

// GET /api/feed/page — the initial feed bundle (items, sectors, suggestions)
// for a signed-in viewer. 401 when signed out.
export const GET = route(async (request) => {
  const user = await requireUser(request);
  return ok(await getFeedPage({ id: user.id, role: user.role }));
});
