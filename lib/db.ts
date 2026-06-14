import { Kysely, PostgresDialect, type Generated, type Selectable, type Insertable } from "kysely";
import { Pool } from "pg";

export type ClimbStyle = "sport" | "trad" | "boulder";
export type TickType = "onsight" | "flash" | "redpoint" | "toprope" | "attempt";

export interface CragsTable {
  id: Generated<number>;
  name: string;
  area: string | null;
  country: string | null;
  description: string | null;
  created_at: Generated<Date>;
}

export interface RoutesTable {
  id: Generated<number>;
  name: string;
  crag_id: number;
  grade: string;
  style: ClimbStyle;
  height_m: number | null;
  description: string | null;
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

export interface UsersTable {
  id: Generated<number>;
  email: string;
  name: string;
  password_hash: string | null;
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

export interface Database {
  crags: CragsTable;
  routes: RoutesTable;
  ascents: AscentsTable;
  users: UsersTable;
  gear_items: GearItemsTable;
  gear_reviews: GearReviewsTable;
  countries: CountriesTable;
}

export type Crag = Selectable<CragsTable>;
export type NewCrag = Insertable<CragsTable>;
export type Route = Selectable<RoutesTable>;
export type NewRoute = Insertable<RoutesTable>;
export type Ascent = Selectable<AscentsTable>;
export type NewAscent = Insertable<AscentsTable>;

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
