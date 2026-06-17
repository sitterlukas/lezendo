import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { leaderboardQuery } from "@whipperbook/api-client";
import { parsePeriod, parseDiscipline } from "@whipperbook/core";
import LeaderboardsClient, {
  type LeaderboardResponse,
} from "./leaderboards-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboards",
  description:
    "See the top climbers by points across sport, bouldering and combined disciplines on Whipperbook.",
  alternates: { canonical: "/leaderboards" },
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; discipline?: string }>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const discipline = parseDiscipline(params.discipline);

  const qc = makeQueryClient();
  const api = await serverApi();
  await qc.prefetchQuery(
    leaderboardQuery<LeaderboardResponse>(api, { period, discipline }),
  );

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <LeaderboardsClient period={period} discipline={discipline} />
    </HydrationBoundary>
  );
}
