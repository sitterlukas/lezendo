import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("statuses")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("crag_id", "integer", (col) =>
      col.references("crags.id").onDelete("set null")
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();
  await db.schema
    .createIndex("statuses_created_at_idx")
    .on("statuses")
    .column("created_at")
    .execute();

  await db.schema
    .createTable("follows")
    .addColumn("follower_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("followee_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addPrimaryKeyConstraint("follows_pkey", ["follower_id", "followee_id"])
    .addCheckConstraint("follows_no_self", sql`follower_id <> followee_id`)
    .execute();
  await db.schema
    .createIndex("follows_followee_idx")
    .on("follows")
    .column("followee_id")
    .execute();

  await db.schema
    .createTable("likes")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("target_type", "text", (col) => col.notNull())
    .addColumn("target_id", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addCheckConstraint(
      "likes_target_type_check",
      sql`target_type IN ('status', 'ascent')`
    )
    .addUniqueConstraint("likes_unique", ["user_id", "target_type", "target_id"])
    .execute();
  await db.schema
    .createIndex("likes_target_idx")
    .on("likes")
    .columns(["target_type", "target_id"])
    .execute();

  await db.schema
    .createTable("comments")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("target_type", "text", (col) => col.notNull())
    .addColumn("target_id", "integer", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addCheckConstraint(
      "comments_target_type_check",
      sql`target_type IN ('status', 'ascent')`
    )
    .execute();
  await db.schema
    .createIndex("comments_target_idx")
    .on("comments")
    .columns(["target_type", "target_id"])
    .execute();

  // Allow status photos to reuse the images table.
  await sql`ALTER TABLE images DROP CONSTRAINT images_entity_type_check`.execute(
    db
  );
  await sql`
    ALTER TABLE images
    ADD CONSTRAINT images_entity_type_check
    CHECK (entity_type IN ('crag', 'sector', 'route', 'status'))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DELETE FROM images WHERE entity_type = 'status'`.execute(db);
  await sql`ALTER TABLE images DROP CONSTRAINT images_entity_type_check`.execute(
    db
  );
  await sql`
    ALTER TABLE images
    ADD CONSTRAINT images_entity_type_check
    CHECK (entity_type IN ('crag', 'sector', 'route'))
  `.execute(db);
  await db.schema.dropTable("comments").execute();
  await db.schema.dropTable("likes").execute();
  await db.schema.dropTable("follows").execute();
  await db.schema.dropTable("statuses").execute();
}
