// Send scoring + leaderboard aggregation.
//
// Difficulty is perceived logarithmically, so points grow geometrically with
// grade: the easiest grade in a discipline is worth POINTS_BASE, and every
// harder grade step multiplies by POINTS_GROWTH. Grade "steps" are the ordinal
// positions on the shared difficulty scale (`grade_equivalencies.equivalency_id`),
// computed per discipline so rope and boulder each start their own ladder at 0.
import { sql } from "kysely";
import db from "@/lib/db";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import type { GradeEquivalency } from "@/lib/grade-conversion";
import type { Discipline } from "@/lib/leaderboard";

export const POINTS_BASE = 10;
export const POINTS_GROWTH = 1.3;

/** Plain-language description of the scoring, shared across the UI. */
export const POINTS_EXPLAINER =
  `Each send earns points based on its grade: the easiest grade is worth ${POINTS_BASE}, ` +
  `and every harder grade step multiplies the score by ${POINTS_GROWTH}×. ` +
  `Rope and boulder are scored on separate ladders, and equal difficulty earns equal ` +
  `points regardless of grading system. Attempts don't count.`;

/** Points for a send at the given 0-based grade index within its discipline. */
export function gradePoints(index: number): number {
  return Math.round(POINTS_BASE * POINTS_GROWTH ** index);
}

/**
 * Map each (discipline, equivalency_id) to its 0-based ordinal position, so the
 * easiest grade in a discipline is index 0 regardless of the raw rank spacing.
 */
function buildRankIndex(
  eqs: GradeEquivalency[],
): Map<"rope" | "boulder", Map<number, number>> {
  const ranksByDiscipline = new Map<"rope" | "boulder", Set<number>>([
    ["rope", new Set()],
    ["boulder", new Set()],
  ]);
  for (const e of eqs) ranksByDiscipline.get(e.discipline)?.add(e.rank);

  const out = new Map<"rope" | "boulder", Map<number, number>>();
  for (const [discipline, ranks] of ranksByDiscipline) {
    const sorted = [...ranks].sort((a, b) => a - b);
    const indexByRank = new Map<number, number>();
    sorted.forEach((rank, i) => indexByRank.set(rank, i));
    out.set(discipline, indexByRank);
  }
  return out;
}

export interface LeaderboardRow {
  user_id: number;
  name: string;
  avatar_url: string | null;
  points: number;
}

/**
 * Per-user point totals, highest first. Counts non-attempt ascents of live
 * routes whose grade maps to a known equivalency. `discipline` restricts to
 * rope/boulder, or sums both when "combined".
 */
export async function loadLeaderboard(opts: {
  start: Date | null;
  discipline: Discipline;
}): Promise<LeaderboardRow[]> {
  const indexByRank = buildRankIndex(await loadGradeEquivalencies());

  let query = db
    .selectFrom("ascents")
    .innerJoin("users", "users.id", "ascents.user_id")
    .innerJoin("routes", "routes.id", "ascents.route_id")
    .innerJoin("grade_equivalencies as ge", (join) =>
      join
        .onRef("ge.grading_system_id", "=", "routes.grading_system_id")
        .on(sql<boolean>`lower(ge.grade) = lower(routes.grade)`),
    )
    .select((eb) => [
      "ascents.user_id as user_id",
      "users.name as name",
      "users.avatar_url as avatar_url",
      "ge.discipline as discipline",
      "ge.equivalency_id as rank",
      eb.fn.count<number>("ascents.id").as("n"),
    ])
    .where("ascents.tick_type", "!=", "attempt")
    .where("routes.deleted", "=", false)
    .groupBy([
      "ascents.user_id",
      "users.name",
      "users.avatar_url",
      "ge.discipline",
      "ge.equivalency_id",
    ]);

  if (opts.start) query = query.where("ascents.ascent_date", ">=", opts.start);
  if (opts.discipline !== "combined") {
    query = query.where("ge.discipline", "=", opts.discipline);
  }

  const rows = await query.execute();

  const totals = new Map<number, LeaderboardRow>();
  for (const r of rows) {
    const index = indexByRank.get(r.discipline)?.get(Number(r.rank));
    if (index === undefined) continue;
    const points = gradePoints(index) * Number(r.n);
    const userId = Number(r.user_id);
    const existing = totals.get(userId);
    if (existing) existing.points += points;
    else
      totals.set(userId, {
        user_id: userId,
        name: r.name,
        avatar_url: r.avatar_url,
        points,
      });
  }

  return [...totals.values()].sort((a, b) => b.points - a.points);
}

export interface UserPoints {
  rope: number;
  boulder: number;
  combined: number;
}

/**
 * Point totals for a single climber, split by discipline (and combined). Same
 * scoring as the leaderboard, restricted to one user.
 */
export async function loadUserPoints(
  userId: number,
  start: Date | null = null,
): Promise<UserPoints> {
  const indexByRank = buildRankIndex(await loadGradeEquivalencies());

  let query = db
    .selectFrom("ascents")
    .innerJoin("routes", "routes.id", "ascents.route_id")
    .innerJoin("grade_equivalencies as ge", (join) =>
      join
        .onRef("ge.grading_system_id", "=", "routes.grading_system_id")
        .on(sql<boolean>`lower(ge.grade) = lower(routes.grade)`),
    )
    .select((eb) => [
      "ge.discipline as discipline",
      "ge.equivalency_id as rank",
      eb.fn.count<number>("ascents.id").as("n"),
    ])
    .where("ascents.user_id", "=", userId)
    .where("ascents.tick_type", "!=", "attempt")
    .where("routes.deleted", "=", false)
    .groupBy(["ge.discipline", "ge.equivalency_id"]);

  if (start) query = query.where("ascents.ascent_date", ">=", start);

  const rows = await query.execute();

  let rope = 0;
  let boulder = 0;
  for (const r of rows) {
    const index = indexByRank.get(r.discipline)?.get(Number(r.rank));
    if (index === undefined) continue;
    const points = gradePoints(index) * Number(r.n);
    if (r.discipline === "rope") rope += points;
    else boulder += points;
  }

  return { rope, boulder, combined: rope + boulder };
}
