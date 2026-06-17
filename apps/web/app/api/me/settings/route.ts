import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { auth } from "@/auth";
import { getSettingsData } from "@/lib/queries/me";

// GET /api/me/settings — the profile settings bundle (user, grading systems,
// follow lists) plus the login provider (from the cookie session).
export const GET = route(async (request) => {
  const user = await requireUser(request);
  const data = await getSettingsData(user.id);
  if (!data) return fail("User not found.", 404);
  const provider = (await auth())?.provider ?? null;
  return ok({ ...data, provider });
});
