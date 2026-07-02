import type { MetadataRoute } from "next";
import { site, primaryNav } from "@/content/fr/site";
import { getLatestArticles } from "@/lib/notion";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes = ["/", ...primaryNav.map((link) => link.href)];

  const entries: MetadataRoute.Sitemap = routes.map((path) => ({
    url: `${site.url}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));

  try {
    const articles = await getLatestArticles();
    for (const article of articles) {
      const lastModified = article.date ? new Date(article.date) : now;
      entries.push({
        url: `${site.url}/actualites/${article.slug}`,
        lastModified: Number.isNaN(lastModified.getTime()) ? now : lastModified,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // Fallback silencieux : si Notion est indisponible, on garde uniquement
    // les routes statiques ci-dessus.
  }

  return entries;
}
