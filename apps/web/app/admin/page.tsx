import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { ServerFetchError } from "@/lib/api/server-fetch";
import { adminDeletedQuery } from "@whipperbook/api-client";
import AdminClient, { type AdminDeletedResponse } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const qc = makeQueryClient();
  const api = await serverApi();
  try {
    await qc.fetchQuery(adminDeletedQuery<AdminDeletedResponse>(api));
  } catch (err) {
    if (err instanceof ServerFetchError) {
      if (err.status === 401) redirect("/login");
      if (err.status === 403) redirect("/crags");
    }
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <AdminClient />
    </HydrationBoundary>
  );
}
