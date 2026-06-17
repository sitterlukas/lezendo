import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { readForm, resolveSectorTag, INVALID_SECTOR } from "@/lib/forms";
import { STATUS_MAX_LEN } from "@/lib/constants";
import db from "@/lib/db";

// POST /api/statuses — post a status to the feed (replaces createStatus).
// Returns { id }.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const form = await readForm(request);

  const body = String(form.get("body") ?? "").trim();
  if (!body) return fail("Write something first.", 400);
  if (body.length > STATUS_MAX_LEN) {
    return fail(`Keep it under ${STATUS_MAX_LEN} characters.`, 400);
  }

  const sectorId = await resolveSectorTag(form);
  if (sectorId === INVALID_SECTOR) {
    return fail("That sector no longer exists.", 400);
  }

  const row = await db
    .insertInto("statuses")
    .values({ user_id: user.id, body, sector_id: sectorId })
    .returning("id")
    .executeTakeFirstOrThrow();

  revalidatePath("/feed");
  revalidatePath(`/users/${user.id}`);
  return ok({ id: row.id }, 201);
});
