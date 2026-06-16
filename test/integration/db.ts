import { beforeAll, beforeEach } from "vitest";
import { sql } from "kysely";
import db from "@/lib/db";

// Point the app's db client at the test database for the whole file. lib/db.ts
// reads process.env.DATABASE_URL when the pool is created; set it before any
// query runs. (Vitest loads this module fresh per test file.)
beforeAll(() => {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error("TEST_DATABASE_URL unset");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

// Empty the mutable tables before each test. Reference data (countries,
// grading_systems, grade_equivalencies) is left intact — it's seeded by the
// migrations and the app needs it.
export async function resetDb() {
  await sql`
    TRUNCATE TABLE
      comments, likes, follows, statuses,
      entity_reviews, gear_reviews, gear_items, ascents, ascent_activities, images,
      forum_posts, forum_topics, deletion_log,
      routes, sectors, crags, users
    RESTART IDENTITY CASCADE
  `.execute(db);
}

beforeEach(resetDb);

// --- Fixtures --------------------------------------------------------------

export async function makeUser(name = "Tester"): Promise<number> {
  const row = await db
    .insertInto("users")
    .values({ email: `${name.toLowerCase()}-${Date.now()}@x.test`, name })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

export async function makeCragWithRoute(
  createdBy: number,
): Promise<{ cragId: number; routeId: number }> {
  const crag = await db
    .insertInto("crags")
    .values({ name: `Crag ${Date.now()}`, created_by: createdBy })
    .returning("id")
    .executeTakeFirstOrThrow();
  const gs = await db
    .selectFrom("grading_systems")
    .select("id")
    .executeTakeFirstOrThrow();
  const route = await db
    .insertInto("routes")
    .values({
      name: "Test Route",
      crag_id: crag.id,
      grade: "6a",
      grading_system_id: gs.id,
      style: "sport",
      created_by: createdBy,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return { cragId: crag.id, routeId: route.id };
}

// A stable ascent-activity (one per climber/crag/day). Ascents inserted in a
// test should set `activity_id` to this so the feed batches them.
export async function makeActivity(
  userId: number,
  cragId: number,
  day: string,
): Promise<number> {
  const row = await db
    .insertInto("ascent_activities")
    .values({ user_id: userId, crag_id: cragId, activity_date: day })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}
