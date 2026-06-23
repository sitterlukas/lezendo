import { route, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { markNotificationsRead } from "@whipperbook/db";

// POST /api/notifications/read — mark all of the user's notifications as read.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  await markNotificationsRead(user.id);
  return ok({ ok: true });
});
