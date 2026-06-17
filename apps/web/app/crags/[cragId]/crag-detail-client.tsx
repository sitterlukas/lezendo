"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { cragDetailQuery } from "@whipperbook/api-client";
import { type CragDetailData, type ClimbStyle } from "@whipperbook/db";
import Modal from "@/app/ui/modal";
import ApiForm from "@/app/ui/api-form";
import ActionButton from "@/app/ui/action-button";
import DeleteButton from "@/app/ui/delete-button";
import ImageGallery from "@/app/ui/image-gallery";
import EntityReviews from "@/app/ui/entity-reviews";
import RouteCard from "@/app/ui/route-card";
import CragFields from "@/app/ui/crag-fields";
import { CreateSectorModal, CreateRouteModal } from "@/app/ui/create-modals";
import LoginToAdd from "@/app/ui/login-to-add";
import FactList from "@/app/ui/fact-list";
import { gradeRange, stylesPresent } from "@whipperbook/core";
import { inputClass, typeLabel, typeBadge } from "@/app/ui/style";
import { Skeleton } from "@/app/ui/skeleton";

export type CragDetailResponse = CragDetailData;

export default function CragDetailClient({ cragId }: { cragId: number }) {
  const { data, isPending, isError, error } = useQuery(
    cragDetailQuery<CragDetailResponse>(browserApi, cragId),
  );

  if (isPending) return <CragDetailSkeleton />;

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <p
          role="alert"
          className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
        >
          {(error as Error).message}
        </p>
      </main>
    );
  }

  const id = cragId;
  const {
    crag,
    viewer: currentUser,
    images,
    gradingSystems,
    gradeEquivalencies,
    sectors,
    routes: resolvedRoutes,
    deletedSectors,
    deletedRoutes,
  } = data;
  const tickedRouteIds = new Set(data.tickedRouteIds);

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
              <ApiForm
                endpoint={`/api/crags/${crag.id}`}
                method="PATCH"
                className="grid gap-4"
              >
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
              </ApiForm>
            </Modal>
          )}

          {currentUser && (
            <>
              <CreateSectorModal cragId={crag.id} />
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
            </>
          )}
          {canEdit(crag.created_by) && (
            <DeleteButton
              endpoint={`/api/crags/${crag.id}`}
              title={`Delete ${crag.name}?`}
              message={`This will permanently delete ${crag.name}, all its sectors, and all its routes. This cannot be undone.`}
              confirmLabel="Delete crag"
              ariaLabel="Delete crag"
            />
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
          { label: "Routes", value: resolvedRoutes.length || null },
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

      {resolvedRoutes.length === 0 && sectors.length === 0 && (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No routes here yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add a sector to organise the wall, or go straight to adding a route.
          </p>
          {!currentUser && (
            <div className="mt-3 flex justify-center">
              <LoginToAdd to="to add sectors & routes" />
            </div>
          )}
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
            {!currentUser && (
              <div className="mt-2">
                <LoginToAdd to="to add sectors & routes" />
              </div>
            )}
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
              return (
                <li
                  key={sector.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-zinc-500">
                      {sector.name}
                    </span>
                    {sector.deletedAt && (
                      <span className="ml-3 text-xs text-zinc-400">
                        · Deleted by {sector.deletedBy} on{" "}
                        {new Date(sector.deletedAt).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </span>
                    )}
                  </div>
                  <ActionButton
                    endpoint={`/api/sectors/${sector.id}/recover`}
                    className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Recover
                  </ActionButton>
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
                    {route.deletedAt && (
                      <span className="text-xs text-zinc-400">
                        · Deleted by {route.deletedBy} on{" "}
                        {new Date(route.deletedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <ActionButton
                    endpoint={`/api/routes/${route.id}/recover`}
                    className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Recover
                  </ActionButton>
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

export function CragDetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Skeleton className="h-4 w-20" />
      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-4 w-40" />
          <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        </div>
      </header>
      <div className="mt-6 flex flex-wrap gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-20" />
        ))}
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-32" />
        ))}
      </div>
    </main>
  );
}
