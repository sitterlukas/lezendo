import { route, ok, readJson } from "@/lib/api/respond";
import { requireUser, getUser } from "@/lib/api/auth";
import { gearCreateSchema } from "@/lib/forms";
import { getGearItems, getGearReviews } from "@/lib/queries/gear";
import db from "@/lib/db";

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
  const data = await readJson(request, gearCreateSchema);

  await db
    .insertInto("gear_items")
    .values({
      user_id: user.id,
      name: data.name,
      category: data.category,
      brand: data.brand,
      purchased_on: data.purchased_on,
      notes: data.notes,
    })
    .execute();

  return ok({ ok: true }, 201);
});
