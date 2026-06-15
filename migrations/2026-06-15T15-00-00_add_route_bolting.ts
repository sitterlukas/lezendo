import { type Kysely } from "kysely";

// Route length is already stored as `height_m`. This adds how the route is
// protected: the number of bolts and a short free-text bolting/protection note.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("routes")
    .addColumn("bolt_count", "integer")
    .addColumn("protection", "text")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("routes")
    .dropColumn("bolt_count")
    .dropColumn("protection")
    .execute();
}
