// Vertical column chart of a sector's route grades — how many routes at each
// grade, easiest→hardest left to right. Bars are fixed-width (so a sector with
// only a couple of grades doesn't stretch across the page) and shaded from
// light blue (easy) to dark blue (hard) to form a gradient. `data` must already
// be sorted easiest-first.
const CHART_HEIGHT = 120; // px, tallest column

// Light (easy) → dark (hard) blue gradient.
function barColor(index: number, count: number): string {
  if (count <= 1) return "hsl(217 91% 60%)";
  const lightness = 76 - (index / (count - 1)) * (76 - 44);
  return `hsl(217 91% ${lightness}%)`;
}

export default function GradeHistogram({
  data,
}: {
  data: { grade: string; count: number }[];
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <section className="flex h-full flex-col rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="text-xl font-bold tracking-tight">Grade distribution</h2>

      <div className="mt-4 w-fit">
        {/* columns */}
        <div className="flex items-end gap-2 sm:gap-3">
          {data.map((d, i) => (
            <div
              key={d.grade}
              className="flex w-10 flex-col items-center gap-1"
            >
              <span className="text-xs font-medium tabular-nums text-zinc-500">
                {d.count}
              </span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${Math.max(4, (d.count / max) * CHART_HEIGHT)}px`,
                  backgroundColor: barColor(i, data.length),
                }}
                title={`${d.count} ${d.count === 1 ? "route" : "routes"} at ${d.grade}`}
              />
            </div>
          ))}
        </div>
        {/* axis line + grade labels under each column */}
        <div className="mt-2 flex gap-2 border-t border-zinc-300 pt-2 sm:gap-3 dark:border-zinc-700">
          {data.map((d) => (
            <div
              key={d.grade}
              className="w-10 text-center font-mono text-xs font-medium"
            >
              {d.grade}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        {total} {total === 1 ? "route" : "routes"} across {data.length}{" "}
        {data.length === 1 ? "grade" : "grades"}
      </p>
    </section>
  );
}
