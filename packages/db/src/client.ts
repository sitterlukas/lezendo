import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

// Shared DB row/enum types now live in @whipperbook/core; re-export them so
// existing `@/lib/db` type imports keep resolving. The `Database` interface
// (used by the Kysely client below) comes from there too.
export * from "@whipperbook/core";
import type { Database } from "@whipperbook/core";

declare global {
  var kyselyDb: Kysely<Database> | undefined;
}

// Reuse the instance (and its pool) across hot reloads in development.
const db =
  global.kyselyDb ??
  new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
  });

if (process.env.NODE_ENV !== "production") {
  global.kyselyDb = db;
}

export default db;
