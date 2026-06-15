import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { compare } from "bcryptjs";
import db from "@/lib/db";

const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

// Drives which sign-in buttons the login/register pages render.
export const oauthProviders: { id: "google"; name: string }[] = googleEnabled
  ? [{ id: "google", name: "Google" }]
  : [];

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: {},
      password: {},
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;

      const user = await db
        .selectFrom("users")
        .select(["id", "email", "name", "password_hash"])
        .where("email", "=", email)
        .executeTakeFirst();
      // OAuth-only accounts have no password_hash — they must sign in
      // with their provider.
      if (!user?.password_hash) return null;

      const valid = await compare(password, user.password_hash);
      if (!valid) return null;

      return { id: String(user.id), email: user.email, name: user.name };
    },
  }),
  ...(googleEnabled ? [Google] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;

      // First OAuth sign-in: create a local user row keyed by email.
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      try {
        await db
          .insertInto("users")
          .values({
            email,
            name: user.name ?? email.split("@")[0],
            password_hash: null,
          })
          .onConflict((oc) => oc.column("email").doNothing())
          .execute();
      } catch (error) {
        // Without this, any DB failure here is swallowed by NextAuth as a
        // generic "AccessDenied", hiding the real cause (e.g. a NOT NULL or
        // connection error). Log it, then let it surface as a sign-in failure.
        console.error("[auth] failed to provision OAuth user", email, error);
        throw error;
      }

      return true;
    },
  },
});
