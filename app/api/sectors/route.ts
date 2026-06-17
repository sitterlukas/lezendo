import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import { readForm, parseSectorDetails } from "@/lib/forms";
import db from "@/lib/db";

// POST /api/sectors — create a sector within a crag. Returns { id } (replaces
// addSector).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const form = await readForm(request);

  const name = String(form.get("name") ?? "").trim();
  const cragId = Number(form.get("crag_id"));
  const description = String(form.get("description") ?? "").trim();
  const details = parseSectorDetails(form);

  if (!name) return fail("Name is required.", 400);
  if (!Number.isInteger(cragId)) return fail("Invalid crag.", 400);

  const crag = await db
    .selectFrom("crags")
    .select("id")
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return fail("Crag not found.", 404);

  const row = await db
    .insertInto("sectors")
    .values({
      crag_id: cragId,
      name,
      description: description || null,
      ...details,
      created_by: user.id,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  revalidatePath("/crags", "layout");
  return ok({ id: row.id }, 201);
});
