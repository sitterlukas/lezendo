import { type Kysely } from "kysely";

// Indexes for hot lookups that were doing sequential scans:
// - feed builds from `statuses` filtered by user_id, ordered by created_at
// - crag pages list `routes`/`sectors` by crag_id; sector pages by sector_id
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createIndex("statuses_user_created_idx")
    .ifNotExists()
    .on("statuses")
    .columns(["user_id", "created_at"])
    .execute();
  await db.schema
    .createIndex("routes_crag_id_idx")
    .ifNotExists()
    .on("routes")
    .column("crag_id")
    .execute();
  await db.schema
    .createIndex("routes_sector_id_idx")
    .ifNotExists()
    .on("routes")
    .column("sector_id")
    .execute();
  await db.schema
    .createIndex("sectors_crag_id_idx")
    .ifNotExists()
    .on("sectors")
    .column("crag_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("sectors_crag_id_idx").ifExists().execute();
  await db.schema.dropIndex("routes_sector_id_idx").ifExists().execute();
  await db.schema.dropIndex("routes_crag_id_idx").ifExists().execute();
  await db.schema.dropIndex("statuses_user_created_idx").ifExists().execute();
}
