import type { SimplePageContent } from "@/content/fr/pages";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SwipeGallery } from "@/components/ui/SwipeGallery";
import { ProcessSchema } from "@/components/ui/ProcessSchema";
import { PageHero } from "@/components/sections/PageHero";
import { PageCta } from "@/components/sections/PageCta";
import { prothesesGalleries } from "@/content/fr/protheses-media";

type Props = {
  content: SimplePageContent;
};

/**
 * Génère un slug ancre stable à partir de l'eyebrow d'une section — même
 * logique que PageSections, dupliquée volontairement pour rester local.
 */
function sectionAnchor(eyebrow: string | undefined, index: number): string {
  if (!eyebrow) return `section-${index + 1}`;
  return eyebrow
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * ProthesesLayout — variante de SimplePage qui injecte une galerie swipe de
 * réalisations réelles dans les sections dont l'eyebrow correspond à une clé
 * de `prothesesGalleries` (prothèse conjointe, prothèse amovible).
 */
export function ProthesesLayout({ content }: Props) {
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        intro={content.intro}
      />

      <div className="bg-[var(--bg-elevated)]">
        {content.sections.map((section, index) => {
          const gallery = section.eyebrow
            ? prothesesGalleries[section.eyebrow]
            : undefined;

          return (
            <section
              key={`${section.title}-${index}`}
              id={sectionAnchor(section.eyebrow, index)}
              className="border-b border-[var(--line)] scroll-mt-24"
            >
              <Container size="wide" className="py-20 md:py-24">
                <div className="grid gap-10 lg:gap-16 lg:grid-cols-12 items-start">
                  <Reveal className="lg:col-span-4">
                    <div className="flex flex-col gap-4 lg:sticky lg:top-28">
                      <span className="text-numeral text-eyebrow text-[var(--accent-warm)]">
                        {String(index + 1).padStart(2, "0")}
                        {section.eyebrow ? ` — ${section.eyebrow}` : ""}
                      </span>
                      <h2 className="text-display text-2xl md:text-3xl lg:text-[2.25rem] text-balance">
                        {section.title}
                      </h2>
                    </div>
                  </Reveal>

                  <Reveal delay={80} className="lg:col-span-8 flex flex-col gap-8">
                    <p className="text-[var(--ink-muted)] text-lg leading-relaxed text-pretty">
                      {section.body}
                    </p>

                    {section.items ? (
                      <ul className="grid gap-px bg-[var(--line)] sm:grid-cols-2 border-y border-[var(--line)]">
                        {section.items.map((item) => (
                          <li
                            key={item.title}
                            className="bg-[var(--bg-elevated)] p-6 flex flex-col gap-2"
                          >
                            <h3 className="font-serif text-lg text-[var(--ink)] transition-colors hover:text-[var(--accent)]">
                              {item.title}
                            </h3>
                            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                              {item.description}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {section.eyebrow === "Process" ? <ProcessSchema /> : null}

                    {gallery ? (
                      <div className="flex flex-col gap-3">
                        <SwipeGallery
                          slides={gallery.slides}
                          label={gallery.label}
                          ratio="landscape"
                          className="max-w-2xl"
                        />
                        <p className="text-xs text-[var(--ink-discreet)]">
                          Réalisations du laboratoire — photos anonymisées,
                          publiées avec l’accord du praticien. Faites glisser
                          pour parcourir.
                        </p>
                      </div>
                    ) : null}
                  </Reveal>
                </div>
              </Container>
            </section>
          );
        })}
      </div>

      <PageCta cta={content.cta} />
    </>
  );
}
