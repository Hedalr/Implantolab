import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { HeroVideo } from "@/components/sections/HeroVideo";

export function Hero() {
  const { slogan, eyebrow, title, subtitle, primaryCta, secondaryCta } =
    home.hero;

  return (
    <section className="relative overflow-hidden bg-[var(--bg)]">
      {/* Halo doux en fond, casse l'effet plat "blog" sans être bruyant */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-0"
      >
        <div className="absolute -top-24 -right-16 h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(232,143,172,0.16),transparent_65%)] blur-2xl" />
        <div className="absolute top-24 -left-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(201,75,122,0.08),transparent_65%)] blur-2xl" />
      </div>

      <Container
        size="wide"
        className="relative pt-10 md:pt-14 lg:pt-16 pb-20 md:pb-28 lg:pb-36"
      >
        <Reveal>
          <p className="font-serif italic text-2xl sm:text-3xl md:text-4xl text-[var(--accent)] tracking-tight leading-tight mb-6 md:mb-8">
            <span className="block">{slogan.line1}</span>
            <span className="block">
              <span aria-hidden="true" className="invisible">
                {slogan.line2Offset}
              </span>
              {slogan.line2}
            </span>
          </p>
        </Reveal>

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
              <HeroVideo
                src="/videos/hero-implanto.mp4"
                className="relative w-full aspect-[3/4] max-h-[560px] overflow-hidden bg-[var(--bg-elevated)]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-between px-1 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--ink-discreet)]">
                <span>Réf. ATL—001</span>
                <span>Blois, FR</span>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>

      {/* Ligne séparatrice fine avec dégradé — plus soft qu'une bordure nette */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--line)] to-transparent"
      />
    </section>
  );
}
