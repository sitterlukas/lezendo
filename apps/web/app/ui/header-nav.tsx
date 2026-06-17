"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@whipperbook/api-client";
import { browserApi } from "@/lib/api/client";
import ThemeToggle from "@/app/ui/theme-toggle";

const linkCls = "transition hover:text-zinc-900 dark:hover:text-zinc-100";
const mobileLinkCls =
  "block py-2.5 transition hover:text-zinc-900 dark:hover:text-zinc-100";

// Only the fields the nav needs (the /api/me response carries more).
type Me = { name: string | null; role: string } | null;

export default function HeaderNav() {
  const [open, setOpen] = useState(false);
  // Fetch the viewer client-side so the root layout stays synchronous (a
  // blocking await in the layout commits the response before a page's
  // notFound()/redirect() can set its status).
  const { data: me } = useQuery(meQuery<Me>(browserApi));
  const isAuthed = !!me;
  const displayName = me?.name ?? null;
  const isAdmin = me?.role === "admin";

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex dark:text-zinc-400">
        <Link href="/crags" className={linkCls}>
          Crags
        </Link>
        <Link href="/feed" className={linkCls}>
          Feed
        </Link>
        <Link href="/gear" className={linkCls}>
          Gear
        </Link>
        <Link href="/forum" className={linkCls}>
          Forum
        </Link>
        <Link href="/leaderboards" className={linkCls}>
          Leaderboards
        </Link>
        {isAuthed ? (
          <div className="group relative">
            <Link
              href="/profile/statistics"
              className="flex items-center gap-1 py-2 text-zinc-900 transition dark:text-zinc-100"
            >
              Profile
              <svg
                width="12"
                height="12"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="text-zinc-400 transition group-hover:rotate-180"
              >
                <path
                  d="m5 8 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <div className="invisible absolute right-0 top-full z-20 pt-1 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div className="w-52 rounded border border-zinc-200 bg-white py-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <p className="px-4 py-2 text-xs text-zinc-400">
                  Logged in as{" "}
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                    {displayName}
                  </span>
                </p>
                <Link
                  href="/profile/statistics"
                  className="block px-4 py-2 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  Statistics
                </Link>
                <Link
                  href="/profile/gear"
                  className="block px-4 py-2 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  Gear
                </Link>
                <Link
                  href="/profile/settings"
                  className="block px-4 py-2 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  Profile
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="block px-4 py-2 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    Admin
                  </Link>
                )}
                <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />
                <button
                  type="button"
                  onClick={() => signOut({ redirectTo: "/" })}
                  className="block w-full px-4 py-2 text-left transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Link href="/login" className={linkCls}>
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded bg-zinc-900 px-3 py-1.5 text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Register
            </Link>
          </>
        )}
        <ThemeToggle />
      </div>

      {/* Mobile controls */}
      <div className="flex items-center gap-1 md:hidden">
        <ThemeToggle />
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="rounded p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            {open ? (
              <path
                d="M5 5l14 14M19 5 5 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div
          className="absolute inset-x-0 top-full z-20 border-b border-zinc-200 bg-white shadow-lg md:hidden dark:border-zinc-800 dark:bg-black"
          onClick={() => setOpen(false)}
        >
          <nav className="mx-auto flex max-w-5xl flex-col px-6 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link href="/crags" className={mobileLinkCls}>
              Crags
            </Link>
            <Link href="/feed" className={mobileLinkCls}>
              Feed
            </Link>
            <Link href="/gear" className={mobileLinkCls}>
              Gear
            </Link>
            <Link href="/forum" className={mobileLinkCls}>
              Forum
            </Link>
            <Link href="/leaderboards" className={mobileLinkCls}>
              Leaderboards
            </Link>

            <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />

            {isAuthed ? (
              <>
                <p className="py-1 text-xs text-zinc-400">
                  Logged in as{" "}
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                    {displayName}
                  </span>
                </p>
                <Link href="/profile/statistics" className={mobileLinkCls}>
                  Statistics
                </Link>
                <Link href="/profile/gear" className={mobileLinkCls}>
                  My gear
                </Link>
                <Link href="/profile/settings" className={mobileLinkCls}>
                  Profile
                </Link>
                {isAdmin && (
                  <Link href="/admin" className={mobileLinkCls}>
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => signOut({ redirectTo: "/" })}
                  className="block w-full py-2.5 text-left transition hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={mobileLinkCls}>
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="mt-1 rounded bg-zinc-900 px-3 py-2 text-center text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
