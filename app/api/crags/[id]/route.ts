import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser, canModify, getUser } from "@/lib/api/auth";
import { readForm, parseCragDetails } from "@/lib/forms";
import { getCragDetail } from "@/lib/queries/crags";
import { logDeletion } from "@/lib/deletion-log";
import db from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/crags/[id] — full crag detail bundle (crag, sectors, routes with
// viewer-resolved grades, images, admin deleted lists). 404 when missing.
export const GET = route<Ctx>(async (request, { params }) => {
  const cragId = Number((await params).id);
  if (!Number.isInteger(cragId)) return fail("Invalid crag.", 400);
  const viewer = await getUser(request);
  const data = await getCragDetail(
    cragId,
    viewer ? { id: viewer.id, role: viewer.role } : null,
  );
  if (!data) return fail("Crag not found.", 404);
  return ok(data);
});

// PATCH /api/crags/[id] — edit a crag (replaces updateCrag).
export const PATCH = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const cragId = Number((await params).id);
  if (!Number.isInteger(cragId)) return fail("Invalid crag.", 400);

  const form = await readForm(request);
  const name = String(form.get("name") ?? "").trim();
  const area = String(form.get("area") ?? "").trim();
  const country = String(form.get("country") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const details = parseCragDetails(form);

  if (!name) return fail("Name is required.", 400);

  const crag = await db
    .selectFrom("crags")
    .select(["id", "created_by"])
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return fail("Crag not found.", 404);
  if (!canModify(user, crag.created_by)) return fail("Not allowed.", 403);

  await db
    .updateTable("crags")
    .set({
      name,
      area: area || null,
      country: country || null,
      description: description || null,
      ...details,
    })
    .where("id", "=", cragId)
    .execute();

  revalidatePath("/crags", "layout");
  return ok({ ok: true });
});

// DELETE /api/crags/[id] — soft-delete a crag (replaces deleteCrag). Returns
// the path the client should navigate to.
export const DELETE = route<Ctx>(async (request, { params }) => {
  const user = await requireUser(request);
  const cragId = Number((await params).id);
  if (!Number.isInteger(cragId)) return fail("Invalid crag.", 400);

  const crag = await db
    .selectFrom("crags")
    .select(["id", "name", "created_by"])
    .where("id", "=", cragId)
    .executeTakeFirst();
  if (!crag) return fail("Crag not found.", 404);
  if (!canModify(user, crag.created_by)) return fail("Not allowed.", 403);

  await db
    .updateTable("crags")
    .set({ deleted: true })
    .where("id", "=", cragId)
    .execute();
  await logDeletion("crag", cragId, crag.name, "delete", user.id);

  revalidatePath("/crags", "layout");
  return ok({ redirect: "/crags" });
});
