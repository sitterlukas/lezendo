import { type Kysely } from "kysely";

// Guidebook-style crag info: rock type, aspect (sun), best season and any
// access notes/restrictions.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("crags")
    .addColumn("rock_type", "text")
    .addColumn("aspect", "text")
    .addColumn("best_season", "text")
    .addColumn("access_notes", "text")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("crags")
    .dropColumn("rock_type")
    .dropColumn("aspect")
    .dropColumn("best_season")
    .dropColumn("access_notes")
    .execute();
}
