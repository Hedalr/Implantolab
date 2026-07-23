import "server-only";

import { cache } from "react";
import { Client, isFullPage } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { marked } from "marked";

import {
  fallbackArticleDetails,
  fallbackArticles,
} from "@/content/fr/actualites";

/**
 * IMPLANTOLAB — Intégration Notion pour la publication des actualités.
 *
 * Ce module est strictement serveur (`server-only`) : il ne doit jamais
 * être importé depuis un composant client. Il expose :
 *   - `getLatestArticles(limit?)`      : liste des articles publiés
 *   - `getArticleBySlug(slug)`         : détail d'un article (avec HTML)
 *   - `getAllSlugs()`                  : tous les slugs publiés
 *
 * Si les variables `NOTION_TOKEN` et `NOTION_DATABASE_ID` ne sont pas
 * définies, les articles statiques de `content/fr/actualites.ts` sont
 * utilisés. Cela permet de faire tourner la vitrine sans setup Notion.
 *
 * Sécurité : le HTML rendu (via marked, mode `async: false`) provient de
 * contenu Notion authentifié ou de contenu statique interne. La surface
 * d'attaque XSS est donc considérée comme limitée. On garde toutefois
 * `mangle: false` et `headerIds: false` pour un rendu prévisible.
 */

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  coverUrl: string | null;
  category?: string;
};

export type ArticleDetail = Article & { contentHtml: string };

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

const hasNotionConfig = Boolean(
  NOTION_TOKEN && NOTION_TOKEN.trim() && NOTION_DATABASE_ID && NOTION_DATABASE_ID.trim(),
);

let warnedFallback = false;
function warnFallbackOnce(reason?: string) {
  if (warnedFallback) return;
  warnedFallback = true;
  const suffix = reason ? ` (${reason})` : "";
  console.warn(
    `[notion] NOTION_TOKEN ou NOTION_DATABASE_ID manquants — utilisation des actualités statiques de fallback${suffix}.`,
  );
}

const notion = hasNotionConfig
  ? new Client({ auth: NOTION_TOKEN })
  : null;

const n2m = notion ? new NotionToMarkdown({ notionClient: notion }) : null;

marked.setOptions({ gfm: true, breaks: false });

/**
 * Notion v5 : une database contient une ou plusieurs `data_sources`.
 * On récupère la première data source liée à la database configurée.
 */
const getDataSourceId = cache(async (): Promise<string | null> => {
  if (!notion || !NOTION_DATABASE_ID) return null;
  try {
    const db = await notion.databases.retrieve({
      database_id: NOTION_DATABASE_ID,
    });
    if ("data_sources" in db && db.data_sources.length > 0) {
      return db.data_sources[0].id;
    }
    return null;
  } catch (error) {
    console.error("[notion] Impossible de récupérer la base Notion", error);
    return null;
  }
});

type NotionProperty = Record<string, unknown> & { type?: string };

function readRichText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as NotionProperty;
  if (p.type === "title" && Array.isArray(p.title)) {
    return (p.title as Array<{ plain_text?: string }>)
      .map((item) => item.plain_text ?? "")
      .join("");
  }
  if (p.type === "rich_text" && Array.isArray(p.rich_text)) {
    return (p.rich_text as Array<{ plain_text?: string }>)
      .map((item) => item.plain_text ?? "")
      .join("");
  }
  return "";
}

function readDate(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as NotionProperty;
  if (p.type === "date" && p.date && typeof p.date === "object") {
    const d = p.date as { start?: string | null };
    return d.start ?? "";
  }
  return "";
}

function readSelect(prop: unknown): string | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as NotionProperty;
  if (p.type === "select" && p.select && typeof p.select === "object") {
    const s = p.select as { name?: string };
    return s.name ?? undefined;
  }
  return undefined;
}

/**
 * Ramène une URL d'image « propre » — quand elle pointe vers un fichier local
 * du site (convention `/photos/...`, voir `content/fr/site-photos.ts`), on ne
 * garde que le chemin. Ça évite qu'une URL collée dans Notion avec un domaine
 * différent de celui actuellement en ligne (ex. futur domaine personnalisé
 * saisi avant qu'il ne soit branché, ou `www.` vs sans `www.`) ne casse
 * l'affichage : `next/image` refuse tout hostname externe non listé dans
 * `next.config.ts`, et une URL vers un domaine injoignable ne charge jamais.
 * En chemin relatif, l'image est servie depuis `public/` quel que soit le
 * domaine du déploiement — aucune configuration `remotePatterns` requise.
 */
function toLocalPathIfSiteAsset(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/photos/")) {
      return parsed.pathname;
    }
    return url;
  } catch {
    // URL déjà relative (ou invalide) : on la laisse telle quelle.
    return url;
  }
}

/**
 * Même normalisation que `toLocalPathIfSiteAsset`, mais appliquée à un bloc
 * de texte entier (le markdown généré depuis le contenu d'une page Notion)
 * plutôt qu'à une URL isolée. Les images insérées dans le corps d'un article
 * (blocs `image`) contiennent des URL complètes qui peuvent pointer vers un
 * domaine différent de celui actuellement en ligne — on les ramène toutes en
 * chemin relatif `/photos/...` pour qu'elles se chargent quel que soit le
 * domaine du déploiement.
 */
function normalizeSiteImageUrlsInText(text: string): string {
  return text.replace(/https?:\/\/[^\s)"'>]+?(\/photos\/[^\s)"'>]*)/g, "$1");
}

/**
 * Extrait une URL d'image depuis une propriété "Files & media" ou "URL".
 * Les fichiers hébergés par Notion ont des URL signées qui expirent.
 * Comme les pages qui utilisent cette URL sont en ISR (revalidate=600),
 * la valeur est régénérée régulièrement.
 */
function readImageUrl(prop: unknown, coverFromPage?: string | null): string | null {
  if (coverFromPage) return toLocalPathIfSiteAsset(coverFromPage);
  if (!prop || typeof prop !== "object") return null;
  const p = prop as NotionProperty;
  if (p.type === "url" && typeof p.url === "string" && p.url) {
    return toLocalPathIfSiteAsset(p.url);
  }
  if (p.type === "files" && Array.isArray(p.files)) {
    const first = (p.files as Array<Record<string, unknown>>)[0];
    if (!first) return null;
    if (first.type === "external" && first.external && typeof first.external === "object") {
      const ext = first.external as { url?: string };
      return ext.url ? toLocalPathIfSiteAsset(ext.url) : null;
    }
    if (first.type === "file" && first.file && typeof first.file === "object") {
      const f = first.file as { url?: string };
      return f.url ?? null;
    }
  }
  return null;
}

function readCoverFromPage(cover: unknown): string | null {
  if (!cover || typeof cover !== "object") return null;
  const c = cover as { type?: string; external?: { url?: string }; file?: { url?: string } };
  if (c.type === "external" && c.external?.url) return c.external.url;
  if (c.type === "file" && c.file?.url) return c.file.url;
  return null;
}

type PageLike = {
  id: string;
  cover?: unknown;
  properties: Record<string, unknown>;
};

function pageToArticle(page: PageLike): Article | null {
  const props = page.properties;
  const title = readRichText(props["Titre"]);
  const slug = readRichText(props["Slug"]).trim();
  const excerpt = readRichText(props["Résumé"]);
  const date = readDate(props["Date"]);
  const category = readSelect(props["Catégorie"]);
  const coverFromCover = readCoverFromPage(page.cover);
  const coverUrl = readImageUrl(props["Image"], coverFromCover);

  if (!title || !slug) return null;

  return {
    slug,
    title,
    excerpt,
    date,
    coverUrl,
    category,
  };
}

const fetchPublishedPages = cache(async (): Promise<PageLike[]> => {
  if (!notion) return [];
  const dataSourceId = await getDataSourceId();
  if (!dataSourceId) return [];

  try {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: "Publié",
        checkbox: { equals: true },
      },
      sorts: [{ property: "Date", direction: "descending" }],
      page_size: 100,
    });

    return response.results
      .filter((r) => isFullPage(r))
      .map((r) => r as unknown as PageLike);
  } catch (error) {
    console.error("[notion] Échec de la requête data source", error);
    return [];
  }
});

export const getLatestArticles = cache(
  async (limit?: number): Promise<Article[]> => {
    if (!hasNotionConfig) {
      warnFallbackOnce();
      const list = [...fallbackArticles];
      return typeof limit === "number" ? list.slice(0, limit) : list;
    }

    const pages = await fetchPublishedPages();
    const articles: Article[] = [];
    for (const page of pages) {
      const article = pageToArticle(page);
      if (article) articles.push(article);
    }

    if (articles.length === 0 && pages.length === 0) {
      warnFallbackOnce("aucun article publié récupéré depuis Notion");
      const list = [...fallbackArticles];
      return typeof limit === "number" ? list.slice(0, limit) : list;
    }

    return typeof limit === "number" ? articles.slice(0, limit) : articles;
  },
);

export const getAllSlugs = cache(async (): Promise<string[]> => {
  if (!hasNotionConfig) {
    return fallbackArticles.map((a) => a.slug);
  }
  try {
    const pages = await fetchPublishedPages();
    const slugs = pages
      .map((page) => readRichText(page.properties["Slug"]).trim())
      .filter((s): s is string => Boolean(s));
    if (slugs.length === 0) return fallbackArticles.map((a) => a.slug);
    return slugs;
  } catch {
    return fallbackArticles.map((a) => a.slug);
  }
});

async function pageToHtml(pageId: string): Promise<string> {
  if (!n2m) return "";
  try {
    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const rawMd = n2m.toMarkdownString(mdBlocks).parent ?? "";
    if (!rawMd) return "";
    const md = normalizeSiteImageUrlsInText(rawMd);
    return marked.parse(md, { async: false }) as string;
  } catch (error) {
    console.error("[notion] Échec du rendu markdown pour la page", pageId, error);
    return "";
  }
}

export const getArticleBySlug = cache(
  async (slug: string): Promise<ArticleDetail | null> => {
    if (!hasNotionConfig) {
      warnFallbackOnce();
      return fallbackArticleDetails[slug] ?? null;
    }

    const pages = await fetchPublishedPages();
    const page = pages.find(
      (p) => readRichText(p.properties["Slug"]).trim() === slug,
    );
    if (!page) {
      return fallbackArticleDetails[slug] ?? null;
    }

    const base = pageToArticle(page);
    if (!base) return null;

    const contentHtml = await pageToHtml(page.id);
    return { ...base, contentHtml };
  },
);
