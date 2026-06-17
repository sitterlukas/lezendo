import { type Kysely, sql } from "kysely";

// Credentials accounts must now confirm ownership of their email before they
// can log in. Add a verification timestamp plus a hashed, expiring token used
// by the /verify link. Existing accounts are grandfathered in as verified so
// nobody gets locked out.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("email_verified_at", "timestamptz")
    .addColumn("verification_token_hash", "text")
    .addColumn("verification_token_expires_at", "timestamptz")
    .execute();

  await sql`UPDATE users SET email_verified_at = now()`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .dropColumn("email_verified_at")
    .dropColumn("verification_token_hash")
    .dropColumn("verification_token_expires_at")
    .execute();
}
