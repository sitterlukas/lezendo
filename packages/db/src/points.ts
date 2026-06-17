// Send scoring + leaderboard aggregation (DB-backed).
//
// Pure scoring primitives (POINTS_BASE/GROWTH/EXPLAINER, gradePoints) live in
// @whipperbook/core; this module holds the database-backed aggregation that
// builds on them.
import { sql } from "kysely";
import db from "./client";
import { loadGradeEquivalencies } from "./grade-data";
import {
  gradePoints,
  type GradeEquivalency,
  type Discipline,
} from "@whipperbook/core";

// Build a reusable lookup for the points a single route is worth, given its
// grading system + grade. Returns null when the grade isn't in a known system.
// Same scoring as the leaderboard (one send of that grade).
export function buildRoutePoints(
  eqs: GradeEquivalency[],
): (gradingSystemId: number, grade: string) => number | null {
  const indexByRank = buildRankIndex(eqs);
  const byKey = new Map<
    string,
    { discipline: "rope" | "boulder"; rank: number }
  >();
  for (const e of eqs) {
    byKey.set(`${e.gradingSystemId}|${e.grade.toLowerCase()}`, {
      discipline: e.discipline,
      rank: e.rank,
    });
  }
  return (gradingSystemId, grade) => {
    const hit = byKey.get(`${gradingSystemId}|${grade.toLowerCase()}`);
    if (!hit) return null;
    const index = indexByRank.get(hit.discipline)?.get(hit.rank);
    return index === undefined ? null : gradePoints(index);
  };
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
