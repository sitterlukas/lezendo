import db from "@/lib/db";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import { loadUserPoints } from "@/lib/points";
import { type GradeEquivalency } from "@/lib/grade-conversion";

export type MeCore = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  preferred_rope_grading_system_id: number | null;
  preferred_boulder_grading_system_id: number | null;
  created_at: Date;
};

// The signed-in user's own record (used by the header + settings).
export async function getMe(userId: number): Promise<MeCore | null> {
  const user = await db
    .selectFrom("users")
    .select([
      "id",
      "name",
      "email",
      "role",
      "avatar_url",
      "preferred_rope_grading_system_id",
      "preferred_boulder_grading_system_id",
      "created_at",
    ])
    .where("id", "=", userId)
    .executeTakeFirst();
  return user ?? null;
}

type FollowUser = { id: number; name: string; avatar_url: string | null };

export type SettingsData = {
  user: MeCore;
  gradingSystems: { id: number; name: string; slug: string }[];
  gradeEquivalencies: GradeEquivalency[];
  following: FollowUser[];
  followers: FollowUser[];
};

// The profile settings bundle. Null when the user no longer exists.
export async function getSettingsData(
  userId: number,
): Promise<SettingsData | null> {
  const user = await getMe(userId);
  if (!user) return null;

  const [gradingSystems, gradeEquivalencies, following, followers] =
    await Promise.all([
      db
        .selectFrom("grading_systems")
        .select(["id", "name", "slug"])
        .orderBy("id")
        .execute(),
      loadGradeEquivalencies(),
      db
        .selectFrom("follows")
        .innerJoin("users", "users.id", "follows.followee_id")
        .select(["users.id", "users.name", "users.avatar_url"])
        .where("follows.follower_id", "=", userId)
        .orderBy("users.name")
        .execute(),
      db
        .selectFrom("follows")
        .innerJoin("users", "users.id", "follows.follower_id")
        .select(["users.id", "users.name", "users.avatar_url"])
        .where("follows.followee_id", "=", userId)
        .orderBy("users.name")
        .execute(),
    ]);

  return { user, gradingSystems, gradeEquivalencies, following, followers };
}

export type StatisticsData = {
  tickRows: { tick_type: string; count: number }[];
  styleRows: { style: string; count: number }[];
  gradeRows: { grade: string; count: number }[];
  uniqueRoutes: number;
  uniqueCrags: number;
  points: { combined: number; rope: number; boulder: number };
};

// Raw ascent aggregates for the statistics page (it derives the rest).
export async function getUserStatistics(
  userId: number,
): Promise<StatisticsData> {
  const [tickRows, styleRows, gradeRows, uniqueRoutes, uniqueCrags, points] =
    await Promise.all([
      db
        .selectFrom("ascents")
        .select((eb) => ["tick_type", eb.fn.count<number>("id").as("count")])
        .where("user_id", "=", userId)
        .groupBy("tick_type")
        .execute(),
      db
        .selectFrom("ascents")
        .innerJoin("routes", "routes.id", "ascents.route_id")
        .select((eb) => [
          "routes.style",
          eb.fn.count<number>("ascents.id").as("count"),
        ])
        .where("ascents.user_id", "=", userId)
        .where("ascents.tick_type", "!=", "attempt")
        .groupBy("routes.style")
        .execute(),
      db
        .selectFrom("ascents")
        .innerJoin("routes", "routes.id", "ascents.route_id")
        .select((eb) => [
          "routes.grade",
          eb.fn.count<number>("ascents.id").as("count"),
        ])
        .where("ascents.user_id", "=", userId)
        .where("ascents.tick_type", "!=", "attempt")
        .groupBy("routes.grade")
        .execute(),
      db
        .selectFrom("ascents")
        .select((eb) => eb.fn.count<number>("route_id").distinct().as("count"))
        .where("user_id", "=", userId)
        .where("tick_type", "!=", "attempt")
        .executeTakeFirstOrThrow(),
      db
        .selectFrom("ascents")
        .innerJoin("routes", "routes.id", "ascents.route_id")
        .select((eb) =>
          eb.fn.count<number>("routes.crag_id").distinct().as("count"),
        )
        .where("ascents.user_id", "=", userId)
        .where("ascents.tick_type", "!=", "attempt")
        .executeTakeFirstOrThrow(),
      loadUserPoints(userId),
    ]);

  return {
    tickRows: tickRows.map((r) => ({
      tick_type: r.tick_type,
      count: Number(r.count),
    })),
    styleRows: styleRows.map((r) => ({
      style: r.style,
      count: Number(r.count),
    })),
    gradeRows: gradeRows.map((r) => ({
      grade: r.grade,
      count: Number(r.count),
    })),
    uniqueRoutes: Number(uniqueRoutes.count),
    uniqueCrags: Number(uniqueCrags.count),
    points,
  };
}
