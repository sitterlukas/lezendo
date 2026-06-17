import db from "@whipperbook/db";
import { HttpError } from "@/lib/api/respond";

// The string identifiers used by the images, comments, and likes endpoints to
// say what an attachment points at. They map onto different tables, so the
// mapping lives here in one place.
type TargetType =
  | "crag"
  | "sector"
  | "route"
  | "status"
  | "activity"
  | "comment";

// Confirm the row an image/comment/like is about to point at actually exists
// (and, for the soft-deletable crag/sector/route tables, hasn't been deleted).
// Throws 404 otherwise so callers can't create rows orphaned onto a missing or
// deleted target. The per-table branches keep Kysely's column typing intact.
export async function assertTargetExists(
  type: TargetType,
  id: number,
): Promise<void> {
  let found: { id: number } | undefined;
  switch (type) {
    case "crag":
      found = await db
        .selectFrom("crags")
        .select("id")
        .where("id", "=", id)
        .where("deleted", "=", false)
        .executeTakeFirst();
      break;
    case "sector":
      found = await db
        .selectFrom("sectors")
        .select("id")
        .where("id", "=", id)
        .where("deleted", "=", false)
        .executeTakeFirst();
      break;
    case "route":
      found = await db
        .selectFrom("routes")
        .select("id")
        .where("id", "=", id)
        .where("deleted", "=", false)
        .executeTakeFirst();
      break;
    case "status":
      found = await db
        .selectFrom("statuses")
        .select("id")
        .where("id", "=", id)
        .executeTakeFirst();
      break;
    case "activity":
      found = await db
        .selectFrom("ascent_activities")
        .select("id")
        .where("id", "=", id)
        .executeTakeFirst();
      break;
    case "comment":
      found = await db
        .selectFrom("comments")
        .select("id")
        .where("id", "=", id)
        .executeTakeFirst();
      break;
  }
  if (!found) throw new HttpError(404, "Not found.");
}
