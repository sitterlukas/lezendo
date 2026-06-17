"use client";

import { signIn } from "next-auth/react";
import type { ReactNode } from "react";

// One OAuth sign-in button. Kicks off the provider redirect flow via
// next-auth/react (which posts to /api/auth/[...nextauth] under the hood), so
// the cookie session is still established server-side. Replaces the oauthLogin
// server action.
export default function OAuthButton({
  provider,
  children,
}: {
  provider: "google";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => signIn(provider, { redirectTo: "/" })}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
