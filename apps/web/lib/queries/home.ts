import db, { type ClimbStyle } from "@/lib/db";
import { resolveGrade } from "@whipperbook/core";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import { periodStart, type Period, type Discipline } from "@whipperbook/core";
import { loadLeaderboard } from "@/lib/points";
import { type LeaderboardRow } from "@/lib/queries/leaderboards";

export type HomeRoute = {
  id: number;
  name: string;
  grade: string;
  style: ClimbStyle;
  crag_id: number;
  crag_name: string;
  originalGrade: string | null;
  systemName: string | null;
};

export type HomeData = {
  isAuthed: boolean;
  routeCount: number;
  cragCount: number;
  ascentCount: number;
  recentRoutes: HomeRoute[];
  topClimbers: LeaderboardRow[];
};

// The landing page bundle: live counts, latest routes (with viewer-resolved
// grades), and the top-5 leaderboard for the chosen period/discipline.
export async function getHome(
  period: Period,
  discipline: Discipline,
  viewer: { id: number } | null,
): Promise<HomeData> {
  const viewerPrefs = viewer
    ? ((await db
        .selectFrom("users")
        .select([
          "preferred_rope_grading_system_id",
          "preferred_boulder_grading_system_id",
        ])
        .where("id", "=", viewer.id)
        .executeTakeFirst()) ?? null)
    : null;

  const start = periodStart(period);

  const [
    routeCount,
    cragCount,
    ascentCount,
    recentRows,
    topClimbers,
    gradingSystems,
    gradeEquivalencies,
  ] = await Promise.all([
    db
      .selectFrom("routes")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("deleted", "=", false)
      .executeTakeFirstOrThrow()
      .then((r) => Number(r.count)),
    db
      .selectFrom("crags")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("deleted", "=", false)
      .executeTakeFirstOrThrow()
      .then((r) => Number(r.count)),
    db
      .selectFrom("ascents")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow()
      .then((r) => Number(r.count)),
    db
      .selectFrom("routes")
      .innerJoin("crags", "crags.id", "routes.crag_id")
      .select([
        "routes.id",
        "routes.name",
        "routes.grade",
        "routes.grading_system_id",
        "routes.style",
        "routes.crag_id",
        "crags.name as crag_name",
      ])
      .where("routes.deleted", "=", false)
      .orderBy("routes.created_at", "desc")
      .limit(6)
      .execute(),
    loadLeaderboard({ start, discipline }).then((r) => r.slice(0, 5)),
    db
      .selectFrom("grading_systems")
      .select(["id", "name", "slug"])
      .orderBy("id")
      .execute(),
    loadGradeEquivalencies(),
  ]);

  const recentRoutes: HomeRoute[] = recentRows.map((r) => {
    const resolved = resolveGrade(
      r.grade,
      r.grading_system_id,
      gradingSystems,
      {
        rope: viewerPrefs?.preferred_rope_grading_system_id,
        boulder: viewerPrefs?.preferred_boulder_grading_system_id,
      },
      gradeEquivalencies,
    );
    return {
      id: r.id,
      name: r.name,
      style: r.style,
      crag_id: r.crag_id,
      crag_name: r.crag_name,
      grade: resolved.grade,
      originalGrade: resolved.originalGrade,
      systemName: resolved.systemName,
    };
  });

  return {
    isAuthed: viewer !== null,
    routeCount,
    cragCount,
    ascentCount,
    recentRoutes,
    topClimbers,
  };
}
