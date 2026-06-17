import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { logDeletion } from "@/lib/deletion-log";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/crags/[id]/recover — restore a soft-deleted crag (replaces
// recoverCrag).
export const POST = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const cragId = Number((await params).id);
  if (!Number.isInteger(cragId)) return fail("Invalid crag.", 400);

  const crag = await db
    .selectFrom("crags")
    .select(["id", "name"])
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return fail("Crag not found.", 404);

  await db
    .updateTable("crags")
    .set({ deleted: false })
    .where("id", "=", cragId)
    .execute();
  await logDeletion("crag", cragId, crag.name, "recover", user.id);

  revalidatePath("/crags", "layout");
  return ok({ ok: true });
});
