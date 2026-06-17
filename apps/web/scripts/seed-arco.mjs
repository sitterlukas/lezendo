// One-off demo seed: fills the existing "Arco" crag (id 13) with 3 sectors,
// 2 routes each, descriptions, and photos uploaded to Vercel Blob.
// Run with: node scripts/seed-arco.mjs
import { Pool } from "pg";
import { put } from "@vercel/blob";

try {
  process.loadEnvFile(".env.local");
} catch {}

const CRAG_ID = 13; // Arco, Trentino (already exists)
const AUTHOR = 2; // admin user
const FRENCH = 1; // grading_systems.id for 'french'

// Verified-reachable Unsplash climbing/limestone photos (HTTP 200).
const PHOTOS = [
  "photo-1522163182402-834f871fd851",
  "photo-1551698618-1dfe5d97d256",
  "photo-1516592673884-4a382d1124c2",
  "photo-1564769662533-4f00a87b4056",
  "photo-1571902943202-507ec2618e8f",
  "photo-1517649763962-0c623066013b",
  "photo-1486870591958-9b9d0d1dda99",
  "photo-1533692328991-08159ff19fca",
  "photo-1470770841072-f978cf4d019e",
  "photo-1454496522488-7a8e488e8606",
  "photo-1506905925346-21bda4d32df4",
].map(
  (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=70`,
);

const cragDescription =
  "Year-round sport climbing on grey and orange limestone above Lake Garda. " +
  "Hundreds of bolted routes across the Sarca Valley, from slabby warm-ups to " +
  "steep tufa testpieces, with a sunny aspect that makes Arco a winter classic.";

const SECTORS = [
  {
    name: "Massone",
    description:
      "Arco's most popular wall — a vast sweep of vertical to gently overhanging " +
      "limestone with quick access and grades for everyone. Gets shade in the " +
      "afternoon, so it stays climbable even in summer.",
    routes: [
      {
        name: "Pueblo",
        grade: "6a",
        height_m: 25,
        description:
          "Immaculate grey slab on small crimps and pockets. A perfect " +
          "introduction to Massone's technical footwork.",
      },
      {
        name: "Spiderman",
        grade: "6b+",
        height_m: 28,
        description:
          "Sustained vertical climbing up a streak of water-worn pockets. " +
          "Reachy moves through the headwall to a bolted chain.",
      },
    ],
  },
  {
    name: "Belvedere",
    description:
      "A scenic terraced sector high above the valley with airy, exposed lines " +
      "and a panorama over Arco's castle. Morning sun, afternoon shade.",
    routes: [
      {
        name: "Belvedere Direct",
        grade: "6a+",
        height_m: 20,
        description:
          "Short but punchy pillar climbing on positive edges. A great " +
          "warm-up before tackling the harder neighbours.",
      },
      {
        name: "Vista",
        grade: "7a",
        height_m: 30,
        description:
          "The line of the sector: a long, pumpy pitch up a tufa-streaked " +
          "wall with a committing crux past the fifth bolt.",
      },
    ],
  },
  {
    name: "Policromuro",
    description:
      "Steep, colourful rock that stays dry in the rain — Arco's go-to crag for " +
      "bad weather. Powerful climbing on tufas, pockets and the occasional jug.",
    routes: [
      {
        name: "Policromuro",
        grade: "6c",
        height_m: 35,
        description:
          "The namesake testpiece: relentless three-dimensional climbing up " +
          "orange tufas. Read the rests or get pumped.",
      },
      {
        name: "Arcobaleno",
        grade: "6b",
        height_m: 22,
        description:
          "Juggy overhang to a slabby finish. Feels burly for the grade but " +
          "the holds are always there.",
      },
    ],
  },
];

async function uploadPhoto(srcUrl, name) {
  const res = await fetch(srcUrl);
  if (!res.ok) throw new Error(`fetch ${srcUrl} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const blob = await put(`arco/${name}.jpg`, buf, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: true,
  });
  return blob.url;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addImage(entityType, entityId, url) {
  await pool.query(
    `INSERT INTO images (entity_type, entity_id, url, uploaded_by) VALUES ($1,$2,$3,$4)`,
    [entityType, entityId, url, AUTHOR],
  );
}

try {
  const existing = await pool.query(
    `SELECT count(*)::int n FROM sectors WHERE crag_id=$1`,
    [CRAG_ID],
  );
  if (existing.rows[0].n > 0) {
    throw new Error(
      `Crag ${CRAG_ID} already has sectors — aborting to avoid duplicates.`,
    );
  }

  let p = 0; // index into uploaded photo URLs

  console.log("Uploading photos to Vercel Blob…");
  const urls = [];
  for (let i = 0; i < PHOTOS.length; i++) {
    urls.push(await uploadPhoto(PHOTOS[i], `arco-${i}`));
  }
  console.log(`Uploaded ${urls.length} photos.`);

  // Crag: refresh description + two cover photos.
  await pool.query(
    `UPDATE crags SET description=$1, created_by=COALESCE(created_by,$2) WHERE id=$3`,
    [cragDescription, AUTHOR, CRAG_ID],
  );
  await addImage("crag", CRAG_ID, urls[p++]);
  await addImage("crag", CRAG_ID, urls[p++]);

  for (const sector of SECTORS) {
    const { rows } = await pool.query(
      `INSERT INTO sectors (crag_id, name, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
      [CRAG_ID, sector.name, sector.description, AUTHOR],
    );
    const sectorId = rows[0].id;
    await addImage("sector", sectorId, urls[p++]);
    console.log(`Sector ${sector.name} (#${sectorId})`);

    for (const r of sector.routes) {
      const ins = await pool.query(
        `INSERT INTO routes (name, crag_id, sector_id, grade, grading_system_id, style, height_m, description, created_by)
         VALUES ($1,$2,$3,$4,$5,'sport',$6,$7,$8) RETURNING id`,
        [
          r.name,
          CRAG_ID,
          sectorId,
          r.grade,
          FRENCH,
          r.height_m,
          r.description,
          AUTHOR,
        ],
      );
      const routeId = ins.rows[0].id;
      await addImage("route", routeId, urls[p++]);
      console.log(`  Route ${r.name} ${r.grade} (#${routeId})`);
    }
  }

  console.log("Done.");
} finally {
  await pool.end();
}
