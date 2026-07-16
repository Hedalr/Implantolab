import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { PageCta } from "@/components/sections/PageCta";
import { FluxNumeriqueWorkflow } from "@/components/sections/FluxNumeriqueWorkflow";
import type { SimplePageContent } from "@/content/fr/pages";

type Props = {
  content: SimplePageContent;
};

/**
 * Mise en page dédiée à /flux-numerique, plus visuelle et moins linéaire
 * que la présentation générique PageSections utilisée sur les autres pages.
 *
 * Blocs :
 *  01 Formats — grille de badges de formats acceptés.
 *  02 Workflow — timeline horizontale (5 étapes, chevrons).
 *  03 Outils — grille de cartes machines (parc technologique).
 *  04 Sécurité — bloc éditorial sombre pour marquer la rupture.
 */
export function FluxNumeriqueLayout({ content }: Props) {
  const [formatsSection, workflowSection, toolsSection, securitySection] =
    content.sections;

  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        intro={content.intro}
      />

      {formatsSection ? <FormatsBlock section={formatsSection} /> : null}
      {workflowSection ? (
        <FluxNumeriqueWorkflow section={workflowSection} />
      ) : null}
      {toolsSection ? <ToolsGrid section={toolsSection} /> : null}
      {securitySection ? <SecurityBlock section={securitySection} /> : null}

      <PageCta cta={content.cta} />
    </>
  );
}

type SectionProps = { section: SimplePageContent["sections"][number] };

const FORMAT_BADGES = ["STL", "PLY", "OBJ"] as const;

function FormatsBlock({ section }: SectionProps) {
  return (
    <section
      id="formats"
      className="bg-[var(--bg-elevated)] border-b border-[var(--line)] scroll-mt-24"
    >
      <Container size="wide" className="py-14 md:py-20 lg:py-28">
        <div className="grid gap-10 lg:gap-16 lg:grid-cols-12 items-start">
          <Reveal className="lg:col-span-5">
            <div className="flex flex-col gap-4">
              <span className="text-numeral text-eyebrow text-[var(--accent-warm)]">
                01 — {section.eyebrow}
              </span>
              <h2 className="text-display text-2xl md:text-3xl lg:text-[2.25rem] text-balance">
                {section.title}
              </h2>
            </div>
          </Reveal>

          <Reveal delay={80} className="lg:col-span-7 flex flex-col gap-8">
            <p className="text-[var(--ink-muted)] text-base sm:text-lg leading-relaxed text-pretty">
              {section.body}
            </p>
            <ul className="flex flex-wrap gap-3">
              {FORMAT_BADGES.map((format) => (
                <li
                  key={format}
                  className="inline-flex items-center gap-2 border border-[var(--line-strong)] bg-[var(--bg)] px-4 sm:px-5 py-2.5 sm:py-3 text-numeral text-base sm:text-lg tracking-wider text-[var(--ink)]"
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                  />
                  .{format.toLowerCase()}
                </li>
              ))}
              <li className="w-full sm:w-auto inline-flex items-center gap-2 border border-dashed border-[var(--line-strong)] bg-transparent px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm text-[var(--ink-discreet)]">
                + empreintes physiques numérisées
              </li>
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function ToolsGrid({ section }: SectionProps) {
  const items = section.items ?? [];

  return (
    <section
      id="outils"
      className="bg-[var(--bg-elevated)] border-b border-[var(--line)] scroll-mt-24"
    >
      <Container size="wide" className="py-14 md:py-20 lg:py-28">
        <div className="grid gap-10 lg:gap-16 lg:grid-cols-12 items-end">
          <Reveal className="lg:col-span-7 flex flex-col gap-4">
            <span className="text-numeral text-eyebrow text-[var(--accent-warm)]">
              03 — {section.eyebrow}
            </span>
            <h2 className="text-display text-2xl md:text-3xl lg:text-[2.25rem] text-balance">
              {section.title}
            </h2>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-5">
            <p className="text-[var(--ink-muted)] leading-relaxed text-pretty">
              {section.body}
            </p>
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item, index) => (
            <Reveal
              as="li"
              key={item.title}
              delay={index * 80}
              className="group relative flex flex-col gap-4 border border-[var(--line)] bg-[var(--bg)] p-6 md:p-7 h-full transition-colors hover:border-[var(--accent)]"
            >
              <div className="flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center border border-[var(--line-strong)] text-[var(--accent)] group-hover:border-[var(--accent)] transition-colors"
                >
                  <MachineIcon index={index} />
                </span>
                <span className="text-numeral text-eyebrow text-[var(--ink-discreet)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-serif text-lg text-[var(--ink)] transition-colors hover:text-[var(--accent)]">
                {item.title}
              </h3>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                {item.description}
              </p>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function SecurityBlock({ section }: SectionProps) {
  return (
    <section
      id="securite"
      className="bg-[var(--bg-deep)] text-[var(--ink-invert)] border-b border-[var(--line-invert)] scroll-mt-24"
    >
      <Container size="wide" className="py-14 md:py-20 lg:py-28">
        <div className="grid gap-10 lg:gap-16 lg:grid-cols-12 items-start">
          <Reveal className="lg:col-span-4">
            <div className="flex flex-col gap-4">
              <span className="text-numeral text-eyebrow text-[var(--accent-warm-soft)]">
                04 — {section.eyebrow}
              </span>
              <h2 className="text-display text-2xl md:text-3xl lg:text-[2.25rem] text-[var(--ink-invert)] text-balance">
                {section.title}
              </h2>
            </div>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-8">
            <p className="text-[var(--ink-invert-muted)] text-base sm:text-lg leading-relaxed text-pretty">
              {section.body}
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/**
 * Petites icônes SVG évoquant l'univers machine (impression, usinage, fusion,
 * logiciel). Neutres, choisies pour rester cohérentes avec le trait fin
 * utilisé dans le reste du site.
 */
function MachineIcon({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="7" stroke="currentColor" />
          <path d="M4 10V13" stroke="currentColor" />
          <path d="M12 10V13" stroke="currentColor" />
          <path d="M5 13H11" stroke="currentColor" />
        </svg>
      );
    case 1:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" />
          <path d="M8 2.5V5" stroke="currentColor" />
          <path d="M8 11V13.5" stroke="currentColor" />
          <path d="M2.5 8H5" stroke="currentColor" />
          <path d="M11 8H13.5" stroke="currentColor" />
        </svg>
      );
    case 2:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 13L8 3L14 13H2Z" stroke="currentColor" />
          <path d="M8 8V10" stroke="currentColor" />
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="4" width="12" height="8" stroke="currentColor" />
          <path d="M5 8H11" stroke="currentColor" />
          <path d="M5 10H9" stroke="currentColor" />
        </svg>
      );
  }
}
