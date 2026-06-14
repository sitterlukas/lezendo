import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import db, { type ClimbStyle } from "@/lib/db";
import { addRoute, logAscent } from "@/app/actions";
import Modal from "@/app/modal";

const typeLabel: Record<ClimbStyle, string> = {
  sport: "Sport climb",
  trad: "Trad",
  boulder: "Boulder",
};

const typeBadge: Record<ClimbStyle, string> = {
  sport: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  trad: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  boulder:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
};

const routeTypes = ["sport", "trad", "boulder"] as const;

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

export const dynamic = "force-dynamic";

export default async function CragPage({
  params,
  searchParams,
}: {
  params: Promise<{ cragId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { cragId } = await params;
  const id = Number(cragId);
  if (!Number.isInteger(id)) notFound();

  const crag = await db
    .selectFrom("crags")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
  if (!crag) notFound();

  const { type } = await searchParams;
  const activeType = routeTypes.find((t) => t === type);

  let query = db
    .selectFrom("routes")
    .select(["id", "name", "grade", "style", "height_m", "description"])
    .where("crag_id", "=", id)
    .orderBy("created_at", "desc");
  if (activeType) {
    query = query.where("style", "=", activeType);
  }
  const routes = await query.execute();

  const email = session.user?.email;
  const user = email
    ? await db
        .selectFrom("users")
        .select("id")
        .where("email", "=", email.toLowerCase())
        .executeTakeFirst()
    : undefined;
  const tickedRows = user
    ? await db
        .selectFrom("ascents")
        .select("route_id")
        .distinct()
        .where("user_id", "=", user.id)
        .execute()
    : [];
  const tickedRouteIds = new Set(tickedRows.map((row) => row.route_id));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Link
        href="/crags"
        className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← All crags
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{crag.name}</h1>
          {(crag.area || crag.country) && (
            <p className="mt-1 text-zinc-500">
              {[crag.area, crag.country].filter(Boolean).join(", ")}
            </p>
          )}
          {crag.description && (
            <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
              {crag.description}
            </p>
          )}
          <p className="mt-3 text-sm text-zinc-500">
            {routes.length} {routes.length === 1 ? "route" : "routes"}
            {activeType ? ` — ${typeLabel[activeType].toLowerCase()} only` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Route type filter */}
          <nav className="flex items-center gap-2 text-sm">
          <Link
            href={`/crags/${id}`}
            className={`rounded px-3 py-1.5 font-medium transition ${
              !activeType
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            All
          </Link>
          {routeTypes.map((t) => (
            <Link
              key={t}
              href={`/crags/${id}?type=${t}`}
              className={`rounded px-3 py-1.5 font-medium transition ${
                activeType === t
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {typeLabel[t]}
            </Link>
          ))}
          </nav>

          <Modal
            triggerLabel="Add route"
            title={`Add a route at ${crag.name}`}
            subtitle="Know a line that's missing? Put it in the book."
          >
            <form action={addRoute} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="crag_id" value={crag.id} />
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Route name
                </span>
                <input
                  name="name"
                  placeholder="e.g. Moonlight Arête"
                  required
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Grade
                </span>
                <input
                  name="grade"
                  placeholder="e.g. 6b+"
                  required
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Type
                </span>
                <select name="style" defaultValue="sport" className={inputClass}>
                  <option value="sport">Sport climb</option>
                  <option value="trad">Trad</option>
                  <option value="boulder">Boulder</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Height (m)
                </span>
                <input
                  name="height_m"
                  type="number"
                  min="1"
                  placeholder="optional"
                  className={inputClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Description
                </span>
                <textarea
                  name="description"
                  placeholder="Beta, rock type, what makes it good… (optional)"
                  rows={2}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 sm:col-span-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Add route
              </button>
            </form>
          </Modal>
        </div>
      </header>

      {routes.length === 0 ? (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No routes here yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            {activeType
              ? `No ${typeLabel[activeType].toLowerCase()} routes at ${crag.name} — try another type or add one with the button above.`
              : `Be the first to add a line at ${crag.name}.`}
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {routes.map((route) => (
            <li
              key={route.id}
              className="group flex flex-col rounded border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold leading-snug">
                  {route.name}
                </h3>
                <span className="shrink-0 rounded bg-zinc-900 px-2.5 py-1 font-mono text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {route.grade}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[route.style]}`}
                >
                  {typeLabel[route.style]}
                </span>
                {route.height_m !== null && (
                  <span className="text-xs">↑ {route.height_m} m</span>
                )}
                {tickedRouteIds.has(route.id) && (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    Climbed
                  </span>
                )}
              </div>
              {route.description && (
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {route.description}
                </p>
              )}
              <form
                action={logAscent}
                className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800"
              >
                <input type="hidden" name="route_id" value={route.id} />
                <select
                  name="tick_type"
                  defaultValue="redpoint"
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="onsight">Onsight</option>
                  <option value="flash">Flash</option>
                  <option value="redpoint">Redpoint</option>
                  <option value="toprope">Toprope</option>
                  <option value="attempt">Attempt</option>
                </select>
                <input
                  type="date"
                  name="ascent_date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
                <button
                  type="submit"
                  className="ml-auto rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  ✓ Tick
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

    </main>
  );
}
