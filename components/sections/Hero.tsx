import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { ParallaxImage } from "@/components/ui/ParallaxImage";
import { HeroVideo } from "@/components/sections/HeroVideo";
import { HeroSlogan } from "@/components/sections/HeroSlogan";
import { HeroScroll } from "@/components/sections/HeroScroll";

export function Hero() {
  const {
    slogan,
    eyebrow,
    title,
    subtitle,
    primaryCta,
    secondaryCta,
    visualCaption,
    visualCaptionSecondary,
  } = home.hero;

  return (
    <section className="grain relative overflow-hidden bg-[var(--bg)]">
      <Container
        size="wide"
        className="relative pt-8 md:pt-10 lg:pt-12 pb-20 md:pb-28 lg:pb-36"
      >
        <HeroScroll
          copy={
            <>
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
                  <strong className="font-semibold text-[var(--ink)]">
                    IMPLANTOLAB
                  </strong>
                  {subtitle.replace(/^IMPLANTOLAB/, "")}
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
            </>
          }
          visuals={
            <>
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <Reveal variant="rise">
                  <ParallaxImage offset={14}>
                    <figure className="photo-lift relative">
                      <HeroVideo
                        src="/videos/hero-implanto.mp4"
                        className="relative w-full aspect-[3/4] max-h-[560px] overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[0_20px_40px_rgba(0,0,0,0.06)]"
                      />
                      <figcaption className="pointer-events-none absolute bottom-2 left-2 rounded-sm bg-white/85 backdrop-blur-sm px-2 py-1 text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.14em] text-[var(--ink-discreet)]">
                        {visualCaption}
                      </figcaption>
                    </figure>
                  </ParallaxImage>
                </Reveal>
                <Reveal variant="rise" delay={120} className="mt-4 sm:mt-6">
                  <ParallaxImage offset={18}>
                    <figure className="photo-lift relative">
                      <HeroVideo
                        src="/videos/hero-implanto-2.mp4"
                        className="relative w-full aspect-[3/4] max-h-[560px] overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[0_20px_40px_rgba(0,0,0,0.06)]"
                      />
                      <figcaption className="pointer-events-none absolute bottom-2 left-2 rounded-sm bg-white/85 backdrop-blur-sm px-2 py-1 text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.14em] text-[var(--ink-discreet)]">
                        {visualCaptionSecondary}
                      </figcaption>
                    </figure>
                  </ParallaxImage>
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
            </>
          }
        />
      </Container>

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--line)] to-transparent"
      />
    </section>
  );
}
