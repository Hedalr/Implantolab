import { NextResponse } from "next/server";

import { site } from "@/content/fr/site";
import { getLatestArticles, type Article } from "@/lib/notion";

export const revalidate = 600;

function absoluteCoverUrl(coverUrl: string | null): string | null {
  if (!coverUrl) return null;
  if (/^https?:\/\//i.test(coverUrl)) return coverUrl;
  const base = site.url.replace(/\/$/, "");
  return `${base}${coverUrl.startsWith("/") ? coverUrl : `/${coverUrl}`}`;
}

function toPublicArticle(article: Article): Article {
  return {
    ...article,
    coverUrl: absoluteCoverUrl(article.coverUrl),
  };
}

/** Liste publique des actualités (consommée par l’app mobile). */
export async function GET() {
  const articles = await getLatestArticles();
  return NextResponse.json(
    { articles: articles.map(toPublicArticle) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    },
  );
}
