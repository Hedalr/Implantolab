import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { getArticleBySlug } from "@/lib/notion";
import { formatArticleDate } from "@/lib/utils/date";

import "@/app/actualites/prose.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article introuvable — Espace praticien",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${article.title} — Espace praticien`,
    description: article.excerpt || undefined,
    robots: { index: false, follow: false },
  };
}

export default async function EspacePraticienArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="py-6 md:py-10 mx-auto max-w-3xl">
      <Link
        href="/espace-praticien/actualites"
        className="inline-flex items-center gap-3 text-sm text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors"
      >
        <svg
          width="14"
          height="10"
          viewBox="0 0 14 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14 5H2M2 5L6 1M2 5L6 9"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
        Retour aux actualités
      </Link>

      <header className="mt-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-eyebrow">
          {article.category ? (
            <>
              <span className="text-[var(--accent-warm)]">{article.category}</span>
              <span
                aria-hidden="true"
                className="h-px w-6 bg-[var(--line-strong)]"
              />
            </>
          ) : null}
          <time dateTime={article.date} className="text-[var(--ink-discreet)]">
            {formatArticleDate(article.date)}
          </time>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[var(--ink)] leading-tight text-balance">
          {article.title}
        </h1>
        {article.excerpt ? (
          <p className="text-base md:text-lg text-[var(--ink-muted)] leading-relaxed">
            {article.excerpt}
          </p>
        ) : null}
      </header>

      <div className="mt-8 overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]">
        {article.coverUrl ? (
          <div className="relative aspect-[16/10] w-full">
            <Image
              src={article.coverUrl}
              alt={article.title}
              fill
              sizes="(min-width: 768px) 48rem, 100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <VisualPlaceholder
            caption={article.category ?? "Actualité"}
            ratio="landscape"
            tone="warm"
          />
        )}
      </div>

      <article
        className="prose-article mt-10 flex flex-col gap-6 text-base sm:text-lg leading-relaxed text-[var(--ink-muted)]"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />

      <div className="mt-12 pt-6 border-t border-[var(--line)]">
        <Link
          href="/espace-praticien/actualites"
          className="inline-flex items-center gap-3 text-sm tracking-wide text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
        >
          <span className="inline-flex items-center gap-3 border-b border-current pb-1">
            <svg
              width="14"
              height="10"
              viewBox="0 0 14 10"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M14 5H2M2 5L6 1M2 5L6 9"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
            Retour aux actualités
          </span>
        </Link>
      </div>
    </div>
  );
}
