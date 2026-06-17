import { z } from "zod";
import { route, ok, fail, readJson } from "@/lib/api/respond";
import { verifyCredentials } from "@/lib/credentials";
import { issueTokenPair } from "@/lib/api/tokens";

const schema = z.object({
  email: z.string(),
  password: z.string(),
});

// POST /api/auth/token — exchange email + password for an access/refresh token
// pair (mobile login). The web app signs in via NextAuth cookies instead.
export const POST = route(async (request) => {
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
