import { compare } from "bcryptjs";
import db from "@/lib/db";
import type { UserRole } from "@/lib/db";

export type CredentialsResult =
  | {
      ok: true;
      user: { id: number; email: string; name: string; role: UserRole };
    }
  | { ok: false; reason: "invalid" | "unverified" };

// Verify an email + password against the users table. Shared by the NextAuth
// credentials provider (web cookie session) and the /api/auth/token route
// (mobile bearer tokens) so the rules stay in one place: OAuth-only accounts
// (no password_hash) and wrong passwords are "invalid"; a correct password on
// an unconfirmed email is "unverified".
export async function verifyCredentials(
  emailRaw: string,
  password: string,
): Promise<CredentialsResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) return { ok: false, reason: "invalid" };

  const user = await db
    .selectFrom("users")
    .select([
      "id",
      "email",
      "name",
      "password_hash",
      "email_verified_at",
      "role",
    ])
    .where("email", "=", email)
    .executeTakeFirst();
  if (!user?.password_hash) return { ok: false, reason: "invalid" };

  const valid = await compare(password, user.password_hash);
  if (!valid) return { ok: false, reason: "invalid" };

  if (!user.email_verified_at) return { ok: false, reason: "unverified" };

  return {
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
