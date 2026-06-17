import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import db from "@/lib/db";
import { serverFetch, ServerFetchError } from "@/lib/api/server-fetch";
import { type SectorDetailData } from "@/lib/queries/sectors";
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

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cragId: string; sectorId: string }>;
}): Promise<Metadata> {
  const { cragId, sectorId } = await params;
  const c = Number(cragId);
  const s = Number(sectorId);
  if (!Number.isInteger(c) || !Number.isInteger(s)) return {};
  const sector = await db
    .selectFrom("sectors")
    .innerJoin("crags", "crags.id", "sectors.crag_id")
    .select([
      "sectors.name as name",
      "sectors.description as description",
      "crags.name as cragName",
    ])
    .where("sectors.id", "=", s)
    .where("sectors.crag_id", "=", c)
    .where("sectors.deleted", "=", false)
    .executeTakeFirst();
  if (!sector) return {};
  const title = `${sector.name} · ${sector.cragName}`;
  const description =
    sector.description ??
    `Routes and topos at ${sector.name}, ${sector.cragName}, on Whipperbook.`;
  const url = `/crags/${c}/sectors/${s}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function SectorPage({
  params,
}: {
  params: Promise<{ cragId: string; sectorId: string }>;
}) {
  const { cragId, sectorId } = await params;
  const cragIdNum = Number(cragId);
  const sectorIdNum = Number(sectorId);
  if (!Number.isInteger(cragIdNum) || !Number.isInteger(sectorIdNum))
    notFound();

  let data: SectorDetailData;
  try {
    data = await serverFetch<SectorDetailData>(
      `/api/sectors/${sectorIdNum}?cragId=${cragIdNum}`,
    );
  } catch (err) {
    if (err instanceof ServerFetchError && err.status === 404) notFound();
    throw err;
  }

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
