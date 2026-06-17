import { type Kysely, sql } from "kysely";

// Mobile clients can't rely on the NextAuth session cookie, so the REST API
// issues its own tokens: a short-lived access JWT plus a long-lived refresh
// token. We persist only a SHA-256 hash of each refresh token (like the email
// verification tokens) so a leaked DB row can't be replayed. Rotating a token
// deletes the old row and inserts a new one.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("api_refresh_tokens")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("token_hash", "text", (col) => col.notNull().unique())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("api_refresh_tokens_user_id_idx")
    .on("api_refresh_tokens")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("api_refresh_tokens").execute();
}
