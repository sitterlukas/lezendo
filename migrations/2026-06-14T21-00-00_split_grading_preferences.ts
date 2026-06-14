import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("preferred_rope_grading_system_id", "integer", (col) =>
      col.references("grading_systems.id").onDelete("set null")
    )
    .addColumn("preferred_boulder_grading_system_id", "integer", (col) =>
      col.references("grading_systems.id").onDelete("set null")
    )
    .execute();

  // Move the old single preference into the column matching its discipline.
  await sql`
    UPDATE users u
    SET preferred_boulder_grading_system_id = u.preferred_grading_system_id
    FROM grading_systems gs
    WHERE gs.id = u.preferred_grading_system_id
      AND gs.slug IN ('font', 'v-scale')
  `.execute(db);

  await sql`
    UPDATE users u
    SET preferred_rope_grading_system_id = u.preferred_grading_system_id
    FROM grading_systems gs
    WHERE gs.id = u.preferred_grading_system_id
      AND gs.slug NOT IN ('font', 'v-scale')
  `.execute(db);

  await db.schema.alterTable("users").dropColumn("preferred_grading_system_id").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("preferred_grading_system_id", "integer", (col) =>
      col.references("grading_systems.id").onDelete("set null")
    )
    .execute();

  await sql`
    UPDATE users
    SET preferred_grading_system_id =
      COALESCE(preferred_rope_grading_system_id, preferred_boulder_grading_system_id)
  `.execute(db);

  await db.schema
    .alterTable("users")
    .dropColumn("preferred_rope_grading_system_id")
    .dropColumn("preferred_boulder_grading_system_id")
    .execute();
}
