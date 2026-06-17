import { describe, it, expect, beforeAll } from "vitest";
import { signAccessToken, verifyAccessToken } from "@/lib/api/tokens";

// signAccessToken/verifyAccessToken are pure (no DB) — they only need a secret.
beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-access-tokens";
});

describe("access tokens", () => {
  it("round-trips the user id and role", async () => {
    const token = await signAccessToken({ id: 42, role: "admin" });
    const payload = await verifyAccessToken(token);
    expect(payload).toEqual({ userId: 42, role: "admin" });
  });

  it("rejects a garbage token", async () => {
    expect(await verifyAccessToken("not-a-jwt")).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signAccessToken({ id: 1, role: "member" });
    // Flip the last character of the signature.
    const tampered = token.slice(0, -1) + (token.at(-1) === "a" ? "b" : "a");
    expect(await verifyAccessToken(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signAccessToken({ id: 1, role: "member" });
    process.env.AUTH_SECRET = "a-different-secret";
    try {
      expect(await verifyAccessToken(token)).toBeNull();
    } finally {
      process.env.AUTH_SECRET = "test-secret-for-access-tokens";
    }
  });
});
