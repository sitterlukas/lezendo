import { type Kysely, sql } from "kysely";

// Let likes target comments too (in addition to statuses and ascents).
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE likes DROP CONSTRAINT likes_target_type_check`.execute(
    db,
  );
  await sql`
    ALTER TABLE likes
    ADD CONSTRAINT likes_target_type_check
    CHECK (target_type IN ('status', 'ascent', 'comment'))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop comment likes first so the stricter constraint validates cleanly.
  await sql`DELETE FROM likes WHERE target_type = 'comment'`.execute(db);
  await sql`ALTER TABLE likes DROP CONSTRAINT likes_target_type_check`.execute(
    db,
  );
  await sql`
    ALTER TABLE likes
    ADD CONSTRAINT likes_target_type_check
    CHECK (target_type IN ('status', 'ascent'))
  `.execute(db);
}
