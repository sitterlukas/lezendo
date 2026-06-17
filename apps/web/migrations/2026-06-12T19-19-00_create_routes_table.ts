
import { type Kysely, sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("routes")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("crag", "text", (col) => col.notNull())
    .addColumn("grade", "text", (col) => col.notNull())
    .addColumn("style", "text", (col) =>
      col.notNull().check(sql`style IN ('sport', 'trad', 'boulder')`)
    )
    .addColumn("height_m", "integer")
    .addColumn("description", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("routes").execute();
}