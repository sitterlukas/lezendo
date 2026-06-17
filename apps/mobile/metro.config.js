// Metro config tuned for the Turborepo monorepo: watch the workspace root so
// the TS-source `@whipperbook/*` packages are transpiled, and resolve modules
// from both the app and the hoisted root node_modules (single React/RN/Query).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// NativeWind: wraps the Metro transformer to compile Tailwind classes.
module.exports = require("nativewind/metro").withNativeWind(config, {
  input: "./global.css",
});
