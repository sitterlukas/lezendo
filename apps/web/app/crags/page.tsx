import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { cragsListQuery } from "@whipperbook/api-client";
import CragsClient, { type CragsResponse } from "./crags-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crags",
  description:
    "Browse climbing crags — sport, trad and bouldering — with sectors, routes, grades and topos on Whipperbook.",
  alternates: { canonical: "/crags" },
};

export default async function CragsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const params = {
    q: sp.q?.trim() || undefined,
    country: sp.country?.trim() || undefined,
    page: sp.page ? Math.max(1, Number(sp.page) || 1) : undefined,
  };

  const qc = makeQueryClient();
  const api = await serverApi();
  await qc.prefetchQuery(cragsListQuery<CragsResponse>(api, params));

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <CragsClient {...params} />
    </HydrationBoundary>
  );
}
