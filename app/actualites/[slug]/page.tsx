import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/sections/PageHero";
import { PageCta } from "@/components/sections/PageCta";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { site } from "@/content/fr/site";
import { getAllSlugs, getArticleBySlug } from "@/lib/notion";

import "./prose.css";

export const revalidate = 600;

type Params = { slug: string };

type PageProps = {
  params: Promise<Params>;
};

const cta = {
  title: "Un cas à adresser ?",
  description:
    "Vous avez un cas à adresser, une question technique ou un besoin de devis ? Notre équipe vous répond rapidement pour vous orienter vers la solution la plus adaptée.",
  primary: { label: "Nous contacter", href: "/contact" },
  secondary: { label: "Envoyer un cas", href: "/contact?sujet=cas" },
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const slugs = await getAllSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article introuvable",
      description: "Cet article n’est plus disponible.",
    };
  }

  const url = `${site.url}/actualites/${article.slug}`;
  const fullTitle = `${article.title} — ${site.name}`;
  const description = article.excerpt || site.description;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: site.name,
      locale: site.locale,
      type: "article",
      publishedTime: article.date || undefined,
      images: article.coverUrl
        ? [{ url: article.coverUrl, alt: article.title }]
        : [{ url: "/brand/logo.png", width: 512, height: 512, alt: `Logo ${site.name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: article.coverUrl ? [article.coverUrl] : ["/brand/logo.png"],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <>
      <PageHero
        eyebrow={article.category ?? "Actualité"}
        title={article.title}
        intro={article.excerpt || formatDate(article.date)}
      />

      <section className="bg-[var(--bg)] border-b border-[var(--line)]">
        <Container size="narrow" className="py-16 md:py-24">
          <div className="flex flex-col gap-10">
            <div className="flex items-center gap-4 text-eyebrow">
              <time
                dateTime={article.date}
                className="text-[var(--ink-discreet)]"
              >
                {formatDate(article.date)}
              </time>
              {article.category ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-px w-8 bg-[var(--line-strong)]"
                  />
                  <span className="text-[var(--accent-warm)]">
                    {article.category}
                  </span>
                </>
              ) : null}
            </div>

            {article.coverUrl ? (
              <div className="relative w-full aspect-[16/10] bg-[var(--bg-elevated)]">
                <Image
                  src={article.coverUrl}
                  alt={article.title}
                  fill
                  sizes="(min-width: 1024px) 60rem, 100vw"
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

            <article
              className="prose-article flex flex-col gap-6 text-lg leading-relaxed text-[var(--ink-muted)]"
              dangerouslySetInnerHTML={{ __html: article.contentHtml }}
            />

            <div className="pt-6 border-t border-[var(--line)]">
              <Link
                href="/actualites"
                className="inline-flex items-center gap-3 text-sm tracking-wide text-[var(--ink)] border-b border-[var(--ink)] pb-1 hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
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
            </div>
          </div>
        </Container>
      </section>

      <PageCta cta={cta} />
    </>
  );
}
