import { type Kysely, sql } from "kysely";

// OAuth users (Google, Apple) have no local password.
// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .alterColumn("password_hash", (col) => col.dropNotNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // OAuth-only accounts have no hash; give them an unusable sentinel so the
  // column can become NOT NULL again. bcrypt will never match an empty hash.
  await sql`UPDATE users SET password_hash = '' WHERE password_hash IS NULL`.execute(
    db
  );

  await db.schema
    .alterTable("users")
    .alterColumn("password_hash", (col) => col.setNotNull())
    .execute();
}