import Link from "next/link";
import { PageHero } from "@/components/sections/PageHero";
import { PageCta } from "@/components/sections/PageCta";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import {
  implantologie,
  protheses,
  fluxNumerique,
} from "@/content/fr/pages";
import { pageMetadata } from "@/lib/metadata";

const pageIntro = {
  eyebrow: "Expertises",
  title: "Un savoir-faire complet, un seul laboratoire",
  intro:
    "Implantologie, prothèses fixées et amovibles, flux numérique CFAO : trois domaines d’expertise combinés au sein d’un même laboratoire, pour vous accompagner sur l’ensemble de vos cas prothétiques.",
};

const expertises = [
  {
    slug: implantologie.slug,
    eyebrow: implantologie.eyebrow,
    title: implantologie.title,
    intro: implantologie.intro,
    photoCaption: "Restauration implantaire — atelier",
    tone: "warm" as const,
  },
  {
    slug: protheses.slug,
    eyebrow: protheses.eyebrow,
    title: protheses.title,
    intro: protheses.intro,
    photoCaption: "Couronne céramique — finition",
    tone: "cool" as const,
  },
  {
    slug: fluxNumerique.slug,
    eyebrow: fluxNumerique.eyebrow,
    title: fluxNumerique.title,
    intro: fluxNumerique.intro,
    photoCaption: "Conception CAO — poste technique",
    tone: "deep" as const,
  },
];

export const metadata = pageMetadata({
  title: pageIntro.title,
  description: pageIntro.intro,
  path: "/expertises",
});

export default function ExpertisesPage() {
  return (
    <>
      <PageHero
        eyebrow={pageIntro.eyebrow}
        title={pageIntro.title}
        intro={pageIntro.intro}
      />

      <section className="bg-[var(--bg)] border-b border-[var(--line)]">
        <Container size="wide" className="py-20 md:py-28">
          <ul className="flex flex-col gap-16 md:gap-24">
            {expertises.map((item, index) => {
              const reversed = index % 2 === 1;
              return (
                <li
                  key={item.slug}
                  className="grid gap-12 lg:gap-16 lg:grid-cols-12 items-center"
                >
                  <Reveal
                    className={
                      reversed
                        ? "lg:col-span-6 lg:order-2"
                        : "lg:col-span-6"
                    }
                    variant={reversed ? "reveal-x" : "scale"}
                  >
                    <VisualPlaceholder
                      caption={item.photoCaption}
                      ratio="landscape"
                      tone={item.tone}
                    />
                  </Reveal>

                  <div
                    className={
                      reversed
                        ? "lg:col-span-6 lg:order-1 flex flex-col gap-6"
                        : "lg:col-span-6 flex flex-col gap-6"
                    }
                  >
                    <Reveal>
                      <span className="text-eyebrow flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="h-px w-8 bg-[var(--accent-warm)]"
                        />
                        {String(index + 1).padStart(2, "0")} — {item.eyebrow}
                      </span>
                    </Reveal>
                    <Reveal delay={80}>
                      <h2 className="text-display text-3xl md:text-4xl lg:text-[2.5rem] text-balance">
                        {item.title}
                      </h2>
                    </Reveal>
                    <Reveal delay={160}>
                      <p className="text-[var(--ink-muted)] text-lg leading-relaxed text-pretty">
                        {item.intro}
                      </p>
                    </Reveal>
                    <Reveal delay={220}>
                      <Link
                        href={`/${item.slug}`}
                        className="inline-flex items-center gap-3 text-[var(--ink)] border-b border-[var(--ink)] pb-1 text-sm tracking-wide hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors self-start"
                      >
                        Découvrir l’expertise
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
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      <PageCta
        cta={{
          title: "Un cas à discuter avec notre équipe technique ?",
          description:
            "Décrivez-nous votre indication clinique : nous revenons rapidement vers vous avec une proposition adaptée et un délai.",
          primary: { label: "Envoyer un cas", href: "/contact?sujet=cas" },
          secondary: {
            label: "Demander un devis",
            href: "/contact?sujet=devis",
          },
        }}
      />
    </>
  );
}
