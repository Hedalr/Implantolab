import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { getLatestArticles } from "@/lib/notion";
import { formatArticleDate } from "@/lib/utils/date";

export const metadata: Metadata = {
  title: "Actualités — Espace praticien",
  robots: { index: false, follow: false },
};

const placeholderTones = ["warm", "cool", "deep"] as const;

export default async function EspacePraticienActualitesPage() {
  const articles = await getLatestArticles();

  return (
    <div className="py-6 md:py-10">
      <header className="flex flex-col gap-3 max-w-3xl">
        <span className="text-eyebrow flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-px w-8 bg-[var(--accent-warm)]"
          />
          Espace praticien
        </span>
        <h1 className="font-serif text-2xl md:text-3xl text-[var(--ink)] leading-tight">
          Actualités
        </h1>
        <p className="text-sm md:text-base text-[var(--ink-muted)] leading-relaxed">
          Les nouveautés du laboratoire : matériaux, événements, flux numériques
          et retours d’expérience de l’équipe.
        </p>
      </header>

      {articles.length === 0 ? (
        <div className="mt-10 border border-dashed border-[var(--line-strong)] bg-[var(--bg-elevated)] px-6 py-12 text-center">
          <span className="text-eyebrow text-[var(--accent-warm)]">À venir</span>
          <p className="mt-3 font-serif text-xl text-[var(--ink)] text-balance">
            Les prochaines actualités du laboratoire seront bientôt publiées.
          </p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, index) => (
            <li key={article.slug} className="flex">
              <Link
                href={`/espace-praticien/actualites/${article.slug}`}
                className="group flex w-full flex-col gap-4"
              >
                <div className="overflow-hidden bg-[var(--bg-elevated)] border border-[var(--line)]">
                  {article.coverUrl ? (
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={article.coverUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <VisualPlaceholder
                      caption={article.category ?? "Actualité"}
                      ratio="landscape"
                      tone={placeholderTones[index % placeholderTones.length]}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-eyebrow text-[var(--accent-warm)]">
                    {article.category ? (
                      <>
                        <span>{article.category}</span>
                        <span
                          aria-hidden="true"
                          className="h-px w-6 bg-[var(--line-strong)]"
                        />
                      </>
                    ) : null}
                    <time
                      dateTime={article.date}
                      className="text-[var(--ink-discreet)]"
                    >
                      {formatArticleDate(article.date)}
                    </time>
                  </div>
                  <h2 className="font-serif text-xl leading-snug text-[var(--ink)] transition-colors group-hover:text-[var(--accent)] text-balance">
                    {article.title}
                  </h2>
                  {article.excerpt ? (
                    <p className="text-sm text-[var(--ink-muted)] leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  ) : null}
                  <span className="mt-1 self-start text-sm text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
                    <span className="inline-flex items-center gap-2 border-b border-current pb-0.5">
                      Lire l’article
                      <svg
                        width="14"
                        height="10"
                        viewBox="0 0 14 10"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M0 5H12M12 5L8 1M12 5L8 9"
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                      </svg>
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
