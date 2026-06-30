import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { PageHero } from "@/components/sections/PageHero";
import { PageCta } from "@/components/sections/PageCta";
import { casCliniques } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: casCliniques.title,
  description: casCliniques.intro,
  path: "/cas-cliniques",
});

const cases = [
  {
    category: "Implantologie",
    title: "Couronne implantaire unitaire",
    indication: "Secteur postérieur — molaire mandibulaire",
    material: "Zircone monolithique",
    tone: "warm" as const,
  },
  {
    category: "Esthétique",
    title: "Stratification antérieure",
    indication: "Bloc incisivo-canin maxillaire",
    material: "Céramique pressée stratifiée",
    tone: "cool" as const,
  },
  {
    category: "CFAO",
    title: "Bridge implantaire 3 éléments",
    indication: "Secteur prémolaire-molaire",
    material: "Zircone usinée",
    tone: "deep" as const,
  },
  {
    category: "Implantologie",
    title: "Pilier personnalisé titane",
    indication: "Région antérieure maxillaire",
    material: "Titane usiné",
    tone: "warm" as const,
  },
  {
    category: "Esthétique",
    title: "Facettes secteur antérieur",
    indication: "Sourire — réhabilitation esthétique",
    material: "Céramique feldspathique",
    tone: "cool" as const,
  },
  {
    category: "CFAO",
    title: "Guide chirurgical",
    indication: "Planification implantaire",
    material: "Résine biocompatible imprimée",
    tone: "deep" as const,
  },
];

export default function CasCliniquesPage() {
  return (
    <>
      <PageHero
        eyebrow={casCliniques.eyebrow}
        title={casCliniques.title}
        intro={casCliniques.intro}
      />

      <section className="bg-[var(--bg-elevated)] border-b border-[var(--line)]">
        <Container size="wide" className="py-20 md:py-28">
          <div className="flex flex-wrap items-center justify-between gap-6 mb-14">
            <p className="text-eyebrow">Sélection</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--ink-muted)]">
              {["Tous", "Implantologie", "Esthétique", "CFAO"].map((label, i) => (
                <li key={label}>
                  <button
                    type="button"
                    className={
                      i === 0
                        ? "text-[var(--ink)] border-b border-[var(--ink)] pb-1"
                        : "hover:text-[var(--ink)] transition-colors"
                    }
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((item, index) => (
              <Reveal as="li" delay={(index % 3) * 80} key={item.title} className="flex flex-col gap-5">
                <VisualPlaceholder
                  caption={item.category}
                  ratio="portrait"
                  tone={item.tone}
                />
                <div className="flex flex-col gap-2">
                  <span className="text-eyebrow text-[var(--accent-warm)]">
                    {item.category}
                  </span>
                  <h3 className="font-serif text-xl text-[var(--ink)] leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                    {item.indication}
                  </p>
                  <p className="text-xs text-[var(--ink-discreet)] uppercase tracking-[0.12em] mt-1">
                    {item.material}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>

          <p className="mt-16 text-xs text-[var(--ink-discreet)] border-l border-[var(--line)] pl-4 max-w-2xl">
            Les cas présentés sont anonymisés et publiés avec l’accord du
            praticien concerné. Les visuels affichés sont des placeholders dans
            l’attente de l’intégration des photographies cliniques.
          </p>
        </Container>
      </section>

      <PageCta cta={casCliniques.cta} />
    </>
  );
}
