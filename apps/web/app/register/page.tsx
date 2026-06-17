import Link from "next/link";
import RegisterForm from "./register-form";
import OAuthButtons from "@/app/ui/oauth-buttons";

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Create an account to start logging your ascents. We&apos;ll email you a
        link to verify your address before you can log in.
      </p>

      <RegisterForm />

      <OAuthButtons />

      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
