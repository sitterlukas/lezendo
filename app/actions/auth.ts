"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import db from "@/lib/db";
import { auth, signIn, signOut } from "@/auth";
import { issueVerificationToken } from "@/lib/email-verification";
import { sendVerificationEmail } from "@/lib/email";

export async function updateName(formData: FormData) {
  const email = (await auth())?.user?.email;
  if (!email) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 100) return;

  await db
    .updateTable("users")
    .set({ name })
    .where("email", "=", email.toLowerCase())
    .execute();

  revalidatePath("/profile");
  revalidatePath("/", "layout");
}

export async function updateAvatar(url: string | null) {
  const email = (await auth())?.user?.email;
  if (!email) return;

  await db
    .updateTable("users")
    .set({ avatar_url: url })
    .where("email", "=", email.toLowerCase())
    .execute();

  // Avatars appear all over (feed, reviews, profile, forum, leaderboard), so
  // refresh everything.
  revalidatePath("/", "layout");
}

export async function updateGradingSystem(formData: FormData): Promise<void> {
  const email = (await auth())?.user?.email;
  if (!email) return;

  const ropeRaw = String(
    formData.get("preferred_rope_grading_system_id") ?? "",
  ).trim();
  const boulderRaw = String(
    formData.get("preferred_boulder_grading_system_id") ?? "",
  ).trim();

  await db
    .updateTable("users")
    .set({
      preferred_rope_grading_system_id: ropeRaw ? Number(ropeRaw) : null,
      preferred_boulder_grading_system_id: boulderRaw
        ? Number(boulderRaw)
        : null,
    })
    .where("email", "=", email.toLowerCase())
    .execute();

  revalidatePath("/profile/settings");
}

export async function register(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    redirect("/register?error=invalid");
  }

  const existing = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", email)
    .executeTakeFirst();
  if (existing) {
    redirect("/register?error=exists");
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
    // Backstop for the check-then-insert race: the DB's unique constraint on
    // email (Postgres error 23505) means a concurrent signup got there first.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      redirect("/register?error=exists");
    }
    throw error;
  }

  // Don't log them in yet — they must confirm the email first.
  const token = await issueVerificationToken(userId);
  await sendVerificationEmail(email, token);
  redirect("/login?verify=sent");
}

export async function login(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    // A correct password on an unverified account surfaces as our custom code.
    if (error instanceof CredentialsSignin && error.code === "unverified") {
      redirect("/login?error=unverified");
    }
    if (error instanceof AuthError) {
      redirect("/login?error=invalid");
    }
    // signIn redirects by throwing; anything else must propagate too.
    throw error;
  }
}

export async function resendVerification(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  // Always report success so this can't be used to probe which emails exist.
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

  redirect("/login?verify=sent");
}

export async function oauthLogin(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  if (provider !== "google") return;
  await signIn(provider, { redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
