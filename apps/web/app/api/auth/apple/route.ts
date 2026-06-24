import { z } from "zod";
import { route, ok, fail, readJson } from "@/lib/api/respond";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { verifyAppleIdToken } from "@/lib/api/apple";
import { provisionOAuthUser, issueTokenPair } from "@whipperbook/db";
import db from "@whipperbook/db";

// `name` is only sent by the client on the user's first Apple sign-in (Apple
// returns it once); it's used solely when creating the user row.
const schema = z.object({
  identityToken: z.string().min(1),
  name: z.string().nullish(),
});

// POST /api/auth/apple — exchange an Apple identity token (from the mobile app's
// Sign in with Apple) for an access/refresh token pair, mirroring
// /api/auth/google.
export const POST = route(async (request) => {
  rateLimit(`apple:${clientIp(request)}`, 20, 5 * 60 * 1000);

  if (!process.env.AUTH_APPLE_ID) {
    return fail("Apple sign-in isn't configured.", 503);
  }

  const { identityToken, name } = await readJson(request, schema);
  const identity = await verifyAppleIdToken(identityToken);
  if (!identity) return fail("Could not verify your Apple sign-in.", 401);

  const { id, role } = await provisionOAuthUser({
    email: identity.email,
    name: name ?? null,
  });

  const user = await db
    .selectFrom("users")
    .select(["id", "name", "email"])
    .where("id", "=", id)
    .executeTakeFirstOrThrow();

  const tokens = await issueTokenPair({ id, role });
  return ok({ ...tokens, user });
});
