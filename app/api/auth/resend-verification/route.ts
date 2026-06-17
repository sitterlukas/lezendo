import { z } from "zod";
import { route, ok, readJson } from "@/lib/api/respond";
import db from "@/lib/db";
import { issueVerificationToken } from "@/lib/email-verification";
import { sendVerificationEmail } from "@/lib/email";

const schema = z.object({ email: z.string() });

// POST /api/auth/resend-verification — re-send the verification email. Always
// reports success so it can't be used to probe which emails exist.
export const POST = route(async (request) => {
  const { email: emailRaw } = await readJson(request, schema);
  const email = emailRaw.trim().toLowerCase();

  if (email) {
    const user = await db
      .selectFrom("users")
      .select(["id", "email", "email_verified_at"])
      .where("email", "=", email)
      .executeTakeFirst();
    if (user && !user.email_verified_at) {
      const token = await issueVerificationToken(user.id);
      await sendVerificationEmail(user.email, token);
    }
  }

  return ok({ ok: true });
});
