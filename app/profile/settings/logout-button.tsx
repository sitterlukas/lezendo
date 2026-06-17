"use client";

import { signOut } from "next-auth/react";

// Clears the NextAuth cookie session and returns home. Replaces the logout
// server action.
export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/" })}
      className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      Log out
    </button>
  );
}
