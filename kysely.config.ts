import { defineConfig } from "kysely-ctl";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";

// kysely-ctl runs outside Next.js, so load env vars ourselves.
// On Vercel the vars are already injected; skip if the file doesn't exist.
try { process.loadEnvFile(".env.local"); } catch {}

export default defineConfig({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
  migrations: {
    migrationFolder: "migrations",
    // ISO date prefix, e.g. "2026-06-12T19-19-00_" (colons are not
    // filesystem-safe). Sorts lexicographically, so migration order holds.
    getMigrationPrefix: () =>
      `${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}_`,
  },
});