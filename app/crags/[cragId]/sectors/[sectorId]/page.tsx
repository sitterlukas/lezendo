import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import db from "@/lib/db";
import { addRoute, updateSector, deleteSector } from "@/app/actions";
import Modal from "@/app/ui/modal";
import ConfirmSubmit from "@/app/ui/confirm-submit";
import ImageGallery from "@/app/ui/image-gallery";
import ImageUpload from "@/app/ui/image-upload";
import Select from "@/app/ui/select";
import { resolveGrade } from "@/lib/grade-conversion";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import GradeSelect from "@/app/ui/grade-select";
import { typeLabel, typeBadge, inputClass } from "@/app/ui/style";

export const dynamic = "force-dynamic";

export default async function SectorPage({
  params,
}: {
  params: Promise<{ cragId: string; sectorId: string }>;
}) {
  const session = await auth();
  const currentUser = session?.user?.email
    ? await db
        .selectFrom("users")
        .select(["id", "role", "preferred_rope_grading_system_id", "preferred_boulder_grading_system_id"])
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst() ?? null
    : null;

  const { cragId, sectorId } = await params;
  const cragIdNum = Number(cragId);
  const sectorIdNum = Number(sectorId);
  if (!Number.isInteger(cragIdNum) || !Number.isInteger(sectorIdNum)) notFound();

  const [gradingSystems, gradeEquivalencies] = await Promise.all([
    db
      .selectFrom("grading_systems")
      .select(["id", "name", "slug"])
      .orderBy("id")
      .execute(),
    loadGradeEquivalencies(),
  ]);

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

  const images = await db
    .selectFrom("images")
    .select(["id", "url", "uploaded_by"])
    .where("entity_type", "=", "sector")
    .where("entity_id", "=", sectorIdNum)
    .orderBy("created_at")
    .execute();

  const routes = await db
    .selectFrom("routes")
    .select(["id", "name", "grade", "grading_system_id", "style", "height_m", "description"])
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
    ...resolveGrade(r.grade, r.grading_system_id, gradingSystems, {
      rope: currentUser?.preferred_rope_grading_system_id,
      boulder: currentUser?.preferred_boulder_grading_system_id,
    }, gradeEquivalencies),
  }));

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
          {currentUser && (
            <ImageUpload entityType="sector" entityId={sectorIdNum} />
          )}
          {canEdit(sector.created_by) && (
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
          )}

          {currentUser && (
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
                <GradeSelect
                  gradingSystems={gradingSystems}
                  equivalencies={gradeEquivalencies}
                  defaultSystemId={currentUser?.preferred_rope_grading_system_id ?? currentUser?.preferred_boulder_grading_system_id}
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
        </div>
      </header>

      <ImageGallery
        images={images}
        currentUserId={currentUser?.id ?? null}
        isAdmin={currentUser?.role === "admin"}
      />

      {routes.length === 0 ? (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No routes in this sector yet.</p>
          <p className="mt-1 text-sm text-zinc-500">Add the first route to get started.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resolvedRoutes.map((route) => (
            <li key={route.id}>
              <Link
                href={`/crags/${cragIdNum}/routes/${route.id}`}
                className="flex h-full flex-col rounded border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold leading-snug">{route.name}</span>
                  <span className="shrink-0 rounded bg-zinc-900 px-2 py-0.5 text-center font-mono text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {route.grade}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[route.style]}`}>
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

      {/* Danger zone — only for sector author or admin */}
      {canEdit(sector.created_by) && (
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
      )}
    </main>
  );
}
