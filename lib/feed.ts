import type { Kysely, ExpressionBuilder } from "kysely";
import { sql } from "kysely";
import type { Database, TickType } from "@/lib/db";
import { buildRoutePoints } from "@/lib/points";
import { resolveGrade } from "@/lib/grade-conversion";
import { loadGradeEquivalencies } from "@/lib/grade-data";

export type FeedAuthor = {
  id: number;
  name: string;
  avatarUrl: string | null;
};
export type FeedPhoto = { id: number; url: string; uploaded_by: number | null };

export type FeedComment = {
  id: number;
  author: FeedAuthor;
  body: string;
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
};

type FeedBase = {
  id: number;
  author: FeedAuthor;
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  comments: FeedComment[];
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
      // One post per (climber, day) across crags: a lone tick or several
      // batched. `id` (FeedBase) is the stable ascent_activity id — likes/
      // comments attach to it, so they survive logging more climbs that day.
      climbs: {
        id: number;
        tickType: TickType;
        route: { id: number; name: string; grade: string };
        crag: { id: number; name: string };
        points: number | null;
      }[];
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
      "sr.grading_system_id as route_grading_system_id",
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
      "ascents.activity_id",
      "ascents.tick_type",
      "ascents.ascent_date",
      "ascents.created_at",
      "users.id as author_id",
      "users.name as author_name",
      "users.avatar_url as author_avatar",
      "routes.id as route_id",
      "routes.name as route_name",
      "routes.grade",
      "routes.grading_system_id",
      "crags.id as crag_id",
      "crags.name as crag_name",
    ])
    .where("ascents.user_id", "in", authorIds)
    .orderBy("ascents.created_at", "desc")
    .limit(limit);
  if (before) ascentQ = ascentQ.where("ascents.created_at", "<", before);

  // Grade data + the viewer's grading preference, fetched alongside the feed
  // rows so route grades can be shown in the viewer's preferred system.
  const [statusRows, ascentRows, equivalencies, gradingSystems, prefsRow] =
    await Promise.all([
      statusQ.execute(),
      ascentQ.execute(),
      loadGradeEquivalencies(),
      db
        .selectFrom("grading_systems")
        .select(["id", "name", "slug"])
        .orderBy("id")
        .execute(),
      viewerId === null
        ? Promise.resolve(null)
        : db
            .selectFrom("users")
            .select([
              "preferred_rope_grading_system_id",
              "preferred_boulder_grading_system_id",
            ])
            .where("id", "=", viewerId)
            .executeTakeFirst(),
    ]);

  // Display a route's grade in the viewer's preferred system (falls back to the
  // route's own grade when no conversion applies).
  const prefs = {
    rope: prefsRow?.preferred_rope_grading_system_id,
    boulder: prefsRow?.preferred_boulder_grading_system_id,
  };
  const showGrade = (grade: string, systemId: number) =>
    resolveGrade(grade, systemId, gradingSystems, prefs, equivalencies).grade;

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

  // Points each ascent's route is worth (same scoring as the leaderboard).
  const routePoints =
    ascentRows.length > 0 ? buildRoutePoints(equivalencies) : null;

  const statusItems = statusRows.map(
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
              grade: showGrade(r.route_grade!, r.route_grading_system_id!),
              crag: { id: r.route_crag_id!, name: r.route_crag_name! },
            }
          : null,
      photos: photosByStatus.get(r.id) ?? [],
      likeCount: 0,
      likedByMe: false,
      commentCount: 0,
      comments: [],
    }),
  );

  // Batch by the stable ascent_activity (one per climber/crag/day). The
  // activity id is the post's identity, so likes/comments survive logging more
  // climbs that day.
  const ascentGroups = new Map<number, typeof ascentRows>();
  for (const r of ascentRows) {
    const key = r.activity_id ?? r.id;
    const group = ascentGroups.get(key) ?? [];
    group.push(r);
    ascentGroups.set(key, group);
  }
  const ascentItems: FeedItem[] = [...ascentGroups.entries()].map(
    ([activityId, group]) => {
      // Latest log sets the post's sort time + author display.
      const rep = group.reduce((a, b) => (b.created_at > a.created_at ? b : a));
      const climbs = [...group]
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
        .map((r) => ({
          id: r.id,
          tickType: r.tick_type,
          route: {
            id: r.route_id,
            name: r.route_name,
            grade: showGrade(r.grade, r.grading_system_id),
          },
          crag: { id: r.crag_id, name: r.crag_name },
          points: routePoints?.(r.grading_system_id, r.grade) ?? null,
        }));
      return {
        kind: "ascent",
        id: activityId,
        author: {
          id: rep.author_id,
          name: rep.author_name,
          avatarUrl: rep.author_avatar,
        },
        createdAt: rep.created_at,
        climbs,
        likeCount: 0,
        likedByMe: false,
        commentCount: 0,
        comments: [],
      };
    },
  );

  const items = sortFeedNewestFirst([...statusItems, ...ascentItems]).slice(
    0,
    limit,
  );

  // Likes for the items and their comments load independently — run together.
  await Promise.all([
    attachLikes(db, viewerId, items),
    attachComments(db, viewerId, items),
  ]);

  // If both source queries returned a full page, there may be more.
  const more =
    statusRows.length === limit || ascentRows.length === limit
      ? (items[items.length - 1]?.createdAt ?? null)
      : null;
  return { items, nextCursor: items.length === limit ? more : null };
}

// Feed items map to interaction target types: statuses → 'status', ascent
// activities → 'activity'. (Comments are their own 'comment' target type.)
function targetTypeForKind(kind: "status" | "ascent"): "status" | "activity" {
  return kind === "ascent" ? "activity" : "status";
}

// Like counts (+ which the viewer liked) for the feed items, batched in two
// queries regardless of how many items there are.
async function attachLikes(
  db: Kysely<Database>,
  viewerId: number | null,
  items: FeedItem[],
): Promise<void> {
  if (items.length === 0) return;
  const statusIds = items.filter((i) => i.kind === "status").map((i) => i.id);
  const activityIds = items.filter((i) => i.kind === "ascent").map((i) => i.id);

  // Restrict a `likes` query to exactly the items' (target_type, target_id) set.
  const matchItems = (eb: ExpressionBuilder<Database, "likes">) =>
    eb.or([
      eb.and([
        eb("target_type", "=", "status"),
        eb("target_id", "in", statusIds.length ? statusIds : [-1]),
      ]),
      eb.and([
        eb("target_type", "=", "activity"),
        eb("target_id", "in", activityIds.length ? activityIds : [-1]),
      ]),
    ]);

  const [counts, liked] = await Promise.all([
    db
      .selectFrom("likes")
      .select((eb) => [
        "target_type",
        "target_id",
        eb.fn.countAll<number>().as("n"),
      ])
      .where(matchItems)
      .groupBy(["target_type", "target_id"])
      .execute(),
    viewerId === null
      ? Promise.resolve([] as { target_type: string; target_id: number }[])
      : db
          .selectFrom("likes")
          .select(["target_type", "target_id"])
          .where("user_id", "=", viewerId)
          .where(matchItems)
          .execute(),
  ]);

  const likeCounts = new Map<string, number>();
  for (const r of counts)
    likeCounts.set(`${r.target_type}:${r.target_id}`, Number(r.n));
  const likedSet = new Set(liked.map((r) => `${r.target_type}:${r.target_id}`));

  for (const item of items) {
    const key = `${targetTypeForKind(item.kind)}:${item.id}`;
    item.likeCount = likeCounts.get(key) ?? 0;
    item.likedByMe = likedSet.has(key);
  }
}

// Batch-load all comments (+ per-comment like state) for the given items in
// one comments query, avoiding an N+1 across the feed.
async function attachComments(
  db: Kysely<Database>,
  viewerId: number | null,
  items: FeedItem[],
): Promise<void> {
  if (items.length === 0) return;
  const statusIds = items.filter((i) => i.kind === "status").map((i) => i.id);
  const activityIds = items.filter((i) => i.kind === "ascent").map((i) => i.id);

  const rows = await db
    .selectFrom("comments")
    .innerJoin("users", "users.id", "comments.user_id")
    .select([
      "comments.id",
      "comments.target_type",
      "comments.target_id",
      "comments.body",
      "comments.created_at",
      "users.id as author_id",
      "users.name as author_name",
      "users.avatar_url as author_avatar",
    ])
    .where((eb) =>
      eb.or([
        eb.and([
          eb("comments.target_type", "=", "status"),
          eb("comments.target_id", "in", statusIds.length ? statusIds : [-1]),
        ]),
        eb.and([
          eb("comments.target_type", "=", "activity"),
          eb(
            "comments.target_id",
            "in",
            activityIds.length ? activityIds : [-1],
          ),
        ]),
      ]),
    )
    .orderBy("comments.created_at", "asc")
    .execute();

  const { counts: likeCounts, liked: likedSet } = await commentLikeStats(
    db,
    viewerId,
    rows.map((r) => r.id),
  );

  const byTarget = new Map<string, FeedComment[]>();
  for (const r of rows) {
    const key = `${r.target_type}:${r.target_id}`;
    const list = byTarget.get(key) ?? [];
    list.push({
      id: r.id,
      author: {
        id: r.author_id,
        name: r.author_name,
        avatarUrl: r.author_avatar,
      },
      body: r.body,
      createdAt: r.created_at,
      likeCount: likeCounts.get(r.id) ?? 0,
      likedByMe: likedSet.has(r.id),
    });
    byTarget.set(key, list);
  }

  for (const item of items) {
    const list =
      byTarget.get(`${targetTypeForKind(item.kind)}:${item.id}`) ?? [];
    item.comments = list;
    item.commentCount = list.length;
  }
}

// Like counts (+ which the viewer liked) for a set of comment ids.
async function commentLikeStats(
  db: Kysely<Database>,
  viewerId: number | null,
  commentIds: number[],
): Promise<{ counts: Map<number, number>; liked: Set<number> }> {
  const counts = new Map<number, number>();
  const liked = new Set<number>();
  if (commentIds.length === 0) return { counts, liked };

  const [countRows, likedRows] = await Promise.all([
    db
      .selectFrom("likes")
      .select((eb) => ["target_id", eb.fn.countAll<number>().as("n")])
      .where("target_type", "=", "comment")
      .where("target_id", "in", commentIds)
      .groupBy("target_id")
      .execute(),
    viewerId === null
      ? Promise.resolve([] as { target_id: number }[])
      : db
          .selectFrom("likes")
          .select("target_id")
          .where("user_id", "=", viewerId)
          .where("target_type", "=", "comment")
          .where("target_id", "in", commentIds)
          .execute(),
  ]);
  for (const c of countRows) counts.set(c.target_id, Number(c.n));
  for (const l of likedRows) liked.add(l.target_id);
  return { counts, liked };
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
