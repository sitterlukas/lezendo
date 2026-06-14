import { type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("preferred_grading_system_id", "integer", (col) =>
      col.references("grading_systems.id").onDelete("set null")
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .dropColumn("preferred_grading_system_id")
    .execute();
}
