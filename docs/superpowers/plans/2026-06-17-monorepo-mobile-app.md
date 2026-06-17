# Turborepo Monorepo + Expo Mobile App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the repo into an npm-workspaces + Turborepo monorepo, extract shared packages, adopt a shared TanStack Query data layer (web hybrid SSR + mobile), and add an Expo mobile app consuming the existing REST API.

**Architecture:** `apps/web` (the existing Next.js 16 app) + `apps/mobile` (new Expo app) + four shared packages: `@whipperbook/core` (pure logic + types), `@whipperbook/validation` (zod schemas), `@whipperbook/api-client` (typed client + TanStack Query `queryOptions`), `@whipperbook/db` (server-only). Packages are consumed as TS source; `core`/`validation`/`api-client` must never import `pg`/`kysely`/`jose`/`next`.

**Tech Stack:** npm workspaces, Turborepo, Next.js 16, Expo + expo-router, TanStack Query v5, NativeWind, Kysely/Postgres, zod, jose, expo-secure-store.

**Spec:** `docs/superpowers/specs/2026-06-17-monorepo-mobile-app-design.md`

---

## Prerequisites

- [ ] **PR #5 (REST API hardening) is merged into `main`.** The package extraction relies on the hardened, zod-based route handlers and the split-friendly `lib/forms.ts`. Start this plan from a `main` that includes #5.
- [ ] **Create the working branch** off the merged `main`:

```bash
git checkout main && git pull
git checkout -b feat/monorepo-mobile
```

- [ ] **Confirm tooling versions** (record what you have; pin in CI later):

```bash
node -v   # expect Node 20+
npm -v    # expect npm 10+
npx --yes turbo --version 2>/dev/null || echo "turbo not yet installed (added in Phase 1)"
```

Throughout: after each task, the named verification command MUST pass before committing. Use `git mv` for moves so history is preserved.

---

## Phase 1 — Workspace scaffold

Establishes the workspace root, Turbo, shared TS config, and shared lint/format. After this phase the existing app still lives at the repo root and still builds; we wire workspaces before moving anything.

### Task 1.1: Root workspace + Turbo config

**Files:**
- Modify: `package.json` (root)
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Modify: `.gitignore`

- [ ] **Step 1: Make the root `package.json` a private workspace root.** Edit the top of `package.json` to add `"private": true` and `"workspaces"`, and replace the app-specific `scripts` with Turbo passthroughs. Keep `devDependencies` for now (they move in later tasks). The result's top keys:

```json
{
  "name": "whipperbook-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

- [ ] **Step 2: Install Turbo at the root.**

Run: `npm install -D turbo@^2`
Expected: `turbo` added to root `devDependencies`; `package-lock.json` updated.

- [ ] **Step 3: Create `turbo.json`:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "type-check": { "dependsOn": ["^build"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`** with the strict options currently in `tsconfig.json` (copy `compilerOptions` from the existing file, drop Next-specific `plugins`/`paths`, keep `strict`, `target`, `moduleResolution: "bundler"`, `esModuleInterop`, `skipLibCheck`, etc.):

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": false
  }
}
```

- [ ] **Step 5: Add monorepo entries to `.gitignore`** (append):

```
# turbo
.turbo
# expo
apps/mobile/.expo
apps/mobile/ios
apps/mobile/android
```

- [ ] **Step 6: Verify install resolves and Turbo runs.**

Run: `npm install && npx turbo run build --dry=json | head -20`
Expected: install succeeds; `turbo` prints a (currently empty) task graph without error.

- [ ] **Step 7: Commit.**

```bash
git add package.json package-lock.json turbo.json tsconfig.base.json .gitignore
git commit -m "chore: add npm workspaces + turborepo scaffolding"
```

### Task 1.2: Root shared ESLint + Prettier

**Files:**
- Modify: `eslint.config.mjs` (becomes the root shared base)
- Keep: `.prettierrc`, `.prettierignore` at root (already repo-wide)

- [ ] **Step 1: Keep `eslint.config.mjs` at the root** as the shared flat config; export the base array so apps can extend it. Add `apps/**` and `packages/**` to its file globs and ignore build outputs (`**/.next/**`, `**/dist/**`, `**/.expo/**`). (Per-app overrides — e.g. the Expo plugin — are added in their app tasks.)
- [ ] **Step 2: Verify lint runs from root** (no workspaces yet, so this lints root files):

Run: `npx eslint .`
Expected: exits 0 (or only pre-existing warnings).

- [ ] **Step 3: Commit.**

```bash
git add eslint.config.mjs
git commit -m "chore: make root eslint config the shared base"
```

---

## Phase 2 — Move web into `apps/web`

Move the entire app under `apps/web` with its own `package.json`/`tsconfig`, keeping the `@/` alias so imports don't change yet. **Checkpoint: web builds + all tests green.**

### Task 2.1: Relocate the app files

**Files (moves):** everything app-related into `apps/web/`.

- [ ] **Step 1: Create `apps/web` and move files with `git mv`:**

```bash
mkdir -p apps/web
git mv app auth.ts proxy.ts public types test scripts \
       next.config.ts postcss.config.mjs next-env.d.ts \
       kysely.config.ts migrations \
       vitest.config.ts vitest.integration.config.ts \
       lib apps/web/
```

(Note: the whole `lib/` moves to `apps/web/lib` for now; Phase 3 extracts the shared parts out of it into packages.)

- [ ] **Step 2: Create `apps/web/package.json`.** Move web runtime + dev deps here from the root `package.json` (Next, React, Kysely, pg, next-auth, jose, zod, bcryptjs, @vercel/blob, leaflet, qrcode, vitest, tailwind, etc.). Leave only `turbo` + `prettier` at the root. Web scripts:

```json
{
  "name": "@whipperbook/web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "kysely migrate:latest && next build",
    "start": "next start",
    "lint": "eslint",
    "type-check": "tsc --noEmit",
    "test": "vitest run --config vitest.config.ts",
    "test:integration": "sh -c 'DATABASE_URL=${TEST_DATABASE_URL:-$DATABASE_URL} vitest run --config vitest.integration.config.ts'",
    "migrate:make": "kysely migrate:make",
    "migrate:latest": "kysely migrate:latest"
  }
}
```

- [ ] **Step 3: Create `apps/web/tsconfig.json`** extending the base and keeping the `@/` alias + Next plugin:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "jsx": "preserve",
    "allowJs": true,
    "incremental": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Delete the old root `tsconfig.json` (its options now live in `tsconfig.base.json` + `apps/web/tsconfig.json`):

```bash
git rm tsconfig.json
```

- [ ] **Step 4: Fix config file internals for the new location.**
  - `apps/web/kysely.config.ts`: confirm the migrations path resolves relative to `apps/web` (it should, since `migrations/` moved alongside it).
  - `apps/web/vitest.config.ts` and `vitest.integration.config.ts`: ensure the `@/` alias/root points at `apps/web` (e.g. `resolve.alias` `@` → `__dirname`, or `tsconfigPaths` plugin reading the local tsconfig).
  - `apps/web/next.config.ts`: no change yet (transpilePackages added in Phase 3).

- [ ] **Step 5: Install and verify the web app builds + tests from its workspace.**

Run:
```bash
npm install
npm run -w @whipperbook/web type-check
npm run -w @whipperbook/web test
npm run -w @whipperbook/web build
```
Expected: type-check, unit tests, and build all pass (DB must be reachable for the `migrate:latest` build step — use the dev DB).

- [ ] **Step 6: Commit.**

```bash
git add -A
git commit -m "refactor: move web app into apps/web workspace"
```

---

## Phase 3 — Extract shared packages

Pull the shareable code out of `apps/web/lib` into `packages/*`, split the three mixed modules, and rewrite the web's imports. Extract in dependency order: `core` → `validation` → `api-client` → `db`. **Checkpoint after each: web green.**

### Task 3.1: `@whipperbook/core` (types + pure logic)

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/index.ts`
- Move into `packages/core/src/`: `types.ts` (extracted from `db.ts`), `grade-conversion.ts`, `leaderboard.ts`, `route-stats.ts`, `time-ago.ts`, `constants.ts`, `points.ts` (pure parts)
- Move tests: `grade-conversion.test.ts`, `leaderboard.test.ts`, `route-stats.test.ts`, `time-ago.test.ts`, `points.test.ts` (pure parts)

- [ ] **Step 1: Create `packages/core/package.json`:**

```json
{
  "name": "@whipperbook/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "lint": "eslint",
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": { "vitest": "^3" }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Extract the DB row/enum types out of `apps/web/lib/db.ts`** into `packages/core/src/types.ts`. Move the top section of `db.ts` (everything above `import { Pool } from "pg"`): the string-union types (`DeletionEntityType`, `DeletionAction`, `ImageEntityType`, `FeedTargetType`, `LikeTargetType`, `ReviewEntityType`, `ClimbStyle`, `TickType`, `GearCategory`, …) **and** all the `*Table` interfaces and the `Database` interface. Keep the `Generated`/`ColumnType` type imports from `kysely` (type-only imports are erased and don't pull `pg` into the bundle):

```ts
// packages/core/src/types.ts
import type { Generated, ColumnType } from "kysely";

export type DeletionEntityType = "crag" | "sector" | "route";
// … (all the type aliases + table interfaces + the Database interface,
//     moved verbatim from the old db.ts header)
```

- [ ] **Step 4: Move the pure modules** with `git mv`:

```bash
mkdir -p packages/core/src
git mv apps/web/lib/grade-conversion.ts packages/core/src/grade-conversion.ts
git mv apps/web/lib/grade-conversion.test.ts packages/core/src/grade-conversion.test.ts
git mv apps/web/lib/leaderboard.ts packages/core/src/leaderboard.ts
git mv apps/web/lib/leaderboard.test.ts packages/core/src/leaderboard.test.ts
git mv apps/web/lib/route-stats.ts packages/core/src/route-stats.ts
git mv apps/web/lib/route-stats.test.ts packages/core/src/route-stats.test.ts
git mv apps/web/lib/time-ago.ts packages/core/src/time-ago.ts
git mv apps/web/lib/time-ago.test.ts packages/core/src/time-ago.test.ts
git mv apps/web/lib/constants.ts packages/core/src/constants.ts
```

- [ ] **Step 5: Split `points.ts`.** Create `packages/core/src/points.ts` with ONLY the pure exports (`POINTS_BASE`, `POINTS_GROWTH`, `POINTS_EXPLAINER`, `gradePoints`) and the `Discipline`/`GradeEquivalency` type imports. Leave `buildRoutePoints` (it uses `db`/`sql`) behind in `apps/web/lib/points.ts` for now — it moves to `@whipperbook/db` in Task 3.4. Split the matching test: pure `gradePoints` tests → `packages/core/src/points.test.ts`; any `buildRoutePoints` test stays with the web/db side.

- [ ] **Step 6: Fix internal imports inside the moved core files.** They currently import each other and types via `@/lib/...`. Rewrite to relative paths and the new types module:
  - `@/lib/db` (types only) → `./types`
  - `@/lib/grade-conversion` → `./grade-conversion`
  - `@/lib/leaderboard` → `./leaderboard`
  - etc.

- [ ] **Step 7: Create `packages/core/src/index.ts`** re-exporting the public surface:

```ts
export * from "./types";
export * from "./grade-conversion";
export * from "./leaderboard";
export * from "./route-stats";
export * from "./time-ago";
export * from "./constants";
export * from "./points";
```

- [ ] **Step 8: Point `apps/web/lib/db.ts` at the extracted types.** Replace the moved type block at the top of `db.ts` with `export * from "@whipperbook/core"` for the types it re-exposes (so existing `@/lib/db` type imports keep resolving during the transition), and keep only the `pg`/`kysely` client below. Add `"@whipperbook/core": "*"` to `apps/web/package.json` dependencies.

- [ ] **Step 9: Rewrite web imports of the moved pure modules** to `@whipperbook/core`. Apply each mapping repo-wide under `apps/web`:

```bash
cd apps/web
grep -rl '@/lib/grade-conversion' . | xargs sed -i '' 's#@/lib/grade-conversion#@whipperbook/core#g'
grep -rl '@/lib/leaderboard'      . | xargs sed -i '' 's#@/lib/leaderboard#@whipperbook/core#g'
grep -rl '@/lib/route-stats'      . | xargs sed -i '' 's#@/lib/route-stats#@whipperbook/core#g'
grep -rl '@/lib/time-ago'         . | xargs sed -i '' 's#@/lib/time-ago#@whipperbook/core#g'
grep -rl '@/lib/constants'        . | xargs sed -i '' 's#@/lib/constants#@whipperbook/core#g'
cd ../..
```

(`sed -i ''` is the macOS form; on Linux use `sed -i`.) Type-only imports from `@/lib/db` can stay as-is because `db.ts` now re-exports the core types.

- [ ] **Step 10: Add `@whipperbook/core` to `transpilePackages`** in `apps/web/next.config.ts`:

```ts
const nextConfig: NextConfig = {
  transpilePackages: ["@whipperbook/core"],
  images: { /* unchanged */ },
};
```

- [ ] **Step 11: Verify.**

Run:
```bash
npm install
npm run -w @whipperbook/core test
npm run -w @whipperbook/core type-check
npm run -w @whipperbook/web type-check
npm run -w @whipperbook/web build
```
Expected: all pass. `tsc` flags any missed import rewrite — fix and re-run.

- [ ] **Step 12: Commit.**

```bash
git add -A
git commit -m "refactor: extract @whipperbook/core (types + pure logic)"
```

### Task 3.2: `@whipperbook/validation` (pure zod schemas)

**Files:**
- Create: `packages/validation/package.json`, `tsconfig.json`, `src/index.ts`
- Create: `packages/validation/src/schemas.ts` (the pure half of `forms.ts`)
- Modify: `apps/web/lib/forms.ts` (keep only the DB-touching validators)

- [ ] **Step 1: Create the package manifest + tsconfig** (same shape as core; deps: `zod`, `@whipperbook/core`; devDeps: `vitest`):

```json
{
  "name": "@whipperbook/validation",
  "version": "0.0.0", "private": true, "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "lint": "eslint", "type-check": "tsc --noEmit", "test": "vitest run" },
  "dependencies": { "zod": "^4", "@whipperbook/core": "*" },
  "devDependencies": { "vitest": "^3" }
}
```

- [ ] **Step 2: Move the pure schema code** from `apps/web/lib/forms.ts` into `packages/validation/src/schemas.ts`: the field helpers (`trimmed`, `requiredText`, `nullableText`, `nullableInt`, `requiredInt`, `nullableDate`, `coordinate`), the enums (`styleEnum`, …), and ALL the composite schemas (`cragWriteSchema`, `routeWriteSchema`, `reviewQuerySchema`, etc.). Import `STATUS_MAX_LEN`/`COMMENT_MAX_LEN` from `@whipperbook/core` instead of `@/lib/constants`.

- [ ] **Step 3: Leave the DB-touching validators in `apps/web/lib/forms.ts`** — `INVALID_SECTOR`, `resolveSectorTag`, `gradeSystemError` (they import `db`, `grade-data`, `grade-conversion`). These move to `@whipperbook/db` in Task 3.4; for now they stay and import schemas/enums from `@whipperbook/validation`. (`disciplineForStyle` stays with `gradeSystemError`.)

- [ ] **Step 4: Create `packages/validation/src/index.ts`:** `export * from "./schemas";`

- [ ] **Step 5: Add a schema test** at `packages/validation/src/schemas.test.ts` (good ROI; covers the coercion/error behavior):

```ts
import { describe, it, expect } from "vitest";
import { routeWriteSchema, requiredInt } from "./schemas";

describe("requiredInt", () => {
  it("rejects empty/missing with the given message", () => {
    const r = requiredInt("Pick one.", { min: 1 }).safeParse("");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Pick one.");
  });
  it("coerces numeric strings", () => {
    expect(requiredInt("x", { min: 1 }).parse("12")).toBe(12);
  });
});

describe("routeWriteSchema", () => {
  it("requires a crag_id (closes the Number(null)===0 hole)", () => {
    const r = routeWriteSchema.safeParse({ name: "A", grade: "6a", style: "sport", grading_system_id: "1" });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 6: Rewrite web imports** of the schemas from `@/lib/forms` → `@whipperbook/validation` for route handlers that import schemas/enums, while keeping `@/lib/forms` for `resolveSectorTag`/`gradeSystemError`/`INVALID_SECTOR`. Concretely, in each `apps/web/app/api/**/route.ts`, change the schema/enum names in the `@/lib/forms` import to come from `@whipperbook/validation`; leave the validator names importing from `@/lib/forms`. Add `"@whipperbook/validation": "*"` to `apps/web/package.json` and to `transpilePackages`.

- [ ] **Step 7: Verify.**

Run:
```bash
npm install
npm run -w @whipperbook/validation test
npm run -w @whipperbook/web type-check && npm run -w @whipperbook/web test
```
Expected: pass.

- [ ] **Step 8: Commit.**

```bash
git add -A
git commit -m "refactor: extract @whipperbook/validation (zod schemas)"
```

### Task 3.3: `@whipperbook/api-client` (typed client + reviveDates + queryOptions)

**Files:**
- Create: `packages/api-client/package.json`, `tsconfig.json`, `src/index.ts`
- Create: `packages/api-client/src/json.ts` (reviveDates, moved), `src/client.ts` (transport-injected client), `src/queries.ts` (queryOptions)
- Move test: `apps/web/lib/api/json.test.ts` → `packages/api-client/src/json.test.ts`

- [ ] **Step 1: Manifest + tsconfig.** Deps: `@whipperbook/core`, `@tanstack/react-query@^5`. (No `next`, no `pg`.)

- [ ] **Step 2: Move `reviveDates`** from `apps/web/lib/api/json.ts` to `packages/api-client/src/json.ts` (move the test alongside). Update `apps/web/lib/api/server-fetch.ts` to import `reviveDates` from `@whipperbook/api-client`.

- [ ] **Step 3: Define the transport-injected client** in `packages/api-client/src/client.ts`. The client takes a `transport` (a `fetch`-like function + base URL + auth strategy) so web-server, web-client, and mobile supply their own:

```ts
import { reviveDates } from "./json";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type Transport = (
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal },
) => Promise<Response>;

export function createApiClient(transport: Transport) {
  async function request<T>(path: string, init: Parameters<Transport>[1] = {}): Promise<T> {
    const res = await transport(path, init);
    const text = await res.text();
    let data: unknown = null;
    if (text) { try { data = JSON.parse(text); } catch { data = null; } }
    if (!res.ok) {
      const message =
        (data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error) : null) ??
        `Request failed (${res.status})`;
      throw new ApiError(res.status, message);
    }
    return reviveDates(data) as T;
  }
  return {
    get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
    send: <T>(path: string, method: string, body?: unknown) => request<T>(path, { method, body }),
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
```

- [ ] **Step 4: Define shared `queryOptions`** in `packages/api-client/src/queries.ts` using TanStack Query v5's `queryOptions` helper, parameterized by an `ApiClient`. Cover the read endpoints the mobile slice + web need (start with crags list + crag detail; add more as web adoption proceeds):

```ts
import { queryOptions } from "@tanstack/react-query";
import type { ApiClient } from "./client";
// Response types come from the web's query layer; re-declare the shared shape here
// or import row types from "@whipperbook/core". Keep these in sync with the API.

export const cragsKeys = {
  all: ["crags"] as const,
  list: (q?: string, country?: string, page?: number) =>
    ["crags", "list", { q: q ?? null, country: country ?? null, page: page ?? 1 }] as const,
  detail: (id: number) => ["crags", "detail", id] as const,
};

export function cragsListQuery<T>(api: ApiClient, params: { q?: string; country?: string; page?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.country) qs.set("country", params.country);
  if (params.page) qs.set("page", String(params.page));
  return queryOptions({
    queryKey: cragsKeys.list(params.q, params.country, params.page),
    queryFn: () => api.get<T>(`/api/crags${qs.toString() ? `?${qs}` : ""}`),
  });
}

export function cragDetailQuery<T>(api: ApiClient, id: number) {
  return queryOptions({
    queryKey: cragsKeys.detail(id),
    queryFn: () => api.get<T>(`/api/crags/${id}`),
  });
}
```

- [ ] **Step 5: `packages/api-client/src/index.ts`:** `export * from "./json"; export * from "./client"; export * from "./queries";`

- [ ] **Step 6: Rewrite the web's `lib/api-client.ts` consumers.** Replace the old `apiFetch`/`ApiError` from `@/lib/api-client` and `reviveDates` from `@/lib/api/json` with `@whipperbook/api-client`. Create `apps/web/lib/api/client.ts` that builds a browser `ApiClient` (same-origin fetch) and a server `ApiClient` (cookie-forwarding via `next/headers`) — see Phase 4. For now keep the existing `apiFetch` working by re-exporting a browser client wrapper so client components compile unchanged. Add `"@whipperbook/api-client": "*"` to web deps + `transpilePackages`.

- [ ] **Step 7: Verify.**

Run:
```bash
npm install
npm run -w @whipperbook/api-client test
npm run -w @whipperbook/api-client type-check
npm run -w @whipperbook/web type-check && npm run -w @whipperbook/web test && npm run -w @whipperbook/web build
```
Expected: pass.

- [ ] **Step 8: Commit.**

```bash
git add -A
git commit -m "refactor: extract @whipperbook/api-client (client + reviveDates + queryOptions)"
```

### Task 3.4: `@whipperbook/db` (server-only)

**Files:**
- Create: `packages/db/package.json`, `tsconfig.json`, `src/index.ts`
- Move into `packages/db/src/`: the kysely client (from `db.ts`), `grade-data.ts`, `buildRoutePoints` (from `points.ts`), `api/tokens.ts`, `credentials.ts`, `queries/*`, `feed.ts`, `deletion-log.ts`, `soft-delete.ts`, `feed-interactions.ts`, and the validators `resolveSectorTag`/`gradeSystemError` (from `forms.ts`)
- Move tests: `tokens.test.ts`, `feed.test.ts`

- [ ] **Step 1: Manifest + tsconfig.** Deps: `kysely`, `pg`, `jose`, `bcryptjs`, `zod`, `@whipperbook/core`, `@whipperbook/validation`. devDeps: `vitest`, `@types/pg`. This is the only package allowed server-only deps.

- [ ] **Step 2: Move the kysely client.** `git mv apps/web/lib/db.ts packages/db/src/client.ts`; strip the type block (now `export * from "@whipperbook/core"`), keep the `Pool`/`Kysely` client + `export default db`. Re-export types: `export type * from "@whipperbook/core";`.

- [ ] **Step 3: Move the server modules** with `git mv` into `packages/db/src/` (preserving the `queries/` subdir), then rewrite their internal imports: `@/lib/db` → `./client`, `@/lib/grade-conversion` & types → `@whipperbook/core`, schemas → `@whipperbook/validation`, sibling modules → relative paths.

```bash
mkdir -p packages/db/src/queries packages/db/src/api
git mv apps/web/lib/grade-data.ts        packages/db/src/grade-data.ts
git mv apps/web/lib/credentials.ts       packages/db/src/credentials.ts
git mv apps/web/lib/api/tokens.ts        packages/db/src/api/tokens.ts
git mv apps/web/lib/api/tokens.test.ts   packages/db/src/api/tokens.test.ts
git mv apps/web/lib/deletion-log.ts      packages/db/src/deletion-log.ts
git mv apps/web/lib/soft-delete.ts       packages/db/src/soft-delete.ts
git mv apps/web/lib/feed-interactions.ts packages/db/src/feed-interactions.ts
git mv apps/web/lib/feed.ts              packages/db/src/feed.ts
git mv apps/web/lib/feed.test.ts         packages/db/src/feed.test.ts
git mv apps/web/lib/queries packages/db/src/queries
```

- [ ] **Step 4: Move `buildRoutePoints`** from `apps/web/lib/points.ts` into `packages/db/src/points-query.ts` (it imports `db`, `sql`, `loadGradeEquivalencies`, and pure helpers from `@whipperbook/core`). Delete the now-empty `apps/web/lib/points.ts`.

- [ ] **Step 5: Move the validators** `resolveSectorTag`, `gradeSystemError`, `INVALID_SECTOR` from `apps/web/lib/forms.ts` into `packages/db/src/validators.ts` (they import `db` + `grade-data` + `grade-conversion`). `apps/web/lib/forms.ts` can now be deleted (schemas live in `@whipperbook/validation`, validators in `@whipperbook/db`).

```bash
git rm apps/web/lib/forms.ts apps/web/lib/points.ts apps/web/lib/api-client.ts apps/web/lib/api/json.ts 2>/dev/null || true
```

- [ ] **Step 6: Create `packages/db/src/index.ts`** exporting the public server surface:

```ts
export { default as db } from "./client";
export type * from "@whipperbook/core";
export * from "./grade-data";
export * from "./credentials";
export * from "./api/tokens";
export * from "./deletion-log";
export * from "./soft-delete";
export * from "./feed-interactions";
export * from "./feed";
export * from "./points-query";
export * from "./validators";
export * as queries from "./queries"; // or re-export each query module
```

- [ ] **Step 7: Rewrite all remaining web server imports** to `@whipperbook/db`. In `apps/web` rewrite these module specifiers (route handlers, pages, sitemap, metadata, scripts):
  - `@/lib/db` (the client/default import) → `@whipperbook/db`
  - `@/lib/queries/*` → `@whipperbook/db` (named `queries.*`) — adjust call sites accordingly, OR keep `queries` as a sub-path export `@whipperbook/db/queries` if you prefer minimal call-site churn
  - `@/lib/grade-data`, `@/lib/credentials`, `@/lib/api/tokens`, `@/lib/deletion-log`, `@/lib/soft-delete`, `@/lib/feed-interactions`, `@/lib/feed` → `@whipperbook/db`
  - `@/lib/forms` validator names (`resolveSectorTag`, `gradeSystemError`, `INVALID_SECTOR`) → `@whipperbook/db`
  - `buildRoutePoints` → `@whipperbook/db`

  Add `"@whipperbook/db": "*"` to web deps + `transpilePackages`.

- [ ] **Step 8: Confirm the bundle boundary.** Grep the three client-safe packages for forbidden deps:

```bash
grep -rnE "from \"(pg|kysely|jose|next|@vercel)" packages/core/src packages/validation/src packages/api-client/src \
  | grep -v "import type" && echo "LEAK FOUND (fix before commit)" || echo "clean"
```
Expected: `clean` (only `import type { Generated, ColumnType } from "kysely"` in core types is allowed — it's type-only and erased).

- [ ] **Step 9: Verify the whole graph.**

Run:
```bash
npm install
npx turbo run type-check test
npm run -w @whipperbook/web build
```
Expected: every workspace's type-check + tests pass; web builds. `tsc` flags any missed rewrite — fix and re-run.

- [ ] **Step 10: Commit.**

```bash
git add -A
git commit -m "refactor: extract @whipperbook/db (server-only client + queries + validators)"
```

---

## Phase 4 — Adopt TanStack Query on the web (hybrid)

Add the `QueryClient` provider, convert reads to RSC-prefetch + `HydrationBoundary`, and move the shared mutation components to `useMutation`. **Checkpoint: web green; loading/error states work.**

### Task 4.1: QueryClient providers + transports

**Files:**
- Create: `apps/web/lib/api/client.ts` (browser + server `ApiClient` factories)
- Create: `apps/web/app/providers.tsx` (client `QueryClientProvider`)
- Create: `apps/web/lib/api/get-query-client.ts` (per-request server client)
- Modify: `apps/web/app/layout.tsx` (wrap children in providers)

- [ ] **Step 1: Build the two transports.** In `apps/web/lib/api/client.ts`:

```ts
import { createApiClient } from "@whipperbook/api-client";
import { headers } from "next/headers";

const base = () => process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";

// Browser: same-origin relative fetch.
export const browserApi = createApiClient((path, init) =>
  fetch(path, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  }),
);

// Server: absolute URL + forwarded cookie (replaces serverFetch).
export async function serverApi() {
  const h = await headers();
  return createApiClient((path, init) =>
    fetch(`${base()}${path}`, {
      method: init.method ?? "GET",
      headers: {
        cookie: h.get("cookie") ?? "",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    }),
  );
}
```

- [ ] **Step 2: Per-request server QueryClient** in `apps/web/lib/api/get-query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  });
}
```

- [ ] **Step 3: Client provider** in `apps/web/app/providers.tsx`:

```tsx
"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { makeQueryClient } from "@/lib/api/get-query-client";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: Wrap the app** — in `apps/web/app/layout.tsx` wrap the existing children with `<Providers>`. Add `@tanstack/react-query` to web deps.
- [ ] **Step 5: Verify build.** Run: `npm install && npm run -w @whipperbook/web build`. Expected: pass.
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(web): add TanStack Query providers + transports"`

### Task 4.2: Convert one read end-to-end (crags list) as the pattern

**Files:**
- Modify: `apps/web/app/crags/page.tsx`
- Create: `apps/web/app/crags/crags-client.tsx`

- [ ] **Step 1: Server prefetch + hydrate** in `apps/web/app/crags/page.tsx`. Replace the `serverFetch<CragsResponse>(...)` call with a prefetch + `HydrationBoundary`:

```tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/get-query-client";
import { serverApi } from "@/lib/api/client";
import { cragsListQuery } from "@whipperbook/api-client";
import CragsClient from "./crags-client";

export default async function CragsPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const sp = await searchParams;
  const qc = makeQueryClient();
  const api = await serverApi();
  await qc.prefetchQuery(cragsListQuery(api, { q: sp.q, country: sp.country, page: sp.page ? Number(sp.page) : undefined }));
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <CragsClient q={sp.q} country={sp.country} page={sp.page ? Number(sp.page) : undefined} />
    </HydrationBoundary>
  );
}
```

- [ ] **Step 2: Client component** `apps/web/app/crags/crags-client.tsx` that reads via `useQuery` and renders loading/error:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { cragsListQuery } from "@whipperbook/api-client";
import { browserApi } from "@/lib/api/client";
// import the existing crags list markup/components and render `data`

export default function CragsClient(props: { q?: string; country?: string; page?: number }) {
  const { data, isPending, isError, error } = useQuery(cragsListQuery(browserApi, props));
  if (isPending) return <CragsListSkeleton />;          // simple skeleton component
  if (isError) return <p role="alert" className="text-red-600">{(error as Error).message}</p>;
  return <CragsList data={data} />;                      // existing markup, moved here
}
```

(Move the current page's JSX into `CragsList`/`CragsListSkeleton` presentational components under `apps/web/app/crags/`.)

- [ ] **Step 3: Add a route-level `loading.tsx`** at `apps/web/app/crags/loading.tsx` for the initial server work:

```tsx
export default function Loading() { return <CragsListSkeleton />; }
```

- [ ] **Step 4: Verify visually + build.** Run `npm run -w @whipperbook/web dev`, load `/crags` (data present on first paint, no flash), then `npm run -w @whipperbook/web build`. Expected: SSR data present; client navigation shows the skeleton.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat(web): crags list via hybrid TanStack Query + loading state"`

### Task 4.3: Mutations via `useMutation`

**Files:**
- Modify: `apps/web/app/ui/api-form.tsx`, `action-button.tsx`, `delete-button.tsx`

- [ ] **Step 1: Convert `ApiForm`** to `useMutation`: on submit, `mutate` the body through `browserApi.send(endpoint, method, body)`; on success follow `redirect`/`redirectTo` else `queryClient.invalidateQueries()` (scoped to the affected keys, e.g. `cragsKeys.all`); expose `isPending` (disable submit) and render `error` from the mutation. Keep the existing inline-error UX from PR #5.
- [ ] **Step 2: Convert `ActionButton` + `DeleteButton`** the same way (`useMutation`, `isPending` disables the button, error rendered inline, `invalidateQueries` on success instead of `router.refresh()`).
- [ ] **Step 3: Verify** a mutation round-trip in `dev` (e.g. retire gear, delete a comment): pending disables the control, the list updates via invalidation, errors show inline. Then `npm run -w @whipperbook/web build`.
- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat(web): mutations via useMutation + query invalidation"`

> Repeat Task 4.2's pattern for the remaining reads (home, gear, forum, feed, profile, leaderboards, user/route/sector detail) as follow-up tasks of the same shape. Each: add a `queryOptions` factory in `@whipperbook/api-client`, prefetch+hydrate in the page, `useQuery` in a client child, `loading.tsx`. Track them as a checklist; they don't block Phase 5+.

---

## Phase 5 — Vercel deployment config

**Files:** Vercel project settings (dashboard) + a small `vercel.json` if desired.

- [ ] **Step 1: Set Root Directory** to `apps/web` in the Vercel project settings; keep "Include files outside the Root Directory" ON.
- [ ] **Step 2: Confirm `transpilePackages`** in `apps/web/next.config.ts` lists all four packages: `["@whipperbook/core","@whipperbook/validation","@whipperbook/api-client","@whipperbook/db"]`.
- [ ] **Step 3 (optional): Ignored Build Step** = `npx turbo-ignore` in project settings; enable Turborepo Remote Caching.
- [ ] **Step 4: Verify** by pushing the branch and opening a Vercel Preview Deployment; confirm it installs at the repo root, builds `apps/web`, runs migrations, and serves. Expected: green preview.
- [ ] **Step 5 (if `vercel.json` used): Commit** it. `git add apps/web/vercel.json && git commit -m "chore: vercel monorepo config"`

---

## Phase 6 — Expo mobile app (`apps/mobile`)

Scaffold the Expo app and build the proof slice (login + register + crags list + crag detail) against the API using the shared packages. **Checkpoint: `expo start` runs the slice.**

### Task 6.1: Scaffold + Metro monorepo config

**Files:** `apps/mobile/package.json`, `app.json`, `metro.config.js`, `babel.config.js`, `tsconfig.json`, `.npmrc` (root, if needed)

- [ ] **Step 1: Create the Expo app** under `apps/mobile`:

```bash
cd apps && npx create-expo-app@latest mobile --template default && cd ..
```

Rename its package to `@whipperbook/mobile` and add deps: `@tanstack/react-query`, `nativewind`, `tailwindcss`, `expo-secure-store`, `expo-router`, and the workspace packages `@whipperbook/core`, `@whipperbook/validation`, `@whipperbook/api-client` (NOT `@whipperbook/db`).

- [ ] **Step 2: Metro monorepo config** at `apps/mobile/metro.config.js` per Expo's guide:

```js
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
module.exports = config;
```

- [ ] **Step 3: Add a root `.npmrc`** if hoisting causes duplicate React/native module errors during `expo start`: `node-linker=hoisted` is the npm default, so usually none is needed — add only if a duplicate-React or unresolved-module error appears.
- [ ] **Step 4: tsconfig** extends base + Expo's: `{ "extends": "expo/tsconfig.base", ... }` with `compilerOptions.paths` empty (workspace packages resolve via node_modules symlinks). Add `EXPO_PUBLIC_API_URL` to `apps/mobile/.env` (dev) and `app.json` `extra`.
- [ ] **Step 5: Verify it boots.** Run `cd apps/mobile && npx expo start` and load it (simulator or Expo Go). Expected: the default template renders. Then verify a shared import compiles: add `import { gradePoints } from "@whipperbook/core";` to a screen and confirm Metro bundles it.
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(mobile): scaffold Expo app with monorepo Metro config"`

### Task 6.2: NativeWind + QueryClient + auth token provider

**Files:** `apps/mobile/tailwind.config.js`, `global.css`, `babel.config.js`, `app/_layout.tsx`, `lib/auth.ts`, `lib/api.ts`

- [ ] **Step 1: Configure NativeWind** (v4) per its Expo setup: `tailwind.config.js` `content` globs over `app/**` and `components/**`; add the `nativewind/babel` preset to `babel.config.js`; import `global.css` in the root layout; add `nativewind-env.d.ts`.
- [ ] **Step 2: Secure token storage + auth client** in `apps/mobile/lib/auth.ts`:

```ts
import * as SecureStore from "expo-secure-store";
const ACCESS = "wb.access", REFRESH = "wb.refresh";
export const tokens = {
  get: () => SecureStore.getItemAsync(ACCESS),
  getRefresh: () => SecureStore.getItemAsync(REFRESH),
  set: async (a: string, r: string) => { await SecureStore.setItemAsync(ACCESS, a); await SecureStore.setItemAsync(REFRESH, r); },
  clear: async () => { await SecureStore.deleteItemAsync(ACCESS); await SecureStore.deleteItemAsync(REFRESH); },
};
```

- [ ] **Step 3: Bearer transport with refresh-on-401** in `apps/mobile/lib/api.ts`:

```ts
import { createApiClient } from "@whipperbook/api-client";
import { tokens } from "./auth";
import Constants from "expo-constants";

const base = Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL!;

async function rawFetch(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal }, access: string | null) {
  return fetch(`${base}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  });
}

export const api = createApiClient(async (path, init) => {
  let access = await tokens.get();
  let res = await rawFetch(path, init, access);
  if (res.status === 401) {
    const refresh = await tokens.getRefresh();
    if (refresh) {
      const r = await fetch(`${base}/api/auth/token/refresh`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (r.ok) {
        const { accessToken, refreshToken } = await r.json();
        await tokens.set(accessToken, refreshToken);
        res = await rawFetch(path, init, accessToken);
      } else { await tokens.clear(); }
    }
  }
  return res;
});
```

- [ ] **Step 4: Root layout** `apps/mobile/app/_layout.tsx` wraps the app in `QueryClientProvider` (a mobile `makeQueryClient`) + expo-router `<Stack>`, imports `global.css`.
- [ ] **Step 5: Verify** `npx expo start` boots with the providers and a NativeWind-styled placeholder screen renders. 
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(mobile): NativeWind + QueryClient + secure-store auth transport"`

### Task 6.3: Auth screens (login + register)

**Files:** `apps/mobile/app/(auth)/login.tsx`, `register.tsx`

- [ ] **Step 1: Login screen** — a form validated client-side, posting to `/api/auth/token`; on success store tokens and route to the crags tab:

```tsx
"use client";
import { useState } from "react";
import { View, TextInput, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../lib/api";
import { tokens } from "../../lib/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function submit() {
    setError(null); setBusy(true);
    try {
      const r = await api.send<{ accessToken: string; refreshToken: string }>("/api/auth/token", "POST", { email, password });
      await tokens.set(r.accessToken, r.refreshToken);
      router.replace("/(tabs)/crags");
    } catch (e) { setError(e instanceof Error ? e.message : "Login failed."); }
    finally { setBusy(false); }
  }
  return (
    <View className="flex-1 justify-center gap-3 p-6">
      <TextInput className="rounded border border-zinc-300 p-3" placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput className="rounded border border-zinc-300 p-3" placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error && <Text className="text-red-600">{error}</Text>}
      <Pressable disabled={busy} onPress={submit} className="rounded bg-zinc-900 p-3"><Text className="text-center text-white">{busy ? "…" : "Sign in"}</Text></Pressable>
    </View>
  );
}
```

- [ ] **Step 2: Register screen** — validate with `@whipperbook/validation` client-side, POST `/api/auth/register`, then show "check your email" (server requires verification). Reuse the same form pattern.
- [ ] **Step 3: Verify** against a locally-running web API (`EXPO_PUBLIC_API_URL` → your dev tunnel/LAN URL): logging in with a verified account stores tokens and navigates; bad credentials show the inline error.
- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat(mobile): login + register screens"`

### Task 6.4: Crags list + detail (the read slice)

**Files:** `apps/mobile/app/(tabs)/crags/index.tsx`, `[id].tsx`

- [ ] **Step 1: Crags list** using the shared query + mobile `api`:

```tsx
"use client";
import { FlatList, Text, View, ActivityIndicator, Pressable } from "react-native";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { cragsListQuery } from "@whipperbook/api-client";
import { api } from "../../../lib/api";

type CragsResponse = { crags: { id: number; name: string; area: string | null }[] };

export default function Crags() {
  const { data, isPending, isError, error } = useQuery(cragsListQuery<CragsResponse>(api));
  if (isPending) return <ActivityIndicator className="mt-10" />;
  if (isError) return <Text className="m-6 text-red-600">{(error as Error).message}</Text>;
  return (
    <FlatList
      data={data.crags}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item }) => (
        <Link href={`/(tabs)/crags/${item.id}`} asChild>
          <Pressable className="border-b border-zinc-200 p-4">
            <Text className="text-base font-medium">{item.name}</Text>
            {item.area && <Text className="text-zinc-500">{item.area}</Text>}
          </Pressable>
        </Link>
      )}
    />
  );
}
```

- [ ] **Step 2: Crag detail** screen using `cragDetailQuery` keyed on the route param, rendering name + a routes list, with `ActivityIndicator` loading + inline error.
- [ ] **Step 3: Verify** end-to-end: signed in, the crags list loads from the API, tapping a crag opens detail. This proves shared types + query layer + auth transport.
- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat(mobile): crags list + detail via shared query layer"`

---

## Phase 7 — CI + EAS

**Files:** `.github/workflows/ci.yml`, `apps/mobile/eas.json`

- [ ] **Step 1: CI workflow** at `.github/workflows/ci.yml` running the Turbo graph on PRs:

```yaml
name: CI
on: { pull_request: {}, push: { branches: [main] } }
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx turbo run lint type-check test
```

(Leave `build` out of CI if it requires DB access via the migrate step; Vercel covers the web build. Optionally add a `build` job with a Postgres service container later.)

- [ ] **Step 2: Verify** the workflow passes on a draft PR.
- [ ] **Step 3: EAS config** at `apps/mobile/eas.json` with `development`/`preview`/`production` profiles (standard `eas build:configure` output). Run `cd apps/mobile && npx eas build:configure`. (Actual store builds are out of scope here.)
- [ ] **Step 4: Commit.** `git add -A && git commit -m "ci: turbo workflow + eas config"`

---

## Self-review notes (against the spec)

- **Spec coverage:** workspace+Turbo (Phase 1), web move (Phase 2), all four packages incl. the `db.ts`/`forms.ts`/`points.ts`/`grade-data` splits (Phase 3), web hybrid TanStack Query + loading + mutations (Phase 4), Vercel Root Directory + `transpilePackages` (Phase 5), Expo app + Metro config + secure-store auth + NativeWind + TanStack Query + the login/register/crags slice (Phase 6), CI + EAS (Phase 7). All spec sections map to tasks.
- **Boundary guard:** Task 3.4 Step 8 greps the client-safe packages for `pg`/`kysely`/`jose`/`next`/`@vercel` (allowing only the type-only `kysely` import in core types) — enforces the spec's hard rule.
- **Corrected boundaries:** `grade-data.ts` and `buildRoutePoints` go to `@whipperbook/db` (they use `db`/`sql`/React `cache`), not `core` — matches the corrected spec.
- **Naming consistency:** `createApiClient`/`ApiClient`/`browserApi`/`serverApi`/`makeQueryClient`/`cragsListQuery`/`cragDetailQuery`/`tokens`/`api` are used consistently across web (Phase 4) and mobile (Phase 6).

## Notes / risks (carried from the spec)

- Run the `sed` rewrites with the macOS `sed -i ''` form; Linux uses `sed -i`. After every rewrite, `tsc` is the safety net for missed paths.
- The web `build` includes `kysely migrate:latest`; CI omits `build` unless a Postgres service is wired. Vercel runs it with `DATABASE_URL`.
- Metro + npm hoisting is the likeliest source of mobile friction — verify the shared-import bundle early (Task 6.1 Step 5) before building screens.
- Per-request server `QueryClient` (never shared); `staleTime: 30s` so hydrated data isn't instantly refetched.
