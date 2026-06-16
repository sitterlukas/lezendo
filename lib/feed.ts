import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { Database, TickType } from "@/lib/db";

export type FeedAuthor = {
  id: number;
  name: string;
  avatarUrl: string | null;
};
export type FeedPhoto = { id: number; url: string; uploaded_by: number | null };

type FeedBase = {
  id: number;
  author: FeedAuthor;
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export type FeedItem =
  | (FeedBase & {
      kind: "status";
      body: string;
      crag: { id: number; name: string } | null;
      route: {
        id: number;
        name: string;
        grade: string;
        crag: { id: number; name: string };
      } | null;
      photos: FeedPhoto[];
    })
  | (FeedBase & {
      kind: "ascent";
      tickType: TickType;
      route: { id: number; name: string; grade: string };
      crag: { id: number; name: string };
    });

export type FeedPage = { items: FeedItem[]; nextCursor: Date | null };

const PAGE_SIZE = 20;

// Pure: order feed items newest-first. Sorts a copy (no mutation) so it's easy
// to unit-test. Ties broken by id desc for determinism.
export function sortFeedNewestFirst(items: FeedItem[]): FeedItem[] {
  return [...items].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
  );
}

// Build a feed of statuses + ascents authored by `authorIds`, newest first.
// `before` pages backwards by created_at. Returns up to PAGE_SIZE items plus a
// cursor (the oldest item's createdAt) when more may exist.
async function buildFor(
  db: Kysely<Database>,
  viewerId: number | null,
  authorIds: number[],
  before: Date | null,
  limit = PAGE_SIZE,
): Promise<FeedPage> {
  if (authorIds.length === 0) return { items: [], nextCursor: null };

  let statusQ = db
    .selectFrom("statuses")
    .innerJoin("users", "users.id", "statuses.user_id")
    .leftJoin("crags", "crags.id", "statuses.crag_id")
    .leftJoin("routes as sr", "sr.id", "statuses.route_id")
    .leftJoin("crags as rc", "rc.id", "sr.crag_id")
    .select([
      "statuses.id",
      "statuses.body",
      "statuses.created_at",
      "users.id as author_id",
      "users.name as author_name",
      "users.avatar_url as author_avatar",
      "crags.id as crag_id",
      "crags.name as crag_name",
      "sr.id as route_id",
      "sr.name as route_name",
      "sr.grade as route_grade",
      "rc.id as route_crag_id",
      "rc.name as route_crag_name",
    ])
    .where("statuses.user_id", "in", authorIds)
    .orderBy("statuses.created_at", "desc")
    .limit(limit);
  if (before) statusQ = statusQ.where("statuses.created_at", "<", before);

  let ascentQ = db
    .selectFrom("ascents")
    .innerJoin("users", "users.id", "ascents.user_id")
    .innerJoin("routes", "routes.id", "ascents.route_id")
    .innerJoin("crags", "crags.id", "routes.crag_id")
    .select([
      "ascents.id",
      "ascents.tick_type",
      "ascents.created_at",
      "users.id as author_id",
      "users.name as author_name",
      "users.avatar_url as author_avatar",
      "routes.id as route_id",
      "routes.name as route_name",
      "routes.grade",
      "crags.id as crag_id",
      "crags.name as crag_name",
    ])
    .where("ascents.user_id", "in", authorIds)
    .orderBy("ascents.created_at", "desc")
    .limit(limit);
  if (before) ascentQ = ascentQ.where("ascents.created_at", "<", before);

  const [statusRows, ascentRows] = await Promise.all([
    statusQ.execute(),
    ascentQ.execute(),
  ]);

  // Photos for the fetched statuses, in one query.
  const statusIds = statusRows.map((r) => r.id);
  const photosByStatus = new Map<number, FeedPhoto[]>();
  if (statusIds.length > 0) {
    const photos = await db
      .selectFrom("images")
      .select(["id", "url", "uploaded_by", "entity_id"])
      .where("entity_type", "=", "status")
      .where("entity_id", "in", statusIds)
      .orderBy("id")
      .execute();
    for (const p of photos) {
      const list = photosByStatus.get(p.entity_id) ?? [];
      list.push({ id: p.id, url: p.url, uploaded_by: p.uploaded_by });
      photosByStatus.set(p.entity_id, list);
    }
  }

  const merged: FeedItem[] = [
    ...statusRows.map(
      (r): FeedItem => ({
        kind: "status",
        id: r.id,
        author: {
          id: r.author_id,
          name: r.author_name,
          avatarUrl: r.author_avatar,
        },
        createdAt: r.created_at,
        body: r.body,
        crag: r.crag_id != null ? { id: r.crag_id, name: r.crag_name! } : null,
        route:
          r.route_id != null
            ? {
                id: r.route_id,
                name: r.route_name!,
                grade: r.route_grade!,
                crag: { id: r.route_crag_id!, name: r.route_crag_name! },
              }
            : null,
        photos: photosByStatus.get(r.id) ?? [],
        likeCount: 0,
        likedByMe: false,
        commentCount: 0,
      }),
    ),
    ...ascentRows.map(
      (r): FeedItem => ({
        kind: "ascent",
        id: r.id,
        author: {
          id: r.author_id,
          name: r.author_name,
          avatarUrl: r.author_avatar,
        },
        createdAt: r.created_at,
        tickType: r.tick_type,
        route: { id: r.route_id, name: r.route_name, grade: r.grade },
        crag: { id: r.crag_id, name: r.crag_name },
        likeCount: 0,
        likedByMe: false,
        commentCount: 0,
      }),
    ),
  ];

  const items = sortFeedNewestFirst(merged).slice(0, limit);

  await attachInteractions(db, viewerId, items);

  // If both source queries returned a full page, there may be more.
  const more =
    statusRows.length === limit || ascentRows.length === limit
      ? (items[items.length - 1]?.createdAt ?? null)
      : null;
  return { items, nextCursor: items.length === limit ? more : null };
}

// Batch-load like counts, liked-by-me, and comment counts for the given items.
async function attachInteractions(
  db: Kysely<Database>,
  viewerId: number | null,
  items: FeedItem[],
): Promise<void> {
  if (items.length === 0) return;
  const statusIds = items.filter((i) => i.kind === "status").map((i) => i.id);
  const ascentIds = items.filter((i) => i.kind === "ascent").map((i) => i.id);

  async function counts(table: "likes" | "comments") {
    const rows = await db
      .selectFrom(table)
      .select((eb) => [
        "target_type",
        "target_id",
        eb.fn.countAll<number>().as("n"),
      ])
      .where((eb) =>
        eb.or([
          eb.and([
            eb("target_type", "=", "status"),
            eb("target_id", "in", statusIds.length ? statusIds : [-1]),
          ]),
          eb.and([
            eb("target_type", "=", "ascent"),
            eb("target_id", "in", ascentIds.length ? ascentIds : [-1]),
          ]),
        ]),
      )
      .groupBy(["target_type", "target_id"])
      .execute();
    const map = new Map<string, number>();
    for (const r of rows)
      map.set(`${r.target_type}:${r.target_id}`, Number(r.n));
    return map;
  }

  const [likeCounts, commentCounts] = await Promise.all([
    counts("likes"),
    counts("comments"),
  ]);

  let likedSet = new Set<string>();
  if (viewerId !== null) {
    const liked = await db
      .selectFrom("likes")
      .select(["target_type", "target_id"])
      .where("user_id", "=", viewerId)
      .where((eb) =>
        eb.or([
          eb.and([
            eb("target_type", "=", "status"),
            eb("target_id", "in", statusIds.length ? statusIds : [-1]),
          ]),
          eb.and([
            eb("target_type", "=", "ascent"),
            eb("target_id", "in", ascentIds.length ? ascentIds : [-1]),
          ]),
        ]),
      )
      .execute();
    likedSet = new Set(liked.map((r) => `${r.target_type}:${r.target_id}`));
  }

  for (const item of items) {
    const key = `${item.kind}:${item.id}`;
    item.likeCount = likeCounts.get(key) ?? 0;
    item.commentCount = commentCounts.get(key) ?? 0;
    item.likedByMe = likedSet.has(key);
  }
}

async function followeeIds(
  db: Kysely<Database>,
  userId: number,
): Promise<number[]> {
  const rows = await db
    .selectFrom("follows")
    .select("followee_id")
    .where("follower_id", "=", userId)
    .execute();
  return rows.map((r) => r.followee_id);
}

// The home feed: people you follow + yourself.
export async function buildFeed(
  db: Kysely<Database>,
  viewerId: number,
  before: Date | null = null,
): Promise<FeedPage> {
  const ids = [...new Set([...(await followeeIds(db, viewerId)), viewerId])];
  return buildFor(db, viewerId, ids, before);
}

// A single user's timeline (for their profile page).
export async function buildProfileTimeline(
  db: Kysely<Database>,
  viewerId: number | null,
  profileId: number,
  before: Date | null = null,
): Promise<FeedPage> {
  return buildFor(db, viewerId, [profileId], before);
}

export type FeedComment = {
  id: number;
  author: FeedAuthor;
  body: string;
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
};

export async function loadComments(
  db: Kysely<Database>,
  targetType: "status" | "ascent",
  targetId: number,
  viewerId: number | null = null,
): Promise<FeedComment[]> {
  const rows = await db
    .selectFrom("comments")
    .innerJoin("users", "users.id", "comments.user_id")
    .select([
      "comments.id",
      "comments.body",
      "comments.created_at",
      "users.id as author_id",
      "users.name as author_name",
      "users.avatar_url as author_avatar",
    ])
    .where("comments.target_type", "=", targetType)
    .where("comments.target_id", "=", targetId)
    .orderBy("comments.created_at", "asc")
    .execute();

  // Batch-load like counts (+ which the viewer liked) for these comments.
  const ids = rows.map((r) => r.id);
  const likeCounts = new Map<number, number>();
  const likedByMe = new Set<number>();
  if (ids.length > 0) {
    const counts = await db
      .selectFrom("likes")
      .select((eb) => ["target_id", eb.fn.countAll<number>().as("n")])
      .where("target_type", "=", "comment")
      .where("target_id", "in", ids)
      .groupBy("target_id")
      .execute();
    for (const c of counts) likeCounts.set(c.target_id, Number(c.n));

    if (viewerId !== null) {
      const mine = await db
        .selectFrom("likes")
        .select("target_id")
        .where("user_id", "=", viewerId)
        .where("target_type", "=", "comment")
        .where("target_id", "in", ids)
        .execute();
      for (const m of mine) likedByMe.add(m.target_id);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    author: {
      id: r.author_id,
      name: r.author_name,
      avatarUrl: r.author_avatar,
    },
    body: r.body,
    createdAt: r.created_at,
    likeCount: likeCounts.get(r.id) ?? 0,
    likedByMe: likedByMe.has(r.id),
  }));
}

// A few users to suggest following: most-followed, excluding the viewer and
// anyone they already follow. Used on the empty feed.
export async function suggestedUsers(
  db: Kysely<Database>,
  viewerId: number,
  limit = 5,
): Promise<
  { id: number; name: string; avatarUrl: string | null; followers: number }[]
> {
  const exclude = [...(await followeeIds(db, viewerId)), viewerId];
  const rows = await db
    .selectFrom("users")
    .leftJoin("follows", "follows.followee_id", "users.id")
    .select((eb) => [
      "users.id",
      "users.name",
      "users.avatar_url",
      eb.fn.count<number>("follows.follower_id").as("followers"),
    ])
    .where("users.id", "not in", exclude)
    .groupBy(["users.id", "users.name", "users.avatar_url"])
    .orderBy(sql`count(follows.follower_id)`, "desc")
    .orderBy("users.id", "desc")
    .limit(limit)
    .execute();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    avatarUrl: r.avatar_url,
    followers: Number(r.followers),
  }));
}
