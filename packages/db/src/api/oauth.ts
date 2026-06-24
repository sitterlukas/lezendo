import { sql } from "kysely";
import db from "../client";
import type { UserRole } from "../client";

// Create (or look up) the local user row for an OAuth sign-in, keyed by email.
// Shared by the web NextAuth `signIn` callback and the mobile
// `POST /api/auth/google` endpoint so OAuth provisioning lives in one place.
//
// The email is assumed already verified by the provider (the caller checks
// `email_verified`), so the account is created verified, and an existing
// (possibly unverified) account is marked verified now that the provider has
// proven the email belongs to this user. OAuth users have no local password.
export async function provisionOAuthUser(input: {
  email: string;
  name?: string | null;
}): Promise<{ id: number; role: UserRole }> {
  const email = input.email.trim().toLowerCase();
  const row = await db
    .insertInto("users")
    .values({
      email,
      name: input.name ?? email.split("@")[0],
      password_hash: null,
      email_verified_at: new Date(),
    })
    .onConflict((oc) =>
      oc.column("email").doUpdateSet({
        email_verified_at: sql`coalesce(users.email_verified_at, now())`,
      }),
    )
    .returning(["id", "role"])
    .executeTakeFirstOrThrow();
  return row;
}
