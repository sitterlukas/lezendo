import db, { type GearCategory } from "@/lib/db";

export type GearItemDto = {
  id: number;
  name: string;
  category: GearCategory;
  brand: string | null;
  purchased_on: Date | null;
  retired_on: Date | null;
  notes: string | null;
  created_at: Date;
};

export type GearReviewDto = {
  id: number;
  user_id: number;
  product: string;
  rating: number;
  body: string;
  created_at: Date;
  author: string;
};

export type GearData = {
  viewerId: number | null;
  items: GearItemDto[];
  reviews: GearReviewDto[];
};

// A user's gear, newest first. Consumers re-sort as needed.
export function getGearItems(userId: number): Promise<GearItemDto[]> {
  return db
    .selectFrom("gear_items")
    .select([
      "id",
      "name",
      "category",
      "brand",
      "purchased_on",
      "retired_on",
      "notes",
      "created_at",
    ])
    .where("user_id", "=", userId)
    .orderBy("created_at", "desc")
    .execute();
}

export function getGearReviews(): Promise<GearReviewDto[]> {
  return db
    .selectFrom("gear_reviews")
    .innerJoin("users", "users.id", "gear_reviews.user_id")
    .select([
      "gear_reviews.id",
      "gear_reviews.user_id",
      "gear_reviews.product",
      "gear_reviews.rating",
      "gear_reviews.body",
      "gear_reviews.created_at",
      "users.name as author",
    ])
    .orderBy("gear_reviews.created_at", "desc")
    .execute();
}
