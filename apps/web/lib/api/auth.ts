import { auth } from "@/auth";
import db from "@whipperbook/db";
import { HttpError } from "@/lib/api/respond";
import { verifyAccessToken } from "@whipperbook/db";

export type ApiUser = { id: number; role: string; email: string };

// Resolve the caller from either a Bearer access token (mobile) or the NextAuth
// session cookie (web). Returns null when neither identifies a known user.
// Replaces the actions' currentUserId()/currentUserFull() helpers.
export async function getUser(request: Request): Promise<ApiUser | null> {
  const authz = request.headers.get("authorization");
  if (authz?.startsWith("Bearer ")) {
    const payload = await verifyAccessToken(authz.slice(7).trim());
    if (!payload) return null;
    const user = await db
      .selectFrom("users")
      .select(["id", "role", "email"])
      .where("id", "=", payload.userId)
      .executeTakeFirst();
    return user ?? null;
  }

  const email = (await auth())?.user?.email;
  if (!email) return null;
  const user = await db
    .selectFrom("users")
    .select(["id", "role", "email"])
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();
  return user ?? null;
}

// Same as getUser but throws 401 when unauthenticated — for the many routes
// that require a signed-in user.
export async function requireUser(request: Request): Promise<ApiUser> {
  const user = await getUser(request);
  if (!user) throw new HttpError(401, "You must be logged in.");
  return user;
}

// Admins may modify anything; otherwise only the creator may. (Moved verbatim
// from app/actions/index.ts.)
export function canModify(
  user: { id: number; role: string },
  createdBy: number | null,
): boolean {
  return user.role === "admin" || user.id === createdBy;
}
