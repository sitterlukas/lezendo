# Monorepo + Expo mobile app — design

**Date:** 2026-06-17
**Status:** Approved design, pending implementation plan
**Author:** Lukas Sitter (with Claude Code)

## Goal

Bring a mobile app into the existing Whipperbook repository as a Turborepo
monorepo, maximizing code shared between the Next.js web app and the new mobile
app. The mobile app consumes the REST API that already exists (the token-auth
endpoints were built for exactly this).

## Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Mobile stack | **Expo** (managed React Native) + TypeScript + expo-router |
| Sharing ambition | **Maximize** — extract shared types, zod validation, pure domain logic, and a typed API client |
| Package manager | **npm workspaces** (keep existing `package-lock.json`) |
| Orchestration | **Turborepo** |
| Restructure approach | **Option A** — full restructure in one effort, sequenced so the tree is green at each checkpoint |
| Data layer (both apps) | **TanStack Query** — web uses the **hybrid** RSC-prefetch + hydrate pattern (keeps SSR/SEO); mobile uses plain `useQuery`. Shared query definitions. |
| Mobile styling | **NativeWind** (Tailwind for RN, mirrors web tokens) |
| Initial mobile slice | login + register + crags list + crag detail (proof of shared contract, not feature parity) |

## Target layout

```
lezendo/
├─ apps/
│  ├─ web/                 # current Next.js 16 app, moved wholesale
│  └─ mobile/              # new Expo app
├─ packages/
│  ├─ core/                # @whipperbook/core       — pure logic + row/enum types + constants
│  ├─ validation/          # @whipperbook/validation — pure zod schemas
│  ├─ api-client/          # @whipperbook/api-client — typed client + reviveDates + token provider
│  └─ db/                  # @whipperbook/db         — server-only kysely client + DB validators
├─ package.json            # private workspace root: { "workspaces": ["apps/*","packages/*"] }
├─ turbo.json
├─ tsconfig.base.json      # shared compiler options; every package/app extends it
└─ .npmrc                  # only if needed for Expo/Metro hoisting
```

### Conventions

- Internal packages use the `@whipperbook/*` scope, consumed via the workspace
  protocol (`"@whipperbook/core": "*"`).
- Internal packages are consumed **directly from TypeScript source** (no
  pre-build step). This keeps Turbo's graph simple for a small team; the cost is
  that consumers must transpile the sources (handled per-consumer below).
- The root `package.json` is private and holds only workspace + shared dev-tool
  config. Each app/package owns its own dependencies and scripts.

## Package boundaries

**Dependency direction (strict):** `apps/*` → `packages/*`; among packages,
`validation` / `api-client` / `db` → `core` only.

**Hard rule:** `core`, `validation`, and `api-client` must never import `pg`,
`kysely`, `jose`, `next`, or `@vercel/*`, so Metro can bundle them for mobile.
`db` is the only server-only package.

| Package | Contents (moved from today's `lib/`) | Splits required |
|---|---|---|
| **core** | `grade-conversion`, `leaderboard`, `route-stats`, `time-ago`, `constants`; **all DB row/enum types** extracted from `lib/db.ts` (`Database`, `ClimbStyle`, `TickType`, `FeedTargetType`, `LikeTargetType`, table interfaces); the **pure** scoring parts of `points.ts` (`POINTS_BASE`, `POINTS_GROWTH`, `POINTS_EXPLAINER`, `gradePoints`) | `points.ts` splits: pure scoring → `core`; `buildRoutePoints` (it queries the DB via `sql`) → `db`. `grade-data.ts` (uses `db` + React `cache`) and `site.ts` (web SEO) are **not** in `core` — see below |
| **validation** | the pure zod schemas + field helpers + enums from `lib/forms.ts` (`cragWriteSchema`, `routeWriteSchema`, `nullableText`, `requiredInt`, etc.) | the DB-touching validators `resolveSectorTag` and `gradeSystemError` move to `db` (they query Postgres) |
| **api-client** | `lib/api-client.ts` (`apiFetch`, `ApiError`) + `reviveDates` (from `lib/api/json.ts`) + shared request/response types, refactored to take a **transport/credential provider** so web-server forwards cookies, web-client uses same-origin fetch, and mobile uses a stored Bearer token. Also exports platform-agnostic **TanStack Query `queryOptions`** (query keys + query functions) consumed by both apps. Depends on `@tanstack/react-query` (a platform-agnostic React lib). | `serverFetch` and the server cookie-forwarding transport stay web-only (they use `next/headers`); they're injected into the shared client, not imported by it |
| **db** | the kysely client (bottom of `lib/db.ts`), `lib/grade-data.ts` (`loadGradeEquivalencies`), the `buildRoutePoints` query from `points.ts`, `lib/api/tokens.ts`, `lib/credentials.ts`, the server validators, `lib/queries/*`, `lib/feed.ts`, `lib/deletion-log.ts`, `lib/soft-delete.ts`, `lib/feed-interactions.ts` | consumed only by `apps/web` server code |

`migrations/` and `kysely.config.ts` stay in **`apps/web`** (operationally tied
to the web deploy/build), not in `packages/db`. `lib/site.ts` (SEO origin) stays
in `apps/web` since only the web needs it.

## Web app migration (`apps/web`)

**Moves into `apps/web`:** `app/`, `auth.ts`, `proxy.ts`, `public/`, `types/`,
`test/`, `scripts/`, `next.config.ts`, `postcss.config.mjs`, `next-env.d.ts`,
`kysely.config.ts`, `migrations/`, both `vitest.config.ts` files, and the
**web-only slice of `lib/`**: the Next-dependent HTTP-layer helpers
`lib/api/respond.ts`, `lib/api/server-fetch.ts`, `lib/api/auth.ts`,
`lib/api/rate-limit.ts`.

**Path alias:** every app/package gets its own `tsconfig` extending
`tsconfig.base.json`. `apps/web` keeps `@/* → ./*` (now resolving to
`apps/web/*`), so most web imports — `@/app/...`, `@/lib/api/respond`, components
under `@/app/ui/...` — **don't change**. Only imports of modules that moved into
packages get rewritten:

- `grade-conversion`, `points`, `leaderboard`, `route-stats`, `time-ago`,
  `constants`, and the type imports from `db.ts` → `@whipperbook/core`
- `forms` (schemas) → `@whipperbook/validation`
- `api-client`, `api/json` → `@whipperbook/api-client`
- `db` (client), `queries/*`, `feed`, `credentials`, `api/tokens`,
  `deletion-log`, `soft-delete`, `feed-interactions`, and the server validators
  → `@whipperbook/db`

These rewrites are mechanical (known old-path → new-package per module) and
`tsc` flags any miss.

**Config updates:** `next.config.ts` gains
`transpilePackages: ["@whipperbook/core", "@whipperbook/validation", "@whipperbook/api-client", "@whipperbook/db"]`;
`tsconfig` extends base + keeps `@/`; `kysely.config.ts` migration glob stays
relative to `apps/web`; the `vitest` configs get their root/alias adjusted;
`package.json` carries only web deps + scripts plus the `@whipperbook/*`
workspace deps.

**ESLint / Prettier:** lifted to the root as shared flat config that all
workspaces extend, with per-app overrides only where needed (e.g. the Expo/RN
plugin for mobile).

### Web data fetching & loading states (TanStack Query, hybrid)

The web keeps server rendering but adopts TanStack Query so it shares the query
layer with mobile and gets first-class loading/error/refetch states.

- **Shared query definitions:** `@whipperbook/api-client` exports TanStack Query
  `queryOptions` (typed `queryKey` + `queryFn`) per read endpoint. The `queryFn`
  calls the injected transport, so the same definition runs on the web server
  (cookie-forwarding fetch), in the web browser (same-origin fetch), and on
  mobile (Bearer token).
- **Reads (hybrid RSC prefetch + hydrate):** a `QueryClient` provider lives in
  the web root layout (client component). Server Components `prefetchQuery(...)`
  the relevant `queryOptions` and wrap their subtree in
  `<HydrationBoundary state={dehydrate(queryClient)}>`; client components then
  `useQuery(sameQueryOptions)` and receive the server-fetched data immediately
  (no blank-then-spinner on first paint, SSR/SEO preserved). A fresh
  `QueryClient` is created per request on the server.
- **Loading states:** route-level `loading.tsx` (Suspense) covers initial server
  work; client components surface `isPending`/`isError` from `useQuery` for
  client-side navigations and refetches.
- **Mutations:** the shared form/action components (`ApiForm`, `ActionButton`,
  `DeleteButton`) move from `router.refresh()` to `useMutation`, exposing pending
  + error state and calling `queryClient.invalidateQueries(...)` on success. This
  replaces the manual refresh with cache-driven updates and gives consistent
  pending UX (disabled buttons / spinners) across the app. (The inline error
  handling added in PR #5 is preserved.)

Mobile consumes the same `queryOptions` with plain `useQuery`/`useMutation`.

## Mobile app (`apps/mobile`)

- **Framework:** Expo (managed) + TypeScript + **expo-router** (file-based
  routing). `babel-preset-expo`, plus a `metro.config.js` configured for the
  workspace per Expo's monorepo guide (`watchFolders` = repo root so the
  `@whipperbook/*` TS packages resolve and transpile). This Metro config is the
  one piece that needs care; it is well-trodden with npm workspaces.
- **Auth:** mobile uses the token endpoints — `POST /api/auth/token` (login),
  `/api/auth/token/refresh`, `/api/auth/token/revoke` (logout). Tokens are stored
  in **`expo-secure-store`** (Keychain/Keystore), never AsyncStorage. The shared
  `@whipperbook/api-client` is parameterized by a token provider; mobile supplies
  one that injects the `Bearer` header and, on a 401, transparently runs
  refresh-then-retry once. API base URL comes from `EXPO_PUBLIC_API_URL`.
- **Data layer:** **TanStack Query** over the shared `queryOptions` from
  `@whipperbook/api-client` (same definitions the web uses), with a mobile
  `QueryClient` provider at the app root.
- **Styling:** **NativeWind** (Tailwind for RN), mirroring the web Tailwind
  tokens.
- **Shared code in action:** mobile forms validate with the same
  `@whipperbook/validation` schemas client-side; lists render grades via
  `@whipperbook/core`, all typed by the shared row types. The server stays the
  source of truth.
- **Initial scope (thin proof slice, not parity):** login + register, crags
  list, crag detail — all against the real REST API through the shared client.
  The rest of the app is future work in its own specs.
- **Deployment:** EAS Build (`eas.json`) for store/dev builds — separate from
  Vercel.

## Deployment (Vercel)

The web app deploys on Vercel exactly as today, with these monorepo settings:

- **Root Directory → `apps/web`** in the Vercel project settings.
- **"Include files outside the Root Directory" ON** (default) so Vercel installs
  at the repo root and the `@whipperbook/*` workspace packages resolve.
- **`transpilePackages`** in `apps/web/next.config.ts` (above) is mandatory
  because packages are consumed as TS source; without it the build fails to
  compile them.
- **Build command:** Vercel's auto Next build works; optionally
  `turbo run build --filter=web...` for Turbo caching. Install command stays the
  default (npm workspaces auto-detected).
- **Ignored Build Step (optional):** `npx turbo-ignore` so mobile-only commits
  don't redeploy web; enable Turborepo Remote Caching.
- **Migrations:** the existing `kysely migrate:latest && next build` moves with
  web into `apps/web` and is unchanged, provided `DATABASE_URL` stays in the
  Vercel env (it does). Decoupling migrations from build is a possible later
  follow-up, out of scope here.
- **`AUTH_URL` / `NEXTAUTH_URL`** must stay set to the deployed domain (the
  hardened `serverFetch` now relies on it too).

The mobile app is never built by Vercel.

## Testing

Tests move with their code:

- `packages/core`: existing `grade-conversion`, `points`, `leaderboard`,
  `route-stats`, `time-ago` vitest tests. `packages/api-client`: the `json` /
  `reviveDates` test. `packages/db`: the `tokens` test. `packages/validation`:
  add a few schema tests (good ROI now that validation is centralized).
- `apps/web`: keeps its vitest **unit** + **integration** suites (integration
  still needs a DB).
- `apps/mobile`: type-check only initially; `jest-expo` component tests deferred
  to a later spec (YAGNI).
- `turbo run test` fans out across all workspaces with caching.

## Turbo pipelines (`turbo.json`)

- `dev` — persistent, uncached; runs web + mobile.
- `lint`, `type-check`, `test` — cached, fan out across workspaces.
- `build` — web's `next build` with `.next` as a cache output; internal packages
  are source-consumed, so their "build" reduces to `type-check`.

## CI

A GitHub Actions workflow on PRs running
`turbo run lint type-check test build` with remote caching. Vercel continues to
own web deploys; EAS owns mobile builds (triggered separately). Kept minimal.

## Execution order

Option A is a single effort, sequenced so the tree is green at each checkpoint:

1. **Workspace scaffold** — root `package.json` (workspaces), `turbo.json`,
   `tsconfig.base.json`, root ESLint/Prettier.
2. **Move web → `apps/web`**; fix configs. *Checkpoint: web builds + all tests
   green* (imports still internal).
3. **Extract packages** `core` → `validation` → `api-client` → `db`; rewrite the
   moved-module import paths; split `db.ts` / `forms.ts` / `points.ts`. Add the
   shared TanStack Query `queryOptions` to `api-client`. *Checkpoint: web green
   again.*
4. **Adopt TanStack Query on web** — add the `QueryClient` provider + per-request
   server client; convert reads to the hybrid RSC-prefetch + `HydrationBoundary`
   pattern; move the shared form/action components to `useMutation` +
   `invalidateQueries`; add `loading.tsx` where useful. *Checkpoint: web builds +
   tests green, loading/error states verified.*
5. **Vercel** — set Root Directory `apps/web` + `transpilePackages`.
   *Checkpoint: preview deploy works.*
6. **Scaffold `apps/mobile`** (Expo + expo-router + NativeWind + TanStack Query +
   secure-store + shared `queryOptions` + api-client provider); build login +
   register + crags-list + crag-detail. *Checkpoint: `expo start` runs the slice
   against the API.*
7. **CI workflow + `eas.json`.**

## Risks & mitigations

- **Metro monorepo resolution + npm hoisting** — may need `.npmrc` and/or Metro
  `nodeModulesPaths`/`watchFolders`. Follow Expo's monorepo guide; verify early
  with the crags slice.
- **`transpilePackages` requirement** — easy to forget; without it Vercel/web
  builds fail. Listed explicitly above.
- **Import-rewrite breadth** — mitigated by deterministic per-module mapping and
  `tsc` catching misses.
- **NativeWind v4 + Tailwind config in RN** — verify the Tailwind/PostCSS setup
  works under Metro before building screens.
- **Migrations-at-build on Vercel** — unchanged behavior, but flagged; revisit
  separately if desired.
- **TanStack Query hybrid on web** — create a fresh `QueryClient` per request on
  the server (never share across requests); set a small default `staleTime` so
  hydrated data isn't immediately refetched on the client; ensure the
  server-side `queryFn` transport forwards cookies (injected from `apps/web`,
  not imported into the shared package). The web mutation rework (router.refresh
  → `useMutation` + `invalidateQueries`) touches the shared form/action
  components — verify each call site's invalidation keys.

## Out of scope

- Full mobile feature parity (only the proof slice is built now).
- Decoupling migrations from the Vercel build.
- `jest-expo` mobile component testing.
- Any change to the REST API surface (the migration hardening lives in its own
  PR, #5).

## Prerequisite

This restructure should land **after** the REST API hardening PR (#5) merges, so
the package extraction starts from the hardened, zod-based route handlers and
the split-friendly `forms.ts`.
