import { describe, it, expect } from "vitest";
import { sortFeedNewestFirst, type FeedItem } from "@/lib/feed";

function status(id: number, iso: string): FeedItem {
  return {
    kind: "status",
    id,
    author: { id: 1, name: "A" },
    createdAt: new Date(iso),
    body: "x",
    crag: null,
    photos: [],
    likeCount: 0,
    likedByMe: false,
    commentCount: 0,
  };
}

describe("sortFeedNewestFirst", () => {
  it("orders newest first and does not mutate the input", () => {
    const input = [
      status(1, "2026-06-01T00:00:00Z"),
      status(2, "2026-06-03T00:00:00Z"),
      status(3, "2026-06-02T00:00:00Z"),
    ];
    const out = sortFeedNewestFirst(input);
    expect(out.map((i) => i.id)).toEqual([2, 3, 1]);
    expect(input.map((i) => i.id)).toEqual([1, 2, 3]); // unchanged
  });
});
