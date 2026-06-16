import { type Kysely } from "kysely";

// Statuses now tag a single sector (more specific than a crag, simpler than a
// route) instead of an optional crag/route. Swap the crag_id/route_id columns
// for one sector_id.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("statuses")
    .addColumn("sector_id", "integer", (col) =>
      col.references("sectors.id").onDelete("set null"),
    )
    .execute();
  await db.schema.alterTable("statuses").dropColumn("crag_id").execute();
  await db.schema.alterTable("statuses").dropColumn("route_id").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("statuses")
    .addColumn("crag_id", "integer", (col) =>
      col.references("crags.id").onDelete("set null"),
    )
    .addColumn("route_id", "integer", (col) =>
      col.references("routes.id").onDelete("set null"),
    )
    .execute();
  await db.schema.alterTable("statuses").dropColumn("sector_id").execute();
}
