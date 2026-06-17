import { type Kysely } from "kysely";

// Sector approach time (walk-in from parking, minutes) and aspect (sun/shade).
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("sectors")
    .addColumn("approach_minutes", "integer")
    .addColumn("aspect", "text")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("sectors")
    .dropColumn("approach_minutes")
    .dropColumn("aspect")
    .execute();
}
