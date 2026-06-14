import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { deleteAscent } from "@/app/actions";
import ConfirmSubmit from "@/app/confirm-submit";
import ProfileTabs from "@/app/profile/tabs";
import db, { type TickType } from "@/lib/db";

const tickBadge: Record<TickType, string> = {
  onsight:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  flash: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  redpoint: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  toprope: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  attempt:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
};

export default async function LoggedRoutesPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const user = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();
  if (!user) {
    redirect("/login");
  }

  const ascents = await db
    .selectFrom("ascents")
    .innerJoin("routes", "routes.id", "ascents.route_id")
    .innerJoin("crags", "crags.id", "routes.crag_id")
    .select([
      "ascents.id",
      "ascents.tick_type",
      "ascents.ascent_date",
      "ascents.notes",
      "routes.name as route",
      "routes.grade",
      "crags.name as crag",
    ])
    .where("ascents.user_id", "=", user.id)
    .orderBy("ascents.ascent_date", "desc")
    .orderBy("ascents.created_at", "desc")
    .execute();

  const distinctRoutes = new Set(ascents.map((a) => a.route)).size;
  const sends = ascents.filter((a) => a.tick_type !== "attempt").length;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <ProfileTabs active="logbook" />

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Logged routes</h2>
        <span className="text-sm text-zinc-500">
          {ascents.length} {ascents.length === 1 ? "tick" : "ticks"} · {sends}{" "}
          {sends === 1 ? "send" : "sends"} · {distinctRoutes}{" "}
          {distinctRoutes === 1 ? "route" : "routes"}
        </span>
      </div>

      {ascents.length === 0 ? (
        <div className="mt-4 border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
          <p className="mx-auto max-w-sm text-sm text-zinc-500">
            Nothing ticked yet — head to the routes and log your first ascent.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {ascents.map((ascent) => (
            <li key={ascent.id} className="group px-6 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{ascent.route}</span>
                <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {ascent.grade}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${tickBadge[ascent.tick_type]}`}
                >
                  {ascent.tick_type}
                </span>
                <span className="ml-auto text-sm text-zinc-500">
                  {ascent.ascent_date.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <form action={deleteAscent}>
                  <input type="hidden" name="ascent_id" value={ascent.id} />
                  <ConfirmSubmit
                    title="Remove tick?"
                    message={`This removes your ${ascent.tick_type} of “${ascent.route}” (${ascent.grade}) from the logbook. This can't be undone.`}
                    confirmLabel="Remove tick"
                    triggerAriaLabel={`Remove ${ascent.route} tick`}
                    triggerClassName="rounded-md p-1 text-zinc-300 transition hover:bg-red-50 hover:text-red-600 group-hover:text-zinc-400 dark:text-zinc-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 5.5h13m-9-2h5m-7.5 2 .7 11a1.5 1.5 0 0 0 1.5 1.4h5.6a1.5 1.5 0 0 0 1.5-1.4l.7-11M8 9v5m4-5v5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </ConfirmSubmit>
                </form>
              </div>
              <div className="mt-0.5 text-sm text-zinc-500">
                {ascent.crag}
                {ascent.notes && (
                  <span className="text-zinc-400"> — {ascent.notes}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
