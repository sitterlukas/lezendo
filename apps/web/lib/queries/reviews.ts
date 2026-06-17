import db, { type ReviewEntityType } from "@/lib/db";

export type EntityReviewDto = {
  id: number;
  user_id: number;
  rating: number;
  body: string | null;
  created_at: Date;
  author: string;
  author_avatar: string | null;
};

// Reviews for one crag/sector/route, newest first, with author name + avatar.
export function getEntityReviews(
  entityType: ReviewEntityType,
  entityId: number,
): Promise<EntityReviewDto[]> {
  return db
    .selectFrom("entity_reviews as r")
    .innerJoin("users as u", "u.id", "r.user_id")
    .select([
      "r.id",
      "r.user_id",
      "r.rating",
      "r.body",
      "r.created_at",
      "u.name as author",
      "u.avatar_url as author_avatar",
    ])
    .where("r.entity_type", "=", entityType)
    .where("r.entity_id", "=", entityId)
    .orderBy("r.created_at", "desc")
    .execute();
}
