---
name: mobile-check
description: Audit Whipperbook's UI for mobile-friendliness — run when asked to check if pages/components are mobile friendly, responsive, or work on small screens. Reviews Tailwind responsive classes, overflow, touch targets, dialogs, and tables across the app.
---

# Mobile-friendliness check

Whipperbook is Next.js 16 + Tailwind v4. The viewport meta (`width=device-width`)
is injected by Next's App Router automatically — don't add it manually. Target
the smallest common phone width (**360–390px**) and verify nothing overflows,
truncates badly, or is too small to tap.

## How to run the audit

1. **Static scan** — grep the codebase for the pitfalls below and list each hit
   with `file:line`.
2. **Live check** (preferred when a dev server is available) — start it
   (`npm run dev`), then load the key routes at a 390px viewport and look for
   horizontal scroll / clipped content. Use the project `run`/`verify` skills or
   `curl` the HTML to inspect structure. Routes to cover:
   `/`, `/crags`, `/crags/[id]`, `/crags/[id]/sectors/[id]`,
   `/crags/[id]/routes/[id]`, `/feed`, `/users/[id]`, `/gear`, `/forum`,
   `/leaderboards`, `/profile/settings`, `/login`, `/register`.
3. **Report**: for each issue give `file:line`, what breaks at ~390px, and the
   fix. Then apply fixes and re-run `npm run build` + `npm run lint`.

## What to look for (and the fix)

- **Horizontal overflow**
  - Wide fixed widths: `w-[<N>px]`, `min-w-[…]`, large `w-NN` on the mobile
    axis. Fix: cap with `max-w-full`, switch to responsive `w-full sm:w-…`.
  - Long unbreakable text (URLs, emails, route names): add `truncate` or
    `break-words`/`min-w-0` on flex children. Flex children need `min-w-0` to
    allow truncation.
- **Tables** (`<table>`, e.g. leaderboard): wrap in
  `<div class="overflow-x-auto">` so they scroll instead of pushing the page.
- **Flex rows that should stack**: `flex` rows with several items and no
  `flex-wrap` / no `sm:` breakpoint. Fix: `flex-col sm:flex-row` or add
  `flex-wrap` + `gap`.
- **Grids**: ensure a single column on mobile — `grid-cols-1 sm:grid-cols-2`
  (not a bare `grid-cols-2`/`grid-cols-3`).
- **Dialogs/modals** (`<dialog>`, `app/ui/modal.tsx`, `create-modal.tsx`):
  must use `max-w-…` plus a small-screen inset like
  `max-[544px]:max-w-[calc(100%-2rem)]` and `max-h-[calc(100dvh-2rem)]` +
  `overflow-y-auto`. Confirm new dialogs follow this.
- **Touch targets**: interactive elements should be ≳40px tall. Watch for tiny
  icon buttons (`p-1` with a 10–12px icon). Bump padding on mobile.
- **Header/nav**: confirm the mobile menu (`app/ui/header-nav.tsx`) shows on
  small screens and the desktop nav is `hidden md:flex`.
- **Fixed paddings**: very large `px-`/`py-` on small screens — prefer
  `px-4 sm:px-6` style scaling.
- **Images**: `next/image` with `fill` needs a sized parent; avoid fixed huge
  widths on mobile.

## Conventions to preserve

- Reuse existing tokens in `app/ui/style.ts`; match the surrounding class order.
- The codebase already uses `flex-wrap`, `max-w-2xl/4xl/5xl` containers, and
  `sm:`/`md:` breakpoints — mirror those patterns rather than inventing new ones.
- Prettier owns formatting; run `npm run format` (or `prettier --write`) after edits.
