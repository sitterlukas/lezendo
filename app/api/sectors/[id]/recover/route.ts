import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { logDeletion } from "@/lib/deletion-log";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/sectors/[id]/recover — restore a soft-deleted sector (replaces
// recoverSector).
export const POST = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const sectorId = Number((await params).id);
  if (!Number.isInteger(sectorId)) return fail("Invalid sector.", 400);

  const sector = await db
    .selectFrom("sectors")
    .select(["id", "name"])
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector) return fail("Sector not found.", 404);

  await db
    .updateTable("sectors")
    .set({ deleted: false })
    .where("id", "=", sectorId)
    .execute();
  await logDeletion("sector", sectorId, sector.name, "recover", user.id);

  revalidatePath("/crags", "layout");
  return ok({ ok: true });
});
