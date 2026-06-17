// Canonical public origin for SEO (metadata base, sitemap, robots) and any
// absolute links. Prefers an explicit override, then the NextAuth/Vercel
// domain, falling back to localhost in dev. No trailing slash.
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
