import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser, getUser } from "@/lib/api/auth";
import { readForm, gearCategories } from "@/lib/forms";
import { getGearItems, getGearReviews } from "@/lib/queries/gear";
import db, { type GearCategory } from "@/lib/db";

// GET /api/gear — the caller's gear items (empty when signed out) plus the
// community reviews. `viewerId` lets the client gate edit/delete affordances.
export const GET = route(async (request) => {
  const user = await getUser(request);
  const [items, reviews] = await Promise.all([
    user ? getGearItems(user.id) : Promise.resolve([]),
    getGearReviews(),
  ]);
  return ok({ viewerId: user?.id ?? null, items, reviews });
});

// POST /api/gear — add a gear item to the caller's inventory (replaces
// addGearItem).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const form = await readForm(request);

  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "") as GearCategory;
  const brand = String(form.get("brand") ?? "").trim();
  const purchasedRaw = String(form.get("purchased_on") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();

  if (!name) return fail("Name is required.", 400);
  if (!gearCategories.includes(category)) return fail("Invalid category.", 400);
  const purchasedOn = purchasedRaw ? new Date(purchasedRaw) : null;
  if (purchasedOn && Number.isNaN(purchasedOn.getTime())) {
    return fail("Invalid purchase date.", 400);
  }

  await db
    .insertInto("gear_items")
    .values({
      user_id: user.id,
      name,
      category,
      brand: brand || null,
      purchased_on: purchasedOn,
      notes: notes || null,
    })
    .execute();

  revalidatePath("/gear");
  revalidatePath("/profile/gear");
  return ok({ ok: true }, 201);
});
