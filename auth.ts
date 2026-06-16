import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { sql } from "kysely";
import { compare } from "bcryptjs";
import db from "@/lib/db";

// Thrown from `authorize` so the login page can tell "wrong password" apart from
// "correct password, but email not verified yet" (surfaced as `?error=<code>`).
class UnverifiedEmailError extends CredentialsSignin {
  code = "unverified";
}

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
        .select(["id", "email", "name", "password_hash", "email_verified_at"])
        .where("email", "=", email)
        .executeTakeFirst();
      // OAuth-only accounts have no password_hash — they must sign in
      // with their provider.
      if (!user?.password_hash) return null;

      const valid = await compare(password, user.password_hash);
      if (!valid) return null;

      // Block login until the email is confirmed (existing accounts were
      // grandfathered in by the migration).
      if (!user.email_verified_at) throw new UnverifiedEmailError();

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
    async jwt({ token, account }) {
      // `account` is only present at sign-in; persist the provider for the rest
      // of the session so the UI can show how the user actually authenticated.
      if (account) token.provider = account.provider;
      return token;
    },
    async session({ session, token }) {
      if (token.provider) session.provider = token.provider;
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") return true;

      // Auto-linking by email is only safe when the provider has verified the
      // email belongs to this user — otherwise an unverified OAuth identity
      // could be linked onto someone else's account.
      if (account?.provider === "google" && profile?.email_verified !== true) {
        console.warn(
          "[auth] rejected Google sign-in with unverified email",
          user.email,
        );
        return false;
      }

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
            // Google already verified the email, so the account is good to go.
            email_verified_at: new Date(),
          })
          .onConflict((oc) =>
            // An existing (possibly unverified) account: Google has now proven
            // the email belongs to them, so mark it verified if it wasn't.
            oc.column("email").doUpdateSet({
              email_verified_at: sql`coalesce(users.email_verified_at, now())`,
            }),
          )
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
