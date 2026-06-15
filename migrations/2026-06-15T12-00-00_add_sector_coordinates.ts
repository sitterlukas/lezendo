import { type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("sectors")
    .addColumn("latitude", "double precision")
    .addColumn("longitude", "double precision")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("sectors")
    .dropColumn("latitude")
    .dropColumn("longitude")
    .execute();
}
