import db, {
  type CragsTable,
  type RoutesTable,
  type TickType,
} from "../client";
import { type Selectable } from "kysely";
import { resolveGrade, type GradeEquivalency } from "@whipperbook/core";
import { loadGradeEquivalencies } from "../grade-data";
import { type CragDetailViewer } from "./crags";

export type RouteAscent = {
  id: number;
  user_id: number;
  tick_type: TickType;
  ascent_date: Date;
  notes: string | null;
  author: string;
};

export type RouteDetailData = {
  crag: Selectable<CragsTable>;
  route: Selectable<RoutesTable>;
  sector: { id: number; name: string } | null;
  sectors: { id: number; name: string }[];
  viewer: CragDetailViewer | null;
  gradingSystems: { id: number; name: string; slug: string }[];
  gradeEquivalencies: GradeEquivalency[];
  images: { id: number; url: string; uploaded_by: number | null }[];
  ascents: RouteAscent[];
  displayGrade: string;
  displaySystemName: string | null;
};

// Everything the route detail page renders. Returns null when the route
// doesn't exist under that crag (or is deleted) so the route can answer 404.
export async function getRouteDetail(
  cragId: number,
  routeId: number,
  viewer: { id: number; role: string } | null,
): Promise<RouteDetailData | null> {
  const [crag, route, sectors, gradingSystems, gradeEquivalencies] =
    await Promise.all([
      db
        .selectFrom("crags")
        .selectAll()
        .where("id", "=", cragId)
        .where("deleted", "=", false)
        .executeTakeFirst(),
      db
        .selectFrom("routes")
        .selectAll()
        .where("id", "=", routeId)
        .where("crag_id", "=", cragId)
        .where("deleted", "=", false)
        .executeTakeFirst(),
      db
        .selectFrom("sectors")
        .select(["id", "name"])
        .where("crag_id", "=", cragId)
        .where("deleted", "=", false)
        .orderBy("name")
        .execute(),
      db
        .selectFrom("grading_systems")
        .select(["id", "name", "slug"])
        .orderBy("id")
        .execute(),
      loadGradeEquivalencies(),
    ]);
  if (!crag || !route) return null;

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

  const sector = route.sector_id
    ? ((await db
        .selectFrom("sectors")
        .select(["id", "name"])
        .where("id", "=", route.sector_id)
        .executeTakeFirst()) ?? null)
    : null;

  const [images, ascents] = await Promise.all([
    db
      .selectFrom("images")
      .select(["id", "url", "uploaded_by"])
      .where("entity_type", "=", "route")
      .where("entity_id", "=", routeId)
      .orderBy("created_at")
      .execute(),
    db
      .selectFrom("ascents")
      .innerJoin("users", "users.id", "ascents.user_id")
      .select([
        "ascents.id",
        "ascents.user_id",
        "ascents.tick_type",
        "ascents.ascent_date",
        "ascents.notes",
        "users.name as author",
      ])
      .where("ascents.route_id", "=", routeId)
      .orderBy("ascents.ascent_date", "desc")
      .orderBy("ascents.created_at", "desc")
      .execute(),
  ]);

  const { grade: displayGrade, systemName: displaySystemName } = resolveGrade(
    route.grade,
    route.grading_system_id,
    gradingSystems,
    {
      rope: viewerFull?.preferred_rope_grading_system_id,
      boulder: viewerFull?.preferred_boulder_grading_system_id,
    },
    gradeEquivalencies,
  );

  return {
    crag,
    route,
    sector,
    sectors,
    viewer: viewerFull,
    gradingSystems,
    gradeEquivalencies,
    images,
    ascents,
    displayGrade,
    displaySystemName,
  };
}
