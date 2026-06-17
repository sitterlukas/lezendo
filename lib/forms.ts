import db, {
  type ClimbStyle,
  type GearCategory,
  type TickType,
  type FeedTargetType,
  type LikeTargetType,
} from "@/lib/db";
import { gradesForSystem, disciplineOf } from "@/lib/grade-conversion";
import { loadGradeEquivalencies } from "@/lib/grade-data";

// Shared form parsing + validation helpers, lifted out of the old server
// actions so the REST route handlers can reuse the exact same rules. They work
// on a FormData, which `readForm` builds from either a JSON or multipart body —
// so the web app can POST JSON while the parsing stays identical to before.

export const styles: ClimbStyle[] = ["sport", "trad", "boulder"];

export const tickTypes: TickType[] = [
  "onsight",
  "flash",
  "redpoint",
  "toprope",
  "attempt",
];

export const gearCategories: GearCategory[] = [
  "rope",
  "quickdraws",
  "harness",
  "shoes",
  "protection",
  "bouldering",
  "safety",
  "other",
];

export const reviewEntityTypes = ["crag", "sector", "route"] as const;
export const feedTargetTypes: FeedTargetType[] = ["status", "activity"];
export const likeTargetTypes: LikeTargetType[] = [
  "status",
  "activity",
  "comment",
];

// Reads either an application/json body or a multipart/urlencoded form and
// normalizes both into a FormData, so handlers (and the helpers below) don't
// care which a client sent. The web app sends JSON; mobile may send either.
export async function readForm(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let data: unknown;
    try {
      data = await request.json();
    } catch {
      data = {};
    }
    const fd = new FormData();
    if (data && typeof data === "object") {
      for (const [k, v] of Object.entries(data)) {
        if (v !== null && v !== undefined) fd.set(k, String(v));
      }
    }
    return fd;
  }
  return request.formData();
}

// Resolve the optional `sector_id` form field for a status: returns the sector
// id, null when no tag was chosen, or INVALID_SECTOR when the id is malformed
// or points at a missing/deleted sector.
export const INVALID_SECTOR = Symbol("invalid-sector");

export async function resolveSectorTag(
  formData: FormData,
): Promise<number | null | typeof INVALID_SECTOR> {
  const raw = String(formData.get("sector_id") ?? "").trim();
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isInteger(id)) return INVALID_SECTOR;
  const sector = await db
    .selectFrom("sectors")
    .select("id")
    .where("id", "=", id)
    .where("deleted", "=", false)
    .executeTakeFirst();
  return sector ? id : INVALID_SECTOR;
}

// Bouldering is its own discipline; sport and trad are both roped.
const disciplineForStyle = (style: ClimbStyle): "rope" | "boulder" =>
  style === "boulder" ? "boulder" : "rope";

// Validates the grading system + grade for a route. Returns an error message to
// surface, or null when valid.
export async function gradeSystemError(
  gradingSystemId: number,
  grade: string,
  style: ClimbStyle,
): Promise<string | null> {
  const gs = await db
    .selectFrom("grading_systems")
    .select("slug")
    .where("id", "=", gradingSystemId)
    .executeTakeFirst();
  if (!gs) return "Unknown grading system.";

  const eqs = await loadGradeEquivalencies();
  const want = disciplineForStyle(style);
  if (disciplineOf(gs.slug, eqs) !== want) {
    return want === "boulder"
      ? "Boulders must use a boulder grading system (e.g. Font or V-scale)."
      : "Roped routes must use a roped grading system (e.g. French, YDS, UIAA, or British).";
  }
  if (!gradesForSystem(gs.slug, eqs).includes(grade)) {
    return `"${grade}" is not a valid grade for the selected grading system.`;
  }
  return null;
}

// Shared parsing for a route's bolt count + bolting/protection note.
export function parseBolting(formData: FormData): {
  boltCount: number | null;
  protection: string | null;
} {
  const boltRaw = String(formData.get("bolt_count") ?? "").trim();
  const bolts = boltRaw ? Number.parseInt(boltRaw, 10) : null;
  const protection = String(formData.get("protection") ?? "").trim();
  return {
    boltCount:
      bolts !== null && Number.isInteger(bolts) && bolts >= 0 ? bolts : null,
    protection: protection || null,
  };
}

// Shared parsing for a crag's guidebook fields.
export function parseCragDetails(formData: FormData): {
  rock_type: string | null;
  aspect: string | null;
  best_season: string | null;
  access_notes: string | null;
} {
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  return {
    rock_type: str("rock_type"),
    aspect: str("aspect"),
    best_season: str("best_season"),
    access_notes: str("access_notes"),
  };
}

// Shared parsing for a sector's approach time + aspect.
export function parseSectorDetails(formData: FormData): {
  approach_minutes: number | null;
  aspect: string | null;
} {
  const approachRaw = String(formData.get("approach_minutes") ?? "").trim();
  const approach = approachRaw ? Number.parseInt(approachRaw, 10) : null;
  const aspect = String(formData.get("aspect") ?? "").trim();
  return {
    approach_minutes:
      approach !== null && Number.isInteger(approach) && approach >= 0
        ? approach
        : null,
    aspect: aspect || null,
  };
}

// Shared parsing for a route's guidebook details (first ascent, pitches, gear).
export function parseRouteDetails(formData: FormData): {
  firstAscensionist: string | null;
  firstAscentYear: number | null;
  pitches: number | null;
  gearNotes: string | null;
} {
  const firstAscensionist = String(
    formData.get("first_ascensionist") ?? "",
  ).trim();
  const yearRaw = String(formData.get("first_ascent_year") ?? "").trim();
  const pitchesRaw = String(formData.get("pitches") ?? "").trim();
  const gearNotes = String(formData.get("gear_notes") ?? "").trim();

  const year = yearRaw ? Number.parseInt(yearRaw, 10) : null;
  const pitches = pitchesRaw ? Number.parseInt(pitchesRaw, 10) : null;
  const thisYear = 2026;

  return {
    firstAscensionist: firstAscensionist || null,
    firstAscentYear:
      year !== null &&
      Number.isInteger(year) &&
      year >= 1900 &&
      year <= thisYear + 1
        ? year
        : null,
    pitches:
      pitches !== null && Number.isInteger(pitches) && pitches >= 1
        ? pitches
        : null,
    gearNotes: gearNotes || null,
  };
}
