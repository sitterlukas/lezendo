// Dummy data seed for local development.
// Reuses the climbing photos already stored in Vercel Blob (no re-upload) and
// attaches them to crags / sectors / routes. Idempotent-ish: refuses to run if
// crags already exist, to avoid piling up duplicates.
//
// Run with: node scripts/seed-dummy.mjs
import { Pool } from "pg";
import { list } from "@vercel/blob";
import { hash } from "bcryptjs";

try {
  process.loadEnvFile(".env.local");
} catch {}

const FRENCH = 1; // grading_systems.id
const VSCALE = 5;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// --- pull existing photos straight from Vercel Blob ------------------------
async function loadBlobUrls() {
  const urls = [];
  let cursor;
  do {
    const res = await list({ cursor, limit: 1000 });
    urls.push(...res.blobs.map((b) => b.url));
    cursor = res.cursor;
  } while (cursor);
  urls.sort(); // stable order
  return urls;
}

async function main() {
  const { rows: existing } = await pool.query(`SELECT count(*)::int n FROM crags`);
  if (existing[0].n > 0) {
    throw new Error(
      `crags table already has ${existing[0].n} rows — aborting to avoid duplicate seed data. ` +
        `Truncate first if you want a clean reseed.`,
    );
  }

  const photos = await loadBlobUrls();
  if (photos.length === 0) throw new Error("No photos found in Vercel Blob.");
  console.log(`Found ${photos.length} photos in Vercel Blob.`);
  let p = 0;
  const nextPhoto = () => photos[p++ % photos.length]; // cycle if we run out

  // --- users ---------------------------------------------------------------
  const pw = await hash("password", 10);
  const users = {};
  for (const u of [
    { key: "admin", email: "admin@whipperbook.test", name: "Ada Admin", role: "admin" },
    { key: "lukas", email: "lukas@whipperbook.test", name: "Lukas Climber", role: "member" },
    { key: "mara", email: "mara@whipperbook.test", name: "Mara Boulder", role: "member" },
  ]) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, name, password_hash, role,
         preferred_rope_grading_system_id, preferred_boulder_grading_system_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [u.email, u.name, pw, u.role, FRENCH, VSCALE],
    );
    users[u.key] = rows[0].id;
  }
  console.log(`Created ${Object.keys(users).length} users (password: "password").`);

  const addImage = (entityType, entityId, by) =>
    pool.query(
      `INSERT INTO images (entity_type, entity_id, url, uploaded_by) VALUES ($1,$2,$3,$4)`,
      [entityType, entityId, nextPhoto(), by],
    );

  // --- crags / sectors / routes -------------------------------------------
  const CRAGS = [
    {
      name: "Arco",
      area: "Sarca Valley",
      country: "Italy",
      description:
        "Year-round sport climbing on grey and orange limestone above Lake Garda — " +
        "hundreds of bolted lines from slabby warm-ups to steep tufa testpieces.",
      sectors: [
        {
          name: "Massone",
          description:
            "Arco's most popular wall: vertical to gently overhanging limestone with " +
            "quick access and afternoon shade.",
          routes: [
            { name: "Pueblo", grade: "6a", style: "sport", height_m: 25, system: FRENCH,
              description: "Immaculate grey slab on small crimps and pockets." },
            { name: "Spiderman", grade: "6b+", style: "sport", height_m: 28, system: FRENCH,
              description: "Sustained vertical climbing up water-worn pockets to the headwall." },
          ],
        },
        {
          name: "Policromuro",
          description:
            "Steep, colourful rock that stays dry in the rain — Arco's go-to bad-weather crag.",
          routes: [
            { name: "Policromuro", grade: "6c", style: "sport", height_m: 35, system: FRENCH,
              description: "Relentless three-dimensional climbing up orange tufas." },
            { name: "Arcobaleno", grade: "7a", style: "sport", height_m: 22, system: FRENCH,
              description: "Juggy overhang to a slabby finish — burly for the grade." },
          ],
        },
      ],
    },
    {
      name: "Kalymnos",
      area: "Dodecanese",
      country: "Greece",
      description:
        "A Greek island of steep grey and orange limestone dripping with tufas and " +
        "stalactites, rising straight out of the Aegean. The sport-climbing holiday classic.",
      sectors: [
        {
          name: "Grande Grotta",
          description:
            "The iconic cave — huge stalactites and tufa pinches on famously photogenic 3D terrain.",
          routes: [
            { name: "DNA", grade: "7a", style: "sport", height_m: 35, system: FRENCH,
              description: "Wild tufa pinching through the right side of the cave." },
            { name: "Aegialis", grade: "7b+", style: "sport", height_m: 40, system: FRENCH,
              description: "Long, pumpy stalactite climbing — read the kneebar rests or melt." },
          ],
        },
        {
          name: "Odyssey",
          description: "Vertical to slightly overhanging walls with sea views and morning shade.",
          routes: [
            { name: "Priapos", grade: "6b", style: "sport", height_m: 30, system: FRENCH,
              description: "Positive edges up a clean grey shield." },
            { name: "Monahiko Kyma", grade: "6c+", style: "sport", height_m: 32, system: FRENCH,
              description: "Technical crux low, then jugs to the chains." },
          ],
        },
      ],
    },
    {
      name: "Fontainebleau",
      area: "Île-de-France",
      country: "France",
      description:
        "The spiritual home of bouldering: a forest of sandstone boulders south of Paris, " +
        "famous for slopers, delicate slabs and impeccable friction.",
      sectors: [
        {
          name: "Bas Cuvier",
          description:
            "The historic heart of Font bouldering — polished classics and brutal slopers.",
          routes: [
            { name: "La Marie-Rose", grade: "V3", style: "boulder", height_m: 4, system: VSCALE,
              description: "The first-ever 6a — a Font rite of passage on the Cuvier slab." },
            { name: "L'Abattoir", grade: "V5", style: "boulder", height_m: 4, system: VSCALE,
              description: "Powerful overhang on sandstone slopers and pinches." },
          ],
        },
        {
          name: "Franchard Isatis",
          description: "A scenic sector with slabs, aretes and a famous traverse circuit.",
          routes: [
            { name: "L'Angle Ben's", grade: "V2", style: "boulder", height_m: 3, system: VSCALE,
              description: "Classic arete with delicate footwork." },
            { name: "Aerodynamite", grade: "V7", style: "boulder", height_m: 4, system: VSCALE,
              description: "Committing dyno-ish move off slopers — the sector testpiece." },
          ],
        },
      ],
    },
  ];

  const allRoutes = []; // {id, name} for ascents
  for (const c of CRAGS) {
    const { rows: cr } = await pool.query(
      `INSERT INTO crags (name, area, country, description, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [c.name, c.area, c.country, c.description, users.admin],
    );
    const cragId = cr[0].id;
    await addImage("crag", cragId, users.admin);
    await addImage("crag", cragId, users.admin);
    console.log(`Crag ${c.name} (#${cragId})`);

    for (const s of c.sectors) {
      const { rows: se } = await pool.query(
        `INSERT INTO sectors (crag_id, name, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
        [cragId, s.name, s.description, users.admin],
      );
      const sectorId = se[0].id;
      await addImage("sector", sectorId, users.admin);
      console.log(`  Sector ${s.name} (#${sectorId})`);

      for (const r of s.routes) {
        const { rows: ro } = await pool.query(
          `INSERT INTO routes (name, crag_id, sector_id, grade, grading_system_id, style, height_m, description, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [r.name, cragId, sectorId, r.grade, r.system, r.style, r.height_m, r.description, users.admin],
        );
        const routeId = ro[0].id;
        await addImage("route", routeId, users.admin);
        allRoutes.push({ id: routeId, name: r.name });
        console.log(`    Route ${r.name} ${r.grade} (#${routeId})`);
      }
    }
  }

  // --- ascents -------------------------------------------------------------
  const tickTypes = ["onsight", "flash", "redpoint", "toprope", "attempt"];
  let ascents = 0;
  for (const climber of [users.lukas, users.mara, users.admin]) {
    // each climber ticks a rotating subset of routes
    for (let i = climber % 3; i < allRoutes.length; i += 2) {
      const r = allRoutes[i];
      await pool.query(
        `INSERT INTO ascents (route_id, user_id, tick_type, ascent_date, notes)
         VALUES ($1,$2,$3, now() - ($4 || ' days')::interval, $5)`,
        [r.id, climber, tickTypes[(i + climber) % tickTypes.length], (i * 7) % 90,
         `Great day out on ${r.name}.`],
      );
      ascents++;
    }
  }
  console.log(`Created ${ascents} ascents.`);

  // --- gear ----------------------------------------------------------------
  const gear = [
    { user: users.lukas, name: "Mammut 9.5 Crag Classic", category: "rope", brand: "Mammut", notes: "70m single, workhorse." },
    { user: users.lukas, name: "Petzl Spirit", category: "quickdraws", brand: "Petzl", notes: "Set of 12." },
    { user: users.lukas, name: "Scarpa Instinct VS", category: "shoes", brand: "Scarpa", notes: "Resoled once." },
    { user: users.mara, name: "La Sportiva Solution", category: "shoes", brand: "La Sportiva", notes: "Bouldering go-to." },
    { user: users.mara, name: "Black Diamond Mondo", category: "bouldering", brand: "Black Diamond", notes: "Huge highball pad." },
    { user: users.admin, name: "Edelrid Ohm", category: "safety", brand: "Edelrid", notes: "For big weight differences." },
  ];
  for (const g of gear) {
    await pool.query(
      `INSERT INTO gear_items (user_id, name, category, brand, purchased_on, notes)
       VALUES ($1,$2,$3,$4, now() - ($5 || ' days')::interval, $6)`,
      [g.user, g.name, g.category, g.brand, 200 + Math.floor(g.name.length * 5), g.notes],
    );
  }
  console.log(`Created ${gear.length} gear items.`);

  const reviews = [
    { user: users.lukas, product: "Scarpa Instinct VS", rating: 5, body: "Stiff edging machine, holds up to multiple resoles." },
    { user: users.mara, product: "La Sportiva Solution", rating: 4, body: "Incredible on overhangs, a touch aggressive for long routes." },
    { user: users.admin, product: "Edelrid Ohm", rating: 5, body: "Game changer for belaying lighter partners." },
  ];
  for (const rv of reviews) {
    await pool.query(
      `INSERT INTO gear_reviews (user_id, product, rating, body) VALUES ($1,$2,$3,$4)`,
      [rv.user, rv.product, rv.rating, rv.body],
    );
  }
  console.log(`Created ${reviews.length} gear reviews.`);

  // --- forum ---------------------------------------------------------------
  const topics = [
    { user: users.lukas, title: "Best time of year for Kalymnos?",
      posts: [
        { user: users.lukas, body: "Thinking of booking a trip — is October too hot?" },
        { user: users.mara, body: "October is perfect, sea's still warm and the crags get shade." },
        { user: users.admin, body: "+1 for October. Avoid August unless you like sweating off jugs." },
      ] },
    { user: users.mara, title: "Font slopers — any friction tips?",
      posts: [
        { user: users.mara, body: "I keep greasing off the Cuvier slopers. Brush + chalk routine?" },
        { user: users.lukas, body: "Climb early when it's cold and dry, and brush every attempt." },
      ] },
  ];
  for (const t of topics) {
    const { rows } = await pool.query(
      `INSERT INTO forum_topics (title, user_id) VALUES ($1,$2) RETURNING id`,
      [t.title, t.user],
    );
    const topicId = rows[0].id;
    for (const post of t.posts) {
      await pool.query(
        `INSERT INTO forum_posts (topic_id, user_id, body) VALUES ($1,$2,$3)`,
        [topicId, post.user, post.body],
      );
    }
  }
  console.log(`Created ${topics.length} forum topics with posts.`);

  console.log("Seed complete.");
}

try {
  await main();
} finally {
  await pool.end();
}
