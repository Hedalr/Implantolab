import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { Reveal } from "@/components/ui/Reveal";

export function Hero() {
  const { eyebrow, title, subtitle, primaryCta, secondaryCta, visualCaption } =
    home.hero;

  return (
    <section className="relative border-b border-[var(--line)] bg-[var(--bg)]">
      <Container size="wide" className="py-20 md:py-28 lg:py-36">
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 flex flex-col gap-8">
            <Reveal>
              <span className="text-eyebrow flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-10 bg-[var(--accent-warm)]"
                />
                {eyebrow}
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="text-display text-4xl md:text-5xl lg:text-[3.75rem] text-balance">
                {title}
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="text-lg md:text-xl text-[var(--ink-muted)] leading-relaxed max-w-xl text-pretty">
                {subtitle}
              </p>
            </Reveal>

            <Reveal delay={240} className="flex flex-wrap gap-3 pt-2">
              <Button href={primaryCta.href} variant="primary">
                {primaryCta.label}
              </Button>
              <Button href={secondaryCta.href} variant="secondary">
                {secondaryCta.label}
              </Button>
            </Reveal>
          </div>

          <Reveal delay={200} className="lg:col-span-5">
            <div className="relative">
              <VisualPlaceholder
                caption={visualCaption}
                ratio="tall"
                tone="warm"
              />
              <div className="absolute -bottom-px left-0 right-0 flex justify-between px-1 pt-1 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--ink-discreet)]">
                <span>Réf. ATL—001</span>
                <span>Paris, FR</span>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
