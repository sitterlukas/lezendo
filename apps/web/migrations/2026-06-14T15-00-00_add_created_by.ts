import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  for (const table of ["crags", "sectors", "routes"] as const) {
    await db.schema
      .alterTable(table)
      .addColumn("created_by", "integer", (col) =>
        col.references("users.id").onDelete("set null")
      )
      .execute();
  }

  // Attribute existing rows to the admin user so they remain editable.
  await sql`
    UPDATE crags  SET created_by = (SELECT id FROM users WHERE email = 'lukas.sitter@gmail.com') WHERE created_by IS NULL
  `.execute(db);
  await sql`
    UPDATE sectors SET created_by = (SELECT id FROM users WHERE email = 'lukas.sitter@gmail.com') WHERE created_by IS NULL
  `.execute(db);
  await sql`
    UPDATE routes  SET created_by = (SELECT id FROM users WHERE email = 'lukas.sitter@gmail.com') WHERE created_by IS NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  for (const table of ["crags", "sectors", "routes"] as const) {
    await db.schema.alterTable(table).dropColumn("created_by").execute();
  }
}
