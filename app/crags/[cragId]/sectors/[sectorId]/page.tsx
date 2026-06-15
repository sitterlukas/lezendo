import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import db from "@/lib/db";
import { addRoute, updateSector, deleteSector } from "@/app/actions";
import Modal from "@/app/ui/modal";
import ConfirmSubmit from "@/app/ui/confirm-submit";
import ImageGallery from "@/app/ui/image-gallery";
import SectorMapQR from "@/app/ui/sector-map-qr";
import EntityReviews from "@/app/ui/entity-reviews";
import RouteCard from "@/app/ui/route-card";
import GradeHistogram from "@/app/ui/grade-histogram";
import SectorFields from "@/app/ui/sector-fields";
import AddRouteForm from "@/app/ui/add-route-form";
import FactList from "@/app/ui/fact-list";
import { resolveGrade } from "@/lib/grade-conversion";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import { gradeBuckets, gradeRange, stylesPresent } from "@/lib/route-stats";
import { inputClass, typeLabel, typeBadge } from "@/app/ui/style";

export const dynamic = "force-dynamic";

export default async function SectorPage({
  params,
}: {
  params: Promise<{ cragId: string; sectorId: string }>;
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

  const { cragId, sectorId } = await params;
  const cragIdNum = Number(cragId);
  const sectorIdNum = Number(sectorId);
  if (!Number.isInteger(cragIdNum) || !Number.isInteger(sectorIdNum))
    notFound();

  const [gradingSystems, gradeEquivalencies] = await Promise.all([
    db
      .selectFrom("grading_systems")
      .select(["id", "name", "slug"])
      .orderBy("id")
      .execute(),
    loadGradeEquivalencies(),
  ]);

  const [crag, sector] = await Promise.all([
    db
      .selectFrom("crags")
      .selectAll()
      .where("id", "=", cragIdNum)
      .where("deleted", "=", false)
      .executeTakeFirst(),
    db
      .selectFrom("sectors")
      .selectAll()
      .where("id", "=", sectorIdNum)
      .where("crag_id", "=", cragIdNum)
      .where("deleted", "=", false)
      .executeTakeFirst(),
  ]);
  if (!crag || !sector) notFound();

  const images = await db
    .selectFrom("images")
    .select(["id", "url", "uploaded_by"])
    .where("entity_type", "=", "sector")
    .where("entity_id", "=", sectorIdNum)
    .orderBy("created_at")
    .execute();

  const routes = await db
    .selectFrom("routes")
    .select([
      "id",
      "name",
      "grade",
      "grading_system_id",
      "style",
      "height_m",
      "description",
    ])
    .where("crag_id", "=", cragIdNum)
    .where("sector_id", "=", sectorIdNum)
    .where("deleted", "=", false)
    .orderBy("name")
    .execute();

  const tickedRouteIds = new Set<number>();
  if (currentUser) {
    const ticked = await db
      .selectFrom("ascents")
      .select("route_id")
      .distinct()
      .where("user_id", "=", currentUser.id)
      .execute();
    for (const t of ticked) tickedRouteIds.add(t.route_id);
  }

  function canEdit(createdBy: number | null) {
    if (!currentUser) return false;
    return currentUser.role === "admin" || currentUser.id === createdBy;
  }

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
              <form action={updateSector} className="grid gap-4">
                <input type="hidden" name="sector_id" value={sector.id} />
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
              </form>
            </Modal>
          )}

          {currentUser && (
            <Modal
              triggerLabel="Add route"
              title={`Add a route in ${sector.name}`}
              subtitle={`Routes here will be assigned to the ${sector.name} sector.`}
            >
              <AddRouteForm
                action={addRoute}
                cragId={crag.id}
                fixedSectorId={sector.id}
                gradingSystems={gradingSystems}
                equivalencies={gradeEquivalencies}
                defaultSystemId={
                  currentUser?.preferred_rope_grading_system_id ??
                  currentUser?.preferred_boulder_grading_system_id
                }
                inputClass={inputClass}
              />
            </Modal>
          )}

          {canEdit(sector.created_by) && (
            <form action={deleteSector}>
              <input type="hidden" name="sector_id" value={sector.id} />
              <input type="hidden" name="crag_id" value={cragIdNum} />
              <ConfirmSubmit
                title={`Delete ${sector.name}?`}
                message={`This will permanently delete the sector "${sector.name}". Routes inside it will remain but become unsectored.`}
                confirmLabel="Delete sector"
                triggerAriaLabel="Delete sector"
                triggerClassName="inline-flex items-center gap-1 rounded border border-red-200 bg-transparent px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Delete
              </ConfirmSubmit>
            </form>
          )}
        </div>
      </header>

      {/* Quick facts */}
      <FactList
        className="mt-6"
        variant="inline"
        items={[
          { label: "Routes", value: routes.length || null },
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
          {routes.length} {routes.length === 1 ? "route" : "routes"}
        </span>
      </div>

      {routes.length === 0 ? (
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
