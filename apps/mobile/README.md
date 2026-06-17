# @whipperbook/mobile (Expo)

Expo (React Native) client that reuses the shared `@whipperbook/*` packages and
the REST API. Part of the pnpm workspace; lint + type-check run in CI.

- **Expo SDK 54** (React 19 / React Native 0.81). Matching the web app's React 19
  is what lets both apps share one workspace cleanly — see the pnpm + React notes
  in the repo root `pnpm-workspace.yaml`.
- Styling via **NativeWind v4**; data via **TanStack Query** against the web REST
  API; auth tokens in **expo-secure-store**.

## Run it

```bash
# From the repo root, install the whole workspace:
pnpm install

# Point the app at a running web API (physical devices need the host's LAN IP,
# not localhost — see apps/mobile/.env):
#   apps/mobile/.env → EXPO_PUBLIC_API_URL=http://<your-LAN-ip>:3000

# Start Metro + the dev client / Expo Go:
pnpm --filter @whipperbook/mobile start
```

Then sign in and open the Crags tab to exercise the shared types + query layer +
auth transport end to end.

See `docs/superpowers/plans/2026-06-17-monorepo-mobile-app.md` (Phase 6) for the
full design.
