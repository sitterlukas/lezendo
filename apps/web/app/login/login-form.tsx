"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// `AccessDenied` is what NextAuth reports when the sign-in callback rejects an
// OAuth login (e.g. an unverified email). `verify_failed` comes from the
// /verify route. `unverified` / `invalid` are surfaced by the credentials
// sign-in below.
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

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>(initialError);
  const [resent, setResent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    setError(undefined);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      // A correct password on an unverified account surfaces as our custom code.
      setError(res?.code === "unverified" ? "unverified" : "invalid");
    });
  }

  async function handleResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    try {
      await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        body: { email },
      });
    } finally {
      // Always report success so this can't be used to probe which emails exist.
      setResent(true);
    }
  }

  return (
    <>
      {resent && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Check your inbox — we sent you a link to verify your email.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMessages[error] ?? "Invalid email or password."}
        </p>
      )}

      {error && resendableErrors.has(error) && !resent && (
        <form onSubmit={handleResend} className="mt-3 flex gap-2">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
            className={inputClass}
          />
          <button
            type="submit"
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Resend
          </button>
        </form>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          autoComplete="email"
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </>
  );
}
