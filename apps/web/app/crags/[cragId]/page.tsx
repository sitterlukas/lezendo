import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import db from "@whipperbook/db";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { cragDetailQuery, ApiError } from "@whipperbook/api-client";
import CragDetailClient, {
  type CragDetailResponse,
} from "./crag-detail-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cragId: string }>;
}): Promise<Metadata> {
  const id = Number((await params).cragId);
  if (!Number.isInteger(id)) return {};
  const crag = await db
    .selectFrom("crags")
    .select(["name", "description"])
    .where("id", "=", id)
    .where("deleted", "=", false)
    .executeTakeFirst();
  if (!crag) return {};
  const description =
    crag.description ??
    `Routes, sectors and ascents at ${crag.name} on Whipperbook.`;
  const url = `/crags/${id}`;
  return {
    title: crag.name,
    description,
    alternates: { canonical: url },
    openGraph: { title: crag.name, description, url },
  };
}

export default async function CragPage({
  params,
}: {
  params: Promise<{ cragId: string }>;
}) {
  const { cragId } = await params;
  const id = Number(cragId);
  if (!Number.isInteger(id)) notFound();

  const qc = makeQueryClient();
  const api = await serverApi();
  try {
    await qc.fetchQuery(cragDetailQuery<CragDetailResponse>(api, id));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <CragDetailClient cragId={id} />
    </HydrationBoundary>
  );
}
