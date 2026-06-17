import Link from "next/link";

// Shown in place of an "Add …" button when the visitor is logged out, so the
// invitation to contribute is visible everywhere instead of a blank space.
// Styled as the inline "Log in to …" text used on the gear page rather than a
// button: an underlined "Log in" link followed by muted action text.
export default function LoginToAdd({ to }: { to: string }) {
  return (
    <p className="text-sm text-zinc-500">
      <Link
        href="/login"
        className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
      >
        Log in
      </Link>{" "}
      {to}
    </p>
  );
}
