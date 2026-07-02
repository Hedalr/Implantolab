import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Reveal } from "@/components/ui/Reveal";

export function StatsBand() {
  const { eyebrow, title, description, items } = home.stats;

  return (
    <section className="bg-[var(--bg-elevated)] border-b border-[var(--line)]">
      <Container size="wide" className="py-24 md:py-32">
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-12 items-end">
          <Reveal className="lg:col-span-6">
            <SectionHeading
              eyebrow={eyebrow}
              title={title}
              description={description}
            />
          </Reveal>
          <Reveal delay={100} className="lg:col-span-6">
            <p className="text-sm text-[var(--ink-discreet)] lg:text-right">
              Chiffres mis à jour {new Date().getFullYear()}.
            </p>
          </Reveal>
        </div>

        <ul className="mt-14 md:mt-16 grid gap-px border-y border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <Reveal
              as="li"
              key={item.label}
              delay={index * 80}
              className="bg-[var(--bg-elevated)] p-8 md:p-10 flex flex-col gap-3"
            >
              <span
                aria-hidden="true"
                className="h-px w-8 bg-[var(--accent-warm)]"
              />
              <span className="text-numeral text-display text-4xl md:text-5xl lg:text-6xl text-[var(--ink)] leading-none">
                <AnimatedNumber value={item.value} suffix={item.suffix} />
              </span>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed max-w-[16rem]">
                {item.label}
              </p>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
