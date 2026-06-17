import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { readForm } from "@/lib/forms";
import db from "@/lib/db";

// POST /api/gear-reviews — review a climbing gear product (replaces
// addGearReview).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const form = await readForm(request);

  const product = String(form.get("product") ?? "").trim();
  const rating = Number(form.get("rating"));
  const body = String(form.get("body") ?? "").trim();

  if (!product) return fail("Product is required.", 400);
  if (!body) return fail("Write a review first.", 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail("Rating must be between 1 and 5.", 400);
  }

  await db
    .insertInto("gear_reviews")
    .values({ user_id: user.id, product, rating, body })
    .execute();

  revalidatePath("/gear");
  revalidatePath("/profile/gear");
  return ok({ ok: true }, 201);
});
