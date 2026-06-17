import { type Kysely, sql } from "kysely";

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  // Ascents logged before this migration have no owner; remove them so the
  // column can be NOT NULL.
  await sql`DELETE FROM ascents`.execute(db);

  await db.schema
    .alterTable("ascents")
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .execute();

  await db.schema
    .createIndex("ascents_user_id_idx")
    .on("ascents")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("ascents").dropColumn("user_id").execute();
}