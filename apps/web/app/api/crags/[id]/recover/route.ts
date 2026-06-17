import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { setEntityDeleted } from "@/lib/soft-delete";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/crags/[id]/recover — restore a soft-deleted crag (replaces
// recoverCrag).
export const POST = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const cragId = Number((await params).id);
  if (!Number.isInteger(cragId)) return fail("Invalid crag.", 400);

  await setEntityDeleted("crags", "crag", cragId, false, user);
  return ok({ ok: true });
});
