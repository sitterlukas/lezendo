import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { gearQuery } from "@whipperbook/api-client";
import GearClient, { type GearResponse } from "./gear-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gear",
  description:
    "Climbing gear reviews and ratings — ropes, harnesses, shoes, protection and more — from the Whipperbook community.",
  alternates: { canonical: "/gear" },
};

export default async function GearPage() {
  const qc = makeQueryClient();
  const api = await serverApi();
  await qc.prefetchQuery(gearQuery<GearResponse>(api));

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <GearClient />
    </HydrationBoundary>
  );
}
