import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { homeQuery } from "@whipperbook/api-client";
import { parsePeriod, parseDiscipline } from "@whipperbook/core";
import HomeClient, { type HomeResponse } from "./home-client";

export const dynamic = "force-dynamic";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; discipline?: string }>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const discipline = parseDiscipline(params.discipline);

  const qc = makeQueryClient();
  const api = await serverApi();
  await qc.prefetchQuery(homeQuery<HomeResponse>(api, { period, discipline }));

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <HomeClient period={period} discipline={discipline} />
    </HydrationBoundary>
  );
}
