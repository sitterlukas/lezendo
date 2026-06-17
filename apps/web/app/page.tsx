import Image from "next/image";
import Link from "next/link";
import { serverFetch } from "@/lib/api/server-fetch";
import { type HomeData } from "@/lib/queries/home";
import { typeLabel, typeBadge } from "@/app/ui/style";
import {
  periods,
  periodLabel,
  parsePeriod,
  parseDiscipline,
} from "@whipperbook/core";
import { POINTS_EXPLAINER } from "@whipperbook/core";
import DisciplineSelect from "@/app/ui/discipline-select";
import FilterPill from "@/app/ui/filter-pill";
import RankCrown from "@/app/ui/rank-crown";
import Avatar from "@/app/ui/avatar";

export const dynamic = "force-dynamic";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; discipline?: string }>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const discipline = parseDiscipline(params.discipline);

  const reqParams = new URLSearchParams({ period, discipline });
  const {
    isAuthed: currentUser,
    routeCount,
    cragCount,
    ascentCount,
    recentRoutes: resolvedRecentRoutes,
    topClimbers,
  } = await serverFetch<HomeData>(`/api/home?${reqParams.toString()}`);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Image
          src="/jerry-zhang-hkhCV41gOpA-unsplash.jpg"
          alt="Rock climber on a wall"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative mx-auto max-w-5xl px-6 pb-44 pt-24 sm:pb-60 sm:pt-32">
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">
            Route database &amp; logbook
          </p>
          <h1 className="mt-4 max-w-2xl text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Every route.
            <br />
            Every ascent.
          </h1>
          <p className="mt-6 max-w-md text-base text-white/60">
            A route database and personal logbook for climbers — built to grow
            with every session at the crag.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/crags"
              className="rounded bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
            >
              Explore crags
            </Link>
            <Link
              href="/crags"
              className="rounded border border-white/30 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/60 hover:text-white"
            >
              Add a route
            </Link>
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="bg-zinc-50 dark:bg-zinc-900/50">
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-zinc-200 px-6 py-8 text-center dark:divide-zinc-800">
          <div>
            <div className="text-3xl font-bold">{routeCount}</div>
            <div className="mt-1 text-sm text-zinc-500">routes</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{cragCount}</div>
            <div className="mt-1 text-sm text-zinc-500">crags</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{ascentCount}</div>
            <div className="mt-1 text-sm text-zinc-500">ascents logged</div>
          </div>
        </div>
      </section>

      {/* Feed call-to-action */}
      <section className="mx-auto max-w-5xl px-6 pt-16">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900/50 dark:bg-blue-950/30">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
              Your feed
            </h2>
            <p className="mt-1 max-w-md text-sm text-blue-800/70 dark:text-blue-200/70">
              {currentUser
                ? "See what the climbers you follow are up to, and share your own ascents, statuses, and photos."
                : "Follow climbers to see their ascents, statuses, and photos — and share your own. Log in to get started."}
            </p>
          </div>
          <Link
            href={currentUser ? "/feed" : "/login"}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            {currentUser ? "Open feed →" : "Log in to start →"}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
                  />
                </svg>
              ),
              title: "Explore crags",
              description:
                "Browse a growing database of crags and routes — from local boulders to alpine walls — with grades, styles, and beta.",
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              ),
              title: "Log your ascents",
              description:
                "Keep a tick list of everything you climb. Onsights, flashes, redpoints — your whole climbing history in one place.",
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                  />
                </svg>
              ),
              title: "Track your progress",
              description:
                "See your grade pyramid grow over time and find out what to try next to push your limit.",
            },
          ].map((feature) => (
            <div key={feature.title}>
              <div className="text-zinc-500 dark:text-zinc-400">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Explore routes */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Latest routes</h2>
          <Link
            href="/crags"
            className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            All crags →
          </Link>
        </div>
        {resolvedRecentRoutes.length === 0 ? (
          <div className="mt-8 border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No routes yet.{" "}
            <Link href="/crags" className="underline underline-offset-2">
              Add the first crag
            </Link>
            .
          </div>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resolvedRecentRoutes.map((route) => (
              <li key={route.id}>
                <Link
                  href={`/crags/${route.crag_id}/routes/${route.id}`}
                  className="flex h-full flex-col rounded border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold leading-snug">
                      {route.name}
                    </span>
                    <span className="shrink-0 rounded bg-zinc-900 px-2 py-0.5 text-center font-mono text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                      {route.grade}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[route.style]}`}
                    >
                      {typeLabel[route.style]}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {route.crag_name}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Leaderboard */}
      <section id="leaderboard" className="mx-auto max-w-5xl px-6 pb-20">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Leaderboard</h2>
          <Link
            href={`/leaderboards?period=${period}&discipline=${discipline}`}
            className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Full leaderboard →
          </Link>
        </div>

        {/* Period filter (left) + discipline dropdown (right) */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2">
            {periods.map((p) => (
              <FilterPill
                key={p}
                href={`/?period=${p}&discipline=${discipline}#leaderboard`}
                active={period === p}
                scroll={false}
              >
                {periodLabel[p]}
              </FilterPill>
            ))}
          </nav>
          <DisciplineSelect
            value={discipline}
            period={period}
            basePath="/"
            hash="#leaderboard"
            scroll={false}
          />
        </div>

        {topClimbers.length === 0 ? (
          <div className="mt-6 border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No sends logged {periodLabel[period].toLowerCase()}.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Climber
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {topClimbers.map((row, index) => (
                  <tr key={row.user_id}>
                    <td className="px-4 py-3 tabular-nums">
                      <span
                        className={
                          index === 0 ? "text-base font-bold" : "text-zinc-400"
                        }
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-2">
                        <RankCrown rank={index + 1} />
                        <Link
                          href={`/users/${row.user_id}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Avatar
                            name={row.name}
                            src={row.avatar_url}
                            size={28}
                          />
                          {row.name}
                        </Link>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {row.points.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-zinc-500">
          {POINTS_EXPLAINER}
        </p>
      </section>

      {/* Discover */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="border border-zinc-200 bg-zinc-50 px-8 py-14 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-bold tracking-tight">
            Discover crags &amp; routes
          </h2>
          <p className="mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            Browse the full database — find crags by country, filter by style,
            and explore routes with grades and beta from the community.
          </p>
          <Link
            href="/crags"
            className="mt-8 inline-block rounded bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Browse crags
          </Link>
        </div>
      </section>
    </main>
  );
}
