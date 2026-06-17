import db, { type DeletionEntityType } from "@/lib/db";
import { HttpError } from "@/lib/api/respond";
import { canModify } from "@/lib/api/auth";
import { logDeletion } from "@/lib/deletion-log";

// Crags, sectors, and routes all support soft-delete + recovery with the same
// shape: load the row, check the caller may modify it, flip `deleted`, and write
// the audit log. This is shared by their delete + recover route handlers so the
// authorization and logging stay in one place.
type SoftTable = "crags" | "sectors" | "routes";
const NOUN: Record<SoftTable, string> = {
  crags: "Crag",
  sectors: "Sector",
  routes: "Route",
};

export async function setEntityDeleted(
  table: SoftTable,
  type: DeletionEntityType,
  id: number,
  deleted: boolean,
  user: { id: number; role: string },
): Promise<void> {
  const row = await db
    .selectFrom(table)
    .select(["id", "name", "created_by"])
    .where("id", "=", id)
    .executeTakeFirst();
  if (!row) throw new HttpError(404, `${NOUN[table]} not found.`);
  if (!canModify(user, row.created_by)) {
    throw new HttpError(403, "Not allowed.");
  }
  await db.updateTable(table).set({ deleted }).where("id", "=", id).execute();
  await logDeletion(
    type,
    id,
    row.name,
    deleted ? "delete" : "recover",
    user.id,
  );
}
