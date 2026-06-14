import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("grading_systems")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull().unique())
    .execute();

  await db
    .insertInto("grading_systems" as any)
    .values([
      { name: "French",          slug: "french"  },
      { name: "YDS",             slug: "yds"     },
      { name: "UIAA",            slug: "uiaa"    },
      { name: "Fontainebleau",   slug: "font"    },
      { name: "V-scale (Hueco)", slug: "v-scale" },
      { name: "British",         slug: "british" },
    ])
    .execute();

  await db.schema
    .alterTable("routes")
    .addColumn("grading_system_id", "integer", (col) =>
      col.references("grading_systems.id").onDelete("set null")
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("routes").dropColumn("grading_system_id").execute();
  await db.schema.dropTable("grading_systems").execute();
}
