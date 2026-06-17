import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { readForm, reviewEntityTypes } from "@/lib/forms";
import { getEntityReviews } from "@/lib/queries/reviews";
import db from "@/lib/db";

type ReviewEntityType = (typeof reviewEntityTypes)[number];

// GET /api/reviews?entityType=&entityId= — reviews for one entity.
export const GET = route(async (request) => {
  const sp = new URL(request.url).searchParams;
  const entityType = String(sp.get("entityType") ?? "");
  const entityId = Number(sp.get("entityId"));
  if (!reviewEntityTypes.includes(entityType as ReviewEntityType)) {
    return fail("Invalid review target.", 400);
  }
  if (!Number.isInteger(entityId)) return fail("Invalid review target.", 400);
  return ok(await getEntityReviews(entityType as ReviewEntityType, entityId));
});

// POST /api/reviews — review a crag, sector, or route (replaces
// addEntityReview). One review per user per entity: re-posting updates it.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const form = await readForm(request);

  const entityType = String(form.get("entity_type") ?? "");
  const entityId = Number(form.get("entity_id"));
  const rating = Number(form.get("rating"));
  const body = String(form.get("body") ?? "").trim();

  if (!reviewEntityTypes.includes(entityType as ReviewEntityType)) {
    return fail("Invalid review target.", 400);
  }
  if (!Number.isInteger(entityId)) return fail("Invalid review target.", 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail("Rating must be between 1 and 5.", 400);
  }

  await db
    .insertInto("entity_reviews")
    .values({
      entity_type: entityType as ReviewEntityType,
      entity_id: entityId,
      user_id: user.id,
      rating,
      body: body || null,
    })
    .onConflict((oc) =>
      oc
        .columns(["entity_type", "entity_id", "user_id"])
        .doUpdateSet({ rating, body: body || null }),
    )
    .execute();

  revalidatePath("/crags", "layout");
  return ok({ ok: true }, 201);
});
