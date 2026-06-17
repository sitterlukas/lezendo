import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import db from "@whipperbook/db";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { routeDetailQuery, ApiError } from "@whipperbook/api-client";
import RouteDetailClient, { type RouteDetailData } from "./route-detail-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cragId: string; routeId: string }>;
}): Promise<Metadata> {
  const { cragId, routeId } = await params;
  const c = Number(cragId);
  const r = Number(routeId);
  if (!Number.isInteger(c) || !Number.isInteger(r)) return {};
  const route = await db
    .selectFrom("routes")
    .innerJoin("crags", "crags.id", "routes.crag_id")
    .select([
      "routes.name as name",
      "routes.grade as grade",
      "routes.description as description",
      "crags.name as cragName",
    ])
    .where("routes.id", "=", r)
    .where("routes.crag_id", "=", c)
    .where("routes.deleted", "=", false)
    .executeTakeFirst();
  if (!route) return {};
  const title = `${route.name} (${route.grade}) · ${route.cragName}`;
  const description =
    route.description ??
    `${route.name}, graded ${route.grade}, at ${route.cragName}. Beta, topos and ascents on Whipperbook.`;
  const url = `/crags/${c}/routes/${r}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function RoutePage({
  params,
}: {
  params: Promise<{ cragId: string; routeId: string }>;
}) {
  const { cragId, routeId } = await params;
  const cragIdNum = Number(cragId);
  const routeIdNum = Number(routeId);
  if (!Number.isInteger(cragIdNum) || !Number.isInteger(routeIdNum)) notFound();

  const qc = makeQueryClient();
  const api = await serverApi();
  try {
    await qc.fetchQuery(
      routeDetailQuery<RouteDetailData>(api, cragIdNum, routeIdNum),
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <RouteDetailClient cragId={cragIdNum} routeId={routeIdNum} />
    </HydrationBoundary>
  );
}
