import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { ascentCreateSchema } from "@/lib/forms";
import db from "@/lib/db";

// POST /api/ascents — log an ascent of a route (replaces logAscent).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const data = await readJson(request, ascentCreateSchema);

  const targetRoute = await db
    .selectFrom("routes")
    .select("crag_id")
    .where("id", "=", data.route_id)
    .executeTakeFirst();
  if (!targetRoute) return fail("Route not found.", 404);

  // Find or create the (climber, day) activity this ascent belongs to so feed
  // likes/comments have a stable target.
  const day = (data.ascent_date ?? new Date()).toISOString().slice(0, 10);
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
      route_id: data.route_id,
      user_id: user.id,
      tick_type: data.tick_type,
      ...(data.ascent_date ? { ascent_date: data.ascent_date } : {}),
      notes: data.notes,
      activity_id: activity.id,
    })
    .execute();

  return ok({ ok: true }, 201);
});
