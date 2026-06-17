import db from "@/lib/db";
import {
  buildFeed,
  suggestedUsers,
  loadSectorOptions,
  type FeedItem,
} from "@/lib/feed";
import { type SectorOption } from "@/app/ui/sector-select";

export type FeedPageData = {
  viewer: { id: number; role: string };
  items: FeedItem[];
  nextCursor: Date | null;
  sectors: SectorOption[];
  followsNobody: boolean;
  suggestions: { id: number; name: string; avatarUrl: string | null }[];
};

// The initial feed page bundle for a signed-in viewer. "Load more" continues
// via GET /api/feed.
export async function getFeedPage(viewer: {
  id: number;
  role: string;
}): Promise<FeedPageData> {
  const [{ items, nextCursor }, sectors, followRow] = await Promise.all([
    buildFeed(db, viewer.id),
    loadSectorOptions(db),
    db
      .selectFrom("follows")
      .select("followee_id")
      .where("follower_id", "=", viewer.id)
      .limit(1)
      .executeTakeFirst(),
  ]);

  const followsNobody = !followRow;
  const suggestions = followsNobody ? await suggestedUsers(db, viewer.id) : [];

  return { viewer, items, nextCursor, sectors, followsNobody, suggestions };
}
