import { type Kysely } from "kysely";

// Route guidebook info: first ascent (who + year), pitch count for multi-pitch
// routes, and gear/rack notes for trad.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("routes")
    .addColumn("first_ascensionist", "text")
    .addColumn("first_ascent_year", "integer")
    .addColumn("pitches", "integer")
    .addColumn("gear_notes", "text")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("routes")
    .dropColumn("first_ascensionist")
    .dropColumn("first_ascent_year")
    .dropColumn("pitches")
    .dropColumn("gear_notes")
    .execute();
}
