import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "kysely-ctl";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";

// kysely-ctl runs outside Next.js, so load env vars ourselves. The env file
// lives at the monorepo root, so resolve it relative to this config file
// rather than the cwd (which is the apps/web workspace when run via npm/Turbo).
// On Vercel the vars are already injected; skip if the file doesn't exist.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
try {
  process.loadEnvFile(resolve(repoRoot, ".env.local"));
} catch {}

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
