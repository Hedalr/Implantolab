import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import type { SimplePageContent } from "@/content/fr/pages";

type Props = {
  sections: SimplePageContent["sections"];
};

export function PageSections({ sections }: Props) {
  return (
    <div className="bg-[var(--bg-elevated)]">
      {sections.map((section, index) => (
        <section
          key={`${section.title}-${index}`}
          className="border-b border-[var(--line)]"
        >
          <Container size="wide" className="py-20 md:py-24">
            <div className="grid gap-10 lg:gap-16 lg:grid-cols-12 items-start">
              <Reveal className="lg:col-span-4">
                <div className="flex flex-col gap-4 lg:sticky lg:top-28">
                  <span className="text-numeral text-eyebrow text-[var(--accent-warm)]">
                    {String(index + 1).padStart(2, "0")}
                    {section.eyebrow ? ` — ${section.eyebrow}` : ""}
                  </span>
                  <h2 className="text-display text-2xl md:text-3xl lg:text-[2.25rem] text-balance">
                    {section.title}
                  </h2>
                </div>
              </Reveal>

              <Reveal delay={80} className="lg:col-span-8 flex flex-col gap-8">
                <p className="text-[var(--ink-muted)] text-lg leading-relaxed text-pretty">
                  {section.body}
                </p>
                {section.items ? (
                  <ul className="grid gap-px bg-[var(--line)] sm:grid-cols-2 border-y border-[var(--line)]">
                    {section.items.map((item) => (
                      <li
                        key={item.title}
                        className="bg-[var(--bg-elevated)] p-6 flex flex-col gap-2"
                      >
                        <h3 className="font-serif text-lg text-[var(--ink)]">
                          {item.title}
                        </h3>
                        <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                          {item.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Reveal>
            </div>
          </Container>
        </section>
      ))}
    </div>
  );
}
