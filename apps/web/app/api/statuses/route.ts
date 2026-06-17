import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import {
  statusWriteSchema,
  resolveSectorTag,
  INVALID_SECTOR,
} from "@/lib/forms";
import db from "@/lib/db";

// POST /api/statuses — post a status to the feed (replaces createStatus).
// Returns { id }.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const data = await readJson(request, statusWriteSchema);

  const sectorId = await resolveSectorTag(data.sector_id);
  if (sectorId === INVALID_SECTOR) {
    return fail("That sector no longer exists.", 400);
  }

  const row = await db
    .insertInto("statuses")
    .values({ user_id: user.id, body: data.body, sector_id: sectorId })
    .returning("id")
    .executeTakeFirstOrThrow();

  return ok({ id: row.id }, 201);
});
