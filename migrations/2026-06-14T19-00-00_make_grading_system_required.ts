import { Kysely, sql } from "kysely";

function guessSlug(grade: string): string {
  const g = grade.trim();
  if (/^5\.\d/.test(g)) return "yds";
  if (/^V[B0-9]/.test(g)) return "v-scale";
  if (/^[0-9][A-C][+]?$/.test(g) || /^[0-9][A-C]\+?$/.test(g)) return "font";
  if (/^[0-9][a-c][+]?$/.test(g)) return "french";
  if (/^(I{1,3}|IV|VI{0,3}|VII|VIII|IX|X{0,3})([-+])?/.test(g)) return "uiaa";
  if (/^(Mod|[HS]?VD?|[HS]S|HVS|E\d)/.test(g)) return "british";
  return "french";
}

export async function up(db: Kysely<any>): Promise<void> {
  const systems = await db
    .selectFrom("grading_systems")
    .select(["id", "slug"])
    .execute() as { id: number; slug: string }[];

  const bySlug = Object.fromEntries(systems.map((s) => [s.slug, s.id]));

  const routes = await db
    .selectFrom("routes")
    .select(["id", "grade"])
    .where("grading_system_id", "is", null)
    .execute() as { id: number; grade: string }[];

  for (const route of routes) {
    const slug = guessSlug(route.grade);
    const id = bySlug[slug] ?? bySlug["french"];
    if (id) {
      await db
        .updateTable("routes")
        .set({ grading_system_id: id })
        .where("id", "=", route.id)
        .execute();
    }
  }

  // Safety net for any remaining NULLs
  await sql`
    UPDATE routes
    SET grading_system_id = ${bySlug["french"]}
    WHERE grading_system_id IS NULL
  `.execute(db);

  await sql`ALTER TABLE routes ALTER COLUMN grading_system_id SET NOT NULL`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE routes ALTER COLUMN grading_system_id DROP NOT NULL`.execute(db);
}
