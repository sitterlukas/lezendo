import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import db from "@/lib/db";
import { recoverCrag, recoverSector, recoverRoute } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = session.user.email
    ? await db
        .selectFrom("users")
        .select("role")
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()
    : null;
  if (dbUser?.role !== "admin") redirect("/crags");

  const [deletedCrags, deletedSectors, deletedRoutes, auditLog] =
    await Promise.all([
      db
        .selectFrom("crags")
        .select(["id", "name", "area", "country"])
        .where("deleted", "=", true)
        .orderBy("name")
        .execute(),

      db
        .selectFrom("sectors")
        .innerJoin("crags", "crags.id", "sectors.crag_id")
        .select([
          "sectors.id",
          "sectors.name",
          "sectors.crag_id",
          "crags.name as crag_name",
          "crags.deleted as crag_deleted",
        ])
        .where("sectors.deleted", "=", true)
        .orderBy("crags.name")
        .orderBy("sectors.name")
        .execute(),

      db
        .selectFrom("routes")
        .innerJoin("crags", "crags.id", "routes.crag_id")
        .leftJoin("sectors", "sectors.id", "routes.sector_id")
        .select([
          "routes.id",
          "routes.name",
          "routes.grade",
          "routes.crag_id",
          "crags.name as crag_name",
          "crags.deleted as crag_deleted",
          "sectors.name as sector_name",
        ])
        .where("routes.deleted", "=", true)
        .orderBy("crags.name")
        .orderBy("routes.name")
        .execute(),

      db
        .selectFrom("deletion_log")
        .innerJoin("users", "users.id", "deletion_log.user_id")
        .select([
          "deletion_log.id",
          "deletion_log.entity_type",
          "deletion_log.entity_id",
          "deletion_log.entity_name",
          "deletion_log.action",
          "deletion_log.created_at",
          "users.name as user_name",
        ])
        .orderBy("deletion_log.created_at", "desc")
        .limit(300)
        .execute(),
    ]);

  // Latest delete action per entity (auditLog is newest-first)
  const lastDeleteMap = new Map<string, { by: string; at: Date }>();
  for (const e of auditLog) {
    const key = `${e.entity_type}:${e.entity_id}`;
    if (e.action === "delete" && !lastDeleteMap.has(key)) {
      lastDeleteMap.set(key, {
        by: e.user_name as string,
        at: e.created_at as Date,
      });
    }
  }

  const totalDeleted =
    deletedCrags.length + deletedSectors.length + deletedRoutes.length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Administration
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Deleted content
          </h1>
          <p className="mt-2 text-zinc-500">
            {totalDeleted === 0
              ? "Nothing deleted."
              : `${totalDeleted} deleted ${totalDeleted === 1 ? "item" : "items"} — recover any of them below.`}
          </p>
        </div>
        <div className="flex gap-4 text-sm text-zinc-500">
          <Link
            href="/crags"
            className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Back to crags
          </Link>
        </div>
      </header>

      {/* Summary chips */}
      {totalDeleted > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {deletedCrags.length > 0 && (
            <a
              href="#deleted-crags"
              className="rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700"
            >
              {deletedCrags.length}{" "}
              {deletedCrags.length === 1 ? "crag" : "crags"}
            </a>
          )}
          {deletedSectors.length > 0 && (
            <a
              href="#deleted-sectors"
              className="rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700"
            >
              {deletedSectors.length}{" "}
              {deletedSectors.length === 1 ? "sector" : "sectors"}
            </a>
          )}
          {deletedRoutes.length > 0 && (
            <a
              href="#deleted-routes"
              className="rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700"
            >
              {deletedRoutes.length}{" "}
              {deletedRoutes.length === 1 ? "route" : "routes"}
            </a>
          )}
        </div>
      )}

      {totalDeleted === 0 && (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No deleted items.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Deleted crags, sectors, and routes will appear here.
          </p>
        </div>
      )}

      {/* Deleted crags */}
      {deletedCrags.length > 0 && (
        <section id="deleted-crags" className="mt-12 scroll-mt-20">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Crags
          </h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {deletedCrags.map((crag) => {
              const log = lastDeleteMap.get(`crag:${crag.id}`);
              return (
                <li
                  key={crag.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <span className="font-medium">{crag.name}</span>
                    {(crag.area || crag.country) && (
                      <span className="ml-2 text-sm text-zinc-500">
                        {[crag.area, crag.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {log && (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        Deleted by {log.by} on{" "}
                        {log.at.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <form action={recoverCrag}>
                    <input type="hidden" name="crag_id" value={crag.id} />
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-800"
                    >
                      Recover
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Deleted sectors */}
      {deletedSectors.length > 0 && (
        <section id="deleted-sectors" className="mt-10 scroll-mt-20">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Sectors
          </h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {deletedSectors.map((sector) => {
              const log = lastDeleteMap.get(`sector:${sector.id}`);
              return (
                <li
                  key={sector.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{sector.name}</span>
                      <span className="text-zinc-400">·</span>
                      {sector.crag_deleted ? (
                        <span className="text-sm text-zinc-400 line-through">
                          {sector.crag_name}
                        </span>
                      ) : (
                        <Link
                          href={`/crags/${sector.crag_id}`}
                          className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          {sector.crag_name}
                        </Link>
                      )}
                      {sector.crag_deleted && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                          crag deleted
                        </span>
                      )}
                    </div>
                    {log && (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        Deleted by {log.by} on{" "}
                        {log.at.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <form action={recoverSector}>
                    <input type="hidden" name="sector_id" value={sector.id} />
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-800"
                    >
                      Recover
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Deleted routes */}
      {deletedRoutes.length > 0 && (
        <section id="deleted-routes" className="mt-10 scroll-mt-20">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Routes
          </h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {deletedRoutes.map((route) => {
              const log = lastDeleteMap.get(`route:${route.id}`);
              return (
                <li
                  key={route.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{route.name}</span>
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                        {route.grade}
                      </span>
                      <span className="text-zinc-400">·</span>
                      {route.crag_deleted ? (
                        <span className="text-sm text-zinc-400 line-through">
                          {route.crag_name}
                        </span>
                      ) : (
                        <Link
                          href={`/crags/${route.crag_id}`}
                          className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          {route.crag_name}
                        </Link>
                      )}
                      {route.sector_name && (
                        <>
                          <span className="text-zinc-400">/</span>
                          <span className="text-sm text-zinc-500">
                            {route.sector_name}
                          </span>
                        </>
                      )}
                      {route.crag_deleted && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                          crag deleted
                        </span>
                      )}
                    </div>
                    {log && (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        Deleted by {log.by} on{" "}
                        {log.at.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <form action={recoverRoute}>
                    <input type="hidden" name="route_id" value={route.id} />
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-800"
                    >
                      Recover
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Activity log */}
      <section className="mt-16 pt-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Activity log
        </h2>
        {auditLog.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No activity yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {auditLog.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
              >
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    entry.action === "delete"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                      : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                  }`}
                >
                  {entry.action === "delete" ? "Deleted" : "Recovered"}
                </span>
                <span className="capitalize text-zinc-500">
                  {entry.entity_type}
                </span>
                <span className="font-medium">{entry.entity_name}</span>
                <span className="ml-auto text-xs text-zinc-400">
                  {entry.user_name as string} ·{" "}
                  {(entry.created_at as Date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        {auditLog.length === 300 && (
          <p className="mt-3 text-xs text-zinc-400">
            Showing the 300 most recent actions.
          </p>
        )}
      </section>
    </main>
  );
}
