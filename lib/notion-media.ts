import "server-only";

import { createHash } from "crypto";

import { detectPhotoMimeType } from "@/lib/requests/media-security";
import {
  getServiceRoleSupabase,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";

/**
 * Copie les images hébergées par Notion (URL signées ~1 h) vers le bucket
 * Storage public `actualites`. Idempotent via hash du pathname Notion.
 */

export const ACTUALITES_BUCKET = "actualites";

const MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const HEAD_TIMEOUT_MS = 5_000;
const HTML_PERSIST_CONCURRENCY = 4;

type ArticleImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function detectArticleImageMime(bytes: Uint8Array): ArticleImageMime | null {
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x39 || bytes[4] === 0x37) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  const photo = detectPhotoMimeType(bytes);
  if (photo === "image/jpeg" || photo === "image/png" || photo === "image/webp") {
    return photo;
  }
  return null;
}

/** URL Notion / S3 signée (pas un asset local ni un CDN externe stable). */
export function isNotionHostedFileUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "notion.so" || host.endsWith(".notion.so")) return true;
    // Hosts S3 utilisés par Notion pour les fichiers workspace.
    if (host === "prod-files-secure.s3.us-west-2.amazonaws.com") return true;
    if (host === "secure.notion-static.com") return true;
    if (
      host.endsWith(".amazonaws.com") &&
      host.includes("notion")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function sanitizeSlugSegment(slug: string): string {
  const cleaned = slug
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "article";
}

function storagePathFor(sourceUrl: string, articleSlug: string): string {
  const pathname = new URL(sourceUrl).pathname;
  const key = createHash("sha256").update(pathname).digest("hex").slice(0, 24);
  return `articles/${sanitizeSlugSegment(articleSlug)}/${key}`;
}

function publicUrlFor(path: string): string {
  const admin = getServiceRoleSupabase();
  return admin.storage.from(ACTUALITES_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** HEAD sur l'URL publique — évite un `storage.list` + extension inconnue. */
async function alreadyPersisted(path: string): Promise<string | null> {
  const publicUrl = publicUrlFor(path);
  try {
    const head = await fetch(publicUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
    });
    return head.ok ? publicUrl : null;
  } catch {
    return null;
  }
}

/**
 * Persiste une image Notion vers Supabase Storage et renvoie l'URL publique.
 * En cas d'échec ou sans service_role : renvoie l'URL d'origine inchangée.
 */
export async function persistNotionImage(
  sourceUrl: string,
  options: { articleSlug: string },
): Promise<string> {
  if (!isNotionHostedFileUrl(sourceUrl) || !isServiceRoleConfigured()) {
    return sourceUrl;
  }

  try {
    const path = storagePathFor(sourceUrl, options.articleSlug);
    const existing = await alreadyPersisted(path);
    if (existing) return existing;

    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    // Après redirect : ne garder le body que si l'hôte final reste autorisé.
    if (!response.ok || !isNotionHostedFileUrl(response.url)) {
      console.warn(
        `[notion-media] téléchargement refusé (${response.status}) pour ${options.articleSlug}`,
      );
      return sourceUrl;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
      console.warn(
        `[notion-media] taille invalide (${buffer.byteLength} o) pour ${options.articleSlug}`,
      );
      return sourceUrl;
    }

    const mime = detectArticleImageMime(new Uint8Array(buffer));
    if (!mime) {
      console.warn(
        `[notion-media] type d'image non supporté pour ${options.articleSlug}`,
      );
      return sourceUrl;
    }

    const admin = getServiceRoleSupabase();
    const { error: uploadError } = await admin.storage
      .from(ACTUALITES_BUCKET)
      .upload(path, buffer, {
        contentType: mime,
        upsert: false,
        cacheControl: "31536000",
      });

    if (
      uploadError &&
      !/already exists|duplicate|resource already|The resource already exists/i.test(
        uploadError.message,
      )
    ) {
      console.error("[notion-media] upload échoué", uploadError.message);
      return sourceUrl;
    }

    return publicUrlFor(path);
  } catch (error) {
    console.error("[notion-media] persistance échouée", error);
    return sourceUrl;
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/** Remplace les `src` d'images Notion dans du HTML par des URL Storage. */
export async function persistNotionImagesInHtml(
  html: string,
  articleSlug: string,
): Promise<string> {
  if (!html || !isServiceRoleConfigured()) return html;

  const matches = [...html.matchAll(/\bsrc="(https?:\/\/[^"]+)"/gi)];
  const uniqueUrls = [
    ...new Set(matches.map((m) => m[1]).filter(isNotionHostedFileUrl)),
  ];
  if (uniqueUrls.length === 0) return html;

  const replaced = await mapPool(
    uniqueUrls,
    HTML_PERSIST_CONCURRENCY,
    async (url) => [url, await persistNotionImage(url, { articleSlug })] as const,
  );

  const byUrl = new Map(replaced.filter(([from, to]) => from !== to));
  if (byUrl.size === 0) return html;

  return html.replace(
    /\bsrc="(https?:\/\/[^"]+)"/gi,
    (full, url: string) => {
      const next = byUrl.get(url);
      return next ? `src="${next}"` : full;
    },
  );
}
