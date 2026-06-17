import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/gear-reviews/[id] — remove one of the caller's gear reviews
// (replaces deleteGearReview).
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const reviewId = Number((await params).id);
  if (!Number.isInteger(reviewId)) return fail("Invalid review.", 400);

  await db
    .deleteFrom("gear_reviews")
    .where("id", "=", reviewId)
    .where("user_id", "=", user.id)
    .execute();

  revalidatePath("/gear");
  revalidatePath("/profile/gear");
  return ok({ ok: true });
});
