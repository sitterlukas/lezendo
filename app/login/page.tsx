import Link from "next/link";
import LoginForm from "./login-form";
import OAuthButtons from "@/app/ui/oauth-buttons";

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

      <LoginForm initialError={error} />

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
