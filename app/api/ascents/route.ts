import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { readForm, tickTypes } from "@/lib/forms";
import db, { type TickType } from "@/lib/db";

// POST /api/ascents — log an ascent of a route (replaces logAscent).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const form = await readForm(request);

  const routeId = Number(form.get("route_id"));
  const tickType = String(form.get("tick_type")) as TickType;
  const dateRaw = String(form.get("ascent_date") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();

  if (!Number.isInteger(routeId)) return fail("Invalid route.", 400);
  if (!tickTypes.includes(tickType)) return fail("Invalid ascent style.", 400);
  const date = dateRaw ? new Date(dateRaw) : null;
  if (date && Number.isNaN(date.getTime())) return fail("Invalid date.", 400);

  const targetRoute = await db
    .selectFrom("routes")
    .select("crag_id")
    .where("id", "=", routeId)
    .executeTakeFirst();
  if (!targetRoute) return fail("Route not found.", 404);

  // Find or create the (climber, day) activity this ascent belongs to so feed
  // likes/comments have a stable target.
  const day = (date ?? new Date()).toISOString().slice(0, 10);
  const activity = await db
    .insertInto("ascent_activities")
    .values({
      user_id: user.id,
      crag_id: targetRoute.crag_id,
      activity_date: day,
    })
    .onConflict((oc) =>
      oc
        .columns(["user_id", "activity_date"])
        .doUpdateSet({ user_id: user.id }),
    )
    .returning("id")
    .executeTakeFirstOrThrow();

  await db
    .insertInto("ascents")
    .values({
      route_id: routeId,
      user_id: user.id,
      tick_type: tickType,
      ...(date ? { ascent_date: date } : {}),
      notes: notes || null,
      activity_id: activity.id,
    })
    .execute();

  revalidatePath("/crags", "layout");
  revalidatePath("/profile");
  revalidatePath("/feed");
  return ok({ ok: true }, 201);
});
