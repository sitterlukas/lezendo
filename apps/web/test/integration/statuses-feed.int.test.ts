import { describe, it, expect } from "vitest";
import db from "@whipperbook/db";
import { buildFeed } from "@whipperbook/db";
import { makeUser, makeCragWithRoute, makeActivity } from "./db";

describe("buildFeed", () => {
  it("includes followees + self, excludes non-followed, newest first", async () => {
    const me = await makeUser("Me");
    const friend = await makeUser("Friend");
    const stranger = await makeUser("Stranger");

    await db
      .insertInto("follows")
      .values({ follower_id: me, followee_id: friend })
      .execute();

    const mk = async (userId: number, body: string, iso: string) =>
      db
        .insertInto("statuses")
        .values({
          user_id: userId,
          body,
          sector_id: null,
          created_at: new Date(iso),
        })
        .execute();
    await mk(me, "mine", "2026-06-10T00:00:00Z");
    await mk(friend, "friend", "2026-06-11T00:00:00Z");
    await mk(stranger, "stranger", "2026-06-12T00:00:00Z");

    const { items } = await buildFeed(db, me);
    const bodies = items
      .filter((i) => i.kind === "status")
      .map((i) => (i.kind === "status" ? i.body : ""));

    expect(bodies).toEqual(["friend", "mine"]);
  });

  it("embeds the tagged sector (with its crag) on a status", async () => {
    const me = await makeUser("Me");
    const { cragId } = await makeCragWithRoute(me);
    const sector = await db
      .insertInto("sectors")
      .values({ name: "Main Wall", crag_id: cragId, created_by: me })
      .returning("id")
      .executeTakeFirstOrThrow();

    await db
      .insertInto("statuses")
      .values({ user_id: me, body: "psyched", sector_id: sector.id })
      .execute();

    const { items } = await buildFeed(db, me);
    const item = items.find((i) => i.kind === "status");
    if (item?.kind !== "status") throw new Error("expected a status item");
    expect(item.sector).not.toBeNull();
    expect(item.sector?.id).toBe(sector.id);
    expect(item.sector?.crag.id).toBe(cragId);
  });

  it("batches same-crag, same-day ascents into one feed item", async () => {
    const me = await makeUser("Me");
    const { cragId, routeId } = await makeCragWithRoute(me);
    const gs = await db
      .selectFrom("grading_systems")
      .select("id")
      .executeTakeFirstOrThrow();
    const route2 = await db
      .insertInto("routes")
      .values({
        name: "Route Two",
        crag_id: cragId,
        grade: "6b",
        grading_system_id: gs.id,
        style: "sport",
        created_by: me,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const day = new Date("2026-06-10T00:00:00Z");
    const activityId = await makeActivity(me, cragId, "2026-06-10");
    await db
      .insertInto("ascents")
      .values([
        {
          route_id: routeId,
          user_id: me,
          tick_type: "redpoint",
          ascent_date: day,
          activity_id: activityId,
          created_at: new Date("2026-06-10T10:00:00Z"),
        },
        {
          route_id: route2.id,
          user_id: me,
          tick_type: "flash",
          ascent_date: day,
          activity_id: activityId,
          created_at: new Date("2026-06-10T11:00:00Z"),
        },
      ])
      .execute();

    const { items } = await buildFeed(db, me);
    const ascent = items.find((i) => i.kind === "ascent");
    if (ascent?.kind !== "ascent") throw new Error("expected an ascent item");
    expect(ascent.id).toBe(activityId);
    expect(ascent.climbs).toHaveLength(2);
    expect(ascent.climbs[0].crag.id).toBe(cragId);
  });

  it("keeps a stable activity id so likes survive a later same-day ascent", async () => {
    const me = await makeUser("Me");
    const { cragId, routeId } = await makeCragWithRoute(me);
    const activityId = await makeActivity(me, cragId, "2026-06-12");
    await db
      .insertInto("ascents")
      .values({
        route_id: routeId,
        user_id: me,
        tick_type: "redpoint",
        ascent_date: new Date("2026-06-12T00:00:00Z"),
        activity_id: activityId,
        created_at: new Date("2026-06-12T10:00:00Z"),
      })
      .execute();
    await db
      .insertInto("likes")
      .values({ user_id: me, target_type: "activity", target_id: activityId })
      .execute();

    let item = (await buildFeed(db, me)).items.find((i) => i.kind === "ascent");
    if (item?.kind !== "ascent") throw new Error("expected an ascent item");
    expect(item.id).toBe(activityId);
    expect(item.likeCount).toBe(1);
    expect(item.likedByMe).toBe(true);

    // Log another ascent the same day → same activity; the like must persist.
    const gs = await db
      .selectFrom("grading_systems")
      .select("id")
      .executeTakeFirstOrThrow();
    const route2 = await db
      .insertInto("routes")
      .values({
        name: "Later Route",
        crag_id: cragId,
        grade: "6b",
        grading_system_id: gs.id,
        style: "sport",
        created_by: me,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("ascents")
      .values({
        route_id: route2.id,
        user_id: me,
        tick_type: "flash",
        ascent_date: new Date("2026-06-12T00:00:00Z"),
        activity_id: activityId,
        created_at: new Date("2026-06-12T14:00:00Z"),
      })
      .execute();

    item = (await buildFeed(db, me)).items.find((i) => i.kind === "ascent");
    if (item?.kind !== "ascent") throw new Error("expected an ascent item");
    expect(item.id).toBe(activityId); // stable
    expect(item.climbs).toHaveLength(2);
    expect(item.likeCount).toBe(1); // like survived
    expect(item.likedByMe).toBe(true);
  });
});
