import { describe, it, expect } from "vitest";
import { reviveDates } from "@/lib/api/json";

describe("reviveDates", () => {
  it("revives full ISO datetime strings to Date", () => {
    const out = reviveDates({ created_at: "2026-06-12T20:28:34.865Z" });
    expect(out.created_at).toBeInstanceOf(Date);
    expect((out.created_at as unknown as Date).toISOString()).toBe(
      "2026-06-12T20:28:34.865Z",
    );
  });

  it("leaves date-only strings (YYYY-MM-DD) as strings", () => {
    const out = reviveDates({ activity_date: "2026-06-12" });
    expect(out.activity_date).toBe("2026-06-12");
  });

  it("leaves ordinary strings untouched", () => {
    expect(reviveDates({ name: "Smith Rock" }).name).toBe("Smith Rock");
  });

  it("does not revive user text that happens to look like a datetime", () => {
    // A forum post / status whose body is literally an ISO datetime must stay
    // a string — only timestamp-named keys are revived.
    const out = reviveDates({ body: "2026-06-12T20:28:34.865Z" });
    expect(out.body).toBe("2026-06-12T20:28:34.865Z");
  });

  it("recurses into nested arrays and objects", () => {
    const out = reviveDates({
      items: [{ comments: [{ createdAt: "2026-01-02T03:04:05Z" }] }],
    });
    expect(out.items[0].comments[0].createdAt).toBeInstanceOf(Date);
  });

  it("handles null and primitives", () => {
    expect(reviveDates(null)).toBeNull();
    expect(reviveDates(42)).toBe(42);
  });
});
