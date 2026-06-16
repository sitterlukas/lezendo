import { describe, it, expect } from "vitest";
import db from "@/lib/db";
import { buildFeed } from "@/lib/feed";
import { makeUser } from "./db";

async function makeStatus(userId: number): Promise<number> {
  const row = await db
    .insertInto("statuses")
    .values({ user_id: userId, body: "hi", crag_id: null })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

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
