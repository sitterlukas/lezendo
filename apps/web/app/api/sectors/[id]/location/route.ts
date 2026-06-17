import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { sectorLocationSchema } from "@whipperbook/validation";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/sectors/[id]/location — set the sector or parking coordinates.
// Community-editable: any signed-in user can add/correct them (replaces
// updateSectorLocation).
export const PATCH = route<Ctx>(async (request, { params }) => {
  await requireUser(request);
  const sectorId = Number((await params).id);
  if (!Number.isInteger(sectorId)) return fail("Invalid sector.", 400);

  const data = await readJson(request, sectorLocationSchema);

  const sector = await db
    .selectFrom("sectors")
    .select("id")
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector) return fail("Sector not found.", 404);

  await db
    .updateTable("sectors")
    .set(
      data.kind === "parking"
        ? { parking_latitude: data.latitude, parking_longitude: data.longitude }
        : { latitude: data.latitude, longitude: data.longitude },
    )
    .where("id", "=", sectorId)
    .execute();

  return ok({ ok: true });
});
