<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Whipperbook — working agreement

Whipperbook is a climbing route database + logbook. Crags → sectors → routes, with
ascents, gear, a forum, leaderboards, reviews, and photos.

## Two rules that matter most

1. **Be pragmatic — take the easiest path that works.** Make the smallest change
   that satisfies the request. Don't add dependencies, config, abstractions, or
   indirection unless they clearly earn their keep. Match the patterns already in
   the code instead of introducing new ones. If the server already validates or
   computes something, reuse it rather than reimplementing it.

2. **Reuse shared components; extract new ones when a pattern repeats.** Before
   writing UI, look in `app/ui/` for something that already does the job. If the
   same markup/logic shows up ~2–3 times, lift it into a small reusable component
   in `app/ui/` (or a token in `app/ui/style.ts`) instead of copy-pasting. Keep
   one component per concern — don't fork a near-duplicate.

## Stack

Next.js 16 (App Router, RSC by default, Turbopack) · React 19 · TypeScript ·
Tailwind CSS v4 · Kysely + Postgres (`pg`) · NextAuth v5 · Vercel Blob (images) ·
Leaflet (maps) · `qrcode`. Path alias: `@/` → repo root.

## Where things live

- **Shared UI:** `app/ui/`. Reach for these before building your own:
  - `modal.tsx` — dialog modal (`triggerLabel`, `variant`).
  - `create-modal.tsx` + `create-modals.tsx` — the two-step create flow
    (details → photos/location). New "add X" flows should use this.
  - `delete-button.tsx` — the one delete affordance (`variant="pill" | "icon"`),
    wrapping `confirm-submit.tsx` (a confirm-guarded submit; render it inside the
    `<form>` it deletes). Use this for every delete; don't hand-roll red buttons.
  - `select.tsx`, `field-label.tsx`, `filter-pill.tsx`, `discipline-select.tsx`,
    `grade-select.tsx`, `route-fields.tsx`, `sector-fields.tsx`, `crag-fields.tsx`.
  - `image-upload.tsx` + `image-gallery.tsx` — photos via Vercel Blob.
  - `map-picker.tsx` — Leaflet location picker (emits hidden `latitude`/`longitude`
    inputs; Leaflet is imported lazily in an effect to stay SSR-safe).
  - `route-card.tsx`, `stars.tsx`, `star-rating-input.tsx`, `entity-reviews.tsx`,
    `sector-map-qr.tsx`, `grade-histogram.tsx`, `rank-crown.tsx`, `trash-icon.tsx`,
    `header-nav.tsx`, `theme-toggle.tsx`.
  - `style.ts` — shared Tailwind class tokens (`inputClass`, `typeLabel`,
    `typeBadge`, …). Put reused class strings here, not inline duplicates.
- **API routes (mutations & data):** `app/api/<segment>/route.ts` — REST handlers
  built with the helpers in `lib/api/respond.ts` (`route`, `ok`, `fail`,
  `readJson`), authenticated via `lib/api/auth.ts` (`requireUser`/`getUser`), and
  validated with the Zod schemas from `@whipperbook/validation`. These replaced
  the old server actions — there are none left; add/extend a route handler and
  reuse existing ones. The web and mobile apps call the same endpoints.
- **DB:** schema + row types in `lib/db.ts` (the Kysely `Database` interface).
  Import the `db` client and types from `@/lib/db`.
- **Domain logic:** `lib/` (`grade-conversion`, `grade-data`, `leaderboard`,
  `points`, `route-stats`). Keep these pure so client components can import them.
- **Routes:** `app/<segment>/page.tsx`. Page-local components can sit beside the
  page, but anything reused belongs in `app/ui/`.

## Conventions

- **Server vs client:** default to Server Components. Add `"use client"` only when
  you need state/effects/handlers. Fetch data in server components and pass it
  down. Import browser-only/heavy libs (Leaflet) lazily inside an effect.
- **Forms:** client forms POST to the API routes — use `ApiForm`
  (`app/ui/api-form.tsx`, the drop-in for the old `<form action>`) or
  `apiFetch` / `browserApi` (`lib/api-client.ts`, `lib/api/client.ts`). The API
  handler stays the source of truth; cross-field/UX validation can also run
  client-side.
- **Styling:** Tailwind v4, zinc palette, dark mode via `dark:`. Reuse `style.ts`
  tokens and mirror the surrounding class ordering/idiom.
- **Migrations:** from `apps/web`, `pnpm migrate:make <name>`, write `up`/`down`
  in `migrations/`, then `pnpm migrate:latest` (also runs during `pnpm build`).
  Never edit an applied migration — add a new one — and update the matching table
  interface in `lib/db.ts`.
- **Don't** commit or push unless asked.

## Before you finish

Run and keep clean:

```
pnpm lint          # ESLint (flat config + eslint-config-prettier)
pnpm format        # Prettier writes; or format:check to verify
pnpm build         # runs migrations, typechecks, and builds
```

Prettier owns formatting — don't hand-format. Verify real behavior when it
matters (`pnpm dev`), but reach for the simplest sufficient check first.
