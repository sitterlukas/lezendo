# @whipperbook/mobile (Expo)

Expo (React Native) client that reuses the shared `@whipperbook/*` packages and
the REST API. **This is scaffolded but not yet bootstrapped/verified.**

## ⚠️ Excluded from the npm workspaces (for now)

`apps/mobile` is intentionally **not** listed in the root `package.json`
`workspaces` array yet. Its Expo/React-Native dependency versions are
hand-written placeholders that don't resolve cleanly (peer conflicts), which
would break `npm ci`, CI, and the Vercel web install if included. So it's parked
until bootstrapped.

## Bootstrap (run on a dev machine with the Expo toolchain)

```bash
# 1. From apps/mobile, pin Expo-SDK-compatible native versions:
cd apps/mobile
npx expo install --fix

# 2. Re-add the app to the root workspaces so it links the shared packages:
#    package.json → "workspaces": ["apps/web", "apps/mobile", "packages/*"]
#    then from the repo root:
npm install

# 3. Point it at the running web API and start:
#    apps/mobile/.env → EXPO_PUBLIC_API_URL=http://<your-LAN-ip>:3000
npx expo start
```

Once re-added to the workspaces, restore real `lint`/`type-check` gating in CI
(they're currently skipped because the package isn't installed).

See `docs/superpowers/plans/2026-06-17-monorepo-mobile-app.md` (Phase 6) for the
full design.
