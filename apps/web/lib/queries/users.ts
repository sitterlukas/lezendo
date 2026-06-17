import db from "@/lib/db";
import {
  buildProfileTimeline,
  loadSectorOptions,
  type FeedItem,
} from "@/lib/feed";
import { type SectorOption } from "@/app/ui/sector-select";

export type UserProfileData = {
  profile: { id: number; name: string; avatar_url: string | null };
  viewer: { id: number; role: string } | null;
  isSelf: boolean;
  viewerFollows: boolean;
  followers: number;
  following: number;
  items: FeedItem[];
  sectors: SectorOption[];
};

// Everything the public profile page renders. Returns null when the user
// doesn't exist so the route can answer 404.
export async function getUserProfile(
  profileId: number,
  viewer: { id: number; role: string } | null,
): Promise<UserProfileData | null> {
  const profile = await db
    .selectFrom("users")
    .select(["id", "name", "avatar_url"])
    .where("id", "=", profileId)
    .executeTakeFirst();
  if (!profile) return null;

  const isSelf = viewer?.id === profileId;

  const [followersRow, followingRow, viewerFollowsRow] = await Promise.all([
    db
      .selectFrom("follows")
      .select((eb) => eb.fn.countAll<number>().as("followers"))
      .where("followee_id", "=", profileId)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("follows")
      .select((eb) => eb.fn.countAll<number>().as("following"))
      .where("follower_id", "=", profileId)
      .executeTakeFirstOrThrow(),
    viewer && !isSelf
      ? db
          .selectFrom("follows")
          .select("follower_id")
          .where("follower_id", "=", viewer.id)
          .where("followee_id", "=", profileId)
          .executeTakeFirst()
      : Promise.resolve(null),
  ]);

  const { items } = await buildProfileTimeline(
    db,
    viewer?.id ?? null,
    profileId,
  );

  // The edit dialog (own/admin statuses only) needs the sector options.
  const canEdit = isSelf || viewer?.role === "admin";
  const sectors = canEdit ? await loadSectorOptions(db) : [];

  return {
    profile,
    viewer,
    isSelf,
    viewerFollows: !!viewerFollowsRow,
    followers: Number(followersRow.followers),
    following: Number(followingRow.following),
    items,
    sectors,
  };
}
