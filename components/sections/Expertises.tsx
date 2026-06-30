import Link from "next/link";
import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { Reveal } from "@/components/ui/Reveal";

export function Expertises() {
  const { eyebrow, title, description, items } = home.expertises;

  return (
    <section className="bg-[var(--bg)] border-b border-[var(--line)]">
      <Container size="wide" className="py-24 md:py-32">
        <div className="grid gap-14 lg:gap-20 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 flex flex-col gap-10">
            <Reveal>
              <SectionHeading
                eyebrow={eyebrow}
                title={title}
                description={description}
              />
            </Reveal>

            <ul className="mt-2 border-t border-[var(--line)]">
              {items.map((item, index) => (
                <Reveal
                  as="li"
                  delay={index * 60}
                  key={item.index}
                  className="border-b border-[var(--line)]"
                >
                  <Link
                    href={item.href}
                    className="group grid grid-cols-12 gap-4 py-6 md:py-7 items-start"
                  >
                    <span className="col-span-2 md:col-span-1 text-numeral text-eyebrow text-[var(--accent-warm)] pt-1">
                      {item.index}
                    </span>
                    <div className="col-span-10 md:col-span-8 flex flex-col gap-2">
                      <h3 className="font-serif text-xl md:text-2xl text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[var(--ink-muted)] text-sm md:text-base leading-relaxed max-w-xl">
                        {item.description}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="hidden md:flex col-span-3 justify-end items-center pt-2 text-[var(--ink-discreet)] group-hover:text-[var(--ink)] transition-colors"
                    >
                      <svg
                        width="18"
                        height="12"
                        viewBox="0 0 18 12"
                        fill="none"
                      >
                        <path
                          d="M0 6H16M16 6L11 1M16 6L11 11"
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                      </svg>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>

          <Reveal delay={120} className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="grid gap-4">
              <VisualPlaceholder
                caption="Détail prothèse zircone"
                ratio="portrait"
                tone="warm"
              />
              <div className="grid grid-cols-2 gap-4">
                <VisualPlaceholder
                  caption="Conception CAD"
                  ratio="square"
                  tone="cool"
                />
                <VisualPlaceholder
                  caption="Finition manuelle"
                  ratio="square"
                  tone="warm"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
