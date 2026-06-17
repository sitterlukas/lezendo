import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { setEntityDeleted } from "@/lib/soft-delete";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/routes/[id]/recover — restore a soft-deleted route (replaces
// recoverRoute).
export const POST = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const routeId = Number((await params).id);
  if (!Number.isInteger(routeId)) return fail("Invalid route.", 400);

  await setEntityDeleted("routes", "route", routeId, false, user);
  return ok({ ok: true });
});
