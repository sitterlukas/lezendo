import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("images")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("entity_type", "text", (col) => col.notNull())
    .addColumn("entity_id", "integer", (col) => col.notNull())
    .addColumn("url", "text", (col) => col.notNull())
    .addColumn("uploaded_by", "integer", (col) =>
      col.references("users.id").onDelete("set null")
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await sql`
    ALTER TABLE images
    ADD CONSTRAINT images_entity_type_check
    CHECK (entity_type IN ('crag', 'sector', 'route'))
  `.execute(db);

  await db.schema
    .createIndex("images_entity_idx")
    .on("images")
    .columns(["entity_type", "entity_id"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("images").execute();
}
