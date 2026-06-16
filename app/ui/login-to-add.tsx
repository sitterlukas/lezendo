import Link from "next/link";

// Shown in place of an "Add …" button when the visitor is logged out, so the
// invitation to contribute is visible everywhere instead of a blank space.
// Styled to match the ghost "Add" triggers it replaces.
export default function LoginToAdd({ label }: { label: string }) {
  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-transparent px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
    >
      {label}
    </Link>
  );
}
