import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("sectors")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("crag_id", "integer", (col) =>
      col.notNull().references("crags.id").onDelete("cascade")
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .alterTable("routes")
    .addColumn("sector_id", "integer", (col) =>
      col.references("sectors.id").onDelete("set null")
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("routes").dropColumn("sector_id").execute();
  await db.schema.dropTable("sectors").execute();
}
