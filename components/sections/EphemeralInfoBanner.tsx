import Link from "next/link";
import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

export function EphemeralInfoBanner() {
  const { eyebrow, items } = home.ephemeral;

  if (!items || items.length === 0) return null;

  return (
    <section
      aria-label="Informations récentes"
      className="bg-[var(--bg-elevated)] border-b border-[var(--line)]"
    >
      <Container size="wide" className="py-10 md:py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-12">
          <span className="text-eyebrow flex items-center gap-3 shrink-0 md:pt-1">
            <span
              aria-hidden="true"
              className="h-px w-8 bg-[var(--accent-warm)]"
            />
            {eyebrow}
          </span>

          <ul className="flex-1 grid gap-6 md:grid-cols-2">
            {items.map((item, index) => (
              <Reveal
                as="li"
                key={item.title + index}
                delay={index * 60}
                variant="rise"
                className="flex flex-col gap-2 border-l border-[var(--line-strong)] pl-4"
              >
                <span className="text-eyebrow text-[var(--accent-warm)]">
                  {item.label}
                </span>
                <h3 className="font-serif text-lg text-[var(--ink)] text-balance">
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                    {item.description}
                  </p>
                ) : null}
                {item.cta ? (
                  <Link
                    href={item.cta.href}
                    className="tap-link mt-1 gap-2 text-sm text-[var(--ink)] self-start hover:text-[var(--accent)] transition-colors"
                  >
                    <span className="inline-flex items-center gap-2 border-b border-current pb-1">
                      {item.cta.label}
                      <svg
                        width="14"
                        height="10"
                        viewBox="0 0 14 10"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M0 5H12M12 5L8 1M12 5L8 9"
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                      </svg>
                    </span>
                  </Link>
                ) : null}
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
