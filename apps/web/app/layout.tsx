import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { meQuery } from "@whipperbook/api-client";
import HeaderNav from "@/app/ui/header-nav";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { siteUrl } from "@/lib/site";
import Providers from "@/app/providers";
import InlineScript from "@/app/ui/inline-script";
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

const title = "Whipperbook — Every route. Every ascent. Yours.";
const description =
  "A route database and personal climbing logbook. Explore crags, sectors and routes, log your ascents, and track your progress.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: title,
    template: "%s · Whipperbook",
  },
  description,
  applicationName: "Whipperbook",
  keywords: [
    "climbing",
    "route database",
    "climbing logbook",
    "crags",
    "ascents",
    "bouldering",
    "sport climbing",
    "trad climbing",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    siteName: "Whipperbook",
    title,
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Prefetch the viewer so the (client) header renders server-side without a
  // flash, sharing the same /api/me query the rest of the app uses. (The await
  // here doesn't affect page notFound()/redirect() status codes.)
  const queryClient = makeQueryClient();
  const api = await serverApi();
  await queryClient.prefetchQuery(
    meQuery<{ name: string | null; role: string } | null>(api),
  );
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={themeInitScript} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
              <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <Link href="/" className="text-lg font-bold tracking-tight">
                  Whipperbook
                </Link>
                <HeaderNav />
              </nav>
            </header>
            {children}
            <footer className="border-t border-zinc-200 dark:border-zinc-800">
              <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
                <Link
                  href="/"
                  className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
                >
                  Whipperbook
                </Link>
                <nav className="flex flex-wrap items-center gap-5 text-sm text-zinc-500">
                  <Link
                    href="/crags"
                    className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Crags
                  </Link>
                  <Link
                    href="/leaderboards"
                    className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Leaderboards
                  </Link>
                  <Link
                    href="/forum"
                    className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Forum
                  </Link>
                  <Link
                    href="/gear"
                    className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Gear
                  </Link>
                  <Link
                    href="/profile/statistics"
                    className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/register"
                    className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Register
                  </Link>
                  <Link
                    href="/contact"
                    className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Contact
                  </Link>
                </nav>
                <span className="text-xs text-zinc-400 dark:text-zinc-600">
                  © {new Date().getFullYear()} Whipperbook
                </span>
              </div>
            </footer>
            <Analytics />
          </HydrationBoundary>
        </Providers>
      </body>
    </html>
  );
}
