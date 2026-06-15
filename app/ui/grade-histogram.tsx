// Horizontal bar chart of a sector's route grades — how many routes at each
// grade, ordered hardest-first. `data` must already be sorted.
export default function GradeHistogram({
  data,
}: {
  data: { grade: string; count: number }[];
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        Grade distribution
      </h2>
      <ul className="mt-3 space-y-1.5">
        {data.map((d) => (
          <li key={d.grade} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-right font-mono text-sm font-medium tabular-nums">
              {d.grade}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded bg-blue-500 dark:bg-blue-500/80"
                style={{ width: `${Math.max(6, (d.count / max) * 100)}%` }}
              />
            </div>
            <span className="w-5 shrink-0 text-sm tabular-nums text-zinc-500">
              {d.count}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-zinc-400">
        {total} {total === 1 ? "route" : "routes"} across {data.length}{" "}
        {data.length === 1 ? "grade" : "grades"}
      </p>
    </section>
  );
}
