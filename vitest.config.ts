import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit tests only: pure logic, no database. Integration tests live under
// test/integration and run via vitest.integration.config.ts.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    exclude: ["test/integration/**", "node_modules/**"],
  },
});
