import db, { type ClimbStyle, type CragsTable } from "@/lib/db";
import { sql, type Selectable } from "kysely";
import { resolveGrade, type GradeEquivalency } from "@whipperbook/core";
import { loadGradeEquivalencies } from "@/lib/grade-data";

const PAGE_SIZE = 24;

export type CragListItem = {
  id: number;
  name: string;
  area: string | null;
  country: string | null;
  description: string | null;
  routeCount: number;
};

export type DeletedCragItem = {
  id: number;
  name: string;
  area: string | null;
  country: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
};

export type CragsListParams = {
  q?: string;
  country?: string;
  page?: number;
};

export type CragsListData = {
  crags: CragListItem[];
  usedCountries: string[];
  allCountries: string[];
  paginated: boolean;
  page: number;
  totalCount: number;
  totalPages: number;
  deleted: DeletedCragItem[];
};

// Everything the /crags page renders: the (optionally searched/filtered/
// paginated) crag list with route counts, the country tabs, the "add crag"
// country list, and — for admins — the soft-deleted crags with who/when.
export async function getCragsList(
  params: CragsListParams,
  viewer: { id: number; role: string } | null,
): Promise<CragsListData> {
  const q = params.q?.trim() || "";
  const countryFilter = params.country?.trim() || "";
  const page = Math.max(1, params.page || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const searchPattern = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : null;

  const usedCountryRows = await db
    .selectFrom("crags")
    .select("country")
    .distinct()
    .where("country", "is not", null)
    .where("deleted", "=", false)
    .orderBy("country")
    .execute();
  const usedCountries = usedCountryRows.map((r) => r.country as string);

  const allCountryRows = await db
    .selectFrom("countries")
    .select("name")
    .orderBy("name")
    .execute();
  const allCountries = allCountryRows.map((r) => r.name);

  let baseQuery = db
    .selectFrom("crags")
    .leftJoin("routes", (join) =>
      join
        .onRef("routes.crag_id", "=", "crags.id")
        .on("routes.deleted", "=", false),
    )
    .select((eb) => [
      "crags.id",
      "crags.name",
      "crags.area",
      "crags.country",
      "crags.description",
      eb.fn.count<number>("routes.id").as("routeCount"),
    ])
    .groupBy("crags.id")
    .where("crags.deleted", "=", false)
    .orderBy(sql`crags.country NULLS LAST`)
    .orderBy("crags.name");

  if (searchPattern) {
    baseQuery = baseQuery.where((eb) =>
      eb.or([
        eb("crags.name", "ilike", searchPattern),
        eb("crags.area", "ilike", searchPattern),
        eb("crags.country", "ilike", searchPattern),
        eb("crags.description", "ilike", searchPattern),
      ]),
    );
  }
  if (countryFilter) {
    baseQuery = baseQuery.where("crags.country", "=", countryFilter);
  }

  const paginated = Boolean(searchPattern || countryFilter);
  const cragRows = paginated
    ? await baseQuery.offset(offset).limit(PAGE_SIZE).execute()
    : await baseQuery.execute();
  const crags: CragListItem[] = cragRows.map((c) => ({
    ...c,
    routeCount: Number(c.routeCount),
  }));

  let totalCount = 0;
  let totalPages = 0;
  if (paginated) {
    let countQuery = db
      .selectFrom("crags")
      .select((eb) => eb.fn.countAll<number>().as("total"));
    if (searchPattern) {
      countQuery = countQuery.where((eb) =>
        eb.or([
          eb("name", "ilike", searchPattern),
          eb("area", "ilike", searchPattern),
          eb("country", "ilike", searchPattern),
          eb("description", "ilike", searchPattern),
        ]),
      );
    }
    if (countryFilter) {
      countQuery = countQuery.where("country", "=", countryFilter);
    }
    countQuery = countQuery.where("deleted", "=", false);
    const { total } = await countQuery.executeTakeFirstOrThrow();
    totalCount = Number(total);
    totalPages = Math.ceil(totalCount / PAGE_SIZE);
  }

  // Soft-deleted crags (with who/when) are admin-only.
  let deleted: DeletedCragItem[] = [];
  if (viewer?.role === "admin") {
    const deletedRows = await db
      .selectFrom("crags")
      .select(["id", "name", "area", "country"])
      .where("deleted", "=", true)
      .orderBy("name")
      .execute();
    const log = new Map<number, { at: Date; by: string }>();
    if (deletedRows.length > 0) {
      const entries = await db
        .selectFrom("deletion_log")
        .innerJoin("users", "users.id", "deletion_log.user_id")
        .select([
          "deletion_log.entity_id",
          "deletion_log.created_at",
          "users.name as by",
        ])
        .where("deletion_log.entity_type", "=", "crag")
        .where("deletion_log.action", "=", "delete")
        .orderBy("deletion_log.created_at", "desc")
        .execute();
      for (const e of entries) {
        if (!log.has(e.entity_id)) {
          log.set(e.entity_id, {
            at: e.created_at as Date,
            by: e.by as string,
          });
        }
      }
    }
    deleted = deletedRows.map((c) => ({
      ...c,
      deletedAt: log.get(c.id)?.at ?? null,
      deletedBy: log.get(c.id)?.by ?? null,
    }));
  }

  return {
    crags,
    usedCountries,
    allCountries,
    paginated,
    page,
    totalCount,
    totalPages,
    deleted,
  };
}

export type CragDetailViewer = {
  id: number;
  role: string;
  preferred_rope_grading_system_id: number | null;
  preferred_boulder_grading_system_id: number | null;
};

export type CragDetailRoute = {
  id: number;
  name: string;
  grade: string;
  grading_system_id: number;
  style: ClimbStyle;
  height_m: number | null;
  description: string | null;
  sector_id: number | null;
  originalGrade: string | null;
  systemName: string | null;
};

export type CragDetailDeleted = {
  id: number;
  name: string;
  grade?: string;
  deletedAt: Date | null;
  deletedBy: string | null;
};

export type CragDetailData = {
  crag: Selectable<CragsTable>;
  viewer: CragDetailViewer | null;
  images: { id: number; url: string; uploaded_by: number | null }[];
  gradingSystems: { id: number; name: string; slug: string }[];
  gradeEquivalencies: GradeEquivalency[];
  sectors: {
    id: number;
    name: string;
    description: string | null;
    created_by: number | null;
  }[];
  routes: CragDetailRoute[];
  tickedRouteIds: number[];
  deletedSectors: CragDetailDeleted[];
  deletedRoutes: CragDetailDeleted[];
};

async function deletionLog(
  entityType: "sector" | "route",
  ids: number[],
): Promise<Map<number, { at: Date; by: string }>> {
  const map = new Map<number, { at: Date; by: string }>();
  if (ids.length === 0) return map;
  const entries = await db
    .selectFrom("deletion_log")
    .innerJoin("users", "users.id", "deletion_log.user_id")
    .select([
      "deletion_log.entity_id",
      "deletion_log.created_at",
      "users.name as by",
    ])
    .where("deletion_log.entity_type", "=", entityType)
    .where("deletion_log.action", "=", "delete")
    .where("deletion_log.entity_id", "in", ids)
    .orderBy("deletion_log.created_at", "desc")
    .execute();
  for (const e of entries) {
    if (!map.has(e.entity_id)) {
      map.set(e.entity_id, { at: e.created_at as Date, by: e.by as string });
    }
  }
  return map;
}

// Everything the crag detail page renders. Grades are resolved server-side
// using the viewer's preferences. Returns null when the crag doesn't exist
// (or is deleted) so the route can answer 404.
export async function getCragDetail(
  id: number,
  viewer: { id: number; role: string } | null,
): Promise<CragDetailData | null> {
  const crag = await db
    .selectFrom("crags")
    .selectAll()
    .where("id", "=", id)
    .where("deleted", "=", false)
    .executeTakeFirst();
  if (!crag) return null;

  const viewerFull = viewer
    ? ((await db
        .selectFrom("users")
        .select([
          "id",
          "role",
          "preferred_rope_grading_system_id",
          "preferred_boulder_grading_system_id",
        ])
        .where("id", "=", viewer.id)
        .executeTakeFirst()) ?? null)
    : null;

  const [images, gradingSystems, gradeEquivalencies, sectors, routeRows] =
    await Promise.all([
      db
        .selectFrom("images")
        .select(["id", "url", "uploaded_by"])
        .where("entity_type", "=", "crag")
        .where("entity_id", "=", id)
        .orderBy("created_at")
        .execute(),
      db
        .selectFrom("grading_systems")
        .select(["id", "name", "slug"])
        .orderBy("id")
        .execute(),
      loadGradeEquivalencies(),
      db
        .selectFrom("sectors")
        .select(["id", "name", "description", "created_by"])
        .where("crag_id", "=", id)
        .where("deleted", "=", false)
        .orderBy("name")
        .execute(),
      db
        .selectFrom("routes")
        .select([
          "id",
          "name",
          "grade",
          "grading_system_id",
          "style",
          "height_m",
          "description",
          "sector_id",
        ])
        .where("crag_id", "=", id)
        .where("deleted", "=", false)
        .orderBy("name")
        .execute(),
    ]);

  const tickedRows = viewerFull
    ? await db
        .selectFrom("ascents")
        .select("route_id")
        .distinct()
        .where("user_id", "=", viewerFull.id)
        .execute()
    : [];

  const routes: CragDetailRoute[] = routeRows.map((r) => ({
    ...r,
    ...resolveGrade(
      r.grade,
      r.grading_system_id,
      gradingSystems,
      {
        rope: viewerFull?.preferred_rope_grading_system_id,
        boulder: viewerFull?.preferred_boulder_grading_system_id,
      },
      gradeEquivalencies,
    ),
  }));

  let deletedSectors: CragDetailDeleted[] = [];
  let deletedRoutes: CragDetailDeleted[] = [];
  if (viewerFull?.role === "admin") {
    const [ds, dr] = await Promise.all([
      db
        .selectFrom("sectors")
        .select(["id", "name"])
        .where("crag_id", "=", id)
        .where("deleted", "=", true)
        .orderBy("name")
        .execute(),
      db
        .selectFrom("routes")
        .select(["id", "name", "grade"])
        .where("crag_id", "=", id)
        .where("deleted", "=", true)
        .orderBy("name")
        .execute(),
    ]);
    const [sLog, rLog] = await Promise.all([
      deletionLog(
        "sector",
        ds.map((s) => s.id),
      ),
      deletionLog(
        "route",
        dr.map((r) => r.id),
      ),
    ]);
    deletedSectors = ds.map((s) => ({
      id: s.id,
      name: s.name,
      deletedAt: sLog.get(s.id)?.at ?? null,
      deletedBy: sLog.get(s.id)?.by ?? null,
    }));
    deletedRoutes = dr.map((r) => ({
      id: r.id,
      name: r.name,
      grade: r.grade,
      deletedAt: rLog.get(r.id)?.at ?? null,
      deletedBy: rLog.get(r.id)?.by ?? null,
    }));
  }

  return {
    crag,
    viewer: viewerFull,
    images,
    gradingSystems,
    gradeEquivalencies,
    sectors,
    routes,
    tickedRouteIds: tickedRows.map((r) => r.route_id),
    deletedSectors,
    deletedRoutes,
  };
}
