import { z } from "zod";
import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import db from "@whipperbook/db";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({ retired: z.boolean() });

// PATCH /api/gear/[id] — retire or un-retire one of the caller's gear items
// (replaces retireGearItem / unretireGearItem). Body: { retired: boolean }.
export const PATCH = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const gearId = Number((await params).id);
  if (!Number.isInteger(gearId)) return fail("Invalid gear item.", 400);

  const { retired } = await readJson(request, patchSchema);

  await db
    .updateTable("gear_items")
    .set({ retired_on: retired ? new Date() : null })
    .where("id", "=", gearId)
    .where("user_id", "=", user.id)
    .execute();

  return ok({ ok: true });
});

// DELETE /api/gear/[id] — permanently remove a gear item (replaces
// deleteGearItem).
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const gearId = Number((await params).id);
  if (!Number.isInteger(gearId)) return fail("Invalid gear item.", 400);

  await db
    .deleteFrom("gear_items")
    .where("id", "=", gearId)
    .where("user_id", "=", user.id)
    .execute();

  return ok({ ok: true });
});
