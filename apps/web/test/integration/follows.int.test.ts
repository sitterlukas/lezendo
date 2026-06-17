import { describe, it, expect } from "vitest";
import db from "@whipperbook/db";
import { makeUser, resetDb } from "./db";

describe("integration harness", () => {
  it("starts from an empty users table each test", async () => {
    await resetDb();
    const id = await makeUser("Alice");
    const rows = await db.selectFrom("users").selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(id);
  });
});
