import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  intro: string;
};

export function PageHero({ eyebrow, title, intro }: PageHeroProps) {
  return (
    <section className="bg-[var(--bg)] border-b border-[var(--line)]">
      <Container size="wide" className="pt-16 md:pt-24 pb-16 md:pb-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <span className="text-eyebrow flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-8 bg-[var(--accent-warm)]" />
              {eyebrow}
            </span>
            <h1 className="text-display text-4xl md:text-5xl lg:text-[3.25rem] mt-6 text-balance">
              {title}
            </h1>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-5 lg:pt-2">
            <p className="text-lg text-[var(--ink-muted)] leading-relaxed text-pretty">
              {intro}
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
