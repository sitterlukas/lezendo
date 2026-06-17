import db, { type DeletionEntityType, type DeletionAction } from "@/lib/db";

// Records a soft-delete or recovery in the audit log. Shared by the crag,
// sector, and route route handlers.
export async function logDeletion(
  entityType: DeletionEntityType,
  entityId: number,
  entityName: string,
  action: DeletionAction,
  userId: number,
): Promise<void> {
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
