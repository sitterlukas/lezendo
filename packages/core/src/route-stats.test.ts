import { describe, it, expect } from "vitest";
import {
  gradeRange,
  stylesPresent,
  gradeBuckets,
  tickStats,
  type ResolvedRoute,
} from "./route-stats";
import type { GradeEquivalency } from "./grade-conversion";

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
];
const route = (
  grade: string,
  style: ResolvedRoute["style"] = "sport",
): ResolvedRoute => ({
  grade,
  originalGrade: null,
  grading_system_id: 1,
  style,
});

describe("gradeRange", () => {
  it("returns easiest + hardest by rank", () => {
    expect(gradeRange([route("6a"), route("6c"), route("6b")], eqs)).toEqual({
      minGrade: "6a",
      maxGrade: "6c",
    });
  });
  it("is null when no route has a known grade", () => {
    expect(gradeRange([route("9z")], eqs)).toBeNull();
  });
});

describe("stylesPresent", () => {
  it("returns present styles in sport → trad → boulder order", () => {
    expect(stylesPresent([{ style: "boulder" }, { style: "sport" }])).toEqual([
      "sport",
      "boulder",
    ]);
    expect(stylesPresent([])).toEqual([]);
  });
});

describe("gradeBuckets", () => {
  it("counts routes per grade, easiest-first", () => {
    expect(gradeBuckets([route("6a"), route("6a"), route("6c")], eqs)).toEqual([
      { grade: "6a", count: 2 },
      { grade: "6c", count: 1 },
    ]);
  });
});

describe("tickStats", () => {
  it("counts ticks and excludes attempts from sends", () => {
    const { counts, totalSends } = tickStats([
      { tick_type: "redpoint" },
      { tick_type: "flash" },
      { tick_type: "attempt" },
      { tick_type: "redpoint" },
    ]);
    expect(counts).toEqual({ redpoint: 2, flash: 1, attempt: 1 });
    expect(totalSends).toBe(3);
  });
});
