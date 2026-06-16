import Link from "next/link";
import { auth } from "@/auth";
import db from "@/lib/db";
import { sql } from "kysely";
import { recoverCrag } from "@/app/actions";
import FilterPill from "@/app/ui/filter-pill";
import { CreateCragModal } from "@/app/ui/create-modals";
import LoginToAdd from "@/app/ui/login-to-add";

const PAGE_SIZE = 24;

export const dynamic = "force-dynamic";

export default async function CragsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; page?: string }>;
}) {
  const session = await auth();
  const currentUser = session?.user?.email
    ? ((await db
        .selectFrom("users")
        .select(["id", "role"])
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()) ?? null)
    : null;

  const params = await searchParams;
  const q = params.q?.trim() || "";
  const countryFilter = params.country?.trim() || "";
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const searchPattern = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : null;

  // Countries that actually have crags (for filter tabs)
  const usedCountryRows = await db
    .selectFrom("crags")
    .select("country")
    .distinct()
    .where("country", "is not", null)
    .where("deleted", "=", false)
    .orderBy("country")
    .execute();
  const usedCountries = usedCountryRows.map((r) => r.country as string);

  // All countries for "Add crag" autocomplete
  const allCountryRows = await db
    .selectFrom("countries")
    .select("name")
    .orderBy("name")
    .execute();
  const allCountries = allCountryRows.map((r) => r.name);

  // Base query
  let baseQuery = db
    .selectFrom("crags")
    .leftJoin("routes", (join) =>
      join
        .onRef("routes.crag_id", "=", "crags.id")
        .on("routes.deleted", "=", false),
    )
    .select((eb) => [
      "crags.id",
      "crags.name",
      "crags.area",
      "crags.country",
      "crags.description",
      eb.fn.count<number>("routes.id").as("routeCount"),
    ])
    .groupBy("crags.id")
    .where("crags.deleted", "=", false)
    .orderBy(sql`crags.country NULLS LAST`)
    .orderBy("crags.name");

  if (searchPattern) {
    baseQuery = baseQuery.where((eb) =>
      eb.or([
        eb("crags.name", "ilike", searchPattern),
        eb("crags.area", "ilike", searchPattern),
        eb("crags.country", "ilike", searchPattern),
        eb("crags.description", "ilike", searchPattern),
      ]),
    );
  }
  if (countryFilter) {
    baseQuery = baseQuery.where("crags.country", "=", countryFilter);
  }

  // Paginate when searching or filtering; grouped view fetches all
  const paginated = searchPattern || countryFilter;
  const crags = paginated
    ? await baseQuery.offset(offset).limit(PAGE_SIZE).execute()
    : await baseQuery.execute();

  // Count for pagination
  let totalCount = 0;
  let totalPages = 0;
  if (paginated) {
    let countQuery = db
      .selectFrom("crags")
      .select((eb) => eb.fn.countAll<number>().as("total"));
    if (searchPattern) {
      countQuery = countQuery.where((eb) =>
        eb.or([
          eb("name", "ilike", searchPattern),
          eb("area", "ilike", searchPattern),
          eb("country", "ilike", searchPattern),
          eb("description", "ilike", searchPattern),
        ]),
      );
    }
    if (countryFilter) {
      countQuery = countQuery.where("country", "=", countryFilter);
    }
    countQuery = countQuery.where("deleted", "=", false);
    const { total } = await countQuery.executeTakeFirstOrThrow();
    totalCount = Number(total);
    totalPages = Math.ceil(totalCount / PAGE_SIZE);
  }

  // Deleted crags for trash section
  const deletedCrags = await db
    .selectFrom("crags")
    .select(["id", "name", "area", "country"])
    .where("deleted", "=", true)
    .orderBy("name")
    .execute();

  const deletedCragLog = await (async () => {
    if (deletedCrags.length === 0)
      return new Map<number, { at: Date; by: string }>();
    const entries = await db
      .selectFrom("deletion_log")
      .innerJoin("users", "users.id", "deletion_log.user_id")
      .select([
        "deletion_log.entity_id",
        "deletion_log.created_at",
        "users.name as by",
      ])
      .where("deletion_log.entity_type", "=", "crag")
      .where("deletion_log.action", "=", "delete")
      .orderBy("deletion_log.created_at", "desc")
      .execute();
    const map = new Map<number, { at: Date; by: string }>();
    for (const e of entries) {
      if (!map.has(e.entity_id))
        map.set(e.entity_id, { at: e.created_at as Date, by: e.by as string });
    }
    return map;
  })();

  // Group crags by country for the default view
  const groups = crags.reduce<
    { country: string | null; items: typeof crags }[]
  >((acc, crag) => {
    const last = acc[acc.length - 1];
    if (last && last.country === crag.country) {
      last.items.push(crag);
    } else {
      acc.push({ country: crag.country, items: [crag] });
    }
    return acc;
  }, []);

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (countryFilter) sp.set("country", countryFilter);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/crags${qs ? `?${qs}` : ""}`;
  }

  function countryUrl(c: string) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    sp.set("country", c);
    return `/crags?${sp.toString()}`;
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Crags</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {paginated ? (
            <>
              {totalCount} {totalCount === 1 ? "crag" : "crags"}
              {q && <> matching &ldquo;{q}&rdquo;</>}
              {countryFilter && <> in {countryFilter}</>}
            </>
          ) : (
            <>
              {crags.length} {crags.length === 1 ? "crag" : "crags"} across{" "}
              {groups.filter((g) => g.country).length}{" "}
              {groups.filter((g) => g.country).length === 1
                ? "country"
                : "countries"}
            </>
          )}
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <form action="/crags" className="flex items-center gap-2">
          {countryFilter && (
            <input type="hidden" name="country" value={countryFilter} />
          )}
          <div className="relative">
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            >
              <circle
                cx="9"
                cy="9"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="m13.5 13.5 4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search crags…"
              className="w-56 rounded border border-zinc-300 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          {(q || countryFilter) && (
            <Link
              href="/crags"
              className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Clear
            </Link>
          )}
        </form>

        <div>
          {currentUser ? (
            <CreateCragModal allCountries={allCountries} />
          ) : (
            <LoginToAdd label="Log in to add a crag" />
          )}
        </div>
      </div>

      {/* Country filter tabs */}
      {usedCountries.length > 0 && (
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          <FilterPill
            href={q ? `/crags?q=${encodeURIComponent(q)}` : "/crags"}
            active={!countryFilter}
          >
            All
          </FilterPill>
          {usedCountries.map((country) => (
            <FilterPill
              key={country}
              href={countryUrl(country)}
              active={countryFilter === country}
            >
              {country}
            </FilterPill>
          ))}
        </nav>
      )}

      {crags.length === 0 && (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No crags found.</p>
          <p className="mt-1 text-sm text-zinc-500">
            {q ? (
              <>
                Nothing matches &ldquo;{q}&rdquo; — try a different search or
                add the crag.
              </>
            ) : countryFilter ? (
              <>No crags in {countryFilter} yet — add one.</>
            ) : (
              "Add your first crag."
            )}
          </p>
        </div>
      )}

      {/* Filtered/search results: flat paginated grid */}
      {paginated && crags.length > 0 && (
        <>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {crags.map((crag) => (
              <CragCard key={crag.id} crag={crag} />
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-between pt-6">
              <span className="text-sm text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={pageUrl(page - 1)}
                    className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={pageUrl(page + 1)}
                    className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Default view: grouped by country */}
      {!paginated && crags.length > 0 && (
        <div className="mt-12 space-y-12">
          {groups.map((group) => (
            <section key={group.country ?? "__none__"}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {group.country ?? "No country"}
              </h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((crag) => (
                  <CragCard key={crag.id} crag={crag} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {currentUser?.role === "admin" && deletedCrags.length > 0 && (
        <section className="mt-16 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Deleted crags
          </h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {deletedCrags.map((crag) => {
              const log = deletedCragLog.get(crag.id);
              return (
                <li
                  key={crag.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-zinc-500">
                      {crag.name}
                    </span>
                    {(crag.area || crag.country) && (
                      <span className="ml-2 text-xs text-zinc-400">
                        {[crag.area, crag.country].filter(Boolean).join(", ")}
                      </span>
                    )}
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
                  <form action={recoverCrag}>
                    <input type="hidden" name="crag_id" value={crag.id} />
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

type CragCardProps = {
  crag: {
    id: number;
    name: string;
    area: string | null;
    country: string | null;
    description: string | null;
    routeCount: number;
  };
};

function CragCard({ crag }: CragCardProps) {
  return (
    <li>
      <Link
        href={`/crags/${crag.id}`}
        className="flex h-full flex-col rounded border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-snug">{crag.name}</h3>
          <span className="shrink-0 rounded bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {Number(crag.routeCount)}{" "}
            {Number(crag.routeCount) === 1 ? "route" : "routes"}
          </span>
        </div>
        {crag.area && <p className="mt-1 text-sm text-zinc-500">{crag.area}</p>}
        {crag.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {crag.description}
          </p>
        )}
      </Link>
    </li>
  );
}
