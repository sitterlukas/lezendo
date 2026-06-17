import db, {
  type ClimbStyle,
  type CragsTable,
  type SectorsTable,
} from "@/lib/db";
import { type Selectable } from "kysely";
import { resolveGrade, type GradeEquivalency } from "@/lib/grade-conversion";
import { loadGradeEquivalencies } from "@/lib/grade-data";
import {
  type CragDetailViewer,
  type CragDetailRoute,
} from "@/lib/queries/crags";

export type SectorDetailRoute = Omit<CragDetailRoute, "sector_id">;

export type SectorDetailData = {
  crag: Selectable<CragsTable>;
  sector: Selectable<SectorsTable>;
  viewer: CragDetailViewer | null;
  images: { id: number; url: string; uploaded_by: number | null }[];
  gradingSystems: { id: number; name: string; slug: string }[];
  gradeEquivalencies: GradeEquivalency[];
  routes: SectorDetailRoute[];
  tickedRouteIds: number[];
};

// Everything the sector detail page renders. Returns null when the sector
// doesn't exist under that crag (or is deleted) so the route can answer 404.
export async function getSectorDetail(
  cragId: number,
  sectorId: number,
  viewer: { id: number; role: string } | null,
): Promise<SectorDetailData | null> {
  const [crag, sector] = await Promise.all([
    db
      .selectFrom("crags")
      .selectAll()
      .where("id", "=", cragId)
      .where("deleted", "=", false)
      .executeTakeFirst(),
    db
      .selectFrom("sectors")
      .selectAll()
      .where("id", "=", sectorId)
      .where("crag_id", "=", cragId)
      .where("deleted", "=", false)
      .executeTakeFirst(),
  ]);
  if (!crag || !sector) return null;

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

  const [images, gradingSystems, gradeEquivalencies, routeRows] =
    await Promise.all([
      db
        .selectFrom("images")
        .select(["id", "url", "uploaded_by"])
        .where("entity_type", "=", "sector")
        .where("entity_id", "=", sectorId)
        .orderBy("created_at")
        .execute(),
      db
        .selectFrom("grading_systems")
        .select(["id", "name", "slug"])
        .orderBy("id")
        .execute(),
      loadGradeEquivalencies(),
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
        ])
        .where("crag_id", "=", cragId)
        .where("sector_id", "=", sectorId)
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

  const routes: SectorDetailRoute[] = routeRows.map((r) => ({
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

  return {
    crag,
    sector,
    viewer: viewerFull,
    images,
    gradingSystems,
    gradeEquivalencies,
    routes,
    tickedRouteIds: tickedRows.map((r) => r.route_id),
  };
}

// Re-export so consumers can import the style type alongside the data.
export type { ClimbStyle };
