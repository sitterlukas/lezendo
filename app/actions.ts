"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import db, {
  type ClimbStyle,
  type GearCategory,
  type TickType,
} from "@/lib/db";

const styles: ClimbStyle[] = ["sport", "trad", "boulder"];
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

  revalidatePath("/crags");
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

export async function addCrag(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

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
    })
    .onConflict((oc) => oc.column("name").doNothing())
    .execute();

  revalidatePath("/crags");
  revalidatePath("/");
}

export async function addRoute(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const name = String(formData.get("name") ?? "").trim();
  const cragId = Number(formData.get("crag_id"));
  const grade = String(formData.get("grade") ?? "").trim();
  const style = String(formData.get("style") ?? "sport") as ClimbStyle;
  const heightRaw = String(formData.get("height_m") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !grade || !Number.isInteger(cragId)) return;
  if (!styles.includes(style)) return;

  const crag = await db
    .selectFrom("crags")
    .select("id")
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return;

  const height = heightRaw ? Number.parseInt(heightRaw, 10) : null;

  await db
    .insertInto("routes")
    .values({
      name,
      crag_id: cragId,
      grade,
      style,
      height_m: Number.isNaN(height) ? null : height,
      description: description || null,
    })
    .execute();

  revalidatePath(`/crags/${cragId}`);
  revalidatePath("/crags");
  revalidatePath("/");
}