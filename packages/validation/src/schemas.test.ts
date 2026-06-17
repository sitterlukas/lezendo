import { describe, it, expect } from "vitest";
import { routeWriteSchema, requiredInt } from "./schemas";

describe("requiredInt", () => {
  it("rejects empty/missing with the given message", () => {
    const r = requiredInt("Pick one.", { min: 1 }).safeParse("");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Pick one.");
  });
  it("coerces numeric strings", () => {
    expect(requiredInt("x", { min: 1 }).parse("12")).toBe(12);
  });
});

describe("routeWriteSchema", () => {
  it("requires crag_id (closes the Number(null)===0 hole)", () => {
    const r = routeWriteSchema.safeParse({
      name: "A",
      grade: "6a",
      style: "sport",
      grading_system_id: "1",
    });
    expect(r.success).toBe(false);
  });
});
