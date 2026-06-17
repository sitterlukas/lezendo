"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { sectorDetailQuery } from "@whipperbook/api-client";
import { type SectorDetailData as SectorDetailDataType } from "@whipperbook/db";
import Modal from "@/app/ui/modal";
import ApiForm from "@/app/ui/api-form";
import DeleteButton from "@/app/ui/delete-button";
import ImageGallery from "@/app/ui/image-gallery";
import SectorMapQR from "@/app/ui/sector-map-qr";
import EntityReviews from "@/app/ui/entity-reviews";
import RouteCard from "@/app/ui/route-card";
import GradeHistogram from "@/app/ui/grade-histogram";
import SectorFields from "@/app/ui/sector-fields";
import { CreateRouteModal } from "@/app/ui/create-modals";
import LoginToAdd from "@/app/ui/login-to-add";
import FactList from "@/app/ui/fact-list";
import { gradeBuckets, gradeRange, stylesPresent } from "@whipperbook/core";
import { typeLabel, typeBadge } from "@/app/ui/style";

export type SectorDetailData = SectorDetailDataType;

export default function SectorDetailClient({
  cragId,
  sectorId,
}: {
  cragId: number;
  sectorId: number;
}) {
  const { data, isPending, isError, error } = useQuery(
    sectorDetailQuery<SectorDetailData>(browserApi, cragId, sectorId),
  );

  if (isPending) return <SectorDetailSkeleton />;

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
  const sectorIdNum = sectorId;
  const {
    crag,
    sector,
    viewer: currentUser,
    images,
    gradingSystems,
    gradeEquivalencies,
    routes: resolvedRoutes,
  } = data;
  const tickedRouteIds = new Set(data.tickedRouteIds);

  function canEdit(createdBy: number | null) {
    if (!currentUser) return false;
    return currentUser.role === "admin" || currentUser.id === createdBy;
  }

  const buckets = gradeBuckets(resolvedRoutes, gradeEquivalencies);
  const range = gradeRange(resolvedRoutes, gradeEquivalencies);
  const styles = stylesPresent(resolvedRoutes);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canEdit(sector.created_by) && (
            <Modal
              triggerLabel="Edit sector"
              variant="ghost"
              title={`Edit sector: ${sector.name}`}
            >
              <ApiForm
                endpoint={`/api/sectors/${sector.id}`}
                method="PATCH"
                className="grid gap-4"
              >
                <SectorFields
                  defaults={{
                    name: sector.name,
                    description: sector.description,
                    approach_minutes: sector.approach_minutes,
                    aspect: sector.aspect,
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

          {currentUser ? (
            <CreateRouteModal
              cragId={crag.id}
              fixedSectorId={sector.id}
              gradingSystems={gradingSystems}
              equivalencies={gradeEquivalencies}
              defaultSystemId={
                currentUser?.preferred_rope_grading_system_id ??
                currentUser?.preferred_boulder_grading_system_id
              }
            />
          ) : (
            <LoginToAdd to="to add a route" />
          )}

          {canEdit(sector.created_by) && (
            <DeleteButton
              endpoint={`/api/sectors/${sector.id}`}
              title={`Delete ${sector.name}?`}
              message={`This will permanently delete the sector "${sector.name}". Routes inside it will remain but become unsectored.`}
              confirmLabel="Delete sector"
              ariaLabel="Delete sector"
            />
          )}
        </div>
      </header>

      {/* Quick facts */}
      <FactList
        className="mt-6"
        variant="inline"
        items={[
          { label: "Routes", value: resolvedRoutes.length || null },
          {
            label: "Grades",
            value: range
              ? range.minGrade === range.maxGrade
                ? range.minGrade
                : `${range.minGrade}–${range.maxGrade}`
              : null,
          },
          {
            label: "Styles",
            value: styles.length ? (
              <span className="flex flex-wrap gap-1">
                {styles.map((s) => (
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
          { label: "Aspect", value: sector.aspect },
          {
            label: "Approach",
            value:
              sector.approach_minutes !== null
                ? `${sector.approach_minutes} min`
                : null,
          },
        ]}
      />

      <ImageGallery
        images={images}
        currentUserId={currentUser?.id ?? null}
        isAdmin={currentUser?.role === "admin"}
        entityType="sector"
        entityId={sectorIdNum}
        canUpload={!!currentUser}
      />

      {/* Grade distribution + location side by side, matched heights */}
      <div className="mt-8 grid items-stretch gap-6 md:grid-cols-2">
        {buckets.length > 0 && <GradeHistogram data={buckets} />}
        <SectorMapQR
          sectorId={sector.id}
          name={sector.name}
          canEdit={!!currentUser}
          latitude={sector.latitude}
          longitude={sector.longitude}
          parkingLatitude={sector.parking_latitude}
          parkingLongitude={sector.parking_longitude}
        />
      </div>

      <div className="mt-12 flex items-baseline gap-3">
        <h2 className="text-xl font-bold tracking-tight">Routes</h2>
        <span className="text-sm text-zinc-500">
          {resolvedRoutes.length}{" "}
          {resolvedRoutes.length === 1 ? "route" : "routes"}
        </span>
      </div>

      {resolvedRoutes.length === 0 ? (
        <div className="mt-6 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No routes in this sector yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add the first route to get started.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resolvedRoutes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              cragId={cragIdNum}
              ticked={tickedRouteIds.has(route.id)}
            />
          ))}
        </ul>
      )}

      <EntityReviews
        entityType="sector"
        entityId={sectorIdNum}
        currentUserId={currentUser?.id ?? null}
        isAdmin={currentUser?.role === "admin"}
      />
    </main>
  );
}

export function SectorDetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div className="h-4 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="h-10 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-2 h-4 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </header>
      <div className="mt-6 flex flex-wrap gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50" />
        <div className="h-48 animate-pulse rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50" />
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50"
          />
        ))}
      </div>
    </main>
  );
}
