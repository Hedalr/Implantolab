import { home } from "@/content/fr/home";
import { site } from "@/content/fr/site";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "@/components/sections/ContactForm";

export function ContactCta() {
  const { eyebrow, title, description, note } = home.contact;

  return (
    <section className="bg-[var(--bg-deep)] text-[var(--ink-invert)]">
      <Container size="wide" className="py-24 md:py-32">
        <div className="grid gap-14 lg:gap-20 lg:grid-cols-12 items-start">
          <div className="lg:col-span-5 flex flex-col gap-8">
            <Reveal>
              <span className="text-eyebrow flex items-center gap-3 text-[var(--ink-invert-muted)]">
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-[var(--accent-warm-soft)]"
                />
                {eyebrow}
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h2 className="text-display text-3xl md:text-4xl lg:text-5xl text-[var(--ink-invert)] text-balance">
                {title}
              </h2>
            </Reveal>

            <Reveal delay={160}>
              <p className="text-lg text-[var(--ink-invert-muted)] leading-relaxed max-w-md text-pretty">
                {description}
              </p>
            </Reveal>

            <Reveal delay={220} className="flex flex-col gap-2 pt-4 text-sm">
              <a
                href={`tel:${site.contact.phone}`}
                className="text-[var(--ink-invert)] hover:text-[var(--accent-warm-soft)] transition-colors"
              >
                {site.contact.phoneDisplay}
              </a>
              <a
                href={`mailto:${site.contact.email}`}
                className="text-[var(--ink-invert)] hover:text-[var(--accent-warm-soft)] transition-colors"
              >
                {site.contact.email}
              </a>
            </Reveal>

            <Reveal delay={280}>
              <p className="text-xs text-[var(--ink-invert-muted)] border-l border-[var(--line-invert)] pl-4 leading-relaxed mt-2 max-w-sm">
                {note}
              </p>
            </Reveal>
          </div>

          <Reveal delay={120} className="lg:col-span-7">
            <ContactForm theme="dark" compact />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
