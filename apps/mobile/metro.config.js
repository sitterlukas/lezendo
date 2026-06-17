// Expo SDK 54's getDefaultConfig already detects this pnpm/Turborepo monorepo and
// sets up watchFolders (root node_modules + every workspace package) and the
// resolver's nodeModulesPaths (app, then hoisted root) so the TS-source
// `@whipperbook/*` packages transpile and React/RN/Query resolve to a single
// copy. Overriding those by hand caused modules to resolve via two paths
// (duplicate instances → "getDevServer is not a function"), so we rely on the
// defaults and only layer NativeWind on top.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// NativeWind: wraps the Metro transformer to compile Tailwind classes.
module.exports = require("nativewind/metro").withNativeWind(config, {
  input: "./global.css",
});
