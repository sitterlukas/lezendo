import { type Kysely, sql } from "kysely";

// Give each (climber, crag, day) group of ascents a stable identity so the feed
// can attach likes/comments to the *group* rather than to whichever ascent was
// logged last. Without this, logging another climb that day re-anchors the
// batch and orphans existing interactions.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("ascent_activities")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("crag_id", "integer", (col) =>
      col.notNull().references("crags.id").onDelete("cascade"),
    )
    .addColumn("activity_date", "date", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint("ascent_activities_unique", [
      "user_id",
      "crag_id",
      "activity_date",
    ])
    .execute();
  await db.schema
    .createIndex("ascent_activities_user_created_idx")
    .on("ascent_activities")
    .columns(["user_id", "created_at"])
    .execute();

  await db.schema
    .alterTable("ascents")
    .addColumn("activity_id", "integer", (col) =>
      col.references("ascent_activities.id").onDelete("set null"),
    )
    .execute();

  // Backfill one activity per distinct (user, crag, ascent day), then link
  // each ascent to it.
  await sql`
    INSERT INTO ascent_activities (user_id, crag_id, activity_date)
    SELECT DISTINCT a.user_id, r.crag_id, a.ascent_date::date
    FROM ascents a JOIN routes r ON r.id = a.route_id
  `.execute(db);
  await sql`
    UPDATE ascents a
    SET activity_id = act.id
    FROM routes r, ascent_activities act
    WHERE r.id = a.route_id
      AND act.user_id = a.user_id
      AND act.crag_id = r.crag_id
      AND act.activity_date = a.ascent_date::date
  `.execute(db);

  // Allow 'activity' as a like/comment target.
  await sql`ALTER TABLE likes DROP CONSTRAINT likes_target_type_check`.execute(
    db,
  );
  await sql`ALTER TABLE likes ADD CONSTRAINT likes_target_type_check CHECK (target_type IN ('status', 'ascent', 'comment', 'activity'))`.execute(
    db,
  );
  await sql`ALTER TABLE comments DROP CONSTRAINT comments_target_type_check`.execute(
    db,
  );
  await sql`ALTER TABLE comments ADD CONSTRAINT comments_target_type_check CHECK (target_type IN ('status', 'ascent', 'activity'))`.execute(
    db,
  );

  // Re-point existing ascent interactions onto their activity.
  await sql`
    UPDATE likes l SET target_type = 'activity', target_id = a.activity_id
    FROM ascents a
    WHERE l.target_type = 'ascent' AND l.target_id = a.id AND a.activity_id IS NOT NULL
  `.execute(db);
  await sql`
    UPDATE comments c SET target_type = 'activity', target_id = a.activity_id
    FROM ascents a
    WHERE c.target_type = 'ascent' AND c.target_id = a.id AND a.activity_id IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Activity-targeted interactions can't be reversed cleanly to specific
  // ascents; drop them so the stricter constraints re-apply.
  await sql`DELETE FROM likes WHERE target_type = 'activity'`.execute(db);
  await sql`DELETE FROM comments WHERE target_type = 'activity'`.execute(db);
  await sql`ALTER TABLE comments DROP CONSTRAINT comments_target_type_check`.execute(
    db,
  );
  await sql`ALTER TABLE comments ADD CONSTRAINT comments_target_type_check CHECK (target_type IN ('status', 'ascent'))`.execute(
    db,
  );
  await sql`ALTER TABLE likes DROP CONSTRAINT likes_target_type_check`.execute(
    db,
  );
  await sql`ALTER TABLE likes ADD CONSTRAINT likes_target_type_check CHECK (target_type IN ('status', 'ascent', 'comment'))`.execute(
    db,
  );
  await db.schema.alterTable("ascents").dropColumn("activity_id").execute();
  await db.schema.dropTable("ascent_activities").execute();
}
