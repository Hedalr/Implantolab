import Link from "next/link";
import Image from "next/image";
import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { Reveal } from "@/components/ui/Reveal";
import { getLatestArticles, type Article } from "@/lib/notion";

const placeholderTones = ["warm", "cool", "deep"] as const;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export async function NewsTeaser() {
  const { eyebrow, title, description, link } = home.news;

  let articles: Article[] = [];
  try {
    articles = await getLatestArticles(3);
  } catch {
    articles = [];
  }

  return (
    <section className="bg-[var(--bg)] border-b border-[var(--line)]">
      <Container size="wide" className="py-24 md:py-32">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Reveal>
              <SectionHeading
                eyebrow={eyebrow}
                title={title}
                description={description}
              />
            </Reveal>
          </div>
          <Reveal delay={80}>
            <Link
              href={link.href}
              className="inline-flex items-center gap-3 text-[var(--ink)] border-b border-[var(--ink)] pb-1 text-sm tracking-wide hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors self-start md:self-end"
            >
              {link.label}
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
            </Link>
          </Reveal>
        </div>

        {articles.length === 0 ? (
          <Reveal delay={120} className="mt-16">
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
          <ul className="mt-16 grid gap-8 md:gap-10 md:grid-cols-3">
            {articles.map((article, index) => (
              <Reveal
                as="li"
                key={article.slug}
                delay={index * 80}
                variant="rise"
                className="flex flex-col gap-5"
              >
                <Link
                  href={`/actualites/${article.slug}`}
                  className="group flex flex-col gap-5"
                >
                  <div className="photo-lift overflow-hidden">
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
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-eyebrow text-[var(--accent-warm)]">
                      {article.category ? (
                        <span>{article.category}</span>
                      ) : null}
                      {article.category ? (
                        <span
                          aria-hidden="true"
                          className="h-px w-6 bg-[var(--line-strong)]"
                        />
                      ) : null}
                      <time
                        dateTime={article.date}
                        className="text-[var(--ink-discreet)]"
                      >
                        {formatDate(article.date)}
                      </time>
                    </div>
                    <h3 className="font-serif text-xl md:text-2xl leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                      {article.title}
                    </h3>
                    {article.excerpt ? (
                      <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                        {article.excerpt}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
