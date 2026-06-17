// Adds sectors + routes to some of the newly-seeded crags so they aren't all
// "0 routes". Idempotent: skips any crag that already has sectors.
// Run with: node scripts/seed-more-routes.mjs
import { Pool } from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {}

const AUTHOR = 2; // admin
const FRENCH = 1; // grading_systems.id (rope: sport/trad)
const VSCALE = 5; // grading_systems.id (boulder)

const CRAGS = [
  {
    name: "Leonidio",
    sectors: [
      {
        name: "Hot Rock",
        description:
          "South-facing orange tufas high above the village — sustained, steep and sunny.",
        routes: [
          { name: "Pizza Fly", grade: "6b", height_m: 30, description: "Juggy tufa warm-up with a balancy finish." },
          { name: "Baboufo", grade: "7a", height_m: 35, description: "Long pumpy line through hanging stalactites." },
        ],
      },
      {
        name: "Mars",
        description:
          "Vertical grey and red walls with technical, crimpy climbing and morning shade.",
        routes: [
          { name: "Red Power", grade: "6c", height_m: 25, description: "Crimpy crux off the deck, then easier to the chains." },
          { name: "Mars Attack", grade: "7b", height_m: 28, description: "Relentless small holds — the sector testpiece." },
        ],
      },
    ],
  },
  {
    name: "Céüse",
    sectors: [
      {
        name: "Berlin",
        description:
          "The classic introduction to Céüse's blue limestone — vertical pockets and crimps.",
        routes: [
          { name: "Blocao", grade: "7a", height_m: 22, description: "Sharp pockets up a perfect grey shield." },
          { name: "Berlin", grade: "7b+", height_m: 25, description: "The namesake — technical, sustained, never lets up." },
        ],
      },
      {
        name: "Biographie",
        description:
          "Céüse's most famous wall, home to some of the hardest sport pitches in the world.",
        routes: [
          { name: "Mailbox", grade: "7c", height_m: 30, description: "Bouldery crux into a pumpy headwall." },
          { name: "Biographie", grade: "9a+", height_m: 35, description: "The legendary Sharma line — a world testpiece." },
        ],
      },
    ],
  },
  {
    name: "Finale Ligure",
    sectors: [
      {
        name: "Bric Pianarella",
        description:
          "Sweeping seaside slabs and walls on grippy grey limestone with a sea breeze.",
        routes: [
          { name: "Spiraglio", grade: "6a", height_m: 20, description: "Friendly slab on positive edges." },
          { name: "Rolando", grade: "6b+", height_m: 28, description: "Sustained vertical climbing on small pockets." },
        ],
      },
      {
        name: "Grotta dell'Edera",
        description:
          "A shady cave sector that stays dry in the rain — steep tufas and jugs.",
        routes: [
          { name: "Tequila", grade: "6c+", height_m: 25, description: "Powerful pulls through the cave lip." },
          { name: "Ali Babà", grade: "7a+", height_m: 30, description: "Long, pumpy tufa line to a hands-off rest." },
        ],
      },
    ],
  },
  {
    name: "Gorges du Verdon",
    sectors: [
      {
        name: "L'Escalès",
        description: "The grand wall of the Verdon — long, exposed limestone pitches above the gorge.",
        routes: [
          { name: "Luna Bong", grade: "7b", height_m: 40, description: "Sustained vertical climbing on grey water-streaks." },
          { name: "Pichenibule", grade: "7b+", height_m: 45, description: "A Verdon classic — technical and airy to the rim." },
        ],
      },
      {
        name: "Le Duc",
        description: "Steep pockets and tufas with the river far below.",
        routes: [
          { name: "Eperon Sublime", grade: "6b", height_m: 30, description: "Juggy arête with a stunning position." },
          { name: "Surveiller et Punir", grade: "7a", height_m: 35, description: "Committing crux past the third bolt." },
        ],
      },
    ],
  },
  {
    name: "Kyparissi",
    sectors: [
      {
        name: "Watermill",
        description: "Shaded grey walls right by the spring — friendly grades and clean rock.",
        routes: [
          { name: "Galazio", grade: "6a", height_m: 25, description: "Positive edges up a clean slab." },
          { name: "Poseidon", grade: "6c", height_m: 28, description: "Technical crux into a pumpy finish." },
        ],
      },
      {
        name: "Babala",
        description: "Sun-soaked tufa walls overlooking the bay.",
        routes: [
          { name: "Filema", grade: "6b+", height_m: 22, description: "Pinchy tufa climbing to a good rest." },
          { name: "Sea Breeze", grade: "7a", height_m: 30, description: "Long, breezy line with a balancy headwall." },
        ],
      },
    ],
  },
  {
    name: "Meteora",
    sectors: [
      {
        name: "Holy Spirit",
        description: "Adventurous conglomerate towers — runout pebble-pulling with a head for heights.",
        routes: [
          { name: "Traumpfeiler", grade: "6a", height_m: 60, style: "trad", description: "Classic pillar on rounded cobbles — pure adventure." },
          { name: "Pillar of Dreams", grade: "6b", height_m: 50, style: "trad", description: "Sustained multi-pitch on featured conglomerate." },
        ],
      },
      {
        name: "Doupiani",
        description: "The beginner-friendly tower near the village, with sweeping valley views.",
        routes: [
          { name: "Sonntagspfeiler", grade: "5+", height_m: 40, style: "trad", description: "Mellow pebble climbing — a great first Meteora summit." },
          { name: "Local's Route", grade: "6c", height_m: 45, style: "trad", description: "Steeper testpiece for the cobble connoisseur." },
        ],
      },
    ],
  },
  {
    name: "Saint-Léger-du-Ventoux",
    sectors: [
      {
        name: "Le Pilier",
        description: "Compact pockety limestone with technical, fingery climbing and afternoon shade.",
        routes: [
          { name: "Pocket Rocket", grade: "6c", height_m: 22, description: "Two-finger pockets up a vertical wall." },
          { name: "Crimp Scene", grade: "7a", height_m: 24, description: "Relentless crimping to a powerful crux." },
        ],
      },
      {
        name: "La Grotte",
        description: "A small cave that stays dry in the rain — steep and powerful.",
        routes: [
          { name: "Stalactite", grade: "6b+", height_m: 20, description: "Jugs and pinches out the cave mouth." },
          { name: "Cave Dweller", grade: "7b", height_m: 26, description: "Burly roof climbing to a slabby exit." },
        ],
      },
    ],
  },
  {
    name: "San Vito Lo Capo",
    sectors: [
      {
        name: "Salinella",
        description: "Golden limestone steps right behind the beach — sport climbing with a sea view.",
        routes: [
          { name: "Sabbia", grade: "6a", height_m: 20, description: "Sun-warmed edges above the sand." },
          { name: "Maestrale", grade: "6c+", height_m: 28, description: "Sustained vertical line in the breeze." },
        ],
      },
      {
        name: "El Bahira",
        description: "South-facing crag near the campsite, dry and warm in winter.",
        routes: [
          { name: "Tramonto", grade: "6b", height_m: 24, description: "Mellow climbing best enjoyed at sunset." },
          { name: "Calette", grade: "7a+", height_m: 30, description: "Powerful crux off a small roof." },
        ],
      },
    ],
  },
  {
    name: "Sperlonga",
    sectors: [
      {
        name: "Grotta",
        description: "Steep, dark limestone in a cave above the sea — powerful, tufa-pulling climbing.",
        routes: [
          { name: "Polifemo", grade: "7a", height_m: 25, description: "Burly moves between tufa blobs." },
          { name: "Ciclope", grade: "7c", height_m: 28, description: "The cave testpiece — relentless and three-dimensional." },
        ],
      },
      {
        name: "Settore Centrale",
        description: "Vertical to gently overhanging walls with quick roadside access.",
        routes: [
          { name: "Tiberio", grade: "6b", height_m: 22, description: "Clean edges up a grey shield." },
          { name: "Ulisse", grade: "6c+", height_m: 26, description: "Technical crux low, jugs to the chains." },
        ],
      },
    ],
  },
  {
    name: "Val di Mello",
    sectors: [
      {
        name: "Scoglio delle Metamorfosi",
        description: "Yosemite-style granite slabs and cracks above the meadows — long trad adventures.",
        routes: [
          { name: "Luna Nascente", grade: "6a", height_m: 120, style: "trad", description: "The valley's most famous multi-pitch slab — friction and faith." },
          { name: "Il Risveglio di Kundalini", grade: "6b", height_m: 100, style: "trad", description: "Sustained crack and slab climbing on perfect granite." },
        ],
      },
      {
        name: "Sasso di Remenno",
        description: "A giant freestanding granite boulder — the heart of the Melloblocco festival.",
        routes: [
          { name: "Melloblocco Classic", grade: "V4", height_m: 4, style: "boulder", description: "Crimpy granite arête, a festival rite of passage." },
          { name: "Granite Dyno", grade: "V6", height_m: 4, style: "boulder", description: "Explosive move between glassy slopers." },
        ],
      },
    ],
  },
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  for (const c of CRAGS) {
    const crag = await pool.query(
      `SELECT id FROM crags WHERE name=$1 AND deleted=false`,
      [c.name],
    );
    if (crag.rows.length === 0) {
      console.log(`Crag "${c.name}" not found — skipping.`);
      continue;
    }
    const cragId = crag.rows[0].id;

    const existing = await pool.query(
      `SELECT count(*)::int n FROM sectors WHERE crag_id=$1 AND deleted=false`,
      [cragId],
    );
    if (existing.rows[0].n > 0) {
      console.log(`"${c.name}" already has sectors — skipping.`);
      continue;
    }

    console.log(`${c.name} (#${cragId})`);
    for (const s of c.sectors) {
      const { rows } = await pool.query(
        `INSERT INTO sectors (crag_id, name, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
        [cragId, s.name, s.description, AUTHOR],
      );
      const sectorId = rows[0].id;
      console.log(`  Sector ${s.name} (#${sectorId})`);
      for (const r of s.routes) {
        const style = r.style ?? "sport";
        const system = r.system ?? (style === "boulder" ? VSCALE : FRENCH);
        await pool.query(
          `INSERT INTO routes (name, crag_id, sector_id, grade, grading_system_id, style, height_m, description, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [r.name, cragId, sectorId, r.grade, system, style, r.height_m, r.description, AUTHOR],
        );
        console.log(`    Route ${r.name} ${r.grade} (${style})`);
      }
    }
  }
  console.log("Done.");
} finally {
  await pool.end();
}
