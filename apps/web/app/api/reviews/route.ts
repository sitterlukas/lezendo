import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { entityReviewCreateSchema, reviewQuerySchema } from "@/lib/forms";
import { getEntityReviews } from "@/lib/queries/reviews";
import db from "@/lib/db";

// GET /api/reviews?entityType=&entityId= — reviews for one entity.
export const GET = route(async (request) => {
  const sp = new URL(request.url).searchParams;
  const parsed = reviewQuerySchema.safeParse({
    entityType: sp.get("entityType"),
    entityId: sp.get("entityId"),
  });
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? "Invalid review target.",
      400,
    );
  }
  return ok(
    await getEntityReviews(parsed.data.entityType, parsed.data.entityId),
  );
});

// POST /api/reviews — review a crag, sector, or route (replaces
// addEntityReview). One review per user per entity: re-posting updates it.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const data = await readJson(request, entityReviewCreateSchema);

  await db
    .insertInto("entity_reviews")
    .values({
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      user_id: user.id,
      rating: data.rating,
      body: data.body,
    })
    .onConflict((oc) =>
      oc
        .columns(["entity_type", "entity_id", "user_id"])
        .doUpdateSet({ rating: data.rating, body: data.body }),
    )
    .execute();

  return ok({ ok: true }, 201);
});
