import { route, ok, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { gearReviewCreateSchema } from "@whipperbook/validation";
import db from "@/lib/db";

// POST /api/gear-reviews — review a climbing gear product (replaces
// addGearReview).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const data = await readJson(request, gearReviewCreateSchema);

  await db
    .insertInto("gear_reviews")
    .values({
      user_id: user.id,
      product: data.product,
      rating: data.rating,
      body: data.body,
    })
    .execute();

  return ok({ ok: true }, 201);
});
