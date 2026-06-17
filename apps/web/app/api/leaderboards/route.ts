import { route, ok } from "@/lib/api/respond";
import { getUser } from "@/lib/api/auth";
import { parsePeriod, parseDiscipline } from "@whipperbook/core";
import { getLeaderboard } from "@/lib/queries/leaderboards";

// GET /api/leaderboards?period=&discipline= — top climbers + viewer rank.
export const GET = route(async (request) => {
  const sp = new URL(request.url).searchParams;
  const period = parsePeriod(sp.get("period") ?? undefined);
  const discipline = parseDiscipline(sp.get("discipline") ?? undefined);
  const viewer = await getUser(request);
  return ok(await getLeaderboard(period, discipline, viewer?.id ?? null));
});
