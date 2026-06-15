import Link from "next/link";
import { auth } from "@/auth";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

type Period = "week" | "month" | "year" | "all";

const periods: Period[] = ["week", "month", "year", "all"];

const periodLabel: Record<Period, string> = {
  week: "This week",
  month: "This month",
  year: "This year",
  all: "All time",
};

function periodStart(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "week": {
      const d = new Date(now);
      const day = d.getDay();
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = (
    periods.includes(params.period as Period) ? params.period : "week"
  ) as Period;

  const session = await auth();
  const currentUser = session?.user?.email
    ? ((await db
        .selectFrom("users")
        .select("id")
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()) ?? null)
    : null;

  const start = periodStart(period);

  let query = db
    .selectFrom("ascents")
    .innerJoin("users", "users.id", "ascents.user_id")
    .select((eb) => [
      "ascents.user_id",
      "users.name",
      eb.fn.count<number>("ascents.id").as("total"),
    ])
    .where("ascents.tick_type", "!=", "attempt")
    .groupBy(["ascents.user_id", "users.name"])
    .orderBy("total", "desc")
    .limit(25);

  if (start) {
    query = query.where("ascents.ascent_date", ">=", start);
  }

  const rows = await query.execute();

  // If the current user is outside the top 25, find their rank separately
  let myRow: { rank: number; total: number } | null = null;
  if (currentUser && !rows.some((r) => r.user_id === currentUser.id)) {
    let countQuery = db
      .selectFrom("ascents")
      .select((eb) => eb.fn.count<number>("ascents.id").as("total"))
      .where("ascents.user_id", "=", currentUser.id)
      .where("ascents.tick_type", "!=", "attempt");
    if (start)
      countQuery = countQuery.where("ascents.ascent_date", ">=", start);
    const myCount = await countQuery.executeTakeFirst();
    const myTotal = Number(myCount?.total ?? 0);
    if (myTotal > 0) {
      let rankQuery = db
        .selectFrom("ascents")
        .select("ascents.user_id")
        .select((eb) => eb.fn.count<number>("ascents.id").as("total"))
        .where("ascents.tick_type", "!=", "attempt")
        .groupBy("ascents.user_id")
        .having((eb) => eb.fn.count<number>("ascents.id"), ">", myTotal);
      if (start)
        rankQuery = rankQuery.where("ascents.ascent_date", ">=", start);
      const ahead = await rankQuery.execute();
      myRow = { rank: ahead.length + 1, total: myTotal };
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight">Leaderboards</h1>
      <p className="mt-2 text-zinc-500">
        Most sends logged — attempts not counted.
      </p>

      {/* Period tabs */}
      <nav className="mt-6 flex flex-wrap gap-2">
        {periods.map((p) => (
          <Link
            key={p}
            href={`/leaderboards?period=${p}`}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              period === p
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {periodLabel[p]}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="mt-12 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">
            No ascents logged{" "}
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
          <div className="mt-8 overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Climber
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Sends
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {rows.map((row, index) => {
                  const isMe = currentUser && row.user_id === currentUser.id;
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
                        {row.name}
                        {isMe && (
                          <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {Number(row.total)}
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
                  {myRow.total} sends
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
