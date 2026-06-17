import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { logDeletion } from "@/lib/deletion-log";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/routes/[id]/recover — restore a soft-deleted route (replaces
// recoverRoute).
export const POST = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const routeId = Number((await params).id);
  if (!Number.isInteger(routeId)) return fail("Invalid route.", 400);

  const existing = await db
    .selectFrom("routes")
    .select(["id", "name"])
    .where("id", "=", routeId)
    .executeTakeFirst();
  if (!existing) return fail("Route not found.", 404);

  await db
    .updateTable("routes")
    .set({ deleted: false })
    .where("id", "=", routeId)
    .execute();
  await logDeletion("route", routeId, existing.name, "recover", user.id);

  revalidatePath("/crags", "layout");
  return ok({ ok: true });
});
