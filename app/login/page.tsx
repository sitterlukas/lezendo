import Link from "next/link";
import { login, resendVerification } from "@/app/actions/auth";
import OAuthButtons from "@/app/ui/oauth-buttons";

// `AccessDenied` is what NextAuth reports when the sign-in callback rejects an
// OAuth login (e.g. an unverified email).
const errorMessages: Record<string, string> = {
  invalid: "Invalid email or password.",
  AccessDenied:
    "We couldn't sign you in — your email isn't verified with your provider. Verify it and try again.",
  unverified:
    "Please verify your email before logging in. We sent you a link when you signed up.",
  verify_failed: "That verification link is invalid or has expired.",
};

// Errors where offering to re-send the verification email makes sense.
const resendableErrors = new Set(["unverified", "verify_failed"]);

const noticeMessages: Record<string, string> = {
  sent: "Check your inbox — we sent you a link to verify your email before you can log in.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verify?: string; verified?: string }>;
}) {
  const { error, verify, verified } = await searchParams;
  const notice =
    verified === "1"
      ? "Email verified — you can now log in."
      : verify
        ? noticeMessages[verify]
        : undefined;

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Log in</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Welcome back.
      </p>

      {notice && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMessages[error] ?? "Invalid email or password."}
        </p>
      )}

      {error && resendableErrors.has(error) && (
        <form action={resendVerification} className="mt-3 flex gap-2">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Resend
          </button>
        </form>
      )}

      <form action={login} className="mt-8 space-y-4">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Log in
        </button>
      </form>

      <OAuthButtons />

      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        No account yet?{" "}
        <Link href="/register" className="font-medium underline">
          Register
        </Link>
      </p>
    </main>
  );
}
