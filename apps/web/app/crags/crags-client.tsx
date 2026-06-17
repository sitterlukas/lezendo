"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { cragsListQuery } from "@whipperbook/api-client";
import { type CragsListData } from "@whipperbook/db";
import ActionButton from "@/app/ui/action-button";
import FilterPill from "@/app/ui/filter-pill";
import { CreateCragModal } from "@/app/ui/create-modals";
import LoginToAdd from "@/app/ui/login-to-add";
import { Skeleton } from "@/app/ui/skeleton";

export type CragsResponse = CragsListData & {
  viewer: { id: number; role: string } | null;
};

type CragsClientProps = {
  q?: string;
  country?: string;
  page?: number;
};

export default function CragsClient({ q, country, page }: CragsClientProps) {
  const { data, isPending, error } = useQuery(
    cragsListQuery<CragsResponse>(browserApi, { q, country, page }),
  );

  if (isPending) return <CragsListSkeleton />;

  if (error) {
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

  const {
    viewer: currentUser,
    crags,
    usedCountries,
    allCountries,
    paginated,
    totalCount,
    totalPages,
    deleted: deletedCrags,
  } = data;

  const qVal = q?.trim() || "";
  const countryFilter = country?.trim() || "";
  const pageNum = Math.max(1, page || 1);

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
    if (qVal) sp.set("q", qVal);
    if (countryFilter) sp.set("country", countryFilter);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/crags${qs ? `?${qs}` : ""}`;
  }

  function countryUrl(c: string) {
    const sp = new URLSearchParams();
    if (qVal) sp.set("q", qVal);
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
              {qVal && <> matching &ldquo;{qVal}&rdquo;</>}
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
              defaultValue={qVal}
              placeholder="Search crags…"
              className="w-56 rounded border border-zinc-300 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          {(qVal || countryFilter) && (
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
            <LoginToAdd to="to add a crag" />
          )}
        </div>
      </div>

      {/* Country filter tabs */}
      {usedCountries.length > 0 && (
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          <FilterPill
            href={qVal ? `/crags?q=${encodeURIComponent(qVal)}` : "/crags"}
            active={!countryFilter}
          >
            All
          </FilterPill>
          {usedCountries.map((c) => (
            <FilterPill
              key={c}
              href={countryUrl(c)}
              active={countryFilter === c}
            >
              {c}
            </FilterPill>
          ))}
        </nav>
      )}

      {crags.length === 0 && (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No crags found.</p>
          <p className="mt-1 text-sm text-zinc-500">
            {qVal ? (
              <>
                Nothing matches &ldquo;{qVal}&rdquo; — try a different search or
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
                Page {pageNum} of {totalPages}
              </span>
              <div className="flex gap-2">
                {pageNum > 1 && (
                  <Link
                    href={pageUrl(pageNum - 1)}
                    className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Previous
                  </Link>
                )}
                {pageNum < totalPages && (
                  <Link
                    href={pageUrl(pageNum + 1)}
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
                    {crag.deletedAt && (
                      <span className="ml-3 text-xs text-zinc-400">
                        · Deleted by {crag.deletedBy} on{" "}
                        {new Date(crag.deletedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <ActionButton
                    endpoint={`/api/crags/${crag.id}/recover`}
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

export function CragsListSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <header>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-3 h-4 w-56" />
      </header>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-28" />
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <Skeleton variant="card" className="h-32" />
          </li>
        ))}
      </ul>
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
