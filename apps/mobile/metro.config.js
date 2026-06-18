// Expo SDK 54's getDefaultConfig already detects this pnpm/Turborepo monorepo and
// sets up watchFolders (root node_modules + every workspace package) and the
// resolver's nodeModulesPaths (app, then hoisted root) so the TS-source
// `@whipperbook/*` packages transpile and React/RN/Query resolve to a single
// copy. Overriding those by hand caused modules to resolve via two paths
// (duplicate instances → "getDevServer is not a function"), so we rely on the
// defaults and only layer NativeWind on top.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Force a single React. In this hoisted pnpm workspace the root holds React
// 19.1.0 (Expo/RN's pinned version), but the web app's React 19.2.4 gets nested
// under shared deps such as @tanstack/react-query. Metro would otherwise bundle
// that second copy alongside the app's, leaving the hook dispatcher null
// ("Cannot read property 'useEffect' of null"). Redirect every react/react-dom
// request to the one root copy.
const monorepoRoot = path.resolve(__dirname, "../..");
const reactRoots = {
  react: path.join(monorepoRoot, "node_modules/react"),
  "react-dom": path.join(monorepoRoot, "node_modules/react-dom"),
};
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const [name, dir] of Object.entries(reactRoots)) {
    if (moduleName === name || moduleName.startsWith(name + "/")) {
      return context.resolveRequest(
        context,
        dir + moduleName.slice(name.length),
        platform,
      );
    }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  );
};

// NativeWind: wraps the Metro transformer to compile Tailwind classes.
module.exports = require("nativewind/metro").withNativeWind(config, {
  input: "./global.css",
});
