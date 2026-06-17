import { z } from "zod";
import { route, ok, fail, readJson } from "@/lib/api/respond";
import db from "@/lib/db";
import { consumeRefreshToken, issueTokenPair } from "@/lib/api/tokens";

const schema = z.object({ refreshToken: z.string() });

// POST /api/auth/token/refresh — rotate a refresh token for a new pair. The old
// refresh token is single-use (consumed here), so a stolen-then-reused token is
// detectable as a no-longer-valid token.
export const POST = route(async (request) => {
  const { refreshToken } = await readJson(request, schema);
  const userId = await consumeRefreshToken(refreshToken);
  if (userId === null) return fail("Invalid or expired refresh token.", 401);

  const user = await db
    .selectFrom("users")
    .select(["id", "role"])
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) return fail("Invalid or expired refresh token.", 401);

  const tokens = await issueTokenPair(user);
  return ok(tokens);
});
