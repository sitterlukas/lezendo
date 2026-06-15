import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import db, { type ClimbStyle } from "@/lib/db";
import {
  updateCrag,
  deleteCrag,
  recoverSector,
  recoverRoute,
} from "@/app/actions";
import Modal from "@/app/ui/modal";
import DeleteButton from "@/app/ui/delete-button";
import ImageGallery from "@/app/ui/image-gallery";
import EntityReviews from "@/app/ui/entity-reviews";
import RouteCard from "@/app/ui/route-card";
import CragFields from "@/app/ui/crag-fields";
import { CreateSectorModal, CreateRouteModal } from "@/app/ui/create-modals";
import FactList from "@/app/ui/fact-list";
import { resolveGrade } from "@/lib/grade-conversion";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import { gradeRange, stylesPresent } from "@/lib/route-stats";
import { inputClass, typeLabel, typeBadge } from "@/app/ui/style";

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

  // Crag-level overview stats (derived from all routes).
  const cragRange = gradeRange(resolvedRoutes, gradeEquivalencies);
  const cragStyles = stylesPresent(resolvedRoutes);

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
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
                <CragFields
                  defaults={{
                    rock_type: crag.rock_type,
                    aspect: crag.aspect,
                    best_season: crag.best_season,
                    access_notes: crag.access_notes,
                  }}
                />
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  Save changes
                </button>
              </form>
            </Modal>
          )}

          {currentUser && <CreateSectorModal cragId={crag.id} />}

          {currentUser && (
            <CreateRouteModal
              cragId={crag.id}
              sectors={sectors}
              gradingSystems={gradingSystems}
              equivalencies={gradeEquivalencies}
              defaultSystemId={
                currentUser?.preferred_rope_grading_system_id ??
                currentUser?.preferred_boulder_grading_system_id
              }
            />
          )}
          {canEdit(crag.created_by) && (
            <form action={deleteCrag}>
              <input type="hidden" name="crag_id" value={crag.id} />
              <DeleteButton
                title={`Delete ${crag.name}?`}
                message={`This will permanently delete ${crag.name}, all its sectors, and all its routes. This cannot be undone.`}
                confirmLabel="Delete crag"
                ariaLabel="Delete crag"
              />
            </form>
          )}
        </div>
      </header>

      {/* Overview stats */}
      <FactList
        className="mt-6"
        variant="inline"
        items={[
          {
            label: "Sectors",
            value: sectors.length || null,
          },
          { label: "Routes", value: routes.length || null },
          {
            label: "Grades",
            value: cragRange
              ? cragRange.minGrade === cragRange.maxGrade
                ? cragRange.minGrade
                : `${cragRange.minGrade}–${cragRange.maxGrade}`
              : null,
          },
          {
            label: "Styles",
            value: cragStyles.length ? (
              <span className="flex flex-wrap gap-1">
                {cragStyles.map((s) => (
                  <span
                    key={s}
                    className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[s]}`}
                  >
                    {typeLabel[s]}
                  </span>
                ))}
              </span>
            ) : null,
          },
          { label: "Rock", value: crag.rock_type },
          { label: "Aspect", value: crag.aspect },
          { label: "Season", value: crag.best_season },
        ]}
      />
      {crag.access_notes && (
        <p className="mt-4 max-w-2xl text-sm text-zinc-500">
          <span className="font-medium text-zinc-600 dark:text-zinc-400">
            Access:
          </span>{" "}
          {crag.access_notes}
        </p>
      )}

      <ImageGallery
        images={images}
        currentUserId={currentUser?.id ?? null}
        isAdmin={currentUser?.role === "admin"}
        entityType="crag"
        entityId={id}
        canUpload={!!currentUser}
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
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sectors.map((sector) => {
                const sectorRoutes = routesBySector.get(sector.id) ?? [];
                return (
                  <SectorSummaryCard
                    key={sector.id}
                    cragId={id}
                    sector={sector}
                    routeCount={sectorRoutes.length}
                    range={gradeRange(sectorRoutes, gradeEquivalencies)}
                    styles={stylesPresent(sectorRoutes)}
                  />
                );
              })}
            </ul>
          </div>

          {/* Routes without a sector */}
          {unsectoredRoutes.length > 0 && (
            <section>
              <div className="flex items-baseline gap-3">
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

      <EntityReviews
        entityType="crag"
        entityId={id}
        currentUserId={currentUser?.id ?? null}
        isAdmin={currentUser?.role === "admin"}
      />

      {/* Deleted sectors — admin only */}
      {currentUser?.role === "admin" && deletedSectors.length > 0 && (
        <section className="mt-12 pt-8">
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
        <section className="mt-8 pt-8">
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

function SectorSummaryCard({
  cragId,
  sector,
  routeCount,
  range,
  styles,
}: {
  cragId: number;
  sector: { id: number; name: string; description: string | null };
  routeCount: number;
  range: { minGrade: string; maxGrade: string } | null;
  styles: ClimbStyle[];
}) {
  return (
    <li>
      <Link
        href={`/crags/${cragId}/sectors/${sector.id}`}
        className="flex h-full flex-col rounded border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold leading-snug">{sector.name}</span>
          {range && (
            <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-center font-mono text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {range.minGrade === range.maxGrade
                ? range.minGrade
                : `${range.minGrade}–${range.maxGrade}`}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>
            {routeCount} {routeCount === 1 ? "route" : "routes"}
          </span>
          {styles.map((s) => (
            <span
              key={s}
              className={`rounded px-2 py-0.5 font-medium ${typeBadge[s]}`}
            >
              {typeLabel[s]}
            </span>
          ))}
        </div>
        {sector.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {sector.description}
          </p>
        )}
      </Link>
    </li>
  );
}
