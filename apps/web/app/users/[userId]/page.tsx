import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { ServerFetchError } from "@/lib/api/server-fetch";
import { userProfileQuery } from "@whipperbook/api-client";
import UserProfileClient, {
  type UserProfileResponse,
} from "./user-profile-client";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdRaw } = await params;
  const profileId = Number(userIdRaw);
  if (!Number.isInteger(profileId)) notFound();

  const qc = makeQueryClient();
  const api = await serverApi();
  try {
    await qc.fetchQuery(userProfileQuery<UserProfileResponse>(api, profileId));
  } catch (err) {
    if (err instanceof ServerFetchError && err.status === 404) notFound();
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <UserProfileClient profileId={profileId} />
    </HydrationBoundary>
  );
}
