Lezendo — a climbing route database and personal logbook, built with Next.js,
Kysely and PostgreSQL.

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — copy the example file and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   See [Environment variables](#environment-variables) below.

3. **Run database migrations** (needs a reachable `DATABASE_URL`):

   ```bash
   npm run migrate:latest
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Defined in `.env.local` (gitignored); see `.env.example` for the template.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `AUTH_SECRET` | Yes | Signs auth/JWT sessions. Generate with `npx auth secret`. |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob token for photo uploads. |
| `AUTH_GOOGLE_ID` | No | Google OAuth client ID — enables "Continue with Google". |
| `AUTH_GOOGLE_SECRET` | No | Google OAuth client secret. |
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

The `scripts/` directory holds one-off seed scripts (`node scripts/seed-dummy.mjs`,
etc.), and `scripts/seed-preprod.sql` is a ready-made SQL dump of demo content
for a preprod database (assumes migrations have already run there).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
