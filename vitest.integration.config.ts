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
    fileParallelism: false,
    singleFork: true,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
