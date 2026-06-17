import { z } from "zod";
import { sql } from "kysely";
import { revalidatePath } from "next/cache";
import { route, ok, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import db from "@/lib/db";

const schema = z.object({
  url: z.string(),
  entityType: z.enum(["crag", "sector", "route", "status"]),
  entityId: z.number().int(),
});

// POST /api/images — attach an uploaded image (already in Blob) to a crag,
// sector, route, or status (replaces saveImage). Statuses are capped at 5
// photos, enforced atomically with an advisory lock.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const { url, entityType, entityId } = await readJson(request, schema);

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
          uploaded_by: user.id,
        })
        .execute();
    });
    revalidatePath("/crags", "layout");
    revalidatePath("/feed");
    return ok({ ok: true }, 201);
  }

  await db
    .insertInto("images")
    .values({
      entity_type: entityType,
      entity_id: entityId,
      url,
      uploaded_by: user.id,
    })
    .execute();

  revalidatePath("/crags", "layout");
  return ok({ ok: true }, 201);
});
