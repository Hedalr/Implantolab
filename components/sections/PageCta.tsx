import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import type { SimplePageContent } from "@/content/fr/pages";

type Props = {
  cta: SimplePageContent["cta"];
};

export function PageCta({ cta }: Props) {
  return (
    <section className="bg-[var(--bg-deep)] text-[var(--ink-invert)]">
      <Container size="wide" className="py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-12 items-center">
          <Reveal className="lg:col-span-7 flex flex-col gap-5">
            <h2 className="text-display text-3xl md:text-4xl text-[var(--ink-invert)] text-balance">
              {cta.title}
            </h2>
            <p className="text-[var(--ink-invert-muted)] text-lg leading-relaxed max-w-xl text-pretty">
              {cta.description}
            </p>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-5 flex flex-wrap gap-3 lg:justify-end">
            <Button href={cta.primary.href} variant="invert">
              {cta.primary.label}
            </Button>
            {cta.secondary ? (
              <Button
                href={cta.secondary.href}
                variant="secondary"
                className="text-[var(--ink-invert)] border-[var(--line-invert)] hover:border-[var(--ink-invert)]"
              >
                {cta.secondary.label}
              </Button>
            ) : null}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
