import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { settingsQuery, ApiError } from "@whipperbook/api-client";
import SettingsClient, { type SettingsResponse } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const qc = makeQueryClient();
  const api = await serverApi();
  try {
    await qc.fetchQuery(settingsQuery<SettingsResponse>(api));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect("/login");
    }
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <SettingsClient />
    </HydrationBoundary>
  );
}
