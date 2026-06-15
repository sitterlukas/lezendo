"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import db from "@/lib/db";
import { auth, signIn, signOut } from "@/auth";

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

export async function updateGradingSystem(
  _prev: { saved: boolean },
  formData: FormData,
): Promise<{ saved: boolean }> {
  const email = (await auth())?.user?.email;
  if (!email) return { saved: false };

  const ropeRaw = String(formData.get("preferred_rope_grading_system_id") ?? "").trim();
  const boulderRaw = String(formData.get("preferred_boulder_grading_system_id") ?? "").trim();

  await db
    .updateTable("users")
    .set({
      preferred_rope_grading_system_id: ropeRaw ? Number(ropeRaw) : null,
      preferred_boulder_grading_system_id: boulderRaw ? Number(boulderRaw) : null,
    })
    .where("email", "=", email.toLowerCase())
    .execute();

  revalidatePath("/profile/settings");
  return { saved: true };
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
  await db.insertInto("users").values({ name, email, password_hash }).execute();

  await signIn("credentials", { email, password, redirectTo: "/" });
}

export async function login(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=invalid");
    }
    // signIn redirects by throwing; anything else must propagate too.
    throw error;
  }
}

export async function oauthLogin(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  if (provider !== "google") return;
  await signIn(provider, { redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}