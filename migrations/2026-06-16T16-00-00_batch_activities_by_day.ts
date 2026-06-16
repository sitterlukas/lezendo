import { type Kysely, sql } from "kysely";

// Batch a climber's ascents by DAY across all crags (was per crag + day).
// Merge each (user, day)'s activities into the earliest one, repointing
// ascents + interactions, then make the activity unique per (user, day).
export async function up(db: Kysely<any>): Promise<void> {
  // Canonical activity for each (user, day) = the lowest id.
  await sql`
    WITH canon AS (
      SELECT user_id, activity_date, MIN(id) AS id
      FROM ascent_activities GROUP BY user_id, activity_date
    )
    UPDATE ascents a SET activity_id = canon.id
    FROM ascent_activities act
    JOIN canon ON canon.user_id = act.user_id
              AND canon.activity_date = act.activity_date
    WHERE a.activity_id = act.id AND a.activity_id <> canon.id
  `.execute(db);

  for (const table of ["likes", "comments"]) {
    await sql`
      WITH canon AS (
        SELECT user_id, activity_date, MIN(id) AS id
        FROM ascent_activities GROUP BY user_id, activity_date
      )
      UPDATE ${sql.table(table)} t SET target_id = canon.id
      FROM ascent_activities act
      JOIN canon ON canon.user_id = act.user_id
                AND canon.activity_date = act.activity_date
      WHERE t.target_type = 'activity' AND t.target_id = act.id
        AND t.target_id <> canon.id
    `.execute(db);
  }

  // Drop the now-redundant non-canonical activities.
  await sql`
    DELETE FROM ascent_activities act USING (
      SELECT user_id, activity_date, MIN(id) AS id
      FROM ascent_activities GROUP BY user_id, activity_date
    ) canon
    WHERE act.user_id = canon.user_id
      AND act.activity_date = canon.activity_date
      AND act.id <> canon.id
  `.execute(db);

  await sql`ALTER TABLE ascent_activities DROP CONSTRAINT ascent_activities_unique`.execute(
    db,
  );
  await sql`ALTER TABLE ascent_activities ADD CONSTRAINT ascent_activities_unique UNIQUE (user_id, activity_date)`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  // Re-widen the uniqueness key. Existing per-day activities stay (a day with
  // one crag is valid under either key); we don't attempt to re-split.
  await sql`ALTER TABLE ascent_activities DROP CONSTRAINT ascent_activities_unique`.execute(
    db,
  );
  await sql`ALTER TABLE ascent_activities ADD CONSTRAINT ascent_activities_unique UNIQUE (user_id, crag_id, activity_date)`.execute(
    db,
  );
}
