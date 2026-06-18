// Populate the feed for a viewer (default test@whipperbook.dev) with demo
// content: a few climbers they follow, statuses (some with photos), ascent
// activities, likes, and comments — so the mobile/web feed has something to show.
//
// Idempotent: it owns three demo author accounts (…@whipperbook.dev) and wipes
// their feed content + interactions before reseeding. Existing crags/routes are
// reused for the ascents. Run with: node scripts/seed-feed-demo.mjs

import { Pool } from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {}

const VIEWER_EMAIL = "test@whipperbook.dev";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const q = async (text, params) => (await pool.query(text, params)).rows;

const photo = (seed) => `https://picsum.photos/seed/${seed}/900/650`;

const authors = [
  { email: "mara@whipperbook.dev", name: "Mara Boulanger", avatar: 5 },
  { email: "tariq@whipperbook.dev", name: "Tariq Nguyen", avatar: 12 },
  { email: "lena@whipperbook.dev", name: "Lena Ferrata", avatar: 32 },
];

async function upsertAuthor(a) {
  const [row] = await q(
    `INSERT INTO users (name, email, avatar_url, email_verified_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
     RETURNING id`,
    [a.name, a.email, `https://i.pravatar.cc/200?img=${a.avatar}`],
  );
  return row.id;
}

async function main() {
  const [viewer] = await q(`SELECT id FROM users WHERE email = $1`, [
    VIEWER_EMAIL,
  ]);
  if (!viewer)
    throw new Error(`Viewer ${VIEWER_EMAIL} not found — seed it first.`);
  const viewerId = viewer.id;

  const ids = [];
  for (const a of authors) ids.push(await upsertAuthor(a));
  const [mara, tariq, lena] = ids;

  // ── Wipe previous demo content owned by these authors (idempotency) ──
  const statusRows = await q(
    `SELECT id FROM statuses WHERE user_id = ANY($1)`,
    [ids],
  );
  const statusIds = statusRows.map((r) => r.id);
  const activityRows = await q(
    `SELECT id FROM ascent_activities WHERE user_id = ANY($1)`,
    [ids],
  );
  const activityIds = activityRows.map((r) => r.id);

  if (statusIds.length) {
    await q(
      `DELETE FROM images WHERE entity_type='status' AND entity_id = ANY($1)`,
      [statusIds],
    );
    await q(
      `DELETE FROM likes WHERE target_type='status' AND target_id = ANY($1)`,
      [statusIds],
    );
    await q(
      `DELETE FROM comments WHERE target_type='status' AND target_id = ANY($1)`,
      [statusIds],
    );
  }
  if (activityIds.length) {
    await q(
      `DELETE FROM likes WHERE target_type='activity' AND target_id = ANY($1)`,
      [activityIds],
    );
    await q(
      `DELETE FROM comments WHERE target_type='activity' AND target_id = ANY($1)`,
      [activityIds],
    );
  }
  await q(`DELETE FROM ascents WHERE user_id = ANY($1)`, [ids]);
  await q(`DELETE FROM ascent_activities WHERE user_id = ANY($1)`, [ids]);
  await q(`DELETE FROM statuses WHERE user_id = ANY($1)`, [ids]);
  // Interactions authored by demo users on anything else.
  await q(`DELETE FROM likes WHERE user_id = ANY($1)`, [ids]);
  await q(`DELETE FROM comments WHERE user_id = ANY($1)`, [ids]);

  // ── Follows: viewer follows all three; authors follow each other ──
  const follow = (f, t) =>
    q(
      `INSERT INTO follows (follower_id, followee_id) VALUES ($1,$2)
       ON CONFLICT (follower_id, followee_id) DO NOTHING`,
      [f, t],
    );
  for (const a of ids) await follow(viewerId, a);
  await follow(mara, tariq);
  await follow(tariq, lena);
  await follow(lena, mara);

  // ── Statuses (some with photos), staggered over the last ~2 days ──
  async function status(userId, body, hoursAgo, photoSeeds = []) {
    const [row] = await q(
      `INSERT INTO statuses (user_id, body, created_at)
       VALUES ($1, $2, now() - ($3 || ' hours')::interval) RETURNING id`,
      [userId, body, hoursAgo],
    );
    for (const seed of photoSeeds) {
      await q(
        `INSERT INTO images (entity_type, entity_id, url, uploaded_by)
         VALUES ('status', $1, $2, $3)`,
        [row.id, photo(seed), userId],
      );
    }
    return row.id;
  }

  const s1 = await status(
    mara,
    "Perfect granite session this morning 🧗 conditions were unreal.",
    2,
    ["mara-a", "mara-b"],
  );
  await status(mara, "Rest day — fingers need it after yesterday.", 20);
  const s2 = await status(
    tariq,
    "Sent my first 7a today, absolutely buzzing!",
    5,
    ["tariq-send"],
  );
  await status(
    lena,
    "New quickdraws arrived, all racked up for the weekend.",
    9,
    ["lena-1", "lena-2", "lena-3"],
  );
  await status(lena, "Anyone keen for a trip to Arco next month?", 30);

  // ── Ascent activities (reusing existing routes) ──
  async function activity(userId, cragId, dateOffsetDays, climbs) {
    const [act] = await q(
      `INSERT INTO ascent_activities (user_id, crag_id, activity_date, created_at)
       VALUES ($1, $2, (now() - ($3 || ' days')::interval)::date,
               now() - ($3 || ' days')::interval) RETURNING id`,
      [userId, cragId, dateOffsetDays],
    );
    for (const c of climbs) {
      await q(
        `INSERT INTO ascents (route_id, user_id, tick_type, activity_id, ascent_date, created_at)
         VALUES ($1, $2, $3, $4, (now() - ($5 || ' days')::interval)::date,
                 now() - ($5 || ' days')::interval)`,
        [c.route, userId, c.tick, act.id, dateOffsetDays],
      );
    }
    return act.id;
  }

  // Mara: a multi-climb day at Arco (crag 13, routes 10–15).
  const a1 = await activity(mara, 13, 1, [
    { route: 10, tick: "redpoint" },
    { route: 11, tick: "flash" },
    { route: 12, tick: "onsight" },
  ]);
  // Tariq: a single send at crag 3 (route 5).
  const a2 = await activity(tariq, 3, 0, [{ route: 5, tick: "redpoint" }]);

  // ── Likes + comments ──
  const like = (userId, type, targetId) =>
    q(
      `INSERT INTO likes (user_id, target_type, target_id) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, target_type, target_id) DO NOTHING`,
      [userId, type, targetId],
    );
  const comment = (userId, type, targetId, body) =>
    q(
      `INSERT INTO comments (user_id, target_type, target_id, body) VALUES ($1,$2,$3,$4)`,
      [userId, type, targetId, body],
    );

  await like(viewerId, "status", s1);
  await like(tariq, "status", s1);
  await like(viewerId, "status", s2);
  await like(viewerId, "activity", a1);
  await like(lena, "activity", a1);

  await comment(tariq, "status", s1, "Looks incredible — which sector?");
  await comment(viewerId, "status", s2, "Congrats! Huge milestone 🎉");
  await comment(mara, "activity", a2, "Strong! That line is no joke.");

  console.log(
    `Seeded demo feed for ${VIEWER_EMAIL}: ${authors.length} authors, statuses with photos, 2 activities, likes + comments.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
