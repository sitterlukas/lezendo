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

### Testing on a physical device with Expo Go (incl. WSL2)

On a real phone, `localhost` points at the phone, not your dev machine — so both
Metro **and** the web API must be reachable over the network. On WSL2 the host's
LAN IP usually isn't reachable from the phone either, so the simplest path is to
tunnel both:

```bash
# 1. Start the web API (from apps/web), with Postgres running:
pnpm --filter @whipperbook/web dev          # serves on http://localhost:3000

# 2. Tunnel the web API to a public exp.direct URL and point the app at it:
#   apps/mobile/.env → EXPO_PUBLIC_API_URL=https://<subdomain>-3000.exp.direct
#   (EXPO_PUBLIC_ vars are inlined at bundle time — restart Metro after editing)

# 3. Start Metro in tunnel mode and scan the QR with Expo Go:
pnpm --filter @whipperbook/mobile start --tunnel
```

The first `--tunnel` run installs `@expo/ngrok` and provisions a stable
`*.exp.direct` subdomain (persisted in the project's `urlRandomness`). To tunnel
the API on the same exp.direct account, reuse that subdomain with the matching
port, e.g. `https://<subdomain>-3000.exp.direct`. If the QR doesn't render in your
terminal, type the `exp://<subdomain>-8081.exp.direct` URL into Expo Go manually.

See `docs/superpowers/plans/2026-06-17-monorepo-mobile-app.md` (Phase 6) for the
full design.
