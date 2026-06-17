import { describe, it, expect } from "vitest";
import { timeAgo } from "./time-ago";

const now = new Date("2026-06-16T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("timeAgo", () => {
  it("shows 'just now' under 45s", () => {
    expect(timeAgo(ago(10_000), now)).toBe("just now");
  });
  it("shows minutes", () => {
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5m");
  });
  it("shows hours", () => {
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe("3h");
  });
  it("shows days under a week", () => {
    expect(timeAgo(ago(2 * 86_400_000), now)).toBe("2d");
  });
  it("falls back to an absolute date past a week", () => {
    expect(timeAgo(ago(30 * 86_400_000), now)).toMatch(/May|2026|\d/);
  });
});
