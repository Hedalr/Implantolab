import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

export function Reassurance() {
  const { intro, pillars } = home.reassurance;

  return (
    <section className="bg-[var(--bg-elevated)] border-b border-[var(--line)]">
      <Container size="wide" className="py-20 md:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <Reveal>
              <span className="text-eyebrow flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-[var(--accent-warm)]"
                />
                Notre engagement
              </span>
            </Reveal>
          </div>
          <Reveal delay={80} className="lg:col-span-8">
            <p className="text-xl md:text-2xl text-[var(--ink)] leading-relaxed font-serif text-balance">
              {intro}
            </p>
          </Reveal>
        </div>

        <ul className="mt-16 grid gap-px border-y border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-5">
          {pillars.map((pillar, index) => (
            <Reveal
              as="li"
              delay={index * 60}
              key={pillar.title}
              className="bg-[var(--bg-elevated)] p-6 lg:p-7 flex flex-col gap-3"
            >
              <span className="text-numeral text-eyebrow text-[var(--accent-warm)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-serif text-lg leading-snug text-[var(--ink)]">
                {pillar.title}
              </h3>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                {pillar.description}
              </p>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
