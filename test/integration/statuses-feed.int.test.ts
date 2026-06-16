import { describe, it, expect } from "vitest";
import db from "@/lib/db";
import { buildFeed } from "@/lib/feed";
import { makeUser } from "./db";

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
        .values({ user_id: userId, body, crag_id: null, created_at: new Date(iso) })
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
});
