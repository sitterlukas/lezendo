import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { getAdminDeleted } from "@whipperbook/db";

// GET /api/admin/deleted — soft-deleted content + audit log. Admins only.
export const GET = route(async (request) => {
  const user = await requireUser(request);
  if (user.role !== "admin") return fail("Forbidden.", 403);
  return ok(await getAdminDeleted());
});
