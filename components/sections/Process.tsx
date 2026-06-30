import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export function Process() {
  const { eyebrow, title, description, steps } = home.process;

  return (
    <section className="bg-[var(--bg-elevated)] border-b border-[var(--line)]">
      <Container size="wide" className="py-24 md:py-32">
        <div className="max-w-3xl">
          <Reveal>
            <SectionHeading
              eyebrow={eyebrow}
              title={title}
              description={description}
            />
          </Reveal>
        </div>

        <ol className="relative mt-16 md:mt-20">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-[1.6rem] hidden md:block h-px bg-[var(--line)]"
          />
          <div className="grid gap-px md:grid-cols-5 md:gap-0 bg-[var(--line)] md:bg-transparent">
            {steps.map((step, index) => (
              <Reveal
                as="li"
                delay={index * 80}
                key={step.index}
                className="relative bg-[var(--bg-elevated)] md:bg-transparent p-6 md:p-0 md:pr-6 flex md:flex-col gap-5"
              >
                <div className="flex md:contents items-start gap-5">
                  <span
                    aria-hidden="true"
                    className="hidden md:block h-3 w-3 rounded-full border border-[var(--accent-warm)] bg-[var(--bg-elevated)] -translate-y-[5px]"
                  />
                  <span className="text-numeral text-eyebrow text-[var(--accent-warm)] md:mt-4 shrink-0">
                    {step.index}
                  </span>
                </div>
                <div className="flex flex-col gap-2 md:mt-2">
                  <h3 className="font-serif text-lg md:text-xl text-[var(--ink)] leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--ink-muted)] leading-relaxed max-w-[15rem]">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </ol>
      </Container>
    </section>
  );
}
