import type { Metadata } from "next";
import Link from "next/link";
import { serverFetch } from "@/lib/api/server-fetch";
import { type LeaderboardData } from "@/lib/queries/leaderboards";
import {
  periods,
  periodLabel,
  parsePeriod,
  parseDiscipline,
} from "@/lib/leaderboard";
import { POINTS_EXPLAINER } from "@/lib/points";
import DisciplineSelect from "@/app/ui/discipline-select";
import FilterPill from "@/app/ui/filter-pill";
import RankCrown from "@/app/ui/rank-crown";
import Avatar from "@/app/ui/avatar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboards",
  description:
    "See the top climbers by points across sport, bouldering and combined disciplines on Whipperbook.",
  alternates: { canonical: "/leaderboards" },
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; discipline?: string }>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const discipline = parseDiscipline(params.discipline);

  const reqParams = new URLSearchParams({ period, discipline });
  const { viewerId, rows, myRow } = await serverFetch<LeaderboardData>(
    `/api/leaderboards?${reqParams.toString()}`,
  );

  // Preserve the discipline when switching period.
  const periodHref = (p: string) =>
    `/leaderboards?period=${p}&discipline=${discipline}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight">Leaderboards</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
        {POINTS_EXPLAINER}
      </p>

      {/* Period tabs (left) + discipline dropdown (right) */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <FilterPill key={p} href={periodHref(p)} active={period === p}>
              {periodLabel[p]}
            </FilterPill>
          ))}
        </nav>
        <DisciplineSelect
          value={discipline}
          period={period}
          basePath="/leaderboards"
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">
            No sends logged{" "}
            {period === "all" ? "yet" : `${periodLabel[period].toLowerCase()}`}.
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            <Link href="/crags" className="underline underline-offset-2">
              Head to the crags
            </Link>{" "}
            and log your first send.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
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
                {rows.map((row, index) => {
                  const isMe = viewerId === row.user_id;
                  const isFirst = index === 0;
                  return (
                    <tr
                      key={row.user_id}
                      className={isMe ? "bg-zinc-50 dark:bg-zinc-900/40" : ""}
                    >
                      <td className="px-4 py-3 tabular-nums">
                        <span
                          className={
                            isFirst
                              ? "text-base font-bold text-zinc-900 dark:text-zinc-100"
                              : "text-zinc-400"
                          }
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <span className="flex items-center gap-1.5">
                          <RankCrown rank={index + 1} />
                          <Avatar
                            name={row.name}
                            src={row.avatar_url}
                            size={28}
                          />
                          <Link
                            href={`/users/${row.user_id}`}
                            className="hover:underline"
                          >
                            {row.name}
                          </Link>
                          {isMe && (
                            <span className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                              You
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {row.points.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Show the current user's rank if they're outside the top 25 */}
          {myRow && (
            <div className="mt-4 flex items-center justify-between rounded border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <span className="text-zinc-500">Your rank</span>
              <div className="flex items-center gap-4">
                <span className="tabular-nums text-zinc-400">
                  #{myRow.rank}
                </span>
                <span className="font-semibold tabular-nums">
                  {myRow.total.toLocaleString()} pts
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
