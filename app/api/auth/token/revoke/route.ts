import { z } from "zod";
import { route, ok, readJson } from "@/lib/api/respond";
import { revokeRefreshToken } from "@/lib/api/tokens";

const schema = z.object({ refreshToken: z.string() });

// POST /api/auth/token/revoke — mobile logout. Idempotent: revoking an unknown
// token still returns ok.
export const POST = route(async (request) => {
  const { refreshToken } = await readJson(request, schema);
  await revokeRefreshToken(refreshToken);
  return ok({ ok: true });
});
