import { createHash, randomBytes } from "crypto";
import db from "@whipperbook/db";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// We store only a hash of the token, so a leaked DB row can't be used to verify
// an account — the raw token lives only in the emailed link.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Issue a fresh verification token for a user, persisting its hash + expiry and
// returning the raw token to embed in the verification link.
export async function issueVerificationToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db
    .updateTable("users")
    .set({
      verification_token_hash: hashToken(token),
      verification_token_expires_at: new Date(Date.now() + TOKEN_TTL_MS),
    })
    .where("id", "=", userId)
    .execute();
  return token;
}

// Verify a token: if it matches an unexpired row, mark the account verified,
// clear the token, and return true. Otherwise return false.
export async function consumeVerificationToken(
  token: string,
): Promise<boolean> {
  if (!token) return false;

  const user = await db
    .selectFrom("users")
    .select(["id", "verification_token_expires_at"])
    .where("verification_token_hash", "=", hashToken(token))
    .executeTakeFirst();

  if (!user?.verification_token_expires_at) return false;
  if (user.verification_token_expires_at < new Date()) return false;

  await db
    .updateTable("users")
    .set({
      email_verified_at: new Date(),
      verification_token_hash: null,
      verification_token_expires_at: null,
    })
    .where("id", "=", user.id)
    .execute();
  return true;
}
