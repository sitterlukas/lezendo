import { type Kysely, sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("gear_items")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("category", "text", (col) =>
      col
        .notNull()
        .check(
          sql`category IN ('rope', 'quickdraws', 'harness', 'shoes', 'protection', 'bouldering', 'safety', 'other')`
        )
    )
    .addColumn("brand", "text")
    .addColumn("purchased_on", "date")
    .addColumn("notes", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex("gear_items_user_id_idx")
    .on("gear_items")
    .column("user_id")
    .execute();

  await db.schema
    .createTable("gear_reviews")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("product", "text", (col) => col.notNull())
    .addColumn("rating", "integer", (col) =>
      col.notNull().check(sql`rating BETWEEN 1 AND 5`)
    )
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("gear_reviews").execute();
  await db.schema.dropTable("gear_items").execute();
}
