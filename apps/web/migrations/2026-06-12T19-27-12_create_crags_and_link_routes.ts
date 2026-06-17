import { type Kysely, sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("crags")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull().unique())
    .addColumn("area", "text")
    .addColumn("country", "text")
    .addColumn("description", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  // Promote the existing free-text routes.crag values to crag rows.
  await sql`INSERT INTO crags (name) SELECT DISTINCT crag FROM routes`.execute(
    db
  );

  await db.schema
    .alterTable("routes")
    .addColumn("crag_id", "integer", (col) =>
      col.references("crags.id").onDelete("restrict")
    )
    .execute();

  await sql`UPDATE routes SET crag_id = crags.id FROM crags WHERE crags.name = routes.crag`.execute(
    db
  );

  await db.schema
    .alterTable("routes")
    .alterColumn("crag_id", (col) => col.setNotNull())
    .execute();

  await db.schema.alterTable("routes").dropColumn("crag").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("routes").addColumn("crag", "text").execute();

  await sql`UPDATE routes SET crag = crags.name FROM crags WHERE crags.id = routes.crag_id`.execute(
    db
  );

  await db.schema
    .alterTable("routes")
    .alterColumn("crag", (col) => col.setNotNull())
    .execute();

  await db.schema.alterTable("routes").dropColumn("crag_id").execute();

  await db.schema.dropTable("crags").execute();
}