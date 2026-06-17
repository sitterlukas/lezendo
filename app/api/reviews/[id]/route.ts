import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/reviews/[id] — remove a crag/sector/route review. Owners delete
// their own; admins can delete any (replaces deleteEntityReview).
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const reviewId = Number((await params).id);
  if (!Number.isInteger(reviewId)) return fail("Invalid review.", 400);

  let query = db.deleteFrom("entity_reviews").where("id", "=", reviewId);
  if (user.role !== "admin") query = query.where("user_id", "=", user.id);
  await query.execute();

  revalidatePath("/crags", "layout");
  return ok({ ok: true });
});
