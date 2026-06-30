import Link from "next/link";
import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { Reveal } from "@/components/ui/Reveal";

export function Quality() {
  const { eyebrow, title, description, indicators, link, visualCaption } =
    home.quality;

  return (
    <section className="bg-[var(--bg)] border-b border-[var(--line)]">
      <Container size="wide" className="py-24 md:py-32">
        <div className="grid gap-14 lg:gap-20 lg:grid-cols-12 items-center">
          <Reveal className="lg:col-span-5 order-2 lg:order-1">
            <VisualPlaceholder
              caption={visualCaption}
              ratio="portrait"
              tone="deep"
            />
          </Reveal>

          <div className="lg:col-span-7 lg:col-start-6 order-1 lg:order-2 flex flex-col gap-10">
            <Reveal>
              <SectionHeading
                eyebrow={eyebrow}
                title={title}
                description={description}
              />
            </Reveal>

            <ul className="grid gap-6 sm:grid-cols-3 border-t border-[var(--line)] pt-8">
              {indicators.map((indicator, index) => (
                <Reveal
                  as="li"
                  delay={index * 60}
                  key={indicator.title}
                  className="flex flex-col gap-2"
                >
                  <span
                    aria-hidden="true"
                    className="h-px w-6 bg-[var(--accent-warm)] mb-2"
                  />
                  <h3 className="font-serif text-base text-[var(--ink)]">
                    {indicator.title}
                  </h3>
                  <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                    {indicator.description}
                  </p>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={180}>
              <Link
                href={link.href}
                className="inline-flex items-center gap-3 text-[var(--ink)] border-b border-[var(--ink)] pb-1 text-sm tracking-wide hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
              >
                {link.label}
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                  <path
                    d="M0 5H12M12 5L8 1M12 5L8 9"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              </Link>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
