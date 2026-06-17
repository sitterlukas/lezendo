import { route, ok, fail } from "@/lib/api/respond";
import { requireUser, canModify } from "@/lib/api/auth";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/images/[id] — remove an image row and its blob (replaces
// deleteImage). Uploader or admin only.
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const imageId = Number((await params).id);
  if (!Number.isInteger(imageId)) return fail("Invalid image.", 400);

  const image = await db
    .selectFrom("images")
    .selectAll()
    .where("id", "=", imageId)
    .executeTakeFirst();
  if (!image) return fail("Image not found.", 404);
  if (!canModify(user, image.uploaded_by)) return fail("Not allowed.", 403);

  const { del } = await import("@vercel/blob");
  await del(image.url);

  await db.deleteFrom("images").where("id", "=", imageId).execute();

  return ok({ ok: true });
});
