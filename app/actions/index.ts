"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "kysely";
import { auth } from "@/auth";
import { STATUS_MAX_LEN, COMMENT_MAX_LEN } from "@/lib/constants";
import db, {
  type ClimbStyle,
  type FeedTargetType,
  type LikeTargetType,
  type GearCategory,
  type TickType,
  type DeletionEntityType,
  type DeletionAction,
  type ImageEntityType,
} from "@/lib/db";
import { gradesForSystem, disciplineOf } from "@/lib/grade-conversion";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import { buildFeed, type FeedPage } from "@/lib/feed";

const styles: ClimbStyle[] = ["sport", "trad", "boulder"];

// Bouldering is its own discipline; sport and trad are both roped.
const disciplineForStyle = (style: ClimbStyle): "rope" | "boulder" =>
  style === "boulder" ? "boulder" : "rope";

// Validates the grading system + grade for a route. Returns an error message to
// surface, or null when valid. Enforces two things: the grading system's
// discipline must match the route's style (boulders take boulder grades, roped
// routes take roped grades), and the grade must be recognized notation for that
// system (e.g. no "5+" under UIAA).
async function gradeSystemError(
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
const gearCategories: GearCategory[] = [
  "rope",
  "quickdraws",
  "harness",
  "shoes",
  "protection",
  "bouldering",
  "safety",
  "other",
];
const tickTypes: TickType[] = [
  "onsight",
  "flash",
  "redpoint",
  "toprope",
  "attempt",
];

async function currentUserId(): Promise<number | null> {
  const email = (await auth())?.user?.email;
  if (!email) return null;
  const user = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();
  return user?.id ?? null;
}

async function currentUserFull(): Promise<{ id: number; role: string } | null> {
  const email = (await auth())?.user?.email;
  if (!email) return null;
  const user = await db
    .selectFrom("users")
    .select(["id", "role"])
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();
  return user ?? null;
}

function canModify(
  user: { id: number; role: string } | null,
  createdBy: number | null,
) {
  if (!user) return false;
  return user.role === "admin" || user.id === createdBy;
}

// Shared parsing for a route's bolt count + bolting/protection note.
function parseBolting(formData: FormData): {
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
function parseCragDetails(formData: FormData): {
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
function parseSectorDetails(formData: FormData): {
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
function parseRouteDetails(formData: FormData): {
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

export async function logAscent(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const routeId = Number(formData.get("route_id"));
  const tickType = String(formData.get("tick_type")) as TickType;
  const dateRaw = String(formData.get("ascent_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!Number.isInteger(routeId) || !tickTypes.includes(tickType)) return;
  const date = dateRaw ? new Date(dateRaw) : null;
  if (date && Number.isNaN(date.getTime())) return;

  const route = await db
    .selectFrom("routes")
    .select("crag_id")
    .where("id", "=", routeId)
    .executeTakeFirst();
  if (!route) return;

  // Find or create the (climber, day) activity this ascent belongs to (across
  // crags), so feed likes/comments have a stable target. `DO UPDATE` (a no-op
  // set) lets the upsert RETURN the existing row's id on conflict.
  const day = (date ?? new Date()).toISOString().slice(0, 10);
  const activity = await db
    .insertInto("ascent_activities")
    .values({ user_id: userId, crag_id: route.crag_id, activity_date: day })
    .onConflict((oc) =>
      oc.columns(["user_id", "activity_date"]).doUpdateSet({ user_id: userId }),
    )
    .returning("id")
    .executeTakeFirstOrThrow();

  await db
    .insertInto("ascents")
    .values({
      route_id: routeId,
      user_id: userId,
      tick_type: tickType,
      ...(date ? { ascent_date: date } : {}),
      notes: notes || null,
      activity_id: activity.id,
    })
    .execute();

  revalidatePath("/crags", "layout");
  revalidatePath("/profile");
  revalidatePath("/feed");
}

// Remove a feed target's polymorphic interactions before the row itself:
// likes on it, its comments, and the likes on those comments (none are tied by
// a DB foreign key, so they'd otherwise orphan).
async function deleteTargetInteractions(
  targetType: "status" | "activity",
  targetId: number,
) {
  const commentRows = await db
    .selectFrom("comments")
    .select("id")
    .where("target_type", "=", targetType)
    .where("target_id", "=", targetId)
    .execute();
  const commentIds = commentRows.map((r) => r.id);
  if (commentIds.length > 0) {
    await db
      .deleteFrom("likes")
      .where("target_type", "=", "comment")
      .where("target_id", "in", commentIds)
      .execute();
  }
  await db
    .deleteFrom("comments")
    .where("target_type", "=", targetType)
    .where("target_id", "=", targetId)
    .execute();
  await db
    .deleteFrom("likes")
    .where("target_type", "=", targetType)
    .where("target_id", "=", targetId)
    .execute();
}

export async function deleteAscent(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const ascentId = Number(formData.get("ascent_id"));
  if (!Number.isInteger(ascentId)) return;

  // Verify ownership before deleting — only the owner may delete their tick.
  const owned = await db
    .selectFrom("ascents")
    .select(["id", "activity_id"])
    .where("id", "=", ascentId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!owned) return;

  await db.deleteFrom("ascents").where("id", "=", ascentId).execute();

  // If that was the last ascent in its activity, remove the now-empty activity
  // and its feed interactions (likes/comments target the activity).
  if (owned.activity_id !== null) {
    const remaining = await db
      .selectFrom("ascents")
      .select("id")
      .where("activity_id", "=", owned.activity_id)
      .limit(1)
      .executeTakeFirst();
    if (!remaining) {
      await deleteTargetInteractions("activity", owned.activity_id);
      await db
        .deleteFrom("ascent_activities")
        .where("id", "=", owned.activity_id)
        .execute();
    }
  }

  revalidatePath("/profile");
  revalidatePath("/crags");
  revalidatePath("/feed");
}

export async function addGearItem(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as GearCategory;
  const brand = String(formData.get("brand") ?? "").trim();
  const purchasedRaw = String(formData.get("purchased_on") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !gearCategories.includes(category)) return;
  const purchasedOn = purchasedRaw ? new Date(purchasedRaw) : null;
  if (purchasedOn && Number.isNaN(purchasedOn.getTime())) return;

  await db
    .insertInto("gear_items")
    .values({
      user_id: userId,
      name,
      category,
      brand: brand || null,
      purchased_on: purchasedOn,
      notes: notes || null,
    })
    .execute();

  revalidatePath("/gear");
  revalidatePath("/profile/gear");
}

export async function retireGearItem(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const gearId = Number(formData.get("gear_id"));
  if (!Number.isInteger(gearId)) return;

  await db
    .updateTable("gear_items")
    .set({ retired_on: new Date() })
    .where("id", "=", gearId)
    .where("user_id", "=", userId)
    .execute();

  revalidatePath("/gear");
  revalidatePath("/profile/gear");
}

export async function unretireGearItem(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const gearId = Number(formData.get("gear_id"));
  if (!Number.isInteger(gearId)) return;

  await db
    .updateTable("gear_items")
    .set({ retired_on: null })
    .where("id", "=", gearId)
    .where("user_id", "=", userId)
    .execute();

  revalidatePath("/gear");
  revalidatePath("/profile/gear");
}

export async function deleteGearItem(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const gearId = Number(formData.get("gear_id"));
  if (!Number.isInteger(gearId)) return;

  await db
    .deleteFrom("gear_items")
    .where("id", "=", gearId)
    .where("user_id", "=", userId)
    .execute();

  revalidatePath("/gear");
  revalidatePath("/profile/gear");
}

export async function addGearReview(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const product = String(formData.get("product") ?? "").trim();
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();

  if (!product || !body) return;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;

  await db
    .insertInto("gear_reviews")
    .values({ user_id: userId, product, rating, body })
    .execute();

  revalidatePath("/gear");
  revalidatePath("/profile/gear");
}

export async function deleteGearReview(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const reviewId = Number(formData.get("review_id"));
  if (!Number.isInteger(reviewId)) return;

  await db
    .deleteFrom("gear_reviews")
    .where("id", "=", reviewId)
    .where("user_id", "=", userId)
    .execute();

  revalidatePath("/gear");
  revalidatePath("/profile/gear");
}

const reviewEntityTypes = ["crag", "sector", "route"] as const;

export async function addEntityReview(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const entityType = String(formData.get("entity_type") ?? "");
  const entityId = Number(formData.get("entity_id"));
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();

  if (
    !reviewEntityTypes.includes(
      entityType as (typeof reviewEntityTypes)[number],
    )
  )
    return;
  if (!Number.isInteger(entityId)) return;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;

  // One review per user per entity: posting again updates rating/comment.
  await db
    .insertInto("entity_reviews")
    .values({
      entity_type: entityType as (typeof reviewEntityTypes)[number],
      entity_id: entityId,
      user_id: userId,
      rating,
      body: body || null,
    })
    .onConflict((oc) =>
      oc
        .columns(["entity_type", "entity_id", "user_id"])
        .doUpdateSet({ rating, body: body || null }),
    )
    .execute();

  revalidatePath("/crags", "layout");
}

export async function deleteEntityReview(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const reviewId = Number(formData.get("review_id"));
  if (!Number.isInteger(reviewId)) return;

  let query = db.deleteFrom("entity_reviews").where("id", "=", reviewId);
  // Owners delete their own; admins can delete any.
  if (user.role !== "admin") query = query.where("user_id", "=", user.id);
  await query.execute();

  revalidatePath("/crags", "layout");
}

// Result of a create action: the new row's id, or a message to show inline.
export type CreateResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

export async function addCrag(formData: FormData): Promise<CreateResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be logged in." };

  const name = String(formData.get("name") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const details = parseCragDetails(formData);

  if (!name) return { ok: false, error: "Name is required." };

  const row = await db
    .insertInto("crags")
    .values({
      name,
      area: area || null,
      country: country || null,
      description: description || null,
      ...details,
      created_by: userId,
    })
    .onConflict((oc) => oc.column("name").doNothing())
    .returning("id")
    .executeTakeFirst();

  if (!row)
    return { ok: false, error: "A crag with that name already exists." };

  revalidatePath("/crags");
  revalidatePath("/");
  return { ok: true, id: row.id };
}

export async function updateCrag(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const cragId = Number(formData.get("crag_id"));
  const name = String(formData.get("name") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const details = parseCragDetails(formData);

  if (!name || !Number.isInteger(cragId)) return;

  const crag = await db
    .selectFrom("crags")
    .select(["id", "created_by"])
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag || !canModify(user, crag.created_by)) return;

  await db
    .updateTable("crags")
    .set({
      name,
      area: area || null,
      country: country || null,
      description: description || null,
      ...details,
    })
    .where("id", "=", cragId)
    .execute();

  revalidatePath("/crags", "layout");
}

export async function updateSector(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const sectorId = Number(formData.get("sector_id"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const details = parseSectorDetails(formData);

  if (!name || !Number.isInteger(sectorId)) return;

  const sector = await db
    .selectFrom("sectors")
    .select(["id", "created_by"])
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector || !canModify(user, sector.created_by)) return;

  await db
    .updateTable("sectors")
    .set({ name, description: description || null, ...details })
    .where("id", "=", sectorId)
    .execute();

  revalidatePath("/crags", "layout");
}

export async function updateSectorLocation(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const sectorId = Number(formData.get("sector_id"));
  const kind = String(formData.get("kind") ?? "");
  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();

  if (!Number.isInteger(sectorId)) return;
  if (kind !== "sector" && kind !== "parking") return;
  if (!latRaw || !lngRaw) return;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return;

  // Location/parking coordinates are community-editable: any signed-in user
  // can add or correct them (unlike sector name/description, which are
  // restricted to the author/admin in updateSector).
  const sector = await db
    .selectFrom("sectors")
    .select("id")
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector) return;

  await db
    .updateTable("sectors")
    .set(
      kind === "parking"
        ? { parking_latitude: lat, parking_longitude: lng }
        : { latitude: lat, longitude: lng },
    )
    .where("id", "=", sectorId)
    .execute();

  revalidatePath("/crags", "layout");
}

export async function updateRoute(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const routeId = Number(formData.get("route_id"));
  const cragId = Number(formData.get("crag_id"));
  const sectorIdRaw = String(formData.get("sector_id") ?? "").trim();
  const sectorId = sectorIdRaw ? Number(sectorIdRaw) : null;
  const name = String(formData.get("name") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const style = String(formData.get("style") ?? "") as ClimbStyle;
  const heightRaw = String(formData.get("height_m") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const gradingSystemId = Number(
    String(formData.get("grading_system_id") ?? "").trim(),
  );

  if (!name || !grade || !Number.isInteger(routeId) || !styles.includes(style))
    return;
  if (!Number.isInteger(gradingSystemId) || gradingSystemId <= 0) return;
  const updateGradeError = await gradeSystemError(
    gradingSystemId,
    grade,
    style,
  );
  if (updateGradeError) throw new Error(updateGradeError);

  const route = await db
    .selectFrom("routes")
    .select(["id", "created_by"])
    .where("id", "=", routeId)
    .executeTakeFirst();
  if (!route || !canModify(user, route.created_by)) return;

  if (sectorId) {
    const sector = await db
      .selectFrom("sectors")
      .select("id")
      .where("id", "=", sectorId)
      .where("crag_id", "=", cragId)
      .executeTakeFirst();
    if (!sector) return;
  }

  const height = heightRaw ? Number.parseInt(heightRaw, 10) : null;
  const { boltCount, protection } = parseBolting(formData);
  const { firstAscensionist, firstAscentYear, pitches, gearNotes } =
    parseRouteDetails(formData);

  await db
    .updateTable("routes")
    .set({
      name,
      grade,
      grading_system_id: gradingSystemId,
      style,
      sector_id: sectorId,
      height_m: height && !Number.isNaN(height) ? height : null,
      bolt_count: boltCount,
      protection,
      first_ascensionist: firstAscensionist,
      first_ascent_year: firstAscentYear,
      pitches,
      gear_notes: gearNotes,
      description: description || null,
    })
    .where("id", "=", routeId)
    .execute();

  revalidatePath("/crags", "layout");
}

export async function createTopic(formData: FormData) {
  const userId = await currentUserId();
  if (!userId) return;

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return;

  const topic = await db
    .insertInto("forum_topics")
    .values({ title, user_id: userId })
    .returning("id")
    .executeTakeFirstOrThrow();

  await db
    .insertInto("forum_posts")
    .values({ topic_id: topic.id, user_id: userId, body })
    .execute();

  redirect(`/forum/${topic.id}`);
}

export async function createPost(formData: FormData) {
  const userId = await currentUserId();
  if (!userId) return;

  const topicId = Number(formData.get("topic_id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body || !Number.isInteger(topicId)) return;

  const topic = await db
    .selectFrom("forum_topics")
    .select("id")
    .where("id", "=", topicId)
    .executeTakeFirst();
  if (!topic) return;

  await db
    .insertInto("forum_posts")
    .values({ topic_id: topicId, user_id: userId, body })
    .execute();

  revalidatePath(`/forum/${topicId}`);
}

async function logDeletion(
  entityType: DeletionEntityType,
  entityId: number,
  entityName: string,
  action: DeletionAction,
  userId: number,
) {
  await db
    .insertInto("deletion_log")
    .values({
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      action,
      user_id: userId,
    })
    .execute();
}

export async function deleteCrag(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const cragId = Number(formData.get("crag_id"));
  if (!Number.isInteger(cragId)) return;

  const crag = await db
    .selectFrom("crags")
    .select(["id", "name", "created_by"])
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag || !canModify(user, crag.created_by)) return;

  await db
    .updateTable("crags")
    .set({ deleted: true })
    .where("id", "=", cragId)
    .execute();
  await logDeletion("crag", cragId, crag.name, "delete", user.id);

  redirect("/crags");
}

export async function deleteSector(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const sectorId = Number(formData.get("sector_id"));
  const cragId = Number(formData.get("crag_id"));
  if (!Number.isInteger(sectorId) || !Number.isInteger(cragId)) return;

  const sector = await db
    .selectFrom("sectors")
    .select(["id", "name", "created_by"])
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector || !canModify(user, sector.created_by)) return;

  await db
    .updateTable("sectors")
    .set({ deleted: true })
    .where("id", "=", sectorId)
    .execute();
  await logDeletion("sector", sectorId, sector.name, "delete", user.id);

  redirect(`/crags/${cragId}`);
}

export async function deleteRoute(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const routeId = Number(formData.get("route_id"));
  const cragId = Number(formData.get("crag_id"));
  if (!Number.isInteger(routeId) || !Number.isInteger(cragId)) return;

  const route = await db
    .selectFrom("routes")
    .select(["id", "name", "created_by"])
    .where("id", "=", routeId)
    .executeTakeFirst();
  if (!route || !canModify(user, route.created_by)) return;

  await db
    .updateTable("routes")
    .set({ deleted: true })
    .where("id", "=", routeId)
    .execute();
  await logDeletion("route", routeId, route.name, "delete", user.id);

  redirect(`/crags/${cragId}`);
}

export async function recoverCrag(formData: FormData) {
  const userId = await currentUserId();
  if (!userId) return;

  const cragId = Number(formData.get("crag_id"));
  if (!Number.isInteger(cragId)) return;

  const crag = await db
    .selectFrom("crags")
    .select(["id", "name"])
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return;

  await db
    .updateTable("crags")
    .set({ deleted: false })
    .where("id", "=", cragId)
    .execute();
  await logDeletion("crag", cragId, crag.name, "recover", userId);

  revalidatePath("/crags", "layout");
}

export async function recoverSector(formData: FormData) {
  const userId = await currentUserId();
  if (!userId) return;

  const sectorId = Number(formData.get("sector_id"));
  if (!Number.isInteger(sectorId)) return;

  const sector = await db
    .selectFrom("sectors")
    .select(["id", "name"])
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector) return;

  await db
    .updateTable("sectors")
    .set({ deleted: false })
    .where("id", "=", sectorId)
    .execute();
  await logDeletion("sector", sectorId, sector.name, "recover", userId);

  revalidatePath("/crags", "layout");
}

export async function recoverRoute(formData: FormData) {
  const userId = await currentUserId();
  if (!userId) return;

  const routeId = Number(formData.get("route_id"));
  if (!Number.isInteger(routeId)) return;

  const route = await db
    .selectFrom("routes")
    .select(["id", "name"])
    .where("id", "=", routeId)
    .executeTakeFirst();
  if (!route) return;

  await db
    .updateTable("routes")
    .set({ deleted: false })
    .where("id", "=", routeId)
    .execute();
  await logDeletion("route", routeId, route.name, "recover", userId);

  revalidatePath("/crags", "layout");
}

export async function addSector(formData: FormData): Promise<CreateResult> {
  const userId = await currentUserId();
  if (userId === null) return { ok: false, error: "You must be logged in." };

  const name = String(formData.get("name") ?? "").trim();
  const cragId = Number(formData.get("crag_id"));
  const description = String(formData.get("description") ?? "").trim();
  const details = parseSectorDetails(formData);

  if (!name) return { ok: false, error: "Name is required." };
  if (!Number.isInteger(cragId)) return { ok: false, error: "Invalid crag." };

  const crag = await db
    .selectFrom("crags")
    .select("id")
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return { ok: false, error: "Crag not found." };

  const row = await db
    .insertInto("sectors")
    .values({
      crag_id: cragId,
      name,
      description: description || null,
      ...details,
      created_by: userId,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  revalidatePath("/crags", "layout");
  return { ok: true, id: row.id };
}

export async function addRoute(formData: FormData): Promise<CreateResult> {
  const userId = await currentUserId();
  if (userId === null) return { ok: false, error: "You must be logged in." };

  const name = String(formData.get("name") ?? "").trim();
  const cragId = Number(formData.get("crag_id"));
  const sectorIdRaw = String(formData.get("sector_id") ?? "").trim();
  const sectorId = sectorIdRaw ? Number(sectorIdRaw) : null;
  const grade = String(formData.get("grade") ?? "").trim();
  const style = String(formData.get("style") ?? "sport") as ClimbStyle;
  const heightRaw = String(formData.get("height_m") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const gradingSystemId = Number(
    String(formData.get("grading_system_id") ?? "").trim(),
  );

  if (!name) return { ok: false, error: "Name is required." };
  if (!grade) return { ok: false, error: "Grade is required." };
  if (!Number.isInteger(cragId)) return { ok: false, error: "Invalid crag." };
  if (!styles.includes(style)) return { ok: false, error: "Invalid type." };
  if (!Number.isInteger(gradingSystemId) || gradingSystemId <= 0)
    return { ok: false, error: "Pick a grading system." };
  const addGradeError = await gradeSystemError(gradingSystemId, grade, style);
  if (addGradeError) return { ok: false, error: addGradeError };

  const crag = await db
    .selectFrom("crags")
    .select("id")
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return { ok: false, error: "Crag not found." };

  if (sectorId) {
    const sector = await db
      .selectFrom("sectors")
      .select("id")
      .where("id", "=", sectorId)
      .where("crag_id", "=", cragId)
      .executeTakeFirst();
    if (!sector) return { ok: false, error: "Sector not found." };
  }

  const height = heightRaw ? Number.parseInt(heightRaw, 10) : null;
  const { boltCount, protection } = parseBolting(formData);
  const { firstAscensionist, firstAscentYear, pitches, gearNotes } =
    parseRouteDetails(formData);

  const row = await db
    .insertInto("routes")
    .values({
      name,
      crag_id: cragId,
      sector_id: sectorId,
      grade,
      grading_system_id: gradingSystemId,
      style,
      height_m: Number.isNaN(height) ? null : height,
      bolt_count: boltCount,
      protection,
      first_ascensionist: firstAscensionist,
      first_ascent_year: firstAscentYear,
      pitches,
      gear_notes: gearNotes,
      description: description || null,
      created_by: userId,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  revalidatePath("/crags", "layout");
  revalidatePath("/");
  return { ok: true, id: row.id };
}
export async function saveImage(
  url: string,
  entityType: ImageEntityType,
  entityId: number,
) {
  const userId = await currentUserId();
  if (!userId) return;

  // Statuses are capped at 5 photos. Do the count + insert inside one
  // transaction guarded by a per-status advisory lock so two concurrent
  // uploads can't both pass the check and overshoot the cap.
  if (entityType === "status") {
    await db.transaction().execute(async (trx) => {
      await sql`select pg_advisory_xact_lock(hashtext(${`status:${entityId}`}))`.execute(
        trx,
      );
      const { count } = await trx
        .selectFrom("images")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("entity_type", "=", "status")
        .where("entity_id", "=", entityId)
        .executeTakeFirstOrThrow();
      if (Number(count) >= 5) return;
      await trx
        .insertInto("images")
        .values({
          entity_type: entityType,
          entity_id: entityId,
          url,
          uploaded_by: userId,
        })
        .execute();
    });
    revalidatePath("/crags", "layout");
    revalidatePath("/feed");
    return;
  }

  await db
    .insertInto("images")
    .values({
      entity_type: entityType,
      entity_id: entityId,
      url,
      uploaded_by: userId,
    })
    .execute();

  revalidatePath("/crags", "layout");
}

export async function deleteImage(imageId: number) {
  const user = await currentUserFull();
  if (!user) return;

  const image = await db
    .selectFrom("images")
    .selectAll()
    .where("id", "=", imageId)
    .executeTakeFirst();
  if (!image) return;

  if (!canModify(user, image.uploaded_by)) return;

  const { del } = await import("@vercel/blob");
  await del(image.url);

  await db.deleteFrom("images").where("id", "=", imageId).execute();

  revalidatePath("/crags", "layout");
}

export async function followUser(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const followeeId = Number(formData.get("followee_id"));
  if (!Number.isInteger(followeeId) || followeeId === userId) return;

  // Idempotent: ignore if the follow already exists.
  await db
    .insertInto("follows")
    .values({ follower_id: userId, followee_id: followeeId })
    .onConflict((oc) => oc.columns(["follower_id", "followee_id"]).doNothing())
    .execute();

  revalidatePath(`/users/${followeeId}`);
  revalidatePath("/feed");
  revalidatePath("/profile", "layout");
}

export async function unfollowUser(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const followeeId = Number(formData.get("followee_id"));
  if (!Number.isInteger(followeeId)) return;

  await db
    .deleteFrom("follows")
    .where("follower_id", "=", userId)
    .where("followee_id", "=", followeeId)
    .execute();

  revalidatePath(`/users/${followeeId}`);
  revalidatePath("/feed");
  revalidatePath("/profile", "layout");
}

export type PersonResult = {
  id: number;
  name: string;
  avatarUrl: string | null;
  following: boolean;
};

// Find people by name or email (email is matched but never returned, so it
// stays private). Excludes the viewer; flags who they already follow.
export async function searchPeople(query: string): Promise<PersonResult[]> {
  // Searching people and exposing follow relationships is for signed-in users.
  const viewerId = await currentUserId();
  if (viewerId === null) return [];

  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;

  const rows = await db
    .selectFrom("users")
    .select(["id", "name", "avatar_url"])
    .where((eb) =>
      eb.or([eb("name", "ilike", pattern), eb("email", "ilike", pattern)]),
    )
    .where("id", "!=", viewerId)
    .orderBy("name")
    .limit(10)
    .execute();

  let followed = new Set<number>();
  if (rows.length > 0) {
    const f = await db
      .selectFrom("follows")
      .select("followee_id")
      .where("follower_id", "=", viewerId)
      .where(
        "followee_id",
        "in",
        rows.map((r) => r.id),
      )
      .execute();
    followed = new Set(f.map((r) => r.followee_id));
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    avatarUrl: r.avatar_url,
    following: followed.has(r.id),
  }));
}

// Next page of the home feed, for the "Load more" button. `before` is the
// cursor (oldest createdAt shown). Dates round-trip through server actions.
export async function loadFeedPage(before: Date | null): Promise<FeedPage> {
  const viewerId = await currentUserId();
  if (viewerId === null) return { items: [], nextCursor: null };
  return buildFeed(db, viewerId, before);
}

export async function createStatus(formData: FormData): Promise<CreateResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be logged in." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Write something first." };
  if (body.length > STATUS_MAX_LEN)
    return { ok: false, error: `Keep it under ${STATUS_MAX_LEN} characters.` };

  // A status can tag a route OR a crag. A tagged route takes precedence (it
  // already implies its crag), so we clear crag_id in that case.
  let routeId: number | null = null;
  let cragId: number | null = null;

  const routeRaw = String(formData.get("route_id") ?? "").trim();
  if (routeRaw) {
    const id = Number(routeRaw);
    if (!Number.isInteger(id)) return { ok: false, error: "Invalid route." };
    const route = await db
      .selectFrom("routes")
      .select("id")
      .where("id", "=", id)
      .where("deleted", "=", false)
      .executeTakeFirst();
    if (!route) return { ok: false, error: "That route no longer exists." };
    routeId = id;
  }

  const cragRaw = String(formData.get("crag_id") ?? "").trim();
  if (!routeId && cragRaw) {
    const id = Number(cragRaw);
    if (!Number.isInteger(id)) return { ok: false, error: "Invalid crag." };
    const crag = await db
      .selectFrom("crags")
      .select("id")
      .where("id", "=", id)
      .where("deleted", "=", false)
      .executeTakeFirst();
    if (!crag) return { ok: false, error: "That crag no longer exists." };
    cragId = id;
  }

  const row = await db
    .insertInto("statuses")
    .values({ user_id: userId, body, crag_id: cragId, route_id: routeId })
    .returning("id")
    .executeTakeFirstOrThrow();

  revalidatePath("/feed");
  revalidatePath(`/users/${userId}`);
  return { ok: true, id: row.id };
}

// What the feed lets you comment on / like. Ascents are grouped into a
// per-day "activity", so feed interactions on ascents target the activity.
const feedTargetTypes: FeedTargetType[] = ["status", "activity"];
const likeTargetTypes: LikeTargetType[] = ["status", "activity", "comment"];

export async function toggleLike(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const targetType = String(formData.get("target_type")) as LikeTargetType;
  const targetId = Number(formData.get("target_id"));
  if (!likeTargetTypes.includes(targetType) || !Number.isInteger(targetId))
    return;

  const existing = await db
    .selectFrom("likes")
    .select("id")
    .where("user_id", "=", userId)
    .where("target_type", "=", targetType)
    .where("target_id", "=", targetId)
    .executeTakeFirst();

  if (existing) {
    await db.deleteFrom("likes").where("id", "=", existing.id).execute();
  } else {
    await db
      .insertInto("likes")
      .values({ user_id: userId, target_type: targetType, target_id: targetId })
      .onConflict((oc) =>
        oc.columns(["user_id", "target_type", "target_id"]).doNothing(),
      )
      .execute();
  }

  revalidatePath("/feed");
  revalidatePath("/users", "layout");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addComment(formData: FormData): Promise<ActionResult> {
  const userId = await currentUserId();
  if (userId === null) return { ok: false, error: "You must be logged in." };

  const targetType = String(formData.get("target_type")) as FeedTargetType;
  const targetId = Number(formData.get("target_id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!feedTargetTypes.includes(targetType) || !Number.isInteger(targetId))
    return { ok: false, error: "Invalid comment target." };
  if (!body) return { ok: false, error: "Write something first." };
  if (body.length > COMMENT_MAX_LEN)
    return { ok: false, error: `Keep it under ${COMMENT_MAX_LEN} characters.` };

  await db
    .insertInto("comments")
    .values({
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      body,
    })
    .execute();

  revalidatePath("/feed");
  revalidatePath("/users", "layout");
  return { ok: true };
}

export async function deleteComment(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const commentId = Number(formData.get("comment_id"));
  if (!Number.isInteger(commentId)) return;

  const comment = await db
    .selectFrom("comments")
    .select(["id", "user_id"])
    .where("id", "=", commentId)
    .executeTakeFirst();
  if (!comment || !canModify(user, comment.user_id)) return;

  // Drop the comment's likes first (polymorphic, no FK), then the comment.
  await db
    .deleteFrom("likes")
    .where("target_type", "=", "comment")
    .where("target_id", "=", commentId)
    .execute();
  await db.deleteFrom("comments").where("id", "=", commentId).execute();
  revalidatePath("/feed");
  revalidatePath("/users", "layout");
}

export async function deleteStatus(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const statusId = Number(formData.get("status_id"));
  if (!Number.isInteger(statusId)) return;

  const status = await db
    .selectFrom("statuses")
    .select(["id", "user_id"])
    .where("id", "=", statusId)
    .executeTakeFirst();
  if (!status) return;
  if (!canModify(user, status.user_id)) return;

  // Remove the status's photos from blob storage, then its polymorphic
  // likes/comments (and the comments' likes), then the row itself.
  const photos = await db
    .selectFrom("images")
    .select(["id", "url"])
    .where("entity_type", "=", "status")
    .where("entity_id", "=", statusId)
    .execute();
  if (photos.length > 0) {
    const { del } = await import("@vercel/blob");
    await del(photos.map((p) => p.url));
    await db
      .deleteFrom("images")
      .where("entity_type", "=", "status")
      .where("entity_id", "=", statusId)
      .execute();
  }
  await deleteTargetInteractions("status", statusId);
  await db.deleteFrom("statuses").where("id", "=", statusId).execute();

  revalidatePath("/feed");
  revalidatePath(`/users/${status.user_id}`);
}
