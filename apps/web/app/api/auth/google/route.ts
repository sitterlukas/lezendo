import { z } from "zod";
import { route, ok, fail, readJson } from "@/lib/api/respond";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { verifyGoogleIdToken } from "@/lib/api/google";
import { provisionOAuthUser, issueTokenPair } from "@whipperbook/db";
import db from "@whipperbook/db";

const schema = z.object({ idToken: z.string().min(1) });

// POST /api/auth/google — exchange a Google ID token (from the mobile app's
// native Google Sign-In) for an access/refresh token pair, mirroring
// /api/auth/token. The user row is provisioned the same way the web NextAuth
// flow does (email-keyed, no password).
export const POST = route(async (request) => {
  rateLimit(`google:${clientIp(request)}`, 20, 5 * 60 * 1000);

  if (!process.env.AUTH_GOOGLE_ID) {
    return fail("Google sign-in isn't configured.", 503);
  }

  const { idToken } = await readJson(request, schema);
  const identity = await verifyGoogleIdToken(idToken);
  if (!identity) return fail("Could not verify your Google sign-in.", 401);

  const { id, role } = await provisionOAuthUser(identity);

  // The provisioned row carries the canonical name/email to echo back.
  const user = await db
    .selectFrom("users")
    .select(["id", "name", "email"])
    .where("id", "=", id)
    .executeTakeFirstOrThrow();

  const tokens = await issueTokenPair({ id, role });
  return ok({ ...tokens, user });
});
