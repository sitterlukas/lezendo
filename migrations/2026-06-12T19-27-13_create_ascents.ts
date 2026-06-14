import { type Kysely, sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("ascents")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("route_id", "integer", (col) =>
      col.notNull().references("routes.id").onDelete("cascade")
    )
    .addColumn("tick_type", "text", (col) =>
      col
        .notNull()
        .check(
          sql`tick_type IN ('onsight', 'flash', 'redpoint', 'toprope', 'attempt')`
        )
    )
    .addColumn("ascent_date", "date", (col) =>
      col.notNull().defaultTo(sql`CURRENT_DATE`)
    )
    .addColumn("notes", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex("ascents_route_id_idx")
    .on("ascents")
    .column("route_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("ascents").execute();
}