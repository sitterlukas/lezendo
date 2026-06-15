import { type Kysely, sql } from "kysely";

// Older users predate the defaulting added in the UI, so their preferred
// grading systems are still NULL. Backfill them with the app defaults:
// UIAA for rope, Fontainebleau for boulder.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    UPDATE users
    SET preferred_rope_grading_system_id = gs.id
    FROM grading_systems gs
    WHERE gs.slug = 'uiaa'
      AND users.preferred_rope_grading_system_id IS NULL
  `.execute(db);

  await sql`
    UPDATE users
    SET preferred_boulder_grading_system_id = gs.id
    FROM grading_systems gs
    WHERE gs.slug = 'font'
      AND users.preferred_boulder_grading_system_id IS NULL
  `.execute(db);
}

export async function down(): Promise<void> {
  // Pure data backfill — we can't distinguish backfilled values from genuine
  // choices, so there is nothing safe to revert.
}
