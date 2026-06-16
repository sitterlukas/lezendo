import { describe, it, expect } from "vitest";
import db from "@/lib/db";
import { buildFeed } from "@/lib/feed";
import { makeUser } from "./db";

async function makeStatus(userId: number): Promise<number> {
  const row = await db
    .insertInto("statuses")
    .values({ user_id: userId, body: "hi", sector_id: null })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

describe("comments", () => {
  it("reports commentCount and loads comments oldest-first", async () => {
    const me = await makeUser("Me");
    const statusId = await makeStatus(me);

    await db
      .insertInto("comments")
      .values([
        {
          user_id: me,
          target_type: "status",
          target_id: statusId,
          body: "first",
          created_at: new Date("2026-06-10T00:00:00Z"),
        },
        {
          user_id: me,
          target_type: "status",
          target_id: statusId,
          body: "second",
          created_at: new Date("2026-06-11T00:00:00Z"),
        },
      ])
      .execute();

    const { items } = await buildFeed(db, me);
    const item = items.find((i) => i.kind === "status" && i.id === statusId)!;
    expect(item.commentCount).toBe(2);
    expect(item.comments.map((c) => c.body)).toEqual(["first", "second"]);
  });

  it("reports per-comment like counts on feed items", async () => {
    const me = await makeUser("Me");
    const other = await makeUser("Other");
    const statusId = await makeStatus(me);

    const comment = await db
      .insertInto("comments")
      .values({
        user_id: me,
        target_type: "status",
        target_id: statusId,
        body: "nice",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await db
      .insertInto("likes")
      .values([
        { user_id: me, target_type: "comment", target_id: comment.id },
        { user_id: other, target_type: "comment", target_id: comment.id },
      ])
      .execute();

    const { items } = await buildFeed(db, me);
    const item = items.find((i) => i.kind === "status" && i.id === statusId)!;
    expect(item.comments[0].likeCount).toBe(2);
    expect(item.comments[0].likedByMe).toBe(true);
  });
});

describe("feed interaction counts", () => {
  it("reports likeCount and likedByMe", async () => {
    const me = await makeUser("Me");
    const other = await makeUser("Other");
    const statusId = await makeStatus(me);

    await db
      .insertInto("likes")
      .values([
        { user_id: me, target_type: "status", target_id: statusId },
        { user_id: other, target_type: "status", target_id: statusId },
      ])
      .execute();

    const { items } = await buildFeed(db, me);
    const item = items.find((i) => i.kind === "status" && i.id === statusId)!;
    expect(item.likeCount).toBe(2);
    expect(item.likedByMe).toBe(true);
  });
});
