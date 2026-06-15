import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import db, { type ClimbStyle } from "@/lib/db";
import {
  addRoute,
  addSector,
  updateCrag,
  updateSector,
  deleteCrag,
  deleteSector,
  recoverSector,
  recoverRoute,
} from "@/app/actions";
import Modal from "@/app/ui/modal";
import ConfirmSubmit from "@/app/ui/confirm-submit";
import ImageGallery from "@/app/ui/image-gallery";
import ImageUpload from "@/app/ui/image-upload";
import Select from "@/app/ui/select";
import GradeSelect from "@/app/ui/grade-select";
import { resolveGrade } from "@/lib/grade-conversion";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import { typeLabel, typeBadge, inputClass } from "@/app/ui/style";

export const dynamic = "force-dynamic";

export default async function CragPage({
  params,
}: {
  params: Promise<{ cragId: string }>;
}) {
  const session = await auth();
  const currentUser = session?.user?.email
    ? ((await db
        .selectFrom("users")
        .select([
          "id",
          "role",
          "preferred_rope_grading_system_id",
          "preferred_boulder_grading_system_id",
        ])
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()) ?? null)
    : null;

  const { cragId } = await params;
  const id = Number(cragId);
  if (!Number.isInteger(id)) notFound();

  const crag = await db
    .selectFrom("crags")
    .selectAll()
    .where("id", "=", id)
    .where("deleted", "=", false)
    .executeTakeFirst();
  if (!crag) notFound();

  const images = await db
    .selectFrom("images")
    .select(["id", "url", "uploaded_by"])
    .where("entity_type", "=", "crag")
    .where("entity_id", "=", id)
    .orderBy("created_at")
    .execute();

  const [gradingSystems, gradeEquivalencies] = await Promise.all([
    db
      .selectFrom("grading_systems")
      .select(["id", "name", "slug"])
      .orderBy("id")
      .execute(),
    loadGradeEquivalencies(),
  ]);

  const [sectors, routes, tickedRows] = await Promise.all([
    db
      .selectFrom("sectors")
      .select(["id", "name", "description", "created_by"])
      .where("crag_id", "=", id)
      .where("deleted", "=", false)
      .orderBy("name")
      .execute(),

    db
      .selectFrom("routes")
      .select([
        "id",
        "name",
        "grade",
        "grading_system_id",
        "style",
        "height_m",
        "description",
        "sector_id",
      ])
      .where("crag_id", "=", id)
      .where("deleted", "=", false)
      .orderBy("name")
      .execute(),

    (async () => {
      const email = session?.user?.email;
      const user = email
        ? await db
            .selectFrom("users")
            .select("id")
            .where("email", "=", email.toLowerCase())
            .executeTakeFirst()
        : undefined;
      return user
        ? db
            .selectFrom("ascents")
            .select("route_id")
            .distinct()
            .where("user_id", "=", user.id)
            .execute()
        : [];
    })(),
  ]);

  const tickedRouteIds = new Set(tickedRows.map((r) => r.route_id));

  const resolvedRoutes = routes.map((r) => ({
    ...r,
    ...resolveGrade(
      r.grade,
      r.grading_system_id,
      gradingSystems,
      {
        rope: currentUser?.preferred_rope_grading_system_id,
        boulder: currentUser?.preferred_boulder_grading_system_id,
      },
      gradeEquivalencies,
    ),
  }));

  // Deleted sectors and routes — only fetched when user is admin
  const [deletedSectors, deletedRoutes] =
    currentUser?.role === "admin"
      ? await Promise.all([
          db
            .selectFrom("sectors")
            .select(["id", "name"])
            .where("crag_id", "=", id)
            .where("deleted", "=", true)
            .orderBy("name")
            .execute(),
          db
            .selectFrom("routes")
            .select(["id", "name", "grade"])
            .where("crag_id", "=", id)
            .where("deleted", "=", true)
            .orderBy("name")
            .execute(),
        ])
      : [[], []];

  type LogEntry = { at: Date; by: string };

  async function buildLogMap(entityType: "sector" | "route", ids: number[]) {
    if (ids.length === 0) return new Map<number, LogEntry>();
    const entries = await db
      .selectFrom("deletion_log")
      .innerJoin("users", "users.id", "deletion_log.user_id")
      .select([
        "deletion_log.entity_id",
        "deletion_log.created_at",
        "users.name as by",
      ])
      .where("deletion_log.entity_type", "=", entityType)
      .where("deletion_log.action", "=", "delete")
      .where("deletion_log.entity_id", "in", ids)
      .orderBy("deletion_log.created_at", "desc")
      .execute();
    const map = new Map<number, LogEntry>();
    for (const e of entries) {
      if (!map.has(e.entity_id))
        map.set(e.entity_id, { at: e.created_at as Date, by: e.by as string });
    }
    return map;
  }

  const [deletedSectorLog, deletedRouteLog] = await Promise.all([
    buildLogMap(
      "sector",
      deletedSectors.map((s) => s.id),
    ),
    buildLogMap(
      "route",
      deletedRoutes.map((r) => r.id),
    ),
  ]);

  // Group routes by sector
  const routesBySector = new Map<number | null, typeof resolvedRoutes>();
  for (const route of resolvedRoutes) {
    const key = route.sector_id ?? null;
    if (!routesBySector.has(key)) routesBySector.set(key, []);
    routesBySector.get(key)!.push(route);
  }

  const unsectoredRoutes = routesBySector.get(null) ?? [];

  function canEdit(createdBy: number | null) {
    if (!currentUser) return false;
    return currentUser.role === "admin" || currentUser.id === createdBy;
  }

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
            {sectors.length > 0 && (
              <>
                {sectors.length} {sectors.length === 1 ? "sector" : "sectors"}{" "}
                ·{" "}
              </>
            )}
            {routes.length} {routes.length === 1 ? "route" : "routes"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUser && <ImageUpload entityType="crag" entityId={id} />}
          {canEdit(crag.created_by) && (
            <Modal
              triggerLabel="Edit crag"
              variant="ghost"
              title={`Edit ${crag.name}`}
            >
              <form action={updateCrag} className="grid gap-4">
                <input type="hidden" name="crag_id" value={crag.id} />
                <label>
                  <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Name
                  </span>
                  <input
                    name="name"
                    defaultValue={crag.name}
                    required
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Area
                  </span>
                  <input
                    name="area"
                    defaultValue={crag.area ?? ""}
                    placeholder="e.g. Bohemian Switzerland"
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Country
                  </span>
                  <input
                    name="country"
                    defaultValue={crag.country ?? ""}
                    placeholder="e.g. Czech Republic"
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Description
                  </span>
                  <textarea
                    name="description"
                    defaultValue={crag.description ?? ""}
                    rows={3}
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
          )}

          {currentUser && (
            <Modal
              triggerLabel="Add sector"
              title={`Add a sector at ${crag.name}`}
              subtitle="Group routes by wall, face, or area."
            >
              <form action={addSector} className="grid gap-4">
                <input type="hidden" name="crag_id" value={crag.id} />
                <label>
                  <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Sector name
                  </span>
                  <input
                    name="name"
                    placeholder="e.g. Main wall"
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
                    placeholder="Aspect, approach, character… (optional)"
                    rows={2}
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  Add sector
                </button>
              </form>
            </Modal>
          )}

          {currentUser && (
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
                <GradeSelect
                  gradingSystems={gradingSystems}
                  equivalencies={gradeEquivalencies}
                  defaultSystemId={
                    currentUser?.preferred_rope_grading_system_id ??
                    currentUser?.preferred_boulder_grading_system_id
                  }
                  inputClass={inputClass}
                />
                <label>
                  <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Type
                  </span>
                  <Select name="style" defaultValue="sport">
                    <option value="sport">Sport climb</option>
                    <option value="trad">Trad</option>
                    <option value="boulder">Boulder</option>
                  </Select>
                </label>
                {sectors.length > 0 && (
                  <label>
                    <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Sector
                    </span>
                    <Select name="sector_id">
                      <option value="">— no sector —</option>
                      {sectors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}
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
          )}
          {canEdit(crag.created_by) && (
            <form action={deleteCrag}>
              <input type="hidden" name="crag_id" value={crag.id} />
              <ConfirmSubmit
                title={`Delete ${crag.name}?`}
                message={`This will permanently delete ${crag.name}, all its sectors, and all its routes. This cannot be undone.`}
                confirmLabel="Delete crag"
                triggerAriaLabel="Delete crag"
                triggerClassName="inline-flex items-center gap-1 rounded border border-red-200 bg-transparent px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Delete
              </ConfirmSubmit>
            </form>
          )}
        </div>
      </header>

      <ImageGallery
        images={images}
        currentUserId={currentUser?.id ?? null}
        isAdmin={currentUser?.role === "admin"}
      />

      {routes.length === 0 && sectors.length === 0 && (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No routes here yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add a sector to organise the wall, or go straight to adding a route.
          </p>
        </div>
      )}

      {/* Sectors with their routes */}
      {sectors.length > 0 && (
        <div className="mt-10 space-y-10">
          <div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-bold tracking-tight">Sectors</h2>
              <span className="text-sm text-zinc-500">
                {sectors.length} {sectors.length === 1 ? "sector" : "sectors"}
              </span>
            </div>
            <div className="mt-6 space-y-10">
              {sectors.map((sector) => {
                const sectorRoutes = routesBySector.get(sector.id) ?? [];
                return (
                  <section key={sector.id}>
                    <div className="flex items-baseline justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
                      <div className="flex items-baseline gap-3">
                        <h3 className="text-lg font-semibold">{sector.name}</h3>
                        <span className="text-sm text-zinc-500">
                          {sectorRoutes.length}{" "}
                          {sectorRoutes.length === 1 ? "route" : "routes"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {canEdit(sector.created_by) && (
                          <>
                            <Modal
                              triggerLabel="Edit"
                              variant="ghost"
                              title={`Edit sector: ${sector.name}`}
                            >
                              <form
                                action={updateSector}
                                className="grid gap-4"
                              >
                                <input
                                  type="hidden"
                                  name="sector_id"
                                  value={sector.id}
                                />
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
                            <form action={deleteSector}>
                              <input
                                type="hidden"
                                name="sector_id"
                                value={sector.id}
                              />
                              <input type="hidden" name="crag_id" value={id} />
                              <ConfirmSubmit
                                title={`Delete ${sector.name}?`}
                                message="Routes in this sector will remain but lose their sector assignment."
                                confirmLabel="Delete sector"
                                triggerAriaLabel={`Delete ${sector.name}`}
                                triggerClassName="inline-flex items-center gap-1 rounded border border-red-200 bg-transparent px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                Delete
                              </ConfirmSubmit>
                            </form>
                          </>
                        )}
                        <Link
                          href={`/crags/${id}/sectors/${sector.id}`}
                          className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          View sector →
                        </Link>
                      </div>
                    </div>
                    {sector.description && (
                      <p className="mt-2 text-sm text-zinc-500">
                        {sector.description}
                      </p>
                    )}
                    {sectorRoutes.length === 0 ? (
                      <p className="mt-4 text-sm text-zinc-400 dark:text-zinc-600">
                        No routes in this sector yet.
                      </p>
                    ) : (
                      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sectorRoutes.map((route) => (
                          <RouteCard
                            key={route.id}
                            route={route}
                            cragId={id}
                            ticked={tickedRouteIds.has(route.id)}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </div>

          {/* Routes without a sector */}
          {unsectoredRoutes.length > 0 && (
            <section>
              <div className="flex items-baseline gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-400 dark:text-zinc-500">
                  Other routes
                </h2>
                <span className="text-sm text-zinc-400 dark:text-zinc-500">
                  {unsectoredRoutes.length} without a sector
                </span>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unsectoredRoutes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    cragId={id}
                    ticked={tickedRouteIds.has(route.id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* No sectors: flat list */}
      {sectors.length === 0 && resolvedRoutes.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {resolvedRoutes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              cragId={id}
              ticked={tickedRouteIds.has(route.id)}
            />
          ))}
        </ul>
      )}

      {/* Deleted sectors — admin only */}
      {currentUser?.role === "admin" && deletedSectors.length > 0 && (
        <section className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Deleted sectors
          </h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {deletedSectors.map((sector) => {
              const log = deletedSectorLog.get(sector.id);
              return (
                <li
                  key={sector.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-zinc-500">
                      {sector.name}
                    </span>
                    {log && (
                      <span className="ml-3 text-xs text-zinc-400">
                        · Deleted by {log.by} on{" "}
                        {log.at.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <form action={recoverSector}>
                    <input type="hidden" name="sector_id" value={sector.id} />
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
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

      {/* Deleted routes — admin only */}
      {currentUser?.role === "admin" && deletedRoutes.length > 0 && (
        <section className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Deleted routes
          </h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {deletedRoutes.map((route) => {
              const log = deletedRouteLog.get(route.id);
              return (
                <li
                  key={route.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-500">
                      {route.name}
                    </span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-500 dark:bg-zinc-800">
                      {route.grade}
                    </span>
                    {log && (
                      <span className="text-xs text-zinc-400">
                        · Deleted by {log.by} on{" "}
                        {log.at.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <form action={recoverRoute}>
                    <input type="hidden" name="route_id" value={route.id} />
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
    </main>
  );
}

function RouteCard({
  route,
  cragId,
  ticked,
}: {
  route: {
    id: number;
    name: string;
    grade: string;
    originalGrade: string | null;
    systemName: string | null;
    style: ClimbStyle;
    height_m: number | null;
    description: string | null;
  };
  cragId: number;
  ticked: boolean;
}) {
  return (
    <li>
      <Link
        href={`/crags/${cragId}/routes/${route.id}`}
        className="flex h-full flex-col rounded border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold leading-snug">{route.name}</span>
          <span className="shrink-0 rounded bg-zinc-900 px-2 py-0.5 text-center font-mono text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {route.grade}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[route.style]}`}
          >
            {typeLabel[route.style]}
          </span>
          {route.systemName && (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {route.systemName}
            </span>
          )}
          {route.height_m !== null && (
            <span className="text-xs text-zinc-500">{route.height_m} m</span>
          )}
          {ticked && (
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
  );
}
