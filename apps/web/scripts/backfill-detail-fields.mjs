// Backfill the new guidebook fields (rock type / aspect / season / access on
// crags; approach + aspect on sectors; first ascent / pitches / gear on routes)
// with realistic demo values. Non-destructive: only fills columns that are NULL.
// Run with: node scripts/backfill-detail-fields.mjs
import { Pool } from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Per-crag guidebook facts, keyed by name.
const CRAG_INFO = {
  Arco: {
    rock: "Limestone",
    aspect: "South-facing",
    season: "Autumn–Spring",
    access:
      "Roadside and car-park access; some sectors have a 10–20 min walk-in.",
  },
  Kalymnos: {
    rock: "Limestone",
    aspect: "Mixed sun & shade",
    season: "Spring & Autumn",
    access:
      "Scooter to most sectors, then a short walk. Respect goat fences and private land.",
  },
  Fontainebleau: {
    rock: "Sandstone",
    aspect: "Mixed",
    season: "Autumn–Spring",
    access:
      "Forest parking; keep to paths and brush off tick marks. Avoid climbing on wet sandstone.",
  },
  "Finale Ligure": {
    rock: "Limestone",
    aspect: "South-facing",
    season: "Autumn–Spring",
    access:
      "Roadside parking; some approaches cross private olive groves — leave gates as found.",
  },
  Sperlonga: {
    rock: "Limestone",
    aspect: "South-facing",
    season: "Winter",
    access:
      "Park in the village; short walk to the crag. Busy in summer — go early.",
  },
  "San Vito Lo Capo": {
    rock: "Limestone",
    aspect: "South-facing",
    season: "Winter & Spring",
    access: "Roadside parking near the campsite; flat 5–10 min approaches.",
  },
  "Val di Mello": {
    rock: "Granite",
    aspect: "Mixed",
    season: "Late spring–Autumn",
    access:
      "Car-free valley: park in San Martino and walk in. Protected nature reserve — no fires.",
  },
  Leonidio: {
    rock: "Limestone",
    aspect: "South & West",
    season: "Autumn–Spring",
    access:
      "Drive to sector parking, then 5–25 min walk-ins. Respect the monastery and farmland.",
  },
  Meteora: {
    rock: "Conglomerate",
    aspect: "Mixed",
    season: "Spring & Autumn",
    access:
      "Park below the towers; observe monastery dress code and opening hours nearby.",
  },
  Kyparissi: {
    rock: "Limestone",
    aspect: "Sea-facing, mixed",
    season: "Autumn–Spring",
    access:
      "Park in the village; flat seaside approaches. Quiet area — keep noise down.",
  },
  Céüse: {
    rock: "Limestone",
    aspect: "South-facing",
    season: "Late spring–Autumn",
    access:
      "45-minute uphill approach from the car park — bring water. No camping at the crag.",
  },
  "Gorges du Verdon": {
    rock: "Limestone",
    aspect: "Mixed",
    season: "Spring & Autumn",
    access:
      "Most routes are reached by abseil from the rim — know your descent. Falling-rock area.",
  },
  "Saint-Léger-du-Ventoux": {
    rock: "Limestone",
    aspect: "Afternoon shade",
    season: "Most of the year",
    access:
      "Roadside parking in the gorge; short walk-ins. Narrow road — park considerately.",
  },
};

const FA_NAMES = [
  "Manolo",
  "Lynn Hill",
  "Wolfgang Güllich",
  "Catherine Destivelle",
  "Alexander Huber",
  "Josune Bereziartu",
  "Stefan Glowacz",
  "Adam Ondra",
  "Angela Eiter",
  "Patrick Edlinger",
];

const SECTOR_ASPECTS = [
  "South-facing",
  "Shaded in the afternoon",
  "Morning sun",
  "Sunny most of the day",
];

try {
  // --- crags --------------------------------------------------------------
  let crags = 0;
  for (const [name, info] of Object.entries(CRAG_INFO)) {
    const res = await pool.query(
      `UPDATE crags
         SET rock_type = COALESCE(rock_type, $1),
             aspect = COALESCE(aspect, $2),
             best_season = COALESCE(best_season, $3),
             access_notes = COALESCE(access_notes, $4)
       WHERE name = $5 AND deleted = false`,
      [info.rock, info.aspect, info.season, info.access, name],
    );
    crags += res.rowCount;
  }
  console.log(`Backfilled ${crags} crags.`);

  // --- sectors ------------------------------------------------------------
  const { rows: sectors } = await pool.query(
    `SELECT id FROM sectors WHERE deleted = false AND (approach_minutes IS NULL OR aspect IS NULL)`,
  );
  for (const s of sectors) {
    const approach = 5 + (s.id % 8) * 5; // 5–40 min, deterministic
    const aspect = SECTOR_ASPECTS[s.id % SECTOR_ASPECTS.length];
    await pool.query(
      `UPDATE sectors
         SET approach_minutes = COALESCE(approach_minutes, $1),
             aspect = COALESCE(aspect, $2)
       WHERE id = $3`,
      [approach, aspect, s.id],
    );
  }
  console.log(`Backfilled ${sectors.length} sectors.`);

  // --- routes -------------------------------------------------------------
  const { rows: routes } = await pool.query(
    `SELECT id, style, height_m FROM routes
     WHERE deleted = false
       AND (first_ascensionist IS NULL OR pitches IS NULL)`,
  );
  for (const r of routes) {
    const fa = FA_NAMES[r.id % FA_NAMES.length];
    const faYear = 1985 + (r.id % 35); // 1985–2019
    const pitches = r.height_m ? Math.max(1, Math.round(r.height_m / 35)) : 1;
    const gear =
      r.style === "trad"
        ? "Single rack of cams to 3 inches plus a set of nuts; slings for threads."
        : null;
    await pool.query(
      `UPDATE routes
         SET first_ascensionist = COALESCE(first_ascensionist, $1),
             first_ascent_year = COALESCE(first_ascent_year, $2),
             pitches = COALESCE(pitches, $3),
             gear_notes = COALESCE(gear_notes, $4)
       WHERE id = $5`,
      [fa, faYear, pitches, gear, r.id],
    );
  }
  console.log(`Backfilled ${routes.length} routes.`);
  console.log("Done.");
} finally {
  await pool.end();
}
