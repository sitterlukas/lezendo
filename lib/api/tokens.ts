import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import db from "@/lib/db";
import type { UserRole } from "@/lib/db";

// Mobile clients authenticate with a short-lived access JWT (sent as a Bearer
// header) and rotate it with a long-lived refresh token. The access token is
// signed with AUTH_SECRET (same secret NextAuth uses) so no extra config is
// needed; refresh tokens are opaque random strings, stored only as a SHA-256
// hash in `api_refresh_tokens`.
const ACCESS_TTL = "30m";
const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signAccessToken(user: {
  id: number;
  role: string;
}): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secret());
}

export async function verifyAccessToken(
  token: string,
): Promise<{ userId: number; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) return null;
    return { userId, role: String(payload.role ?? "member") };
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueRefreshToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db
    .insertInto("api_refresh_tokens")
    .values({
      user_id: userId,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + REFRESH_TTL_MS),
    })
    .execute();
  return token;
}

// Issue a fresh access + refresh token pair for a user (login / refresh).
export async function issueTokenPair(user: {
  id: number;
  role: UserRole | string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user),
    issueRefreshToken(user.id),
  ]);
  return { accessToken, refreshToken };
}

// Single-use consume: delete the row (so refresh rotates) and return the owning
// user id, or null if the token is unknown or expired.
export async function consumeRefreshToken(
  token: string,
): Promise<number | null> {
  if (!token) return null;
  const row = await db
    .selectFrom("api_refresh_tokens")
    .select(["id", "user_id", "expires_at"])
    .where("token_hash", "=", hashToken(token))
    .executeTakeFirst();
  if (!row) return null;
  await db.deleteFrom("api_refresh_tokens").where("id", "=", row.id).execute();
  if (row.expires_at < new Date()) return null;
  return row.user_id;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  if (!token) return;
  await db
    .deleteFrom("api_refresh_tokens")
    .where("token_hash", "=", hashToken(token))
    .execute();
}
