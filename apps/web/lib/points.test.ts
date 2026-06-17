import { describe, it, expect } from "vitest";
import { gradePoints, buildRoutePoints, POINTS_BASE } from "@/lib/points";
import type { GradeEquivalency } from "@/lib/grade-conversion";

describe("gradePoints", () => {
  it("starts at POINTS_BASE and grows geometrically (rounded)", () => {
    expect(gradePoints(0)).toBe(POINTS_BASE); // 10
    expect(gradePoints(1)).toBe(13); // round(10 * 1.3)
    expect(gradePoints(2)).toBe(17); // round(10 * 1.3^2 = 16.9)
  });
});

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
