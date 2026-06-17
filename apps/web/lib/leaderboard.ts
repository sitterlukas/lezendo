// Shared leaderboard period filtering, used by the homepage widget and the
// full /leaderboards page so both offer the same week/month/year/all options.

export type Period = "week" | "month" | "year" | "all";

export const periods: Period[] = ["week", "month", "year", "all"];

export const periodLabel: Record<Period, string> = {
  week: "This week",
  month: "This month",
  year: "This year",
  all: "All time",
};

/** Start of the given period, or null for "all" (no lower bound). */
export function periodStart(period: Period): Date | null {
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

/** Coerce an untrusted query value into a valid Period, falling back to `fallback`. */
export function parsePeriod(value: unknown, fallback: Period = "month"): Period {
  return periods.includes(value as Period) ? (value as Period) : fallback;
}

// --- discipline filter -----------------------------------------------------
// "combined" sums rope + boulder points; the others restrict to one discipline.

export type Discipline = "combined" | "rope" | "boulder";

export const disciplines: Discipline[] = ["combined", "rope", "boulder"];

export const disciplineLabel: Record<Discipline, string> = {
  combined: "Combined",
  rope: "Rope",
  boulder: "Boulder",
};

/** Coerce an untrusted query value into a valid Discipline, defaulting to combined. */
export function parseDiscipline(
  value: unknown,
  fallback: Discipline = "combined",
): Discipline {
  return disciplines.includes(value as Discipline)
    ? (value as Discipline)
    : fallback;
}
