import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { setEntityDeleted } from "@/lib/soft-delete";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/sectors/[id]/recover — restore a soft-deleted sector (replaces
// recoverSector).
export const POST = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const sectorId = Number((await params).id);
  if (!Number.isInteger(sectorId)) return fail("Invalid sector.", 400);

  await setEntityDeleted("sectors", "sector", sectorId, false, user);
  return ok({ ok: true });
});
