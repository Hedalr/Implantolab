import Link from "next/link";
import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { ProductionChainDiagram } from "@/components/ui/ProductionChainDiagram";
import { Reveal } from "@/components/ui/Reveal";
import { ParallaxImage } from "@/components/ui/ParallaxImage";

export function LabIntro() {
  const {
    eyebrow,
    title,
    body,
    highlights,
    link,
    processEyebrow,
    processFootnote,
    processSteps,
  } = home.labIntro;

  return (
    <section className="relative bg-[var(--bg-elevated)] overflow-hidden">
      {/* Gradient soft haut/bas pour adoucir la transition avec les sections voisines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--bg)] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--bg)] to-transparent"
      />

      <Container size="wide" className="relative py-16 md:py-24 lg:py-32">
        <div className="grid gap-10 lg:gap-20 lg:grid-cols-12 items-center">
          <Reveal className="lg:col-span-6" variant="reveal-x">
            <ParallaxImage offset={40}>
              <ProductionChainDiagram
                steps={processSteps}
                eyebrow={processEyebrow}
                footnote={processFootnote}
              />
            </ParallaxImage>
          </Reveal>

          <div className="lg:col-span-6 flex flex-col gap-8">
            <Reveal>
              <span className="text-eyebrow flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-[var(--accent-warm)]"
                />
                {eyebrow}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="text-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] text-balance">
                {title}
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-[var(--ink-muted)] text-base sm:text-lg leading-relaxed text-pretty">
                {body}
              </p>
            </Reveal>
            <Reveal delay={220}>
              <ul className="flex flex-col gap-3 border-t border-[var(--line)] pt-6">
                {highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[var(--ink)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-px w-5 bg-[var(--accent-warm)] shrink-0"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            {link ? (
              <Reveal delay={280}>
                <Link
                  href={link.href}
                  className="tap-link gap-3 text-[var(--ink)] text-sm tracking-wide hover:text-[var(--accent)] transition-colors self-start"
                >
                  <span className="inline-flex items-center gap-3 border-b border-current pb-1">
                    {link.label}
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                      <path
                        d="M0 5H12M12 5L8 1M12 5L8 9"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                    </svg>
                  </span>
                </Link>
              </Reveal>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
