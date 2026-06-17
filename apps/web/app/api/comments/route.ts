import { route, ok, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { commentCreateSchema } from "@whipperbook/validation";
import db from "@whipperbook/db";

// POST /api/comments — comment on a status or activity (replaces addComment).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const data = await readJson(request, commentCreateSchema);

  await db
    .insertInto("comments")
    .values({
      user_id: user.id,
      target_type: data.target_type,
      target_id: data.target_id,
      body: data.body,
    })
    .execute();

  return ok({ ok: true }, 201);
});
