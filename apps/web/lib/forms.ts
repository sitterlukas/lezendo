import { z } from "zod";
import db from "@/lib/db";
import { gradesForSystem, disciplineOf } from "@whipperbook/core";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import { STATUS_MAX_LEN, COMMENT_MAX_LEN } from "@whipperbook/core";

// Shared request-body validation for the REST route handlers. Every write route
// parses its JSON body against one of these Zod schemas via `readJson`, so the
// validation rules live in one place and the route bodies stay thin.
//
// The web client serializes form fields with `Object.fromEntries(FormData)`, so
// numeric/date/boolean fields arrive as strings; the mobile client may send real
// JSON scalars. The helpers below accept both shapes.

// ── Field helpers ──────────────────────────────────────────────────────────

// Trim a value to a string ("" when null/undefined) before applying `schema`.
function trimmed<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v == null ? "" : String(v).trim()), schema);
}

// Required, trimmed string with a custom "missing" message and optional max.
export function requiredText(message: string, max?: number) {
  const base = z.string().min(1, message);
  return trimmed(max ? base.max(max, message) : base);
}

// Optional text: "", whitespace, or missing → null; otherwise the trimmed value.
export const nullableText = z
  .preprocess((v) => (v == null ? "" : String(v).trim()), z.string())
  .transform((s) => (s === "" ? null : s));

// Optional integer that silently becomes null on empty/invalid/out-of-range
// input — mirrors the old guidebook-field parsing (a bad value just clears it).
export function nullableInt(opts: { min?: number; max?: number } = {}) {
  return z.preprocess((v) => {
    if (v == null || String(v).trim() === "") return null;
    const n = Number.parseInt(String(v).trim(), 10);
    if (!Number.isInteger(n)) return null;
    if (opts.min != null && n < opts.min) return null;
    if (opts.max != null && n > opts.max) return null;
    return n;
  }, z.number().int().nullable());
}

// Required integer that errors (with `message`) on missing/invalid/out-of-range.
export function requiredInt(
  message: string,
  opts: { min?: number; max?: number } = {},
) {
  let schema = z.number({ error: message }).int(message);
  if (opts.min != null) schema = schema.min(opts.min, message);
  if (opts.max != null) schema = schema.max(opts.max, message);
  return z.preprocess(
    (v) =>
      v == null || String(v).trim() === "" ? NaN : Number(String(v).trim()),
    schema,
  );
}

// Optional date: "" / missing → null; an unparseable value → error (`message`).
export function nullableDate(message: string) {
  return z.preprocess(
    (v) => {
      if (v == null || String(v).trim() === "") return null;
      const d = new Date(String(v).trim());
      return Number.isNaN(d.getTime()) ? NaN : d;
    },
    z.date({ error: message }).nullable(),
  );
}

// A latitude/longitude bounded by ±`bound`.
function coordinate(message: string, bound: number) {
  return z.preprocess(
    (v) => Number(String(v ?? "").trim()),
    z
      .number()
      .refine((n) => Number.isFinite(n) && n >= -bound && n <= bound, message),
  );
}

// ── Enums ────────────────────────────────────────────────────────────────────

export const styleEnum = z.enum(["sport", "trad", "boulder"], {
  error: "Invalid type.",
});
export const tickTypeEnum = z.enum(
  ["onsight", "flash", "redpoint", "toprope", "attempt"],
  { error: "Invalid ascent style." },
);
export const gearCategoryEnum = z.enum(
  [
    "rope",
    "quickdraws",
    "harness",
    "shoes",
    "protection",
    "bouldering",
    "safety",
    "other",
  ],
  { error: "Invalid category." },
);
export const reviewEntityEnum = z.enum(["crag", "sector", "route"], {
  error: "Invalid review target.",
});
export const feedTargetEnum = z.enum(["status", "activity"], {
  error: "Invalid comment target.",
});
export const likeTargetEnum = z.enum(["status", "activity", "comment"], {
  error: "Invalid like target.",
});

// ── Composite write schemas ──────────────────────────────────────────────────

export const cragWriteSchema = z.object({
  name: requiredText("Name is required."),
  area: nullableText,
  country: nullableText,
  description: nullableText,
  rock_type: nullableText,
  aspect: nullableText,
  best_season: nullableText,
  access_notes: nullableText,
});

export const sectorWriteSchema = z.object({
  name: requiredText("Name is required."),
  description: nullableText,
  approach_minutes: nullableInt({ min: 0 }),
  aspect: nullableText,
});

export const sectorCreateSchema = sectorWriteSchema.extend({
  crag_id: requiredInt("Invalid crag.", { min: 1 }),
});

export const routeWriteSchema = z.object({
  name: requiredText("Name is required."),
  grade: requiredText("Grade is required."),
  style: styleEnum,
  grading_system_id: requiredInt("Pick a grading system.", { min: 1 }),
  crag_id: requiredInt("Invalid crag.", { min: 1 }),
  sector_id: nullableInt({ min: 1 }),
  height_m: nullableInt({ min: 1 }),
  bolt_count: nullableInt({ min: 0 }),
  protection: nullableText,
  first_ascensionist: nullableText,
  first_ascent_year: nullableInt({ min: 1900, max: 2027 }),
  pitches: nullableInt({ min: 1 }),
  gear_notes: nullableText,
  description: nullableText,
});

export const ascentCreateSchema = z.object({
  route_id: requiredInt("Invalid route.", { min: 1 }),
  tick_type: tickTypeEnum,
  ascent_date: nullableDate("Invalid date."),
  notes: nullableText,
});

export const gearCreateSchema = z.object({
  name: requiredText("Name is required."),
  category: gearCategoryEnum,
  brand: nullableText,
  purchased_on: nullableDate("Invalid purchase date."),
  notes: nullableText,
});

export const gearReviewCreateSchema = z.object({
  product: requiredText("Product is required."),
  rating: requiredInt("Rating must be between 1 and 5.", { min: 1, max: 5 }),
  body: requiredText("Write a review first."),
});

export const entityReviewCreateSchema = z.object({
  entity_type: reviewEntityEnum,
  entity_id: requiredInt("Invalid review target.", { min: 1 }),
  rating: requiredInt("Rating must be between 1 and 5.", { min: 1, max: 5 }),
  body: nullableText,
});

export const reviewQuerySchema = z.object({
  entityType: reviewEntityEnum,
  entityId: requiredInt("Invalid review target.", { min: 1 }),
});

export const commentCreateSchema = z.object({
  target_type: feedTargetEnum,
  target_id: requiredInt("Invalid comment target.", { min: 1 }),
  body: trimmed(
    z
      .string()
      .min(1, "Write something first.")
      .max(COMMENT_MAX_LEN, `Keep it under ${COMMENT_MAX_LEN} characters.`),
  ),
});

export const likeSchema = z.object({
  target_type: likeTargetEnum,
  target_id: requiredInt("Invalid like target.", { min: 1 }),
});

// Status body + the optional sector tag (resolved against the DB by
// `resolveSectorTag`, which is why sector_id is just passed through here).
export const statusWriteSchema = z.object({
  body: trimmed(
    z
      .string()
      .min(1, "Write something first.")
      .max(STATUS_MAX_LEN, `Keep it under ${STATUS_MAX_LEN} characters.`),
  ),
  sector_id: z.unknown().optional(),
});

export const forumTopicCreateSchema = z.object({
  title: requiredText("Title is required."),
  body: requiredText("Write something first."),
});

export const forumTitleSchema = z.object({
  title: requiredText("Title can't be empty."),
});

export const forumPostBodySchema = z.object({
  body: requiredText("Write something first."),
});

export const sectorLocationSchema = z.object({
  kind: z.enum(["sector", "parking"], { error: "Invalid location kind." }),
  latitude: coordinate("Invalid latitude.", 90),
  longitude: coordinate("Invalid longitude.", 180),
});

// ── Cross-record validators (run after schema parsing) ───────────────────────

// Resolve the optional sector tag for a status: the sector id, null when no tag
// was chosen, or INVALID_SECTOR when the id is malformed or points at a
// missing/deleted sector.
export const INVALID_SECTOR = Symbol("invalid-sector");

export async function resolveSectorTag(
  raw: unknown,
): Promise<number | null | typeof INVALID_SECTOR> {
  const s = raw == null ? "" : String(raw).trim();
  if (!s) return null;
  const id = Number(s);
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
const disciplineForStyle = (style: "sport" | "trad" | "boulder") =>
  style === "boulder" ? "boulder" : "rope";

// Validates the grading system + grade for a route. Returns an error message to
// surface, or null when valid.
export async function gradeSystemError(
  gradingSystemId: number,
  grade: string,
  style: "sport" | "trad" | "boulder",
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
