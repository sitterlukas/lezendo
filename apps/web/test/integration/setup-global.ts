import { execSync } from "node:child_process";

// Runs once before the integration suite: point the migrator at the test DB and
// bring it to the latest schema. Refuses to run against a DB whose name doesn't
// end in `_test`, so we can never migrate/wipe a real database by accident.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  const dbName = url.split("/").pop()?.split("?")[0] ?? "";
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against "${dbName}" (name must end in _test)`,
    );
  }
  execSync("npm run migrate:latest", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
