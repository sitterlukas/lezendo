// Replace the short demo crag/sector descriptions with longer, richer ones.
// Run with: node scripts/expand-descriptions.mjs
import { Pool } from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {}

const CRAGS = {
  Arco: "Spread along the Sarca Valley at the northern tip of Lake Garda, Arco is one of Europe's great year-round sport-climbing hubs. Hundreds of bolted lines thread the grey and orange limestone, from slabby single-pitch warm-ups to steep, tufa-streaked testpieces and long multi-pitches on the surrounding massifs. Its sunny, sheltered aspect keeps the valley climbable through winter, while shady sectors and the cool river offer respite in summer. With its medieval castle, easy living and the famous Rockmaster festival, the town has been a climbers' pilgrimage since the 1980s.",
  Kalymnos:
    "A small island in the Greek Dodecanese, Kalymnos has become a sport-climbing paradise, rising straight out of the turquoise Aegean in tiers of grey and orange limestone. Its walls drip with tufas, stalactites and pockets, giving wildly three-dimensional climbing across more than eighty sectors, most just a short scooter ride from the harbour. Grades span the full range with an unusual concentration of brilliant routes in the 6s and 7s, on rock that stays vertical to steeply overhanging. Warm spring and autumn temperatures, cheap tavernas and a relaxed island pace make it as much a holiday as a climbing trip.",
  Fontainebleau:
    "The forest of Fontainebleau, an hour south of Paris, is the spiritual home of bouldering. Thousands of sandstone blocks lie scattered through the woods, offering everything from polished classics and delicate slabs to brutal overhanging testpieces, all on rock famous for its grippy friction and rounded, sloping holds. The colour-coded circuits — graded paths linking dozens of problems — make it ideal for a full day's roaming, whatever your level. Climbers have trained here for more than a century, and 'Font' grades remain the benchmark for boulderers worldwide.",
  "Finale Ligure":
    "Perched above the Italian Riviera in Liguria, Finale Ligure offers sunny seaside limestone with thousands of routes packed into a compact, walker-friendly area. The grey and ochre rock is riddled with pockets, tufas and the occasional fossil, giving varied climbing from gentle slabs to steep, pumpy walls — much of it climbable right through the winter. Shady caves cover the hot days, mellow grades welcome beginners, and hard projects await the obsessed, with beaches and focaccia a short drive away. It is one of Europe's classic all-round winter destinations.",
  Sperlonga:
    "Halfway between Rome and Naples, Sperlonga is a whitewashed cliff-top village fringed by beaches, with steep grey limestone crags rising just behind the town. The rock is compact and pocketed, with tufa features and a famous cave that stays dry and shaded — perfect for powerful winter sport climbing within sight of the Tyrrhenian Sea. Most routes are vertical to overhanging in the 6th and 7th grades, with quick roadside access. Roman ruins, fresh seafood and an easy swim make it a quintessential central-Italian trip.",
  "San Vito Lo Capo":
    "On the wild northwestern tip of Sicily, San Vito Lo Capo pairs golden limestone crags with a famous crescent of white-sand beach. Sectors range from sea-level walls to shady caves and the towering flanks of Monte Monaco, offering sun or shade in any season and grades for everyone. The rock is solid and richly featured, the winters mild, and the annual autumn climbing festival draws climbers from across Europe. Couscous, swimming and dramatic coastal scenery round out the experience.",
  "Val di Mello":
    "A glacier-carved granite valley in the Italian Alps north of Milan, Val di Mello is often called 'Italy's Yosemite'. Pristine slabs, soaring cracks and house-sized boulders rise from green meadows and clear streams, offering long trad and slab routes alongside the celebrated bouldering of the Melloblocco gathering. The climbing rewards delicate footwork and a cool head rather than raw power, and the protected valley remains gloriously car-free and unspoilt. It is at its best from late spring through autumn, when the granite is dry and the pastures bloom.",
  Leonidio:
    "Tucked beneath towering red and grey limestone walls on the east coast of the Peloponnese, Leonidio has rapidly become one of Greece's premier sport-climbing destinations. Hundreds of routes — many bolted within the last decade — climb immaculate tufa-streaked faces and caves across dozens of sectors above the olive groves and the sea. Grades cluster generously in the 6s and 7s, with steep, athletic lines and a growing tally of hard projects. Quiet villages, welcoming locals and mild winter sun make it a worthy rival to Kalymnos.",
  Meteora:
    "In central Greece, the otherworldly conglomerate towers of Meteora soar hundreds of metres above the plain, crowned by centuries-old monasteries. Climbing here is a serious adventure: long, often boldly protected routes ascend rounded cobbles and pebbles cemented into vertical pillars, demanding commitment and a steady head as much as technique. The traditional ethic and sparse bolting keep the crowds away and reward those seeking summits and solitude. The surreal scenery and deep history make every route a memorable outing.",
  Kyparissi:
    "A remote seaside village on the Peloponnese coast, Kyparissi is one of Greece's newest and most scenic climbing areas. Sectors of clean grey and orange limestone rise directly from the bay, some with belays just metres above the water, offering vertical to overhanging sport routes in a tranquil, undeveloped setting. The grades suit everyone, the rock is impeccable, and the slow rhythm of the fishing village — tavernas, clear swimming, little traffic — makes it feel like a discovery. Spring and autumn bring the finest conditions.",
  Céüse:
    "High on a crescent-shaped mountain above Gap in the French Alps, Céüse is regarded by many as the finest sport crag in the world. A long band of compact blue-grey limestone gives steep, sustained climbing on pockets, crimps and tufas, home to legendary hard routes like Biographie alongside brilliant lines throughout the grades. The 45-minute uphill approach and high altitude keep it cool, quiet and special, with conditions best from late spring to autumn. For many climbers a trip here is nothing short of a pilgrimage.",
  "Gorges du Verdon":
    "France's grand canyon, the Gorges du Verdon, plunges hundreds of metres to a turquoise river through sheer walls of grey limestone in Provence. It is one of Europe's great venues for long, exposed multi-pitch climbing, with many routes reached by a committing abseil from the rim into vertical and overhanging terrain. The position is breathtaking and the climbing demanding — technical faces, tufas and the occasional bold runout — best enjoyed by confident climbers in spring and autumn. Single-pitch sectors and via ferratas round out the offering.",
  "Saint-Léger-du-Ventoux":
    "In a quiet gorge beneath Mont Ventoux in Provence, Saint-Léger offers compact, pockety limestone prized for its technical, fingery climbing. The sheltered walls catch afternoon shade and stay climbable across much of the year, with sectors ranging from vertical pocket-pulling to a steep cave for bad weather. The grades lean towards the harder end but there is plenty for everyone, and the peaceful Provençal setting — lavender, vineyards and the looming Ventoux — adds to the charm.",
};

const SECTORS = [
  [
    "Arco",
    "Massone",
    "Arco's most popular wall: a vast sweep of vertical to gently overhanging limestone with fast access and afternoon shade. Dozens of single-pitch routes pack the cliff, from polished slab classics to crimpy testpieces, making it the perfect place to clock up mileage.",
  ],
  [
    "Arco",
    "Policromuro",
    "A steep, colourful cave sector that stays dry in the rain — Arco's go-to crag when the weather turns. Powerful, three-dimensional climbing on orange tufas, pockets and the occasional jug rewards good footwork and a strong core.",
  ],
  [
    "Kalymnos",
    "Grande Grotta",
    "Kalymnos's iconic cave: an enormous orange amphitheatre hung with giant stalactites and tufa blobs. The climbing is wildly steep and photogenic, with kneebars and rests hidden among the features — home to some of the island's most famous routes.",
  ],
  [
    "Kalymnos",
    "Odyssey",
    "Vertical to slightly overhanging grey walls with morning shade and sweeping sea views. Clean, positive holds and generous bolting make Odyssey a friendly, popular sector through the mid grades.",
  ],
  [
    "Fontainebleau",
    "Bas Cuvier",
    "The historic heart of Fontainebleau bouldering, where many of the sport's classic testpieces and brutal slopers were first established. Polished, technical and steeped in history, its problems still humble climbers of every level.",
  ],
  [
    "Fontainebleau",
    "Franchard Isatis",
    "A scenic Font sector of slabs, aretes and a famous traverse circuit set among the pines. The sandstone is impeccable and the problems range from delicate footwork to powerful compression.",
  ],
  [
    "Leonidio",
    "Hot Rock",
    "South-facing orange tufas high above the village, sustained and sunny. Long, athletic lines weave between hanging stalactites — a brilliant spot on cool winter days.",
  ],
  [
    "Leonidio",
    "Mars",
    "Vertical grey and red walls offering technical, crimpy climbing with morning shade. The holds are small and the movement precise, making it a favourite for face-climbing specialists.",
  ],
  [
    "Céüse",
    "Berlin",
    "The classic introduction to Céüse's blue limestone — vertical pockets and crimps on impeccable rock. Sustained and technical, these lines are the perfect warm-up before the cliff's harder neighbours.",
  ],
  [
    "Céüse",
    "Biographie",
    "Céüse's most famous wall, home to some of the hardest sport pitches ever climbed, including Sharma's Biographie. Steep, relentless and historic, it draws strong climbers from around the world.",
  ],
  [
    "Finale Ligure",
    "Bric Pianarella",
    "Sweeping seaside slabs and walls of grippy grey limestone, cooled by a sea breeze. The friendly angle and abundant edges make it one of Finale's most enjoyable all-round sectors.",
  ],
  [
    "Finale Ligure",
    "Grotta dell'Edera",
    "A shady cave that stays dry in the rain, offering steep tufa pulling and big jugs. When the rest of Finale is wet, this is where everyone heads.",
  ],
  [
    "Gorges du Verdon",
    "L'Escalès",
    "The grand wall of the Verdon — long, airy limestone pitches dropping away above the gorge. Committing, exposed and unforgettable, it is the canyon's signature multi-pitch arena.",
  ],
  [
    "Gorges du Verdon",
    "Le Duc",
    "Steep pockets and tufas with the turquoise river far below. The climbing is athletic and the position spectacular, with a real sense of the void beneath your heels.",
  ],
  [
    "Kyparissi",
    "Watermill",
    "Shaded grey walls beside the spring, with clean rock and friendly grades. A relaxed, family-friendly sector ideal for warming up or escaping a hot afternoon.",
  ],
  [
    "Kyparissi",
    "Babala",
    "Sun-soaked tufa walls overlooking the bay, steeper and more sustained than the village crags. Long, breezy lines reward endurance and a head for exposure above the sea.",
  ],
  [
    "Meteora",
    "Holy Spirit",
    "An adventurous tower of rounded conglomerate cobbles, climbed on long, boldly protected pitches. Pure adventure for those with a steady head and a taste for the unusual.",
  ],
  [
    "Meteora",
    "Doupiani",
    "The beginner-friendly tower near the village, with sweeping views over the monasteries and plain. Mellower pebble climbing makes it the natural place to taste Meteora's surreal rock.",
  ],
  [
    "Saint-Léger-du-Ventoux",
    "Le Pilier",
    "Compact, pockety limestone offering technical, fingery climbing with afternoon shade. Precise footwork and a tolerance for small holds are the keys to this Saint-Léger favourite.",
  ],
  [
    "Saint-Léger-du-Ventoux",
    "La Grotte",
    "A small, steep cave that stays dry in the rain — powerful and burly. Roofs, tufas and big moves make it both the bad-weather option and a strength session in one.",
  ],
  [
    "San Vito Lo Capo",
    "Salinella",
    "Golden limestone steps rising right behind the beach, with sea views and sun. Easy access and approachable grades make it a perfect introduction to San Vito's rock.",
  ],
  [
    "San Vito Lo Capo",
    "El Bahira",
    "A south-facing crag near the campsite, dry and warm through winter. Solid, featured walls with a powerful crux or two reward a midday or sunset session.",
  ],
  [
    "Sperlonga",
    "Grotta",
    "Sperlonga's steep, shaded sea cave — dark, powerful and dripping with tufas. The signature venue for hard winter sport climbing above the Tyrrhenian.",
  ],
  [
    "Sperlonga",
    "Settore Centrale",
    "Vertical to gently overhanging walls with quick roadside access. Clean grey rock and a spread of mid grades make it the sector's reliable all-rounder.",
  ],
  [
    "Val di Mello",
    "Scoglio delle Metamorfosi",
    "Yosemite-style granite slabs and cracks rising above the valley's meadows. Long, committing trad lines reward friction, faith and careful gear placement.",
  ],
  [
    "Val di Mello",
    "Sasso di Remenno",
    "A giant freestanding granite boulder, the beating heart of the Melloblocco festival. Glassy slopers, crimps and aretes draw boulderers from across Europe.",
  ],
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  let crags = 0;
  for (const [name, description] of Object.entries(CRAGS)) {
    const res = await pool.query(
      `UPDATE crags SET description=$1 WHERE name=$2 AND deleted=false`,
      [description, name],
    );
    crags += res.rowCount;
  }
  console.log(`Updated ${crags} crag descriptions.`);

  let sectors = 0;
  for (const [crag, sector, description] of SECTORS) {
    const res = await pool.query(
      `UPDATE sectors SET description=$1
       FROM crags
       WHERE sectors.crag_id=crags.id AND crags.name=$2 AND sectors.name=$3
         AND sectors.deleted=false`,
      [description, crag, sector],
    );
    sectors += res.rowCount;
  }
  console.log(`Updated ${sectors} sector descriptions.`);
  console.log("Done.");
} finally {
  await pool.end();
}
