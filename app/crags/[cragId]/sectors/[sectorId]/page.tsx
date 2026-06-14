import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import db, { type ClimbStyle } from "@/lib/db";
import { addRoute, updateSector, deleteSector } from "@/app/actions";
import Modal from "@/app/modal";
import ConfirmSubmit from "@/app/confirm-submit";

export const dynamic = "force-dynamic";

const typeLabel: Record<ClimbStyle, string> = {
  sport: "Sport climb",
  trad: "Trad",
  boulder: "Boulder",
};

const typeBadge: Record<ClimbStyle, string> = {
  sport: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  trad: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  boulder: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
};

const inputClass =
  "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

export default async function SectorPage({
  params,
}: {
  params: Promise<{ cragId: string; sectorId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { cragId, sectorId } = await params;
  const cragIdNum = Number(cragId);
  const sectorIdNum = Number(sectorId);
  if (!Number.isInteger(cragIdNum) || !Number.isInteger(sectorIdNum)) notFound();

  const [crag, sector] = await Promise.all([
    db.selectFrom("crags").selectAll().where("id", "=", cragIdNum).where("deleted", "=", false).executeTakeFirst(),
    db
      .selectFrom("sectors")
      .selectAll()
      .where("id", "=", sectorIdNum)
      .where("crag_id", "=", cragIdNum)
      .where("deleted", "=", false)
      .executeTakeFirst(),
  ]);
  if (!crag || !sector) notFound();

  const email = session.user.email!;
  const [routes, user] = await Promise.all([
    db
      .selectFrom("routes")
      .select(["id", "name", "grade", "style", "height_m", "description"])
      .where("crag_id", "=", cragIdNum)
      .where("sector_id", "=", sectorIdNum)
      .where("deleted", "=", false)
      .orderBy("name")
      .execute(),
    db
      .selectFrom("users")
      .select("id")
      .where("email", "=", email.toLowerCase())
      .executeTakeFirst(),
  ]);

  const tickedRouteIds = new Set<number>();
  if (user) {
    const ticked = await db
      .selectFrom("ascents")
      .select("route_id")
      .distinct()
      .where("user_id", "=", user.id)
      .execute();
    for (const t of ticked) tickedRouteIds.add(t.route_id);
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/crags" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
          Crags
        </Link>
        <span>/</span>
        <Link
          href={`/crags/${cragIdNum}`}
          className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {crag.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">{sector.name}</span>
      </nav>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{sector.name}</h1>
          <p className="mt-1 text-zinc-500">{crag.name}</p>
          {sector.description && (
            <p className="mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
              {sector.description}
            </p>
          )}
          <p className="mt-3 text-sm text-zinc-500">
            {routes.length} {routes.length === 1 ? "route" : "routes"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Modal
            triggerLabel="Edit sector"
            variant="ghost"
            title={`Edit sector: ${sector.name}`}
          >
            <form action={updateSector} className="grid gap-4">
              <input type="hidden" name="sector_id" value={sector.id} />
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Name
                </span>
                <input
                  name="name"
                  defaultValue={sector.name}
                  required
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Description
                </span>
                <textarea
                  name="description"
                  defaultValue={sector.description ?? ""}
                  rows={2}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Save changes
              </button>
            </form>
          </Modal>

          <Modal
            triggerLabel="Add route"
            title={`Add a route in ${sector.name}`}
            subtitle={`Routes here will be assigned to the ${sector.name} sector.`}
          >
            <form action={addRoute} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="crag_id" value={crag.id} />
              <input type="hidden" name="sector_id" value={sector.id} />
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
                <input name="grade" placeholder="e.g. 6b+" required className={inputClass} />
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
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 sm:col-span-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Add route
              </button>
            </form>
          </Modal>
        </div>
      </header>

      {routes.length === 0 ? (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No routes in this sector yet.</p>
          <p className="mt-1 text-sm text-zinc-500">Add the first route to get started.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <li key={route.id}>
              <Link
                href={`/crags/${cragIdNum}/routes/${route.id}`}
                className="flex h-full flex-col rounded border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold leading-snug">{route.name}</span>
                  <span className="shrink-0 rounded bg-zinc-900 px-2 py-0.5 font-mono text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {route.grade}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[route.style]}`}
                  >
                    {typeLabel[route.style]}
                  </span>
                  {route.height_m !== null && (
                    <span className="text-xs text-zinc-500">{route.height_m} m</span>
                  )}
                  {tickedRouteIds.has(route.id) && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/50 dark:text-green-300">
                      Climbed
                    </span>
                  )}
                </div>
                {route.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {route.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Danger zone */}
      <section className="mt-16 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Danger zone
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded border border-red-200 p-4 dark:border-red-900/50">
          <div>
            <p className="text-sm font-medium">Delete this sector</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Routes in this sector will remain but lose their sector assignment.
            </p>
          </div>
          <form action={deleteSector}>
            <input type="hidden" name="sector_id" value={sector.id} />
            <input type="hidden" name="crag_id" value={cragIdNum} />
            <ConfirmSubmit
              title={`Delete ${sector.name}?`}
              message={`This will permanently delete the sector "${sector.name}". Routes inside it will remain but become unsectored.`}
              confirmLabel="Delete sector"
              triggerAriaLabel="Delete sector"
              triggerClassName="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:bg-transparent dark:hover:bg-red-950/30"
            >
              Delete sector
            </ConfirmSubmit>
          </form>
        </div>
      </section>
    </main>
  );
}
