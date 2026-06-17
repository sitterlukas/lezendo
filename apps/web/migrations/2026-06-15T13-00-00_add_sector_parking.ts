import { type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("sectors")
    .addColumn("parking_latitude", "double precision")
    .addColumn("parking_longitude", "double precision")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("sectors")
    .dropColumn("parking_latitude")
    .dropColumn("parking_longitude")
    .execute();
}
