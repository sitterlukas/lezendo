import { revalidatePath } from "next/cache";
import { route, ok, fail } from "@/lib/api/respond";
import { requireUser, getUser } from "@/lib/api/auth";
import { readForm, parseCragDetails } from "@/lib/forms";
import { getCragsList } from "@/lib/queries/crags";
import db from "@/lib/db";

// GET /api/crags?q=&country=&page= — the crag list bundle (list, country tabs,
// pagination, and admin-only deleted crags) plus the viewer.
export const GET = route(async (request) => {
  const viewer = await getUser(request);
  const sp = new URL(request.url).searchParams;
  const data = await getCragsList(
    {
      q: sp.get("q") ?? undefined,
      country: sp.get("country") ?? undefined,
      page: sp.get("page") ? Number(sp.get("page")) : undefined,
    },
    viewer ? { id: viewer.id, role: viewer.role } : null,
  );
  return ok({
    viewer: viewer ? { id: viewer.id, role: viewer.role } : null,
    ...data,
  });
});

// POST /api/crags — create a crag. Returns { id } (replaces addCrag).
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const form = await readForm(request);

  const name = String(form.get("name") ?? "").trim();
  const area = String(form.get("area") ?? "").trim();
  const country = String(form.get("country") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const details = parseCragDetails(form);

  if (!name) return fail("Name is required.", 400);

  const row = await db
    .insertInto("crags")
    .values({
      name,
      area: area || null,
      country: country || null,
      description: description || null,
      ...details,
      created_by: user.id,
    })
    .onConflict((oc) => oc.column("name").doNothing())
    .returning("id")
    .executeTakeFirst();

  if (!row) return fail("A crag with that name already exists.", 409);

  revalidatePath("/crags");
  revalidatePath("/");
  return ok({ id: row.id }, 201);
});
