import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Integration tests hit a real Postgres (TEST_DATABASE_URL). They share one DB,
// so run them serially in a single fork to avoid cross-test interference.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["test/integration/**/*.int.test.ts"],
    globalSetup: ["test/integration/setup-global.ts"],
    // Integration tests share one Postgres DB; run them in a single worker,
    // one file at a time, so they never race on DB state.
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
