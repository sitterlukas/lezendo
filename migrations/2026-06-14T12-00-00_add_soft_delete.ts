import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("crags")
    .addColumn("deleted", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();

  await db.schema
    .alterTable("sectors")
    .addColumn("deleted", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();

  await db.schema
    .alterTable("routes")
    .addColumn("deleted", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();

  await db.schema
    .createTable("deletion_log")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("entity_type", "text", (col) =>
      col.notNull().check(sql`entity_type IN ('crag', 'sector', 'route')`)
    )
    .addColumn("entity_id", "integer", (col) => col.notNull())
    .addColumn("entity_name", "text", (col) => col.notNull())
    .addColumn("action", "text", (col) =>
      col.notNull().check(sql`action IN ('delete', 'recover')`)
    )
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id")
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("deletion_log").execute();
  await db.schema.alterTable("routes").dropColumn("deleted").execute();
  await db.schema.alterTable("sectors").dropColumn("deleted").execute();
  await db.schema.alterTable("crags").dropColumn("deleted").execute();
}
