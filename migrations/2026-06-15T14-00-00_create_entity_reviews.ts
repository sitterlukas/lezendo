import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("entity_reviews")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("entity_type", "text", (col) => col.notNull())
    .addColumn("entity_id", "integer", (col) => col.notNull())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("rating", "integer", (col) => col.notNull())
    .addColumn("body", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      "entity_reviews_entity_type_check",
      sql`entity_type in ('crag', 'sector', 'route')`,
    )
    .addCheckConstraint(
      "entity_reviews_rating_check",
      sql`rating between 1 and 5`,
    )
    // One review per user per entity — posting again updates the existing one.
    .addUniqueConstraint("entity_reviews_unique_user", [
      "entity_type",
      "entity_id",
      "user_id",
    ])
    .execute();

  await db.schema
    .createIndex("entity_reviews_entity_idx")
    .on("entity_reviews")
    .columns(["entity_type", "entity_id"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("entity_reviews").execute();
}
