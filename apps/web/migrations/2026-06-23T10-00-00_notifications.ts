import { type Kysely, sql } from "kysely";

// In-app notification inbox (no push for now): one row per event for a
// recipient — someone follows you, likes or comments on your post, or replies
// to your forum topic. `target_type`/`target_id` point at what the notification
// is about so the client can deep-link; `read_at` null means unread. Rows are
// removed when either the recipient or the actor is deleted.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("notifications")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("actor_id", "integer", (col) =>
      col.references("users.id").onDelete("cascade"),
    )
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("target_type", "text")
    .addColumn("target_id", "integer")
    .addColumn("read_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("notifications_user_id_created_at_idx")
    .on("notifications")
    .columns(["user_id", "created_at"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("notifications").execute();
}
