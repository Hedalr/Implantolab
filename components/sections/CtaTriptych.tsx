import Link from "next/link";
import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

const toneMap = {
  deep: "bg-[var(--bg-deep)] text-[var(--ink-invert)]",
  warm: "bg-[var(--accent)] text-[var(--ink-invert)]",
  cool: "bg-[var(--accent-warm)] text-[var(--ink-invert)]",
} as const;

const toneMuted = {
  deep: "text-[var(--ink-invert-muted)]",
  warm: "text-[#fdeef4]",
  cool: "text-[var(--ink-invert-muted)]",
} as const;

export function CtaTriptych() {
  const { eyebrow, title, items } = home.ctaTriptych;

  return (
    <section className="bg-[var(--bg)] border-b border-[var(--line)]">
      <Container size="wide" className="py-16 md:py-24 lg:py-32">
        <div className="max-w-2xl">
          <Reveal>
            <SectionHeading eyebrow={eyebrow} title={title} />
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-4 md:gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <Reveal
              as="li"
              delay={index * 100}
              key={item.title}
              className={cn(
                "group relative flex flex-col justify-between gap-8 md:gap-10 p-6 sm:p-8 md:p-10 min-h-0 md:min-h-[16rem]",
                "transition duration-200 ease-out will-change-transform",
                "hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(0,0,0,0.16)]",
                toneMap[item.tone],
              )}
            >
              <div className="flex flex-col gap-4">
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-current opacity-60"
                />
                <h3 className="text-display text-2xl md:text-3xl leading-tight">
                  {item.title}
                </h3>
                <p className={cn("text-sm leading-relaxed", toneMuted[item.tone])}>
                  {item.description}
                </p>
              </div>

              <Link
                href={item.cta.href}
                className="tap-link gap-3 text-sm tracking-wide self-start"
              >
                <span className="inline-flex items-center gap-3 border-b border-current pb-1">
                  {item.cta.label}
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path
                      d="M0 5H12M12 5L8 1M12 5L8 9"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
