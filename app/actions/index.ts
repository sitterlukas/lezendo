"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import db, {
  type ClimbStyle,
  type GearCategory,
  type TickType,
  type DeletionEntityType,
  type DeletionAction,
  type ImageEntityType,
} from "@/lib/db";
import { gradesForSystem, disciplineOf } from "@/lib/grade-conversion";
import { loadGradeEquivalencies } from "@/lib/grade-data";

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
    boltCount: bolts !== null && Number.isInteger(bolts) && bolts >= 0 ? bolts : null,
    protection: protection || null,
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

  await db
    .insertInto("ascents")
    .values({
      route_id: routeId,
      user_id: userId,
      tick_type: tickType,
      ...(date ? { ascent_date: date } : {}),
      notes: notes || null,
    })
    .execute();

  revalidatePath("/crags", "layout");
  revalidatePath("/profile");
}

export async function deleteAscent(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const ascentId = Number(formData.get("ascent_id"));
  if (!Number.isInteger(ascentId)) return;

  // The user_id condition makes sure users can only delete their own ticks.
  await db
    .deleteFrom("ascents")
    .where("id", "=", ascentId)
    .where("user_id", "=", userId)
    .execute();

  revalidatePath("/profile");
  revalidatePath("/crags");
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

  if (!reviewEntityTypes.includes(entityType as (typeof reviewEntityTypes)[number]))
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

export async function addCrag(formData: FormData) {
  const userId = await currentUserId();
  if (!userId) return;

  const name = String(formData.get("name") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return;

  await db
    .insertInto("crags")
    .values({
      name,
      area: area || null,
      country: country || null,
      description: description || null,
      created_by: userId,
    })
    .onConflict((oc) => oc.column("name").doNothing())
    .execute();

  revalidatePath("/crags");
  revalidatePath("/");
}

export async function updateCrag(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const cragId = Number(formData.get("crag_id"));
  const name = String(formData.get("name") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

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

  if (!name || !Number.isInteger(sectorId)) return;

  const sector = await db
    .selectFrom("sectors")
    .select(["id", "created_by"])
    .where("id", "=", sectorId)
    .executeTakeFirst();
  if (!sector || !canModify(user, sector.created_by)) return;

  await db
    .updateTable("sectors")
    .set({ name, description: description || null })
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

export async function addSector(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const name = String(formData.get("name") ?? "").trim();
  const cragId = Number(formData.get("crag_id"));
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !Number.isInteger(cragId)) return;

  const crag = await db
    .selectFrom("crags")
    .select("id")
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return;

  await db
    .insertInto("sectors")
    .values({
      crag_id: cragId,
      name,
      description: description || null,
      created_by: userId,
    })
    .execute();

  revalidatePath("/crags", "layout");
}

export async function addRoute(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

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

  if (!name || !grade || !Number.isInteger(cragId)) return;
  if (!styles.includes(style)) return;
  if (!Number.isInteger(gradingSystemId) || gradingSystemId <= 0) return;
  const addGradeError = await gradeSystemError(gradingSystemId, grade, style);
  if (addGradeError) throw new Error(addGradeError);

  const crag = await db
    .selectFrom("crags")
    .select("id")
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return;

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

  await db
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
      description: description || null,
      created_by: userId,
    })
    .execute();

  revalidatePath("/crags", "layout");
  revalidatePath("/");
}
export async function saveImage(
  url: string,
  entityType: ImageEntityType,
  entityId: number,
) {
  const userId = await currentUserId();
  if (!userId) return;

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
