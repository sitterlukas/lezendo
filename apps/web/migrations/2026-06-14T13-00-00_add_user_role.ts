import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("role", "text", (col) =>
      col.notNull().defaultTo("member").check(sql`role IN ('member', 'admin')`)
    )
    .execute();

  await db
    .updateTable("users" as any)
    .set({ role: "admin" })
    .where("email", "=", "lukas.sitter@gmail.com")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("users").dropColumn("role").execute();
}
