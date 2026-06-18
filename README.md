Whipperbook — a climbing route database and personal logbook, built with Next.js,
Kysely and PostgreSQL.

## Getting Started

This is a `pnpm` + Turborepo monorepo, so use **pnpm** (not npm) for everything.

1. **Install dependencies** (from the repo root):

   ```bash
   pnpm install
   ```

2. **Configure environment** — copy the example file and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   See [Environment variables](#environment-variables) below.

3. **Run database migrations** (needs a reachable `DATABASE_URL`):

   ```bash
   cd apps/web && pnpm migrate:latest
   ```

4. **Start the dev server** (from the repo root; runs the web app):

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Running locally (full stack)

This is a pnpm + Turborepo monorepo: a Next.js web app (`apps/web`) and an Expo
mobile app (`apps/mobile`) that share code under `packages/`. The web app serves
the REST API the mobile app talks to.

### 1. Database — Postgres

The app connects to the `DATABASE_URL` in `.env.local`. **How Postgres is run and
which port it uses differs per machine**, so the connection string and setup live
in [Platform-specific setup](#platform-specific-setup):

- **macOS** — Postgres in Docker on port **6666**.
- **Windows + WSL2** — a local Postgres on port **5432**.

Set up Postgres for your machine there, then apply migrations (safe to re-run;
they also run during `pnpm build`):

```bash
cd apps/web && pnpm migrate:latest
```

### 2. Web app + REST API

```bash
cd apps/web && pnpm dev      # http://localhost:3000
```

Both the web frontend and the mobile app use the `/api/*` routes here.

### 3. Mobile app (Expo)

```bash
cd apps/mobile && npx expo start
```

The mobile app reads its API base URL from `EXPO_PUBLIC_API_URL`
(`apps/mobile/.env`, default `http://localhost:3000`). **Don't run Expo with
`CI=1`** during development: CI mode disables file watching and freezes the route
tree at startup, so newly added screens/layouts won't load until you restart.

How you launch a simulator/device differs by platform — see below.

## Platform-specific setup

The steps above are the same everywhere; only Docker and the way you launch the
Expo client differ between machines.

### On macOS

- **Postgres (Docker on port 6666):** set
  `DATABASE_URL=postgresql://lukas:lezendo_dev@localhost:6666/lezendo` in
  `.env.local`, then start the container via Docker Desktop:

  ```bash
  docker run -d --name lezendo-postgres \
    -e POSTGRES_USER=lukas -e POSTGRES_PASSWORD=lezendo_dev -e POSTGRES_DB=lezendo \
    -p 6666:5432 -v lezendo-pgdata:/var/lib/postgresql/data postgres:16
  ```

  `localhost` works for the web app and migrations as written. Use the
  `docker exec lezendo-postgres psql -U lukas -d lezendo ...` form for the
  seeding/verification commands below.
- **Mobile (iOS Simulator):** with Xcode installed, launch straight into the iOS
  simulator:

  ```bash
  cd apps/mobile && npx expo start --ios
  ```

  The simulator can reach the host's `localhost:3000`, so the default
  `EXPO_PUBLIC_API_URL` works as-is. Use `--android` instead for an Android
  emulator.
- **Physical device:** set `EXPO_PUBLIC_API_URL` to your Mac's LAN IP
  (e.g. `http://192.168.1.42:3000`) or use `npx expo start --tunnel` — a phone
  can't reach the host's `localhost`.

### Windows + WSL2

- **Postgres (local on port 5432):** this machine runs a **local Postgres**
  installed directly in WSL (no Docker), so set
  `DATABASE_URL=postgresql://lukas:lezendo_dev@localhost:5432/lezendo` in
  `.env.local`. Make sure the service is up:

  ```bash
  sudo service postgresql start
  psql "$DATABASE_URL" -c '\conninfo'    # verify the connection
  ```

  Create the role/database once if they don't exist yet (matching `DATABASE_URL`),
  then run the migrations as in [Database](#1-database--postgres). Use plain
  `psql "$DATABASE_URL" ...` instead of the `docker exec` form for the
  seeding/verification commands below.
- **Mobile:** there is no iOS simulator on Windows. Use an Android emulator or a
  physical device:

  ```bash
  cd apps/mobile && npx expo start --android    # Android emulator, or scan the QR with Expo Go
  ```

- **Networking caveat:** the dev server runs inside WSL2, which has its own
  network namespace, so a phone (and sometimes the Android emulator) can't reach
  WSL's `localhost`. Point the app at the host instead:
  - Set `EXPO_PUBLIC_API_URL` to the **Windows host LAN IP**
    (e.g. `http://192.168.1.42:3000`), or
  - Use `npx expo start --tunnel`, which avoids local networking entirely.

  Run `ip addr` in WSL or `ipconfig` in Windows PowerShell to find the LAN IP.

## Environment variables

Defined in `.env.local` (gitignored); see `.env.example` for the template.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `AUTH_SECRET` | Yes | Signs auth/JWT sessions. Generate with `npx auth secret`. |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob token for photo uploads. |
| `AUTH_GOOGLE_ID` | No | Google OAuth client ID — enables "Continue with Google". |
| `AUTH_GOOGLE_SECRET` | No | Google OAuth client secret. |
| `RESEND_API_KEY` | No | Resend key for the "verify your email" link. Leave blank locally to log the link to the console instead of sending. |
| `EMAIL_FROM` | No | Sender address for verification emails. Defaults to Resend's sandbox sender. |
| `TEST_DATABASE_URL` | No | Separate DB for integration tests (name MUST end in `_test`); used by `pnpm test:integration`. |
| `NEXT_PUBLIC_SITE_URL` | No | Public origin for SEO/absolute links. Falls back to `AUTH_URL`, the Vercel URL, then localhost. |
| `AUTH_URL` | Deploy | Public base URL (e.g. `https://your-domain`). Required off-localhost so NextAuth builds the correct OAuth callback; inferred locally. |

### Google sign-in

Email/password works out of the box. To enable **Continue with Google** (the
buttons appear automatically once both vars are set):

1. In [Google Cloud Console](https://console.cloud.google.com), create a project
   and configure the **OAuth consent screen** (External). While it's in *Testing*
   mode, add your account under **Test users**.
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   - Authorized JavaScript origin: `http://localhost:3000` (plus deployed domains).
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
     (and `https://your-domain/api/auth/callback/google` per environment).
3. Put the Client ID/secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` and
   restart the dev server.

A first Google sign-in creates a passwordless local user keyed by email.

## Seeding demo data

The `apps/web/scripts/` directory holds one-off seed scripts
(`node scripts/seed-dummy.mjs`, etc., run from `apps/web`), and
`apps/web/scripts/seed-preprod.sql` is a ready-made SQL dump of demo content for a
preprod database (assumes migrations have already run there).

`seed-dummy.mjs` (run from `apps/web`, needs `BLOB_READ_WRITE_TOKEN`) creates demo
crags/sectors/routes plus three users — `lukas@whipperbook.test`,
`mara@whipperbook.test`, and `admin@whipperbook.test` — all with password
`password`.

Login requires a **verified** email, and seeded users start unverified, so mark
them verified once after seeding. On **macOS** (Docker):

```bash
docker exec lezendo-postgres \
  psql -U lukas -d lezendo -c "UPDATE users SET email_verified_at = now() WHERE email_verified_at IS NULL"
```

On **Windows + WSL2** (local Postgres):

```bash
psql "$DATABASE_URL" -c "UPDATE users SET email_verified_at = now() WHERE email_verified_at IS NULL"
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
