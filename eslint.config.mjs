import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Migrations are frozen in time and take Kysely<any> on purpose (they must
  // not depend on the live, evolving Database type), so allow `any` there.
  {
    files: ["**/migrations/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  // Node config files (metro/tailwind/babel/postcss, …) are CommonJS and
  // legitimately use require().
  {
    files: ["**/*.config.js", "**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Turn off ESLint rules that conflict with Prettier. Keep last.
  prettier,
  // Override default ignores of eslint-config-next, plus build outputs for
  // future monorepo workspaces (apps/*, packages/*).
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Monorepo build outputs (workspaces under apps/ and packages/):
    "**/.next/**",
    "**/dist/**",
    "**/.turbo/**",
    "**/.expo/**",
    "node_modules/**",
  ]),
]);

export default eslintConfig;
