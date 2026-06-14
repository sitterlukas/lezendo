import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("forum_topics")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id")
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createTable("forum_posts")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("topic_id", "integer", (col) =>
      col.notNull().references("forum_topics.id").onDelete("cascade")
    )
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id")
    )
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex("forum_posts_topic_id_idx")
    .on("forum_posts")
    .column("topic_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("forum_posts").execute();
  await db.schema.dropTable("forum_topics").execute();
}
