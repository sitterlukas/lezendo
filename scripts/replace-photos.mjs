// Replace the demo photos with verified real rock-climbing images.
// Uploads a curated set to Vercel Blob, repoints every `images` row to cycle
// through them, then deletes the old (mixed-content) blobs.
// Run with: node scripts/replace-photos.mjs
import { Pool } from "pg";
import { put, list, del } from "@vercel/blob";

try {
  process.loadEnvFile(".env.local");
} catch {}

// Unsplash photo IDs hand-verified (by viewing each) to show real outdoor
// rock climbing — sport, trad, bouldering, alpine and canyon.
const PHOTO_IDS = [
  "1601224748193-d24f166b5c77",
  "1522163182402-834f871fd851",
  "1597250861267-429663f244a8",
  "1682685796186-1bb4a5655653",
  "1507034589631-9433cc6bc453",
  "1586627161720-ee2849303aee",
  "1683009427041-d810728a7cb6",
  "1601025678763-e8f5835995db",
  "1602531734042-c565f8365a0b",
  "1597698063932-9450882bb1be",
  "1625456824839-47810c880c72",
];

const srcUrl = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=75`;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  console.log("Uploading climbing photos to Vercel Blob…");
  const urls = [];
  for (let i = 0; i < PHOTO_IDS.length; i++) {
    const res = await fetch(srcUrl(PHOTO_IDS[i]));
    if (!res.ok) throw new Error(`fetch ${PHOTO_IDS[i]} -> ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const blob = await put(`climbing/climb-${i}.jpg`, buf, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
    });
    urls.push(blob.url);
    console.log(`  uploaded climb-${i} (${(buf.length / 1024) | 0} KB)`);
  }

  // Repoint every image row, cycling through the climbing photos in row order.
  const { rows } = await pool.query(`SELECT id FROM images ORDER BY id`);
  for (let i = 0; i < rows.length; i++) {
    await pool.query(`UPDATE images SET url=$1 WHERE id=$2`, [
      urls[i % urls.length],
      rows[i].id,
    ]);
  }
  console.log(`Repointed ${rows.length} image rows.`);

  // Delete the old (no-longer-referenced) blobs under arco/.
  const old = await list({ prefix: "arco/", limit: 1000 });
  if (old.blobs.length) {
    await del(old.blobs.map((b) => b.url));
    console.log(`Deleted ${old.blobs.length} old blobs.`);
  }

  console.log("Done.");
} finally {
  await pool.end();
}
