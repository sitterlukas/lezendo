import { Kysely, PostgresDialect, type Generated } from "kysely";

export type DeletionEntityType = "crag" | "sector" | "route";
export type DeletionAction = "delete" | "recover";
export type ImageEntityType = "crag" | "sector" | "route";
export type ReviewEntityType = "crag" | "sector" | "route";
import { Pool } from "pg";

export type ClimbStyle = "sport" | "trad" | "boulder";
export type TickType = "onsight" | "flash" | "redpoint" | "toprope" | "attempt";

export interface CragsTable {
  id: Generated<number>;
  name: string;
  area: string | null;
  country: string | null;
  description: string | null;
  deleted: Generated<boolean>;
  created_by: number | null;
  created_at: Generated<Date>;
}

export interface SectorsTable {
  id: Generated<number>;
  crag_id: number;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  parking_latitude: number | null;
  parking_longitude: number | null;
  deleted: Generated<boolean>;
  created_by: number | null;
  created_at: Generated<Date>;
}

export interface GradingSystemsTable {
  id: Generated<number>;
  name: string;
  slug: string;
}

export interface GradeEquivalenciesTable {
  id: Generated<number>;
  equivalency_id: number;
  grading_system_id: number;
  grade: string;
  discipline: "rope" | "boulder";
}

export interface RoutesTable {
  id: Generated<number>;
  name: string;
  crag_id: number;
  sector_id: number | null;
  grade: string;
  grading_system_id: number;
  style: ClimbStyle;
  height_m: number | null;
  bolt_count: number | null;
  protection: string | null;
  description: string | null;
  deleted: Generated<boolean>;
  created_by: number | null;
  created_at: Generated<Date>;
}

export interface DeletionLogTable {
  id: Generated<number>;
  entity_type: DeletionEntityType;
  entity_id: number;
  entity_name: string;
  action: DeletionAction;
  user_id: number;
  created_at: Generated<Date>;
}

export interface AscentsTable {
  id: Generated<number>;
  route_id: number;
  user_id: number;
  tick_type: TickType;
  ascent_date: Generated<Date>;
  notes: string | null;
  created_at: Generated<Date>;
}

export type UserRole = "member" | "admin";

export interface UsersTable {
  id: Generated<number>;
  email: string;
  name: string;
  password_hash: string | null;
  role: Generated<UserRole>;
  preferred_rope_grading_system_id: number | null;
  preferred_boulder_grading_system_id: number | null;
  created_at: Generated<Date>;
}

export type GearCategory =
  | "rope"
  | "quickdraws"
  | "harness"
  | "shoes"
  | "protection"
  | "bouldering"
  | "safety"
  | "other";

export interface GearItemsTable {
  id: Generated<number>;
  user_id: number;
  name: string;
  category: GearCategory;
  brand: string | null;
  purchased_on: Date | null;
  retired_on: Date | null;
  notes: string | null;
  created_at: Generated<Date>;
}

export interface GearReviewsTable {
  id: Generated<number>;
  user_id: number;
  product: string;
  rating: number;
  body: string;
  created_at: Generated<Date>;
}

export interface CountriesTable {
  id: Generated<number>;
  name: string;
}

export interface ForumTopicsTable {
  id: Generated<number>;
  title: string;
  user_id: number;
  created_at: Generated<Date>;
}

export interface ImagesTable {
  id: Generated<number>;
  entity_type: ImageEntityType;
  entity_id: number;
  url: string;
  uploaded_by: number | null;
  created_at: Generated<Date>;
}

export interface ForumPostsTable {
  id: Generated<number>;
  topic_id: number;
  user_id: number;
  body: string;
  created_at: Generated<Date>;
}

export interface EntityReviewsTable {
  id: Generated<number>;
  entity_type: ReviewEntityType;
  entity_id: number;
  user_id: number;
  rating: number;
  body: string | null;
  created_at: Generated<Date>;
}

export interface Database {
  crags: CragsTable;
  sectors: SectorsTable;
  routes: RoutesTable;
  grading_systems: GradingSystemsTable;
  grade_equivalencies: GradeEquivalenciesTable;
  ascents: AscentsTable;
  users: UsersTable;
  gear_items: GearItemsTable;
  gear_reviews: GearReviewsTable;
  countries: CountriesTable;
  deletion_log: DeletionLogTable;
  images: ImagesTable;
  forum_topics: ForumTopicsTable;
  forum_posts: ForumPostsTable;
  entity_reviews: EntityReviewsTable;
}

declare global {
  // eslint-disable-next-line no-var
  var kyselyDb: Kysely<Database> | undefined;
}

// Reuse the instance (and its pool) across hot reloads in development.
const db =
  global.kyselyDb ??
  new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
  });

if (process.env.NODE_ENV !== "production") {
  global.kyselyDb = db;
}

export default db;
