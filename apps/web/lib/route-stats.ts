// Pure helpers for summarising a set of routes — grade range, styles present,
// grade distribution and ascent tick stats. No `db` import (like
// `grade-conversion.ts`), so these stay testable and usable from client code.
import { gradeRank, type GradeEquivalency } from "@/lib/grade-conversion";
import type { ClimbStyle, TickType } from "@/lib/db";

// The shape produced by spreading a route with `resolveGrade(...)`: `grade` is
// the displayed (possibly converted) grade, `originalGrade` the stored one.
export interface ResolvedRoute {
  grade: string;
  originalGrade: string | null;
  grading_system_id: number;
  style: ClimbStyle;
}

function rankOf(route: ResolvedRoute, eqs: GradeEquivalency[]): number | null {
  return gradeRank(
    route.originalGrade ?? route.grade,
    route.grading_system_id,
    eqs,
  );
}

/**
 * Easiest and hardest displayed grade across the routes, or null if none have a
 * known grade. Ranks by the route's own grading system but returns the grade as
 * displayed.
 */
export function gradeRange(
  routes: ResolvedRoute[],
  eqs: GradeEquivalency[],
): { minGrade: string; maxGrade: string } | null {
  let min: { rank: number; grade: string } | null = null;
  let max: { rank: number; grade: string } | null = null;
  for (const route of routes) {
    const rank = rankOf(route, eqs);
    if (rank === null) continue;
    if (!min || rank < min.rank) min = { rank, grade: route.grade };
    if (!max || rank > max.rank) max = { rank, grade: route.grade };
  }
  if (!min || !max) return null;
  return { minGrade: min.grade, maxGrade: max.grade };
}

const STYLE_ORDER: ClimbStyle[] = ["sport", "trad", "boulder"];

/** Which climb styles appear, in a stable sport → trad → boulder order. */
export function stylesPresent(routes: { style: ClimbStyle }[]): ClimbStyle[] {
  const seen = new Set(routes.map((r) => r.style));
  return STYLE_ORDER.filter((s) => seen.has(s));
}

/**
 * Route counts per displayed grade, easiest-first — for the grade-distribution
 * chart. Ranks by the route's own system so conversion doesn't reorder bars.
 */
export function gradeBuckets(
  routes: ResolvedRoute[],
  eqs: GradeEquivalency[],
): { grade: string; count: number }[] {
  const map = new Map<string, { count: number; rank: number }>();
  for (const route of routes) {
    const rank = rankOf(route, eqs) ?? -1;
    const existing = map.get(route.grade);
    if (existing) existing.count++;
    else map.set(route.grade, { count: 1, rank });
  }
  return [...map.entries()]
    .map(([grade, v]) => ({ grade, count: v.count, rank: v.rank }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ grade, count }) => ({ grade, count }));
}

/** Ascent counts per tick type, and total sends (everything but attempts). */
export function tickStats(ascents: { tick_type: TickType }[]): {
  counts: Partial<Record<TickType, number>>;
  totalSends: number;
} {
  const counts: Partial<Record<TickType, number>> = {};
  let totalSends = 0;
  for (const a of ascents) {
    counts[a.tick_type] = (counts[a.tick_type] ?? 0) + 1;
    if (a.tick_type !== "attempt") totalSends++;
  }
  return { counts, totalSends };
}
