import { route, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { getNotifications } from "@whipperbook/db";

// GET /api/notifications — the signed-in user's inbox (recent items + unread
// count). Used by the mobile notifications screen and the header bell badge.
export const GET = route(async (request) => {
  const user = await requireUser(request);
  return ok(await getNotifications(user.id));
});
