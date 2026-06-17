import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser, getUser } from "@/lib/api/auth";
import { cragWriteSchema } from "@/lib/forms";
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
  const data = await readJson(request, cragWriteSchema);

  const row = await db
    .insertInto("crags")
    .values({
      name: data.name,
      area: data.area,
      country: data.country,
      description: data.description,
      rock_type: data.rock_type,
      aspect: data.aspect,
      best_season: data.best_season,
      access_notes: data.access_notes,
      created_by: user.id,
    })
    .onConflict((oc) => oc.column("name").doNothing())
    .returning("id")
    .executeTakeFirst();

  if (!row) return fail("A crag with that name already exists.", 409);

  return ok({ id: row.id }, 201);
});
