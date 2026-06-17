import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import db from "@whipperbook/db";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { sectorDetailQuery, ApiError } from "@whipperbook/api-client";
import SectorDetailClient, {
  type SectorDetailData,
} from "./sector-detail-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cragId: string; sectorId: string }>;
}): Promise<Metadata> {
  const { cragId, sectorId } = await params;
  const c = Number(cragId);
  const s = Number(sectorId);
  if (!Number.isInteger(c) || !Number.isInteger(s)) return {};
  const sector = await db
    .selectFrom("sectors")
    .innerJoin("crags", "crags.id", "sectors.crag_id")
    .select([
      "sectors.name as name",
      "sectors.description as description",
      "crags.name as cragName",
    ])
    .where("sectors.id", "=", s)
    .where("sectors.crag_id", "=", c)
    .where("sectors.deleted", "=", false)
    .executeTakeFirst();
  if (!sector) return {};
  const title = `${sector.name} · ${sector.cragName}`;
  const description =
    sector.description ??
    `Routes and topos at ${sector.name}, ${sector.cragName}, on Whipperbook.`;
  const url = `/crags/${c}/sectors/${s}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function SectorPage({
  params,
}: {
  params: Promise<{ cragId: string; sectorId: string }>;
}) {
  const { cragId, sectorId } = await params;
  const cragIdNum = Number(cragId);
  const sectorIdNum = Number(sectorId);
  if (!Number.isInteger(cragIdNum) || !Number.isInteger(sectorIdNum))
    notFound();

  const qc = makeQueryClient();
  const api = await serverApi();
  try {
    await qc.fetchQuery(
      sectorDetailQuery<SectorDetailData>(api, cragIdNum, sectorIdNum),
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <SectorDetailClient cragId={cragIdNum} sectorId={sectorIdNum} />
    </HydrationBoundary>
  );
}
