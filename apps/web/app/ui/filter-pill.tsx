import Link from "next/link";
import type { ReactNode } from "react";

// A filter tab rendered as a link: solid when active, outlined otherwise.
// Used for the leaderboard period tabs and the crags country tabs.
export default function FilterPill({
  href,
  active,
  scroll = true,
  children,
}: {
  href: string;
  active: boolean;
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={scroll}
      className={`rounded px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </Link>
  );
}
