import { z } from "zod";
import { route, ok, fail, readJson } from "@/lib/api/respond";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import { verifyCredentials } from "@whipperbook/db";
import { issueTokenPair } from "@whipperbook/db";

const schema = z.object({
  email: z.string(),
  password: z.string(),
});

// POST /api/auth/token — exchange email + password for an access/refresh token
// pair (mobile login). The web app signs in via NextAuth cookies instead.
export const POST = route(async (request) => {
  // Throttle login attempts per IP to slow credential-stuffing.
  rateLimit(`token:${clientIp(request)}`, 10, 5 * 60 * 1000);

  const { email, password } = await readJson(request, schema);
  const result = await verifyCredentials(email, password);
  if (!result.ok) {
    return fail(
      result.reason === "unverified"
        ? "Please verify your email before logging in."
        : "Invalid email or password.",
      401,
    );
  }

  const tokens = await issueTokenPair(result.user);
  return ok({
    ...tokens,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
    },
  });
});
