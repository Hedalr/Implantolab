import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { HeroVideo } from "@/components/sections/HeroVideo";
import { HeroSlogan } from "@/components/sections/HeroSlogan";

export function Hero() {
  const { slogan, eyebrow, title, subtitle, primaryCta, secondaryCta } =
    home.hero;

  return (
    <section className="grain relative overflow-hidden bg-[var(--bg)]">
      {/* Halos doux : cassent le blanc plat sans distraire.
          Trois foyers pour créer une profondeur diagonale douce. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-0"
      >
        <div className="absolute -top-24 -right-16 h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(232,143,172,0.22),transparent_65%)] blur-2xl" />
        <div className="absolute top-24 -left-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(201,75,122,0.10),transparent_65%)] blur-2xl" />
        <div className="absolute -bottom-24 left-1/3 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,200,216,0.28),transparent_70%)] blur-3xl" />
      </div>

      <Container
        size="wide"
        className="relative pt-8 md:pt-10 lg:pt-12 pb-20 md:pb-28 lg:pb-36"
      >
        <div className="grid gap-8 sm:gap-12 lg:gap-10 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 flex flex-col gap-8">
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

          <div className="lg:col-span-6 flex flex-col gap-5 sm:gap-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              <Reveal variant="rise">
                <figure className="photo-lift relative">
                  <HeroVideo
                    src="/videos/hero-implanto.mp4"
                    className="relative w-full aspect-[3/4] max-h-[560px] overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[0_20px_40px_rgba(0,0,0,0.06)]"
                  />
                  <figcaption className="pointer-events-none absolute bottom-2 left-2 rounded-sm bg-white/85 backdrop-blur-sm px-2 py-1 text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.14em] text-[var(--ink-discreet)]">
                    Réf. ATL—001
                  </figcaption>
                </figure>
              </Reveal>
              <Reveal variant="rise" delay={120} className="mt-4 sm:mt-6">
                <figure className="photo-lift relative">
                  <HeroVideo
                    src="/videos/hero-implanto-2.mp4"
                    className="relative w-full aspect-[3/4] max-h-[560px] overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[0_20px_40px_rgba(0,0,0,0.06)]"
                  />
                  <figcaption className="pointer-events-none absolute bottom-2 left-2 rounded-sm bg-white/85 backdrop-blur-sm px-2 py-1 text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.14em] text-[var(--ink-discreet)]">
                    Blois, FR
                  </figcaption>
                </figure>
              </Reveal>
            </div>

            <Reveal delay={200} className="w-full flex justify-center">
              <HeroSlogan
                variant="italic"
                line1={slogan.line1}
                line2={slogan.line2}
                line2Offset={slogan.line2Offset}
                emphasis={slogan.emphasis}
              />
            </Reveal>
          </div>
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
