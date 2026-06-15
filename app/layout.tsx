import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { logout } from "@/app/actions/auth";
import ThemeToggle from "@/app/ui/theme-toggle";
import db from "@/lib/db";
import "./globals.css";

// Runs before paint so the stored/system theme applies without a flash.
const themeInitScript = `(function(){try{var t=localStorage.theme;if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lezendo — Every route. Every ascent. Yours.",
  description:
    "A route database and personal climbing logbook. Explore crags, log ascents, track your progress.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  // Read the name from the db — the JWT keeps a stale copy after a rename.
  const dbUser = session?.user?.email
    ? await db
        .selectFrom("users")
        .select(["name", "role"])
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()
    : undefined;
  const displayName = dbUser?.name ?? session?.user?.name;
  const isAdmin = dbUser?.role === "admin";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Lezendo
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              <Link
                href="/crags"
                className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Crags
              </Link>
              <Link
                href="/gear"
                className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Gear
              </Link>
              <Link
                href="/forum"
                className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Forum
              </Link>
              <Link
                href="/leaderboards"
                className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Leaderboards
              </Link>
              {session?.user ? (
                <>
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
                          Signed in as{" "}
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
                          Settings
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
                        <form action={logout}>
                          <button
                            type="submit"
                            className="block w-full px-4 py-2 text-left transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          >
                            Sign out
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Sign in
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
          </nav>
        </header>
        {children}
        <footer className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
            <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Lezendo
            </Link>
            <nav className="flex flex-wrap items-center gap-5 text-sm text-zinc-500">
              <Link href="/crags" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">Crags</Link>
              <Link href="/leaderboards" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">Leaderboards</Link>
              <Link href="/forum" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">Forum</Link>
              <Link href="/gear" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">Gear</Link>
              <Link href="/profile/statistics" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">Profile</Link>
              <Link href="/register" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">Register</Link>
            </nav>
            <span className="text-xs text-zinc-400 dark:text-zinc-600">© {new Date().getFullYear()} Lezendo</span>
          </div>
        </footer>
      </body>
    </html>
  );
}