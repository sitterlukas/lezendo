import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { sectorCreateSchema } from "@/lib/forms";
import db from "@/lib/db";

// POST /api/sectors — create a sector within a crag. Returns { id } (replaces
// addSector).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const data = await readJson(request, sectorCreateSchema);

  const crag = await db
    .selectFrom("crags")
    .select("id")
    .where("id", "=", data.crag_id)
    .executeTakeFirst();
  if (!crag) return fail("Crag not found.", 404);

  const row = await db
    .insertInto("sectors")
    .values({
      crag_id: data.crag_id,
      name: data.name,
      description: data.description,
      approach_minutes: data.approach_minutes,
      aspect: data.aspect,
      created_by: user.id,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return ok({ id: row.id }, 201);
});
