import { describe, it, expect } from "vitest";
import { gradePoints, POINTS_BASE } from "./points";

describe("gradePoints", () => {
  it("starts at POINTS_BASE and grows geometrically (rounded)", () => {
    expect(gradePoints(0)).toBe(POINTS_BASE); // 10
    expect(gradePoints(1)).toBe(13); // round(10 * 1.3)
    expect(gradePoints(2)).toBe(17); // round(10 * 1.3^2 = 16.9)
  });
});
