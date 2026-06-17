import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { readForm } from "@/lib/forms";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/sectors/[id]/location — set the sector or parking coordinates.
// Community-editable: any signed-in user can add/correct them (replaces
// updateSectorLocation).
export const PATCH = route<Ctx>(async (request, { params }) => {
  await requireUser(request);
  const sectorId = Number((await params).id);
  if (!Number.isInteger(sectorId)) return fail("Invalid sector.", 400);

  const form = await readForm(request);
  const kind = String(form.get("kind") ?? "");
  const lat = Number(String(form.get("latitude") ?? "").trim());
  const lng = Number(String(form.get("longitude") ?? "").trim());

  if (kind !== "sector" && kind !== "parking") {
    return fail("Invalid location kind.", 400);
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return fail("Invalid latitude.", 400);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return fail("Invalid longitude.", 400);
  }

  const sector = await db
    .selectFrom("sectors")
    .select("id")
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector) return fail("Sector not found.", 404);

  await db
    .updateTable("sectors")
    .set(
      kind === "parking"
        ? { parking_latitude: lat, parking_longitude: lng }
        : { latitude: lat, longitude: lng },
    )
    .where("id", "=", sectorId)
    .execute();

  revalidatePath("/crags", "layout");
  return ok({ ok: true });
});
