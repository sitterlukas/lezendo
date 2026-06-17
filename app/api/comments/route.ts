import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { readForm, feedTargetTypes } from "@/lib/forms";
import { COMMENT_MAX_LEN } from "@/lib/constants";
import db, { type FeedTargetType } from "@/lib/db";

// POST /api/comments — comment on a status or activity (replaces addComment).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const form = await readForm(request);

  const targetType = String(form.get("target_type")) as FeedTargetType;
  const targetId = Number(form.get("target_id"));
  const body = String(form.get("body") ?? "").trim();
  if (!feedTargetTypes.includes(targetType)) {
    return fail("Invalid comment target.", 400);
  }
  if (!Number.isInteger(targetId)) return fail("Invalid comment target.", 400);
  if (!body) return fail("Write something first.", 400);
  if (body.length > COMMENT_MAX_LEN) {
    return fail(`Keep it under ${COMMENT_MAX_LEN} characters.`, 400);
  }

  await db
    .insertInto("comments")
    .values({
      user_id: user.id,
      target_type: targetType,
      target_id: targetId,
      body,
    })
    .execute();

  revalidatePath("/feed");
  revalidatePath("/users", "layout");
  return ok({ ok: true }, 201);
});
