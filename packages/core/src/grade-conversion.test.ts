import { describe, it, expect } from "vitest";
import {
  disciplineOf,
  gradeRank,
  gradesForSystem,
  resolveGrade,
  type GradeEquivalency,
} from "./grade-conversion";

// French + YDS share the rope discipline (same rank scale); Font is boulder.
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
    gradingSystemId: 2,
    slug: "yds",
    grade: "5.10a",
    rank: 10,
    discipline: "rope",
  },
  {
    gradingSystemId: 2,
    slug: "yds",
    grade: "5.10c",
    rank: 20,
    discipline: "rope",
  },
  {
    gradingSystemId: 2,
    slug: "yds",
    grade: "5.11a",
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
  {
    gradingSystemId: 3,
    slug: "font",
    grade: "7A",
    rank: 20,
    discipline: "boulder",
  },
];
const systems = [
  { id: 1, name: "French", slug: "french" },
  { id: 2, name: "YDS", slug: "yds" },
  { id: 3, name: "Font", slug: "font" },
];

describe("disciplineOf", () => {
  it("maps known slugs and returns null for unknown", () => {
    expect(disciplineOf("french", eqs)).toBe("rope");
    expect(disciplineOf("font", eqs)).toBe("boulder");
    expect(disciplineOf("nope", eqs)).toBeNull();
  });
});

describe("gradeRank", () => {
  it("finds the rank case-insensitively, null when unknown", () => {
    expect(gradeRank("6b", 1, eqs)).toBe(20);
    expect(gradeRank("6B", 1, eqs)).toBe(20);
    expect(gradeRank(" 6c ", 1, eqs)).toBe(30);
    expect(gradeRank("9c", 1, eqs)).toBeNull();
    expect(gradeRank("6b", 99, eqs)).toBeNull();
  });
});

describe("gradesForSystem", () => {
  it("lists a system's grades in ascending difficulty", () => {
    expect(gradesForSystem("french", eqs)).toEqual(["6a", "6b", "6c"]);
  });
});

describe("resolveGrade", () => {
  it("passes through when the preferred system is the route's own", () => {
    const r = resolveGrade("6b", 1, systems, { rope: 1 }, eqs);
    expect(r.grade).toBe("6b");
    expect(r.originalGrade).toBeNull();
  });
  it("converts to the preferred rope system (nearest rank)", () => {
    const r = resolveGrade("6b", 1, systems, { rope: 2 }, eqs);
    expect(r.grade).toBe("5.10c"); // rank 20 → yds rank 20
    expect(r.originalGrade).toBe("6b");
    expect(r.systemName).toBe("YDS");
  });
  it("does not convert across disciplines (boulder route, rope pref)", () => {
    const r = resolveGrade("6A", 3, systems, { rope: 1, boulder: null }, eqs);
    expect(r.grade).toBe("6A");
    expect(r.originalGrade).toBeNull();
  });
});
