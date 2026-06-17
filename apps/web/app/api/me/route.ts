import { z } from "zod";
import { route, ok, fail, readJson } from "@/lib/api/respond";
import { requireUser, getUser } from "@/lib/api/auth";
import { getMe } from "@whipperbook/db";
import db from "@whipperbook/db";

// GET /api/me — the signed-in user's own record, or null when signed out (so
// the header can render for anonymous visitors without a 401).
export const GET = route(async (request) => {
  const viewer = await getUser(request);
  return ok(viewer ? await getMe(viewer.id) : null);
});

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name must be between 1 and 100 characters.")
    .max(100, "Name must be between 1 and 100 characters.")
    .optional(),
  preferred_rope_grading_system_id: z.number().int().nullable().optional(),
  preferred_boulder_grading_system_id: z.number().int().nullable().optional(),
});

// PATCH /api/me — update the signed-in user's display name and/or preferred
// grading systems (replaces updateName + updateGradingSystem). Only fields that
// are present in the body are changed.
export const PATCH = route(async (request) => {
  const user = await requireUser(request);
  const body = await readJson(request, schema);

  const set: {
    name?: string;
    preferred_rope_grading_system_id?: number | null;
    preferred_boulder_grading_system_id?: number | null;
  } = {};

  if (body.name !== undefined) set.name = body.name;
  if (body.preferred_rope_grading_system_id !== undefined) {
    if (!(await gradingSystemExists(body.preferred_rope_grading_system_id))) {
      return fail("Invalid grading system.", 400);
    }
    set.preferred_rope_grading_system_id =
      body.preferred_rope_grading_system_id;
  }
  if (body.preferred_boulder_grading_system_id !== undefined) {
    if (
      !(await gradingSystemExists(body.preferred_boulder_grading_system_id))
    ) {
      return fail("Invalid grading system.", 400);
    }
    set.preferred_boulder_grading_system_id =
      body.preferred_boulder_grading_system_id;
  }

  if (Object.keys(set).length > 0) {
    await db.updateTable("users").set(set).where("id", "=", user.id).execute();
  }

  return ok({ ok: true });
});

// `null` clears the preference; any non-null id must reference a real grading
// system so we never persist a dangling reference.
async function gradingSystemExists(id: number | null): Promise<boolean> {
  if (id === null) return true;
  const row = await db
    .selectFrom("grading_systems")
    .select("id")
    .where("id", "=", id)
    .executeTakeFirst();
  return Boolean(row);
}
