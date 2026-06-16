import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout, updateName } from "@/app/actions/auth";
import ProfileTabs from "@/app/profile/tabs";
import AvatarUpload from "@/app/ui/avatar-upload";
import GradingSystemForm from "./grading-system-form";
import db from "@/lib/db";
import { loadGradeEquivalencies } from "@/lib/grade-data";

export default async function SettingsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const [user, gradingSystems, gradeEquivalencies] = await Promise.all([
    db
      .selectFrom("users")
      .select([
        "id",
        "name",
        "email",
        "password_hash",
        "avatar_url",
        "preferred_rope_grading_system_id",
        "preferred_boulder_grading_system_id",
        "created_at",
      ])
      .where("email", "=", email.toLowerCase())
      .executeTakeFirst(),
    db
      .selectFrom("grading_systems")
      .select(["id", "name", "slug"])
      .orderBy("id")
      .execute(),
    loadGradeEquivalencies(),
  ]);
  if (!user) {
    redirect("/login");
  }

  const memberSince = user.created_at.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <ProfileTabs active="settings" />

      <section className="mt-6 rounded border border-zinc-200 dark:border-zinc-800">
        <h2 className="border-b border-zinc-200 px-6 py-4 text-lg font-semibold dark:border-zinc-800">
          Settings
        </h2>
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <span className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Photo
          </span>
          <AvatarUpload name={user.name} avatarUrl={user.avatar_url} />
        </div>
        <form
          action={updateName}
          className="flex items-end gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800"
        >
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Display name
            </span>
            <input
              name="name"
              defaultValue={user.name}
              required
              maxLength={100}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Save
          </button>
        </form>
        <GradingSystemForm
          gradingSystems={gradingSystems}
          equivalencies={gradeEquivalencies}
          ropeDefault={user.preferred_rope_grading_system_id}
          boulderDefault={user.preferred_boulder_grading_system_id}
        />
        <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
          <div className="flex items-center justify-between px-6 py-4">
            <dt className="text-sm text-zinc-500">Email</dt>
            <dd className="text-sm font-medium">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <dt className="text-sm text-zinc-500">Member since</dt>
            <dd className="text-sm font-medium">{memberSince}</dd>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <dt className="text-sm text-zinc-500">Log-in method</dt>
            <dd className="text-sm font-medium">
              {user.password_hash ? "Email & password" : "Google"}
            </dd>
          </div>
        </dl>
      </section>

      <form action={logout} className="mt-8">
        <button
          type="submit"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          Log out
        </button>
      </form>
    </main>
  );
}
