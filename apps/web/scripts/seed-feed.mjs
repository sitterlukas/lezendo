// Dummy social-feed data for local development: follows, statuses (plain text
// or tagged with a sector), a batched same-crag-same-day set of ascents, plus
// likes and comments.
//
// Idempotent: wipes the feed tables it owns (statuses/follows/likes/comments)
// and its tagged demo ascents (notes = '[seed]') before reseeding. Leaves
// crags/routes/users/other ascents untouched.
//
// It makes every existing user follow the demo authors, so whichever account
// you log in as will see a populated feed.
//
// Run with: node scripts/seed-feed.mjs

import { Pool } from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const q = async (text, params) => (await pool.query(text, params)).rows;

async function main() {
  const users = await q(`SELECT id, name FROM users ORDER BY id`);
  if (users.length < 2)
    throw new Error("Need at least 2 users — seed users first.");

  // Demo authors: prefer the named demo accounts, else the first two users.
  const byName = (n) => users.find((u) => u.name === n);
  const author1 = byName("Lukas Climber") ?? users[0];
  const author2 = byName("Mara Boulder") ?? users[1];
  const authorIds = [author1.id, author2.id];
  console.log(
    `Demo authors: ${author1.name} (#${author1.id}), ${author2.name} (#${author2.id})`,
  );

  const crags = await q(
    `SELECT id, name FROM crags WHERE deleted = false ORDER BY id`,
  );
  if (crags.length === 0)
    throw new Error("No crags — run the main seed first.");
  const crag = crags[0];
  const cragRoutes = await q(
    `SELECT id, name, grade FROM routes WHERE crag_id = $1 AND deleted = false ORDER BY id LIMIT 4`,
    [crag.id],
  );
  if (cragRoutes.length < 3)
    throw new Error(`Crag ${crag.name} needs ≥3 routes for the batch demo.`);
  const sectors = await q(
    `SELECT id, name FROM sectors WHERE crag_id = $1 AND deleted = false ORDER BY id LIMIT 1`,
    [crag.id],
  );
  const sector = sectors[0] ?? null;

  // --- wipe previous demo data (feed tables + tagged demo ascents) ---------
  await q(`TRUNCATE TABLE likes, comments, statuses, follows RESTART IDENTITY`);
  await q(`DELETE FROM ascents WHERE notes = '[seed]'`);
  await q(`DELETE FROM images WHERE entity_type = 'status'`);

  // --- follows: everyone follows the demo authors; authors follow back -----
  for (const u of users) {
    for (const a of authorIds) {
      if (u.id !== a) {
        await q(
          `INSERT INTO follows (follower_id, followee_id) VALUES ($1,$2)
           ON CONFLICT DO NOTHING`,
          [u.id, a],
        );
      }
    }
  }
  // Authors follow each other + a few real users so their own feeds fill too.
  for (const a of authorIds) {
    for (const u of users) {
      if (u.id !== a && !authorIds.includes(u.id)) {
        await q(
          `INSERT INTO follows (follower_id, followee_id) VALUES ($1,$2)
           ON CONFLICT DO NOTHING`,
          [a, u.id],
        );
      }
    }
  }

  // --- statuses ------------------------------------------------------------
  const mkStatus = async (
    userId,
    body,
    { sectorId = null, agoMin = 0 } = {},
  ) => {
    const [{ id }] = await q(
      `INSERT INTO statuses (user_id, body, sector_id, created_at)
       VALUES ($1,$2,$3, now() - ($4 || ' minutes')::interval) RETURNING id`,
      [userId, body, sectorId, agoMin],
    );
    return id;
  };

  const s1 = await mkStatus(
    author1.id,
    "Rest day. Fingers wrecked but stoked for the weekend. 🙌",
    { agoMin: 30 },
  );
  const s2 = await mkStatus(
    author2.id,
    sector
      ? `Conditions at ${sector.name} (${crag.name}) are perfect right now.`
      : `Conditions at ${crag.name} are perfect right now.`,
    { sectorId: sector?.id ?? null, agoMin: 90 },
  );
  await mkStatus(author1.id, "Finally clipped the chains on this one!! 🧗", {
    sectorId: sector?.id ?? null,
    agoMin: 180,
  });

  // --- photos on a couple of statuses (reuse existing blob images) ---------
  const photoPool = (
    await q(
      `SELECT url FROM images WHERE entity_type IN ('crag','route','sector') ORDER BY id LIMIT 8`,
    )
  ).map((r) => r.url);
  const attachPhotos = async (statusId, uploadedBy, urls) => {
    for (const url of urls) {
      await q(
        `INSERT INTO images (entity_type, entity_id, url, uploaded_by)
         VALUES ('status', $1, $2, $3)`,
        [statusId, url, uploadedBy],
      );
    }
  };
  if (photoPool.length > 0) {
    await attachPhotos(s1, author1.id, photoPool.slice(0, 2));
    await attachPhotos(s2, author2.id, photoPool.slice(2, 5));
  }

  // --- ascents: each climber logs several routes the same day, so the feed
  // batches them into one "Logged N climbs" post per climber. Each ascent
  // belongs to a stable per-(climber, day) activity.
  const activityId = async (userId) => {
    const [{ id }] = await q(
      `INSERT INTO ascent_activities (user_id, crag_id, activity_date)
       VALUES ($1,$2, now()::date)
       ON CONFLICT (user_id, activity_date) DO UPDATE SET crag_id = EXCLUDED.crag_id
       RETURNING id`,
      [userId, crag.id],
    );
    return id;
  };
  const ticks = ["redpoint", "flash", "onsight", "redpoint"];
  const logBatch = async (userId, count, baseAgoMin) => {
    const activity = await activityId(userId);
    for (let i = 0; i < count; i++) {
      await q(
        `INSERT INTO ascents (route_id, user_id, tick_type, ascent_date, notes, activity_id, created_at)
         VALUES ($1,$2,$3, now(), '[seed]', $4, now() - ($5 || ' minutes')::interval)`,
        [
          cragRoutes[i % cragRoutes.length].id,
          userId,
          ticks[i % ticks.length],
          activity,
          baseAgoMin + i * 5,
        ],
      );
    }
  };
  await logBatch(author2.id, 3, 200); // Mara: 3 climbs today
  await logBatch(author1.id, 2, 300); // Lukas: 2 climbs today

  // --- likes ---------------------------------------------------------------
  const like = (userId, type, targetId) =>
    q(
      `INSERT INTO likes (user_id, target_type, target_id) VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING`,
      [userId, type, targetId],
    );
  await like(author2.id, "status", s1);
  for (const u of users.slice(0, 3)) await like(u.id, "status", s2);
  await like(author1.id, "status", s2);

  // --- comments (+ a comment like) ----------------------------------------
  const [{ id: c1 }] = await q(
    `INSERT INTO comments (user_id, target_type, target_id, body)
     VALUES ($1,'status',$2,$3) RETURNING id`,
    [author2.id, s1, "Same, my tendons need a break 😅"],
  );
  await q(
    `INSERT INTO comments (user_id, target_type, target_id, body)
     VALUES ($1,'status',$2,$3)`,
    [author1.id, s2, "Nice, might head there Saturday!"],
  );
  await like(author1.id, "comment", c1);

  const counts = (
    await q(
      `SELECT (SELECT count(*) FROM statuses) statuses,
              (SELECT count(*) FROM follows) follows,
              (SELECT count(*) FROM likes) likes,
              (SELECT count(*) FROM comments) comments,
              (SELECT count(*) FROM ascents WHERE notes='[seed]') demo_ascents`,
    )
  )[0];
  console.log("Seeded feed data:", counts);
  console.log("Log in as any account — your feed follows the demo authors.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
