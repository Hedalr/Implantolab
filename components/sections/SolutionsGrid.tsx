import Link from "next/link";
import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Grille "Nos solutions" — placée juste sous le hero, en dessous de la fold.
 * Objectif : donner au dentiste un accès direct aux familles de restauration
 * (conjointe, amovible, esthétique, implanto, flux numérique) dès la home,
 * plutôt que de le forcer à parcourir les onglets Expertises plus bas.
 */
export function SolutionsGrid() {
  const { eyebrow, title, description, items, linkLabel } = home.solutions;

  return (
    <section className="relative overflow-hidden bg-[var(--bg-elevated)] border-b border-[var(--line)]">
      <Container size="wide" className="relative py-16 md:py-20 lg:py-24">
        <Reveal>
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
          />
        </Reveal>

        <ul className="mt-12 md:mt-14 grid gap-px border-y border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-5">
          {items.map((item, index) => (
            <Reveal
              as="li"
              key={item.key}
              delay={index * 60}
              className="group relative bg-[var(--bg)]"
            >
              <Link
                href={item.href}
                className="flex h-full flex-col gap-4 p-6 md:p-7 transition-colors hover:bg-[var(--bg)]"
              >
                <span className="text-numeral text-eyebrow text-[var(--accent)]">
                  {item.number}
                </span>
                <h3 className="font-serif text-xl md:text-[1.35rem] text-[var(--ink)] leading-tight transition-colors group-hover:text-[var(--accent)]">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                  {item.description}
                </p>
                <span className="mt-auto inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
                  {linkLabel}
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    <path
                      d="M2 7h9m0 0L7.5 3.5M11 7l-3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="square"
                    />
                  </svg>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
