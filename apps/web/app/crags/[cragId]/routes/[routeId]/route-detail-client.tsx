"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { routeDetailQuery } from "@whipperbook/api-client";
import {
  type RouteDetailData as RouteDetailDataType,
  type TickType,
} from "@whipperbook/db";
import Modal from "@/app/ui/modal";
import ApiForm from "@/app/ui/api-form";
import DeleteButton from "@/app/ui/delete-button";
import ImageGallery from "@/app/ui/image-gallery";
import EntityReviews from "@/app/ui/entity-reviews";
import Select from "@/app/ui/select";
import FactList from "@/app/ui/fact-list";
import { Skeleton } from "@/app/ui/skeleton";
import { tickStats } from "@whipperbook/core";
import GradeSelect from "@/app/ui/grade-select";
import { typeLabel, typeBadge } from "@/app/ui/style";

export type RouteDetailData = RouteDetailDataType;

const tickLabel: Record<TickType, string> = {
  onsight: "Onsight",
  flash: "Flash",
  redpoint: "Redpoint",
  toprope: "Toprope",
  attempt: "Attempt",
};

const tickBadge: Record<TickType, string> = {
  onsight:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  flash: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  redpoint: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  toprope: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  attempt:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
};

export default function RouteDetailClient({
  cragId,
  routeId,
}: {
  cragId: number;
  routeId: number;
}) {
  const { data, isPending, isError, error } = useQuery(
    routeDetailQuery<RouteDetailData>(browserApi, cragId, routeId),
  );

  if (isPending) return <RouteDetailSkeleton />;

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <p
          role="alert"
          className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
        >
          {(error as Error).message}
        </p>
      </main>
    );
  }

  const cragIdNum = cragId;
  const routeIdNum = routeId;
  const {
    crag,
    route,
    sector,
    sectors,
    viewer: currentUser,
    gradingSystems,
    gradeEquivalencies,
    images,
    ascents: allAscents,
    displayGrade,
    displaySystemName,
  } = data;

  const myAscents = currentUser
    ? allAscents.filter((a) => a.user_id === currentUser.id)
    : [];
  const communityAscents = allAscents.filter(
    (a) => !currentUser || a.user_id !== currentUser.id,
  );
  const stats = tickStats(allAscents);
  const firstAscent =
    route.first_ascensionist || route.first_ascent_year
      ? [route.first_ascensionist, route.first_ascent_year]
          .filter(Boolean)
          .join(", ")
      : null;

  function canEdit(createdBy: number | null) {
    if (!currentUser) return false;
    return currentUser.role === "admin" || currentUser.id === createdBy;
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <Link
          href="/crags"
          className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Crags
        </Link>
        <span>/</span>
        <Link
          href={`/crags/${cragIdNum}`}
          className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {crag.name}
        </Link>
        {sector && (
          <>
            <span>/</span>
            <Link
              href={`/crags/${cragIdNum}/sectors/${sector.id}`}
              className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {sector.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">{route.name}</span>
      </nav>

      {/* Route header */}
      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{route.name}</h1>
          {/* Consolidated spec row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-zinc-500">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[route.style]}`}
            >
              {typeLabel[route.style]}
            </span>
            {displaySystemName && (
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {displaySystemName}
              </span>
            )}
            {route.height_m !== null && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="tabular-nums">{route.height_m} m</span>
              </>
            )}
            {route.pitches !== null && route.pitches > 1 && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="tabular-nums">{route.pitches} pitches</span>
              </>
            )}
            {route.bolt_count !== null && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="tabular-nums">{route.bolt_count} bolts</span>
              </>
            )}
            {(crag.area || crag.country) && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span>
                  {[crag.area, crag.country].filter(Boolean).join(", ")}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <span className="rounded bg-zinc-900 px-3 py-1 text-center font-mono text-lg font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {displayGrade}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit(route.created_by) && (
              <>
                <DeleteButton
                  endpoint={`/api/routes/${route.id}`}
                  title={`Delete ${route.name}?`}
                  message="This will permanently delete the route and all logged ascents for it."
                  confirmLabel="Delete route"
                  ariaLabel="Delete route"
                />
                <Modal
                  triggerLabel="Edit route"
                  variant="ghost"
                  title={`Edit ${route.name}`}
                >
                  <ApiForm
                    endpoint={`/api/routes/${route.id}`}
                    method="PATCH"
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <input type="hidden" name="crag_id" value={cragIdNum} />
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Name
                      </span>
                      <input
                        name="name"
                        defaultValue={route.name}
                        required
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <GradeSelect
                      gradingSystems={gradingSystems}
                      equivalencies={gradeEquivalencies}
                      defaultSystemId={
                        route.grading_system_id ??
                        currentUser?.preferred_rope_grading_system_id ??
                        currentUser?.preferred_boulder_grading_system_id
                      }
                      defaultGrade={route.grade}
                    />
                    <label>
                      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Type
                      </span>
                      <Select name="style" defaultValue={route.style}>
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
                        <Select
                          name="sector_id"
                          defaultValue={route.sector_id ?? ""}
                        >
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
                        Length (m)
                      </span>
                      <input
                        name="height_m"
                        type="number"
                        min="1"
                        defaultValue={route.height_m ?? ""}
                        placeholder="optional"
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Bolts
                      </span>
                      <input
                        name="bolt_count"
                        type="number"
                        min="0"
                        defaultValue={route.bolt_count ?? ""}
                        placeholder="optional"
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Bolting / protection
                      </span>
                      <input
                        name="protection"
                        defaultValue={route.protection ?? ""}
                        placeholder="e.g. Sport-bolted, stainless steel, lower-off (optional)"
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Pitches
                      </span>
                      <input
                        name="pitches"
                        type="number"
                        min="1"
                        defaultValue={route.pitches ?? ""}
                        placeholder="1"
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        First ascent year
                      </span>
                      <input
                        name="first_ascent_year"
                        type="number"
                        min="1900"
                        defaultValue={route.first_ascent_year ?? ""}
                        placeholder="optional"
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        First ascensionist
                      </span>
                      <input
                        name="first_ascensionist"
                        defaultValue={route.first_ascensionist ?? ""}
                        placeholder="Who made the first ascent (optional)"
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Gear / rack
                      </span>
                      <input
                        name="gear_notes"
                        defaultValue={route.gear_notes ?? ""}
                        placeholder="e.g. Single rack to 3 inches, 12 draws (optional)"
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Description
                      </span>
                      <textarea
                        name="description"
                        defaultValue={route.description ?? ""}
                        rows={3}
                        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 sm:col-span-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      Save changes
                    </button>
                  </ApiForm>
                </Modal>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Facts + ascent stats. Trad routes show Gear/rack instead of Bolting
          (the two would otherwise overlap). */}
      {(() => {
        const bolting = route.style === "trad" ? null : route.protection;
        const hasFacts = !!(firstAscent || bolting || route.gear_notes);
        if (!hasFacts && stats.totalSends === 0) return null;
        return (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {hasFacts && (
              <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <FactList
                  items={[
                    { label: "First ascent", value: firstAscent },
                    { label: "Bolting", value: bolting },
                    { label: "Gear / rack", value: route.gear_notes },
                  ]}
                />
              </div>
            )}
            {stats.totalSends > 0 && (
              <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-xs uppercase tracking-wider text-zinc-400">
                  Ascents
                </p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums">
                  {stats.totalSends}{" "}
                  <span className="text-sm font-normal text-zinc-500">
                    {stats.totalSends === 1 ? "send" : "sends"}
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(
                    [
                      "onsight",
                      "flash",
                      "redpoint",
                      "toprope",
                      "attempt",
                    ] as TickType[]
                  ).map((t) =>
                    stats.counts[t] ? (
                      <span
                        key={t}
                        className={`rounded px-2 py-0.5 text-xs font-medium ${tickBadge[t]}`}
                      >
                        {tickLabel[t]} {stats.counts[t]}
                      </span>
                    ) : null,
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {route.description && (
        <p className="mt-6 max-w-2xl leading-relaxed text-zinc-600 dark:text-zinc-400">
          {route.description}
        </p>
      )}

      <ImageGallery
        images={images}
        currentUserId={currentUser?.id ?? null}
        isAdmin={currentUser?.role === "admin"}
        entityType="route"
        entityId={routeIdNum}
        canUpload={!!currentUser}
      />

      {/* Log ascent */}
      <section className="mt-10 pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Log ascent
        </h2>
        {currentUser ? (
          <ApiForm
            endpoint="/api/ascents"
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="route_id" value={route.id} />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Style</span>
              <Select
                name="tick_type"
                defaultValue="redpoint"
                className="w-auto"
              >
                <option value="onsight">Onsight</option>
                <option value="flash">Flash</option>
                <option value="redpoint">Redpoint</option>
                <option value="toprope">Toprope</option>
                <option value="attempt">Attempt</option>
              </Select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Date</span>
              <input
                type="date"
                name="ascent_date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Log
            </button>
          </ApiForm>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            <Link
              href="/login"
              className="font-medium text-zinc-900 underline underline-offset-2 transition hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
            >
              Log in
            </Link>{" "}
            to log your ascents.
          </p>
        )}
      </section>

      {/* My ascents */}
      {myAscents.length > 0 && (
        <section className="mt-10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Your ascents
          </h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {myAscents.map((ascent) => (
              <li
                key={ascent.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${tickBadge[ascent.tick_type]}`}
                >
                  {tickLabel[ascent.tick_type]}
                </span>
                <span className="text-sm text-zinc-500">
                  {new Date(ascent.ascent_date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {ascent.notes && (
                  <span className="text-sm text-zinc-500">
                    — {ascent.notes}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Community ascents */}
      {communityAscents.length > 0 && (
        <section className="mt-10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Community ascents{" "}
            <span className="ml-1 font-normal normal-case tracking-normal text-zinc-400">
              ({communityAscents.length})
            </span>
          </h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {communityAscents.map((ascent) => (
              <li
                key={ascent.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span className="text-sm font-medium">{ascent.author}</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${tickBadge[ascent.tick_type]}`}
                >
                  {tickLabel[ascent.tick_type]}
                </span>
                <span className="ml-auto text-sm text-zinc-500">
                  {new Date(ascent.ascent_date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {allAscents.length === 0 && (
        <p className="mt-10 text-sm text-zinc-500">
          No ascents logged yet — be the first.
        </p>
      )}

      <EntityReviews
        entityType="route"
        entityId={routeIdNum}
        currentUserId={currentUser?.id ?? null}
        isAdmin={currentUser?.role === "admin"}
      />
    </main>
  );
}

export function RouteDetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <Skeleton className="h-4 w-64" />
      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-10 w-56" />
          <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-16" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Skeleton variant="card" className="h-28" />
        <Skeleton variant="card" className="h-28" />
      </div>
      <div className="mt-10 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-12" />
        ))}
      </div>
    </main>
  );
}
