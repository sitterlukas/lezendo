import { describe, it, expect } from "vitest";
import { buildRoutePoints } from "./points";
import { gradePoints, type GradeEquivalency } from "@whipperbook/core";

describe("buildRoutePoints", () => {
  // Ranks are per-discipline; buildRankIndex turns them into 0-based ordinals,
  // so the easiest grade in a discipline is worth POINTS_BASE.
  const eqs: GradeEquivalency[] = [
    {
      gradingSystemId: 1,
      slug: "french",
      grade: "6a",
      rank: 10,
      discipline: "rope",
    },
    {
      gradingSystemId: 1,
      slug: "french",
      grade: "6b",
      rank: 20,
      discipline: "rope",
    },
    {
      gradingSystemId: 1,
      slug: "french",
      grade: "6c",
      rank: 30,
      discipline: "rope",
    },
    {
      gradingSystemId: 3,
      slug: "font",
      grade: "6A",
      rank: 10,
      discipline: "boulder",
    },
  ];

  it("scores a known route by its grade's ordinal", () => {
    const pts = buildRoutePoints(eqs);
    expect(pts(1, "6a")).toBe(gradePoints(0));
    expect(pts(1, "6b")).toBe(gradePoints(1));
    expect(pts(1, "6C")).toBe(gradePoints(2)); // case-insensitive
    expect(pts(3, "6A")).toBe(gradePoints(0)); // boulder ladder starts at 0 too
  });

  it("returns null for an unknown grade or system", () => {
    const pts = buildRoutePoints(eqs);
    expect(pts(1, "9c")).toBeNull();
    expect(pts(99, "6a")).toBeNull();
  });
});
