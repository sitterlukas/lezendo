import type { MetadataRoute } from "next";
import db from "@/lib/db";
import { siteUrl } from "@/lib/site";

// Regenerated on each request so newly added crags/routes/sectors/topics show
// up for crawlers without a redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const [crags, sectors, routes, topics] = await Promise.all([
    db
      .selectFrom("crags")
      .select(["id", "created_at"])
      .where("deleted", "=", false)
      .execute(),
    db
      .selectFrom("sectors")
      .select(["id", "crag_id", "created_at"])
      .where("deleted", "=", false)
      .execute(),
    db
      .selectFrom("routes")
      .select(["id", "crag_id", "created_at"])
      .where("deleted", "=", false)
      .execute(),
    db.selectFrom("forum_topics").select(["id", "created_at"]).execute(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/crags`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/gear`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/forum`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/leaderboards`, changeFrequency: "daily", priority: 0.6 },
  ];

  return [
    ...staticPages,
    ...crags.map((c) => ({
      url: `${base}/crags/${c.id}`,
      lastModified: c.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...sectors.map((s) => ({
      url: `${base}/crags/${s.crag_id}/sectors/${s.id}`,
      lastModified: s.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...routes.map((r) => ({
      url: `${base}/crags/${r.crag_id}/routes/${r.id}`,
      lastModified: r.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...topics.map((t) => ({
      url: `${base}/forum/${t.id}`,
      lastModified: t.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
