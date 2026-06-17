import { z } from "zod";
import { route, ok, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import db from "@/lib/db";

const schema = z.object({ url: z.string().nullable() });

// PATCH /api/me/avatar — set or clear the signed-in user's avatar URL (the blob
// itself is uploaded separately via /api/images/upload). Replaces updateAvatar.
export const PATCH = route(async (request) => {
  const user = await requireUser(request);
  const { url } = await readJson(request, schema);

  await db
    .updateTable("users")
    .set({ avatar_url: url })
    .where("id", "=", user.id)
    .execute();

  return ok({ ok: true });
});
