import { describe, it, expect } from "vitest";
import db from "@/lib/db";
import { buildFeed } from "@/lib/feed";
import { makeUser, makeCragWithRoute } from "./db";

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
          crag_id: null,
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

  it("embeds the shared route (with its crag) on a status", async () => {
    const me = await makeUser("Me");
    const { cragId, routeId } = await makeCragWithRoute(me);

    await db
      .insertInto("statuses")
      .values({
        user_id: me,
        body: "psyched",
        crag_id: null,
        route_id: routeId,
      })
      .execute();

    const { items } = await buildFeed(db, me);
    const item = items.find((i) => i.kind === "status");
    if (item?.kind !== "status") throw new Error("expected a status item");
    expect(item.route).not.toBeNull();
    expect(item.route?.id).toBe(routeId);
    expect(item.route?.grade).toBe("6a");
    expect(item.route?.crag.id).toBe(cragId);
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
    await db
      .insertInto("ascents")
      .values([
        {
          route_id: routeId,
          user_id: me,
          tick_type: "redpoint",
          ascent_date: day,
          created_at: new Date("2026-06-10T10:00:00Z"),
        },
        {
          route_id: route2.id,
          user_id: me,
          tick_type: "flash",
          ascent_date: day,
          created_at: new Date("2026-06-10T11:00:00Z"),
        },
      ])
      .execute();

    const { items } = await buildFeed(db, me);
    const ascent = items.find((i) => i.kind === "ascent");
    if (ascent?.kind !== "ascent") throw new Error("expected an ascent item");
    expect(ascent.climbs).toHaveLength(2);
    expect(ascent.crag.id).toBe(cragId);
  });
});
