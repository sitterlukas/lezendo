import { describe, it, expect } from "vitest";
import { parsePeriod, parseDiscipline, periodStart } from "@/lib/leaderboard";

describe("parsePeriod", () => {
  it("accepts valid periods", () => {
    expect(parsePeriod("week")).toBe("week");
    expect(parsePeriod("all")).toBe("all");
  });
  it("falls back to the default for invalid input", () => {
    expect(parsePeriod("nope")).toBe("month");
    expect(parsePeriod(undefined)).toBe("month");
    expect(parsePeriod(123, "year")).toBe("year");
    expect(parsePeriod("week", "year")).toBe("week");
  });
});

describe("parseDiscipline", () => {
  it("accepts valid disciplines and falls back otherwise", () => {
    expect(parseDiscipline("rope")).toBe("rope");
    expect(parseDiscipline("boulder")).toBe("boulder");
    expect(parseDiscipline("combined")).toBe("combined");
    expect(parseDiscipline("xxx")).toBe("combined");
    expect(parseDiscipline(null)).toBe("combined");
  });
});

describe("periodStart", () => {
  it("returns null for 'all' (no lower bound)", () => {
    expect(periodStart("all")).toBeNull();
  });
  it("returns a Date for bounded periods", () => {
    for (const p of ["week", "month", "year"] as const) {
      expect(periodStart(p)).toBeInstanceOf(Date);
    }
  });
  it("month start is the 1st at midnight", () => {
    const d = periodStart("month")!;
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
  it("year start is Jan 1", () => {
    const d = periodStart("year")!;
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
});
