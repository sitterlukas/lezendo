import { route, ok, fail } from "@/lib/api/respond";
import { getUser } from "@/lib/api/auth";
import { getUserProfile } from "@whipperbook/db";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/users/[id] — public profile bundle (counts, follow state, timeline).
// 404 when the user doesn't exist.
export const GET = route<Ctx>(async (request, { params }) => {
  const profileId = Number((await params).id);
  if (!Number.isInteger(profileId)) return fail("Invalid user.", 400);
  const viewer = await getUser(request);
  const data = await getUserProfile(
    profileId,
    viewer ? { id: viewer.id, role: viewer.role } : null,
  );
  if (!data) return fail("User not found.", 404);
  return ok(data);
});
