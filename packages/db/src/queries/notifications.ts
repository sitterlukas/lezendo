import db from "../client";
import type { FeedTargetType } from "@whipperbook/core";

export type NotificationDto = {
  id: number;
  type: string;
  target_type: string | null;
  target_id: number | null;
  read_at: Date | null;
  created_at: Date;
  actor_id: number | null;
  actor_name: string | null;
  actor_avatar: string | null;
};

export type NotificationsData = {
  items: NotificationDto[];
  unreadCount: number;
};

// The signed-in user's notification inbox: recent items (newest first) with the
// actor's name/avatar, plus the unread count for the header badge.
export async function getNotifications(
  userId: number,
): Promise<NotificationsData> {
  const items = await db
    .selectFrom("notifications as n")
    .leftJoin("users as u", "u.id", "n.actor_id")
    .select([
      "n.id",
      "n.type",
      "n.target_type",
      "n.target_id",
      "n.read_at",
      "n.created_at",
      "n.actor_id",
      "u.name as actor_name",
      "u.avatar_url as actor_avatar",
    ])
    .where("n.user_id", "=", userId)
    .orderBy("n.created_at", "desc")
    .limit(40)
    .execute();

  const { count } = await db
    .selectFrom("notifications")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("user_id", "=", userId)
    .where("read_at", "is", null)
    .executeTakeFirstOrThrow();

  return { items, unreadCount: Number(count) };
}

// Mark every unread notification for the user as read.
export async function markNotificationsRead(userId: number): Promise<void> {
  await db
    .updateTable("notifications")
    .set({ read_at: new Date() })
    .where("user_id", "=", userId)
    .where("read_at", "is", null)
    .execute();
}

// Record a notification. No-op when the actor is the recipient (you don't get
// notified about your own actions). Best-effort: callers fire-and-forget so a
// failed insert never breaks the action that triggered it.
export async function createNotification(n: {
  recipientId: number;
  actorId: number;
  type: string;
  targetType?: string | null;
  targetId?: number | null;
}): Promise<void> {
  if (n.recipientId === n.actorId) return;
  await db
    .insertInto("notifications")
    .values({
      user_id: n.recipientId,
      actor_id: n.actorId,
      type: n.type,
      target_type: n.targetType ?? null,
      target_id: n.targetId ?? null,
    })
    .execute();
}

// Resolve who owns a feed target (status/activity/comment) so likes and
// comments can notify the right person. Returns null when it's gone.
export async function feedTargetOwner(
  type: FeedTargetType | "comment",
  id: number,
): Promise<number | null> {
  if (type === "status") {
    const r = await db
      .selectFrom("statuses")
      .select("user_id")
      .where("id", "=", id)
      .executeTakeFirst();
    return r?.user_id ?? null;
  }
  if (type === "activity") {
    const r = await db
      .selectFrom("ascent_activities")
      .select("user_id")
      .where("id", "=", id)
      .executeTakeFirst();
    return r?.user_id ?? null;
  }
  const r = await db
    .selectFrom("comments")
    .select("user_id")
    .where("id", "=", id)
    .executeTakeFirst();
  return r?.user_id ?? null;
}
