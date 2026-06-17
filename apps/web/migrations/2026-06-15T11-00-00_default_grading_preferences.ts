import { type Kysely, sql } from "kysely";

// New users should start with the app defaults — UIAA for rope, Fontainebleau
// for boulder — without every insert path having to set them. Column defaults
// must be literals, so resolve the ids at migration time and inline them.
export async function up(db: Kysely<any>): Promise<void> {
  const rope = await db
    .selectFrom("grading_systems")
    .select("id")
    .where("slug", "=", "uiaa")
    .executeTakeFirstOrThrow();
  const boulder = await db
    .selectFrom("grading_systems")
    .select("id")
    .where("slug", "=", "font")
    .executeTakeFirstOrThrow();

  await sql`
    ALTER TABLE users
    ALTER COLUMN preferred_rope_grading_system_id SET DEFAULT ${sql.lit(rope.id)}
  `.execute(db);
  await sql`
    ALTER TABLE users
    ALTER COLUMN preferred_boulder_grading_system_id SET DEFAULT ${sql.lit(boulder.id)}
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE users ALTER COLUMN preferred_rope_grading_system_id DROP DEFAULT`.execute(
    db,
  );
  await sql`ALTER TABLE users ALTER COLUMN preferred_boulder_grading_system_id DROP DEFAULT`.execute(
    db,
  );
}
