import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/users/[id]/follow — follow a user (replaces followUser).
export const POST = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const followeeId = Number((await params).id);
  if (!Number.isInteger(followeeId) || followeeId === user.id) {
    return fail("Invalid user.", 400);
  }

  // Idempotent: ignore if the follow already exists.
  await db
    .insertInto("follows")
    .values({ follower_id: user.id, followee_id: followeeId })
    .onConflict((oc) => oc.columns(["follower_id", "followee_id"]).doNothing())
    .execute();

  return ok({ following: true });
});

// DELETE /api/users/[id]/follow — unfollow a user (replaces unfollowUser).
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const followeeId = Number((await params).id);
  if (!Number.isInteger(followeeId)) return fail("Invalid user.", 400);

  await db
    .deleteFrom("follows")
    .where("follower_id", "=", user.id)
    .where("followee_id", "=", followeeId)
    .execute();

  return ok({ following: false });
});
