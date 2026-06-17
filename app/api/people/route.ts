import { route, ok } from "@/lib/api/respond";
import { getUser } from "@/lib/api/auth";
import db from "@/lib/db";

// GET /api/people?q=<query> — find people by name or email (email is matched
// but never returned). Excludes the viewer; flags who they already follow.
// Signed-in only (replaces searchPeople).
export const GET = route(async (request) => {
  const viewer = await getUser(request);
  if (!viewer) return ok([]);

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return ok([]);
  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;

  const rows = await db
    .selectFrom("users")
    .select(["id", "name", "avatar_url"])
    .where((eb) =>
      eb.or([eb("name", "ilike", pattern), eb("email", "ilike", pattern)]),
    )
    .where("id", "!=", viewer.id)
    .orderBy("name")
    .limit(10)
    .execute();

  let followed = new Set<number>();
  if (rows.length > 0) {
    const f = await db
      .selectFrom("follows")
      .select("followee_id")
      .where("follower_id", "=", viewer.id)
      .where(
        "followee_id",
        "in",
        rows.map((r) => r.id),
      )
      .execute();
    followed = new Set(f.map((r) => r.followee_id));
  }

  return ok(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatar_url,
      following: followed.has(r.id),
    })),
  );
});
