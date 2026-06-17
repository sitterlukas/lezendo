import { route, ok } from "@/lib/api/respond";
import { getUser } from "@/lib/api/auth";
import { parsePeriod, parseDiscipline } from "@whipperbook/core";
import { getHome } from "@/lib/queries/home";

// GET /api/home?period=&discipline= — landing page bundle.
export const GET = route(async (request) => {
  const sp = new URL(request.url).searchParams;
  const period = parsePeriod(sp.get("period") ?? undefined);
  const discipline = parseDiscipline(sp.get("discipline") ?? undefined);
  const viewer = await getUser(request);
  return ok(
    await getHome(period, discipline, viewer ? { id: viewer.id } : null),
  );
});
