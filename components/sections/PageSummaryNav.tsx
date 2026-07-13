import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

export type PageSummaryItem = {
  label: string;
  href: string;
  description?: string;
  eyebrow?: string;
};

type Props = {
  eyebrow?: string;
  title?: string;
  intro?: string;
  items: PageSummaryItem[];
};

/**
 * Sommaire des sous-rubriques d'une page d'atterrissage.
 * Repris du pattern déjà en place sur /expertises pour donner un accès
 * direct aux ancres internes ou aux sous-pages.
 */
export function PageSummaryNav({ eyebrow, title, intro, items }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label={title ?? "Sommaire"}
      className="bg-[var(--bg-elevated)] border-b border-[var(--line)]"
    >
      <Container size="wide" className="py-14 md:py-20">
        {title || intro || eyebrow ? (
          <div className="max-w-3xl flex flex-col gap-4">
            {eyebrow ? (
              <Reveal>
                <span className="text-eyebrow flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-px w-8 bg-[var(--accent-warm)]"
                  />
                  {eyebrow}
                </span>
              </Reveal>
            ) : null}
            {title ? (
              <Reveal delay={60}>
                <h2 className="text-display text-2xl md:text-3xl lg:text-[2.25rem] text-balance">
                  {title}
                </h2>
              </Reveal>
            ) : null}
            {intro ? (
              <Reveal delay={120}>
                <p className="text-[var(--ink-muted)] text-base sm:text-lg leading-relaxed text-pretty">
                  {intro}
                </p>
              </Reveal>
            ) : null}
          </div>
        ) : null}

        <ul className="mt-10 flex flex-wrap justify-center border-y border-[var(--line)]">
          {items.map((item, index) => (
            <Reveal
              as="li"
              key={item.href}
              delay={(index % 3) * 60}
              variant="rise"
              className="w-full bg-[var(--bg-elevated)] border-b border-[var(--line)] md:w-1/2 md:border-r md:even:border-r-0 lg:w-1/3 lg:even:border-r lg:[&:nth-child(3n)]:border-r-0"
            >
              <Link
                href={item.href}
                className="group flex h-full flex-col gap-3 p-6 md:p-8 hover:bg-[var(--bg)] transition-colors"
              >
                <span className="text-numeral text-eyebrow text-[var(--accent-warm)]">
                  {String(index + 1).padStart(2, "0")}
                  {item.eyebrow ? ` — ${item.eyebrow}` : ""}
                </span>
                <h3 className="font-serif text-xl leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors text-balance">
                  {item.label}
                </h3>
                {item.description ? (
                  <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                    {item.description}
                  </p>
                ) : null}
                <span className="mt-auto inline-flex items-center gap-2 text-xs tracking-wide text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                  <span className="inline-flex items-center gap-2 border-b border-current pb-1">
                    Voir la section
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
              </Link>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
