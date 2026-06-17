import { route, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { getUserStatistics } from "@whipperbook/db";

// GET /api/me/statistics — the signed-in user's ascent aggregates + points.
export const GET = route(async (request) => {
  const user = await requireUser(request);
  return ok(await getUserStatistics(user.id));
});
