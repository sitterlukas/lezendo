import { redirect } from "next/navigation";
import { auth } from "@/auth";
import db from "@/lib/db";
import ProfileTabs from "@/app/profile/tabs";
import { loadUserPoints, POINTS_EXPLAINER } from "@/lib/points";

export const dynamic = "force-dynamic";

// French/UIAA grades in ascending difficulty order
const gradeOrder = [
  "3",
  "3+",
  "4a",
  "4b",
  "4c",
  "5a",
  "5b",
  "5c",
  "6a",
  "6a+",
  "6b",
  "6b+",
  "6c",
  "6c+",
  "7a",
  "7a+",
  "7b",
  "7b+",
  "7c",
  "7c+",
  "8a",
  "8a+",
  "8b",
  "8b+",
  "8c",
  "8c+",
  "9a",
  "9a+",
  "9b",
  "9b+",
  "9c",
];

function gradeRank(grade: string): number {
  return gradeOrder.indexOf(grade.trim().toLowerCase());
}

function hardest(grades: string[]): string | null {
  if (grades.length === 0) return null;
  let best: string | null = null;
  let bestRank = -2;
  for (const g of grades) {
    const r = gradeRank(g);
    if (r > bestRank) {
      bestRank = r;
      best = g;
    }
  }
  // If no grade matched the list return the first one (unknown format)
  return best ?? grades[0];
}

const tickLabel = {
  onsight: "Onsight",
  flash: "Flash",
  redpoint: "Redpoint",
  toprope: "Toprope",
  attempt: "Attempt",
} as const;

const tickBadge = {
  onsight:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  flash: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  redpoint: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  toprope: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  attempt:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
} as const;

const styleLabel = {
  sport: "Sport",
  trad: "Trad",
  boulder: "Boulder",
} as const;
const styleBadge = {
  sport: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  trad: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  boulder:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
} as const;

export default async function StatisticsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");

  const user = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();
  if (!user) redirect("/login");

  const [tickRows, styleRows, gradeRows, uniqueRoutes, uniqueCrags, points] =
    await Promise.all([
      // Ascents grouped by tick type
      db
        .selectFrom("ascents")
        .select((eb) => ["tick_type", eb.fn.count<number>("id").as("count")])
        .where("user_id", "=", user.id)
        .groupBy("tick_type")
        .execute(),

      // Sends (non-attempt) grouped by route style
      db
        .selectFrom("ascents")
        .innerJoin("routes", "routes.id", "ascents.route_id")
        .select((eb) => [
          "routes.style",
          eb.fn.count<number>("ascents.id").as("count"),
        ])
        .where("ascents.user_id", "=", user.id)
        .where("ascents.tick_type", "!=", "attempt")
        .groupBy("routes.style")
        .execute(),

      // Sends grouped by grade
      db
        .selectFrom("ascents")
        .innerJoin("routes", "routes.id", "ascents.route_id")
        .select((eb) => [
          "routes.grade",
          eb.fn.count<number>("ascents.id").as("count"),
        ])
        .where("ascents.user_id", "=", user.id)
        .where("ascents.tick_type", "!=", "attempt")
        .groupBy("routes.grade")
        .execute(),

      // Unique routes climbed
      db
        .selectFrom("ascents")
        .select((eb) => eb.fn.count<number>("route_id").distinct().as("count"))
        .where("user_id", "=", user.id)
        .where("tick_type", "!=", "attempt")
        .executeTakeFirstOrThrow(),

      // Unique crags visited
      db
        .selectFrom("ascents")
        .innerJoin("routes", "routes.id", "ascents.route_id")
        .select((eb) =>
          eb.fn.count<number>("routes.crag_id").distinct().as("count"),
        )
        .where("ascents.user_id", "=", user.id)
        .where("ascents.tick_type", "!=", "attempt")
        .executeTakeFirstOrThrow(),

      // Total points (all-time), split by discipline
      loadUserPoints(user.id),
    ]);

  const byTick = Object.fromEntries(
    tickRows.map((r) => [r.tick_type, Number(r.count)]),
  ) as Record<string, number>;
  const byStyle = Object.fromEntries(
    styleRows.map((r) => [r.style, Number(r.count)]),
  ) as Record<string, number>;

  const totalSends = tickRows
    .filter((r) => r.tick_type !== "attempt")
    .reduce((s, r) => s + Number(r.count), 0);
  const totalAttempts = byTick["attempt"] ?? 0;

  // Grade breakdown sorted by difficulty (known grades) then alphabetically
  const gradeCounts = gradeRows.map((r) => ({
    grade: r.grade,
    count: Number(r.count),
  }));
  const sortedGrades = [...gradeCounts].sort((a, b) => {
    const ra = gradeRank(a.grade);
    const rb = gradeRank(b.grade);
    if (ra !== -1 && rb !== -1) return rb - ra; // harder first
    if (ra !== -1) return -1;
    if (rb !== -1) return 1;
    return a.grade.localeCompare(b.grade);
  });

  const hardestGrade = hardest(gradeCounts.map((g) => g.grade));

  const overviewCards = [
    { label: "Sends", value: totalSends },
    { label: "Routes", value: Number(uniqueRoutes.count) },
    { label: "Crags", value: Number(uniqueCrags.count) },
    { label: "Attempts", value: totalAttempts },
  ];

  const sends = (["onsight", "flash", "redpoint", "toprope"] as const).filter(
    (t) => byTick[t] !== undefined,
  );

  const styles = (["sport", "trad", "boulder"] as const).filter(
    (s) => byStyle[s] !== undefined,
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <ProfileTabs active="statistics" />

      <div className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight">
          Your statistics
        </h2>

        {totalSends === 0 && totalAttempts === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">No ascents logged yet.</p>
        ) : (
          <>
            {/* Overview */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {overviewCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <p className="text-2xl font-bold tabular-nums">
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-xs text-zinc-500">Points</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {points.combined.toLocaleString()}
                </p>
                <p className="mt-1.5 text-xs text-zinc-500">
                  <span className="tabular-nums">
                    Rope {points.rope.toLocaleString()}
                  </span>
                  <span className="px-1.5 text-zinc-300 dark:text-zinc-600">
                    ·
                  </span>
                  <span className="tabular-nums">
                    Boulder {points.boulder.toLocaleString()}
                  </span>
                </p>
              </div>
              {hardestGrade && (
                <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-xs text-zinc-500">Hardest send</p>
                  <p className="mt-1 font-mono text-3xl font-bold">
                    {hardestGrade}
                  </p>
                </div>
              )}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              {POINTS_EXPLAINER}
            </p>

            {/* By tick type */}
            {sends.length > 0 && (
              <section className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  By style
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sends.map((t) => (
                    <div
                      key={t}
                      className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50"
                    >
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${tickBadge[t]}`}
                      >
                        {tickLabel[t]}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {byTick[t]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* By route style */}
            {styles.length > 0 && (
              <section className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  By discipline
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {styles.map((s) => (
                    <div
                      key={s}
                      className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50"
                    >
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${styleBadge[s]}`}
                      >
                        {styleLabel[s]}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {byStyle[s]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Grade breakdown */}
            {sortedGrades.length > 0 && (
              <section className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Grade breakdown
                </h3>
                <div className="mt-3 overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Grade
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Sends
                        </th>
                        <th className="px-4 py-2.5 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Share
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {sortedGrades.map((row) => {
                        const pct =
                          totalSends > 0
                            ? Math.round((row.count / totalSends) * 100)
                            : 0;
                        const isHardest = row.grade === hardestGrade;
                        return (
                          <tr
                            key={row.grade}
                            className={
                              isHardest ? "bg-zinc-50 dark:bg-zinc-900/40" : ""
                            }
                          >
                            <td className="px-4 py-2.5">
                              <span className="font-mono font-semibold">
                                {row.grade}
                              </span>
                              {isHardest && (
                                <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                                  hardest
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                              {row.count}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-zinc-400">
                              {pct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
