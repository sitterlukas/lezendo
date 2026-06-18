# Mobile: menu icons, dark mode, and add-content flows

Date: 2026-06-18
Status: Approved design — ready for implementation plan

## Context

The Whipperbook mobile app (`apps/mobile`, Expo Router + React Native + NativeWind
+ TanStack Query) is currently read-mostly: you can browse crags → sectors →
routes and log ascents, but you can't create crags/sectors/routes, leave reviews,
or comment. Three gaps were reported:

1. **Menu items** — the Feed and Profile tabs render with no icon and path-style
   labels (`feed/index`, `profile/index`); only Crags is correct.
2. **Dark mode** — the app is fully themed with `dark:` classes but does not
   actually follow the system appearance (verified: simulator in dark → app stayed
   light), and there is no in-app control.
3. **Add content** — no way to add crags, sectors, routes, reviews, or comments
   from the app.

### Scope correction discovered during design

The original ask included "use the REST API endpoints on the web too, not server
actions, and migrate all mutation actions." Investigation showed **the web app
already has zero server actions** — there are no `"use server"` files and no
`app/actions/` directory. Web mutations already go through the REST API
(`app/ui/api-form.tsx` `ApiForm`, `lib/api-client.ts` `apiFetch`,
`lib/api/client.ts` `browserApi`) against `app/api/<segment>/route.ts` handlers.
The migration is already complete; the only stale artifact was the AGENTS.md
description, which has been corrected. **No web mutation migration is in scope.**

Similarly, the route grade picker does **not** need a new endpoint: `getMe()`
(packages db) already returns `gradingSystems` + `gradeEquivalencies`, served by
`GET /api/me`, which mobile already queries.

So this work is **mobile-only** — zero web code changes. (An earlier draft
planned a `GET /api/comments` to read threads, but `buildFeed`/`attachComments`
(`packages/db/src/feed.ts`) already attaches the **full** comment list to every
feed item, so `GET /api/feed/page` — which mobile already queries — returns
complete threads. The feed-item detail screen reads comments from that cached
data and refreshes by invalidating the feed query after posting.)

## Goals

- All three tabs (Feed, Crags, Profile) show correct icons and clean titles.
- Dark mode follows the system by default and is overridable in-app
  (System / Light / Dark), persisted across launches.
- Users can create crags, sectors, and routes; leave a star review on a
  crag/sector/route; and comment on a feed item — all via existing REST endpoints.

## Non-goals

- No web mutation migration (already done).
- No editing/deleting of content from mobile (create-only this pass).
- No image upload or map location picker on mobile create flows (web's two-step
  enrichment is out of scope; mobile creates the entity and navigates to it).
- No forum topics/posts on mobile.

## Architecture & conventions to follow

All taken from existing mobile patterns:

- **Mutations:** `useMutation({ mutationFn: (body) => api.send(path, "POST", body), onSuccess })`
  then `queryClient.invalidateQueries({ queryKey })` and navigate back — mirrors the
  log-ascent mutation in `app/(tabs)/crags/route/[routeId].tsx`.
- **Queries:** `useQuery(<entity>Query<T>(api, ...))` from `@whipperbook/api-client`.
- **Validation:** client-side `safeParse` with the shared Zod schema from
  `@whipperbook/validation`, surfacing `issues[0].message`; the API handler remains
  the source of truth.
- **Errors:** `error instanceof ApiError ? error.message : fallback`.
- **Styling:** RN primitives + Tailwind `dark:` classes; reuse a shared
  `inputClass` token.

## Shared foundation (new, small)

The mobile app has no form components today — every form hand-rolls
`TextInput` + `useState`. Since we add 4 create forms, extract a tiny reusable set:

- `lib/styles.ts` — export `inputClass` (the string currently duplicated in
  `login.tsx`/`register.tsx`), mirroring web's `app/ui/style.ts`.
- `components/form.tsx`:
  - `Field` — labeled `TextInput` wrapper (label + input + optional error),
    using `inputClass`.
  - `Button` — primary/secondary `Pressable` with a busy/`ActivityIndicator`
    state (extracted from the login button).
  - `SegmentedPicker` — horizontal pill selector for small enums (climb style,
    review rating, theme mode). One selected at a time.

Keep each component single-purpose and dark-mode aware.

## Feature 1 — Tab bar icons & labels

**Root cause:** `feed/` and `profile/` contain only `index.tsx` with no
`_layout.tsx`, so Expo Router registers them as routes `feed/index` /
`profile/index`, which don't match `<Tabs.Screen name="feed">` — so they fall back
to a default tab (no icon, raw segment label). `crags/` works only because its
`_layout.tsx` collapses it to a single `crags` route.

**Fix:** add `app/(tabs)/feed/_layout.tsx` and `app/(tabs)/profile/_layout.tsx`,
each a `Stack` (mirroring `crags/_layout.tsx`), registering their `index` screen
and — for feed — the new feed-item detail screen. With a layout present, the
routes become `feed` / `profile`, matching the existing `Tabs.Screen`
declarations, so the Ionicons (`newspaper-outline`, `person-outline`) and titles
render and `/index` disappears. `app/(tabs)/_layout.tsx` keeps `headerShown:false`
on those tabs (each stack manages its own header), matching crags.

## Feature 2 — Dark mode (system default + toggle)

- `lib/theme.ts`:
  - `ThemeMode = "system" | "light" | "dark"`.
  - `loadThemeMode()` / `saveThemeMode(mode)` — persist via the same storage the
    tokens use (`expo-secure-store` native, `localStorage` web fallback; reuse the
    `lib/auth.ts` pattern, keyed e.g. `theme_mode`).
  - `applyThemeMode(mode)` — call NativeWind's `colorScheme.set(mode)` (NativeWind
    accepts `"system"`).
- `app/_layout.tsx` — on mount, read the persisted mode (default `"system"`) and
  `applyThemeMode`. This explicit call also fixes the current "stuck light" bug:
  NativeWind only follows the OS once told to use `system`. Keep `StatusBar
  style="auto"`.
- Profile screen — a `SegmentedPicker` (System / Light / Dark) that calls
  `saveThemeMode` + `applyThemeMode`.

**Verification gate:** flip the simulator appearance with `xcrun simctl ui booted
appearance dark|light` and confirm the app follows when mode is System, and that
Light/Dark override regardless of OS.

## Feature 3 — Add content

Each create form is a **screen presented as a modal** within the relevant stack
(`Stack.Screen options={{ presentation: "modal" }}`), with a Cancel/Save header.
Validate with the shared Zod schema, POST via `api.send`, invalidate the relevant
query, then `router.back()`.

| Entity  | New screen                              | Entry point                                   | Endpoint            | Schema (`@whipperbook/validation`) |
|---------|-----------------------------------------|-----------------------------------------------|---------------------|------------------------------------|
| Crag    | `crags/new.tsx`                         | header "+" on `crags/index`                   | `POST /api/crags`   | `cragWriteSchema`                  |
| Sector  | `crags/sector/new.tsx`                  | "Add sector" on `crags/[id]`                  | `POST /api/sectors` | `sectorCreateSchema`               |
| Route   | `crags/route/new.tsx`                   | "Add route" on `crags/[id]` and `sector/[id]` | `POST /api/routes`  | `routeWriteSchema`                 |
| Review  | inline section on crag/sector/route detail | the detail screens                         | `POST /api/reviews` | `entityReviewCreateSchema`         |
| Comment | `feed/[kind]/[id].tsx` (feed-item detail) | tapping a feed row                          | `POST /api/comments`| `commentCreateSchema`              |

Field sets (required unless noted; mirror web's field components):

- **Crag** — `name` (required); `area`, `country`, `description` (optional). The
  extra optional fields (`rock_type`, `aspect`, `best_season`, `access_notes`) are
  out of scope this pass. Register the new screen in `crags/_layout.tsx`. Invalidate
  the crags list query. (409 on duplicate name → show the API message.)
- **Sector** — `name` (required); `description`, `approach_minutes` (numeric),
  `aspect` (optional). `crag_id` comes from the route param (prefilled, not shown).
  Invalidate the crag detail query.
- **Route** — `name`, `style` (SegmentedPicker: sport/trad/boulder), grading system
  + `grade`. Grade picker reuses `gradesForSystem()` from `@whipperbook/core` with
  `gradingSystems` + `gradeEquivalencies` read from the `/api/me` query (extend the
  mobile `me` query's typed shape to surface them; the endpoint already returns
  them). Optional `description`. `crag_id` (and `sector_id` when launched from a
  sector) from route params. The server validates the grade/system/style combo and
  returns 400 on mismatch — do not reimplement that check. Invalidate the relevant
  crag/sector detail query.
- **Review** — an inline "Your review" section on each detail screen: a
  `SegmentedPicker`/stars 1–5 + optional text, POSTing `entity_type` (`crag` |
  `sector` | `route`) + `entity_id`. Upsert (one per user) — server-handled. After
  success, invalidate that detail query so the review list refreshes.
- **Comment** — see Feature 4.

## Feature 4 — Feed-item detail & comments

Feed items target `status` or `activity`. Comments attach to those.

- New screen `app/(tabs)/feed/[kind]/[id].tsx`, reached by tapping a feed row
  (`feed/index.tsx` rows become `Link`s passing the item's `kind` + `id`).
- **Read (no new endpoint):** the screen reads the item — including its full
  `comments` array and `commentCount` — from the already-cached `/api/feed/page`
  query (`feedPageQuery`), matching by `kind` + `id`. `buildFeed`/`attachComments`
  already attach the complete thread per item, so no `GET /api/comments` is needed.
- **Write:** `POST /api/comments` with `target_type` + `target_id` + `body`
  (max 500, per `commentCreateSchema`). Map feed `kind` → comment `target_type`:
  `status` → `"status"`, `ascent` → `"activity"`. On success invalidate the feed
  page query (`["feed","page"]`) so the thread (and `commentCount`) refresh.

## New/changed files

**Mobile**
- `lib/styles.ts` (new) — `inputClass`.
- `components/form.tsx` (new) — `Field`, `Button`, `SegmentedPicker`.
- `lib/theme.ts` (new) — theme mode load/save/apply.
- `app/_layout.tsx` — apply persisted theme on mount.
- `app/(tabs)/feed/_layout.tsx` (new), `app/(tabs)/profile/_layout.tsx` (new).
- `app/(tabs)/crags/new.tsx`, `app/(tabs)/crags/sector/new.tsx`,
  `app/(tabs)/crags/route/new.tsx` (new); register in `crags/_layout.tsx`.
- `app/(tabs)/feed/[kind]/[id].tsx` (new); register in `feed/_layout.tsx`.
- Edits to `crags/index.tsx`, `crags/[id].tsx`, `crags/sector/[sectorId].tsx`,
  `crags/route/[routeId].tsx` (add buttons + inline review), `feed/index.tsx`
  (rows link to detail), `profile/index.tsx` (theme toggle).
- `login.tsx` / `register.tsx` — use the shared `inputClass`.

**Web**
- None.

**Shared**
- `packages/api-client/src/queries.ts` — ensure the `me` query type surfaces
  `gradingSystems` + `gradeEquivalencies` (the endpoint already returns them).

## Verification (in the running simulator)

1. Tabs: all three show icons + clean titles.
2. Theme: `xcrun simctl ui booted appearance dark|light` — app follows in System
   mode; Light/Dark override; choice persists after reload.
3. Create a crag → open it → add a sector → add a route (pick style + grade);
   confirm each appears.
4. Add a star review on a route; confirm it shows.
5. Open a feed item, post a comment, confirm it appears in the thread.
6. `npm run lint`, `npm run type-check` clean in both `apps/mobile` and `apps/web`.

Screenshot each major step.
