import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import db, { type TickType } from "@/lib/db";
import { logAscent, updateRoute, deleteRoute } from "@/app/actions";
import Modal from "@/app/ui/modal";
import ConfirmSubmit from "@/app/ui/confirm-submit";
import ImageGallery from "@/app/ui/image-gallery";
import EntityReviews from "@/app/ui/entity-reviews";
import Select from "@/app/ui/select";
import { resolveGrade } from "@/lib/grade-conversion";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import GradeSelect from "@/app/ui/grade-select";
import { typeLabel, typeBadge } from "@/app/ui/style";

export const dynamic = "force-dynamic";

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

export default async function RoutePage({
  params,
}: {
  params: Promise<{ cragId: string; routeId: string }>;
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

  const { cragId, routeId } = await params;
  const cragIdNum = Number(cragId);
  const routeIdNum = Number(routeId);
  if (!Number.isInteger(cragIdNum) || !Number.isInteger(routeIdNum)) notFound();

  const [crag, route, sectors, gradingSystems, gradeEquivalencies] =
    await Promise.all([
      db
        .selectFrom("crags")
        .selectAll()
        .where("id", "=", cragIdNum)
        .where("deleted", "=", false)
        .executeTakeFirst(),
      db
        .selectFrom("routes")
        .selectAll()
        .where("id", "=", routeIdNum)
        .where("crag_id", "=", cragIdNum)
        .where("deleted", "=", false)
        .executeTakeFirst(),
      db
        .selectFrom("sectors")
        .select(["id", "name"])
        .where("crag_id", "=", cragIdNum)
        .where("deleted", "=", false)
        .orderBy("name")
        .execute(),
      db
        .selectFrom("grading_systems")
        .select(["id", "name", "slug"])
        .orderBy("id")
        .execute(),
      loadGradeEquivalencies(),
    ]);
  if (!crag || !route) notFound();

  const sector = route.sector_id
    ? await db
        .selectFrom("sectors")
        .select(["id", "name"])
        .where("id", "=", route.sector_id)
        .executeTakeFirst()
    : null;

  const images = await db
    .selectFrom("images")
    .select(["id", "url", "uploaded_by"])
    .where("entity_type", "=", "route")
    .where("entity_id", "=", routeIdNum)
    .orderBy("created_at")
    .execute();

  const allAscents = await db
    .selectFrom("ascents")
    .innerJoin("users", "users.id", "ascents.user_id")
    .select([
      "ascents.id",
      "ascents.user_id",
      "ascents.tick_type",
      "ascents.ascent_date",
      "ascents.notes",
      "users.name as author",
    ])
    .where("ascents.route_id", "=", routeIdNum)
    .orderBy("ascents.ascent_date", "desc")
    .orderBy("ascents.created_at", "desc")
    .execute();

  const myAscents = currentUser
    ? allAscents.filter((a) => a.user_id === currentUser.id)
    : [];
  const communityAscents = allAscents.filter(
    (a) => !currentUser || a.user_id !== currentUser.id,
  );

  function canEdit(createdBy: number | null) {
    if (!currentUser) return false;
    return currentUser.role === "admin" || currentUser.id === createdBy;
  }

  const { grade: displayGrade, systemName: displaySystemName } = resolveGrade(
    route.grade,
    route.grading_system_id,
    gradingSystems,
    {
      rope: currentUser?.preferred_rope_grading_system_id,
      boulder: currentUser?.preferred_boulder_grading_system_id,
    },
    gradeEquivalencies,
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
              <span className="text-sm text-zinc-500">{route.height_m} m</span>
            )}
            <span className="text-sm text-zinc-500">
              {[crag.area, crag.country].filter(Boolean).join(", ")}
            </span>
          </div>
          {route.description && (
            <p className="mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
              {route.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <span className="rounded bg-zinc-900 px-3 py-1 text-center font-mono text-lg font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {displayGrade}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit(route.created_by) && (
              <>
                <form action={deleteRoute}>
                  <input type="hidden" name="route_id" value={route.id} />
                  <input type="hidden" name="crag_id" value={cragIdNum} />
                  <ConfirmSubmit
                    title={`Delete ${route.name}?`}
                    message="This will permanently delete the route and all logged ascents for it."
                    confirmLabel="Delete route"
                    triggerAriaLabel="Delete route"
                    triggerClassName="inline-flex items-center gap-1 rounded border border-red-200 bg-transparent px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    Delete route
                  </ConfirmSubmit>
                </form>
                <Modal
                  triggerLabel="Edit route"
                  variant="ghost"
                  title={`Edit ${route.name}`}
                >
                  <form
                    action={updateRoute}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <input type="hidden" name="route_id" value={route.id} />
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
                        Height (m)
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
                  </form>
                </Modal>
              </>
            )}
          </div>
        </div>
      </div>

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
          <form
            action={logAscent}
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
          </form>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            <Link
              href="/login"
              className="font-medium text-zinc-900 underline underline-offset-2 transition hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
            >
              Sign in
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
                  {ascent.ascent_date.toLocaleDateString("en-GB", {
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
                  {ascent.ascent_date.toLocaleDateString("en-GB", {
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
