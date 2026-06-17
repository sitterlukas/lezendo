import db, { type DeletionEntityType, type DeletionAction } from "@/lib/db";

export type AdminDeletedData = {
  deletedCrags: {
    id: number;
    name: string;
    area: string | null;
    country: string | null;
  }[];
  deletedSectors: {
    id: number;
    name: string;
    crag_id: number;
    crag_name: string;
    crag_deleted: boolean;
  }[];
  deletedRoutes: {
    id: number;
    name: string;
    grade: string;
    crag_id: number;
    crag_name: string;
    crag_deleted: boolean;
    sector_name: string | null;
  }[];
  auditLog: {
    id: number;
    entity_type: DeletionEntityType;
    entity_id: number;
    entity_name: string;
    action: DeletionAction;
    created_at: Date;
    user_name: string;
  }[];
};

// The admin "deleted content" bundle: soft-deleted crags/sectors/routes plus a
// recent slice of the deletion audit log.
export async function getAdminDeleted(): Promise<AdminDeletedData> {
  const [deletedCrags, deletedSectors, deletedRoutes, auditLog] =
    await Promise.all([
      db
        .selectFrom("crags")
        .select(["id", "name", "area", "country"])
        .where("deleted", "=", true)
        .orderBy("name")
        .execute(),
      db
        .selectFrom("sectors")
        .innerJoin("crags", "crags.id", "sectors.crag_id")
        .select([
          "sectors.id",
          "sectors.name",
          "sectors.crag_id",
          "crags.name as crag_name",
          "crags.deleted as crag_deleted",
        ])
        .where("sectors.deleted", "=", true)
        .orderBy("crags.name")
        .orderBy("sectors.name")
        .execute(),
      db
        .selectFrom("routes")
        .innerJoin("crags", "crags.id", "routes.crag_id")
        .leftJoin("sectors", "sectors.id", "routes.sector_id")
        .select([
          "routes.id",
          "routes.name",
          "routes.grade",
          "routes.crag_id",
          "crags.name as crag_name",
          "crags.deleted as crag_deleted",
          "sectors.name as sector_name",
        ])
        .where("routes.deleted", "=", true)
        .orderBy("crags.name")
        .orderBy("routes.name")
        .execute(),
      db
        .selectFrom("deletion_log")
        .innerJoin("users", "users.id", "deletion_log.user_id")
        .select([
          "deletion_log.id",
          "deletion_log.entity_type",
          "deletion_log.entity_id",
          "deletion_log.entity_name",
          "deletion_log.action",
          "deletion_log.created_at",
          "users.name as user_name",
        ])
        .orderBy("deletion_log.created_at", "desc")
        .limit(300)
        .execute(),
    ]);

  return { deletedCrags, deletedSectors, deletedRoutes, auditLog };
}
