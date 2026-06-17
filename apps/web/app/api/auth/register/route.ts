import { hash } from "bcryptjs";
import { z } from "zod";
import { route, ok, fail, readJson } from "@/lib/api/respond";
import { rateLimit, clientIp } from "@/lib/api/rate-limit";
import db from "@whipperbook/db";
import { issueVerificationToken } from "@/lib/email-verification";
import { sendVerificationEmail } from "@/lib/email";

const schema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
});

// POST /api/auth/register — create a credentials account and email a
// verification link. Does not sign the user in (they must confirm first).
export const POST = route(async (request) => {
  // Throttle signups per IP to blunt account-spam / verification-email abuse.
  rateLimit(`register:${clientIp(request)}`, 5, 60 * 60 * 1000);

  const parsed = await readJson(request, schema);
  const name = parsed.name.trim();
  const email = parsed.email.trim().toLowerCase();
  const password = parsed.password;

  if (!name || !email || password.length < 8) {
    return fail(
      "Please fill in all fields — password must be at least 8 characters.",
      400,
    );
  }
  if (name.length > 100) {
    return fail("Name must be at most 100 characters.", 400);
  }

  const existing = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", email)
    .executeTakeFirst();
  if (existing) {
    return fail("An account with this email already exists.", 409);
  }

  const password_hash = await hash(password, 12);
  let userId: number;
  try {
    const inserted = await db
      .insertInto("users")
      .values({ name, email, password_hash })
      .returning("id")
      .executeTakeFirstOrThrow();
    userId = inserted.id;
  } catch (error) {
    // Backstop for the check-then-insert race: the unique email constraint
    // (Postgres 23505) means a concurrent signup got there first.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: unknown }).code === "23505"
    ) {
      return fail("An account with this email already exists.", 409);
    }
    throw error;
  }

  const token = await issueVerificationToken(userId);
  await sendVerificationEmail(email, token);
  return ok({ ok: true }, 201);
});
