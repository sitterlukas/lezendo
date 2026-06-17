import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { gearQuery } from "@whipperbook/api-client";
import ProfileGearClient from "./profile-gear-client";
import { type GearResponse } from "@/app/gear/gear-client";

export const dynamic = "force-dynamic";

export default async function ProfileGearPage() {
  const qc = makeQueryClient();
  const api = await serverApi();
  await qc.prefetchQuery(gearQuery<GearResponse>(api));

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ProfileGearClient />
    </HydrationBoundary>
  );
}
