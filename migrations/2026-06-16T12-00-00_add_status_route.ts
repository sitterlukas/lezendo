import { type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("statuses")
    .addColumn("route_id", "integer", (col) =>
      col.references("routes.id").onDelete("set null"),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("statuses").dropColumn("route_id").execute();
}
