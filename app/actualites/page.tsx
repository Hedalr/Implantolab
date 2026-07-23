import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/sections/PageHero";
import { PageCta } from "@/components/sections/PageCta";
import { Reveal } from "@/components/ui/Reveal";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { pageMetadata } from "@/lib/metadata";
import { getLatestArticles } from "@/lib/notion";
import { formatArticleDate } from "@/lib/utils/date";
import { actualitesCta } from "./cta";

export const revalidate = 600;

const pageIntro =
  "Retour sur la vie du laboratoire : nouveaux matériaux, événements, ouvertures de postes et retours d’expérience de notre équipe technique.";

export const metadata = pageMetadata({
  title: "Actualités du laboratoire",
  description: pageIntro,
  path: "/actualites",
});

const placeholderTones = ["warm", "cool", "deep"] as const;

export default async function ActualitesPage() {
  const articles = await getLatestArticles();

  return (
    <>
      <PageHero
        eyebrow="Actualités"
        title="Les nouveautés du laboratoire"
        intro={pageIntro}
      />

      <section className="bg-[var(--bg)] border-b border-[var(--line)]">
        <Container size="wide" className="py-14 md:py-20 lg:py-28">
          {articles.length === 0 ? (
            <Reveal>
              <div className="border border-[var(--line)] bg-[var(--bg-elevated)] px-8 py-16 flex flex-col gap-3 items-start">
                <span className="text-eyebrow text-[var(--accent-warm)]">
                  À venir
                </span>
                <p className="font-serif text-2xl md:text-3xl text-[var(--ink)] max-w-xl text-balance">
                  Les prochaines actualités du laboratoire seront bientôt
                  publiées.
                </p>
                <p className="text-sm text-[var(--ink-muted)] leading-relaxed max-w-xl">
                  Événements, nouveaux matériaux et ouvertures de postes : cet
                  espace accueillera régulièrement la vie d’IMPLANTOLAB.
                </p>
              </div>
            </Reveal>
          ) : (
            <ul className="grid gap-10 md:gap-12 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article, index) => (
                <Reveal
                  key={article.slug}
                  as="li"
                  delay={(index % 3) * 80}
                  variant="rise"
                  className="flex"
                >
                  <Link
                    href={`/actualites/${article.slug}`}
                    className="group flex flex-col gap-5 w-full"
                  >
                    <div className="photo-lift overflow-hidden bg-[var(--bg-elevated)]">
                      {article.coverUrl ? (
                        <div className="relative w-full aspect-[4/5]">
                          <Image
                            src={article.coverUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 90vw"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <VisualPlaceholder
                          caption={article.category ?? "Actualité"}
                          ratio="portrait"
                          tone={placeholderTones[index % placeholderTones.length]}
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-3">
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
                      <h2 className="font-serif text-2xl leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors text-balance">
                        {article.title}
                      </h2>
                      {article.excerpt ? (
                        <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                          {article.excerpt}
                        </p>
                      ) : null}
                      <span className="tap-link mt-1 gap-2 text-sm text-[var(--ink)] self-start group-hover:text-[var(--accent)] transition-colors">
                        <span className="inline-flex items-center gap-2 border-b border-current pb-1">
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
                </Reveal>
              ))}
            </ul>
          )}
        </Container>
      </section>

      <PageCta cta={actualitesCta} />
    </>
  );
}
