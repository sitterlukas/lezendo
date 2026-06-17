import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Let crawlers index the public content (crags, routes, sectors, forum,
// leaderboards) but keep private/auth-only and API routes out of the index.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/profile", "/feed", "/login", "/register", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
