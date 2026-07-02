import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/sections/PageHero";
import { PageCta } from "@/components/sections/PageCta";
import { recrutement } from "@/content/fr/recrutement";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Recrutement",
  description: recrutement.intro,
  path: "/recrutement",
});

export default function RecrutementPage() {
  return (
    <>
      <PageHero
        eyebrow={recrutement.eyebrow}
        title={recrutement.title}
        intro={recrutement.intro}
      />

      <ValuesSection />
      <BenefitsSection />
      <OpeningsSection />
      <SpontaneousSection />

      <PageCta cta={recrutement.cta} />
    </>
  );
}

function ValuesSection() {
  const { values } = recrutement;

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
                Nos valeurs
              </span>
            </Reveal>
          </div>
          <Reveal delay={80} className="lg:col-span-8">
            <p className="text-xl md:text-2xl text-[var(--ink)] leading-relaxed font-serif text-balance">
              Un état d’esprit partagé, qui guide nos gestes techniques et
              notre manière de collaborer au quotidien.
            </p>
          </Reveal>
        </div>

        <ul className="mt-16 grid gap-px border-y border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value, index) => (
            <Reveal
              as="li"
              delay={index * 70}
              key={value.title}
              className="bg-[var(--bg-elevated)] p-6 lg:p-7 flex flex-col gap-3"
            >
              <span className="text-numeral text-eyebrow text-[var(--accent-warm)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-serif text-lg leading-snug text-[var(--ink)]">
                {value.title}
              </h3>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                {value.description}
              </p>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function BenefitsSection() {
  const { benefits } = recrutement;

  return (
    <section className="bg-[var(--bg)] border-b border-[var(--line)]">
      <Container size="wide" className="py-24 md:py-32">
        <div className="grid gap-14 lg:gap-20 lg:grid-cols-12 items-start">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Reveal>
              <span className="text-eyebrow flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-[var(--accent-warm)]"
                />
                Pourquoi nous rejoindre
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="text-display text-3xl md:text-4xl lg:text-[2.75rem] text-balance">
                Un cadre de travail exigeant, humain et tourné vers l’avenir
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-[var(--ink-muted)] text-lg leading-relaxed text-pretty">
                Nous croyons qu’un bon environnement technique et humain est la
                condition indispensable pour produire des restaurations de
                qualité, jour après jour.
              </p>
            </Reveal>
          </div>

          <Reveal delay={140} className="lg:col-span-7">
            <ul className="flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {benefits.map((benefit, index) => (
                <Reveal
                  as="li"
                  key={benefit.title}
                  delay={index * 60}
                  className="py-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_2fr] sm:gap-8 items-start"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-px w-5 bg-[var(--accent-warm)] shrink-0"
                    />
                    <h3 className="font-serif text-lg text-[var(--ink)] leading-snug">
                      {benefit.title}
                    </h3>
                  </div>
                  <p className="text-[var(--ink-muted)] leading-relaxed text-pretty">
                    {benefit.description}
                  </p>
                </Reveal>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function OpeningsSection() {
  const { openings } = recrutement;

  return (
    <section className="bg-[var(--bg-elevated)] border-b border-[var(--line)]">
      <Container size="wide" className="py-24 md:py-32">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16 items-end">
          <Reveal className="lg:col-span-8 flex flex-col gap-5">
            <span className="text-eyebrow flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-px w-8 bg-[var(--accent-warm)]"
              />
              Postes ouverts
            </span>
            <h2 className="text-display text-3xl md:text-4xl lg:text-[2.75rem] text-balance">
              Trois opportunités pour rejoindre l’atelier
            </h2>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-4">
            <p className="text-[var(--ink-muted)] leading-relaxed text-pretty">
              Nos postes ouverts, actualisés régulièrement. Chaque candidature
              est étudiée par notre équipe.
            </p>
          </Reveal>
        </div>

        <ul className="mt-14 flex flex-col gap-px bg-[var(--line)] border-y border-[var(--line)]">
          {openings.map((opening, index) => (
            <Reveal
              as="li"
              key={opening.role}
              delay={index * 80}
              className="bg-[var(--bg-elevated)]"
            >
              <article className="grid gap-8 p-6 md:p-10 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <span className="text-numeral text-eyebrow text-[var(--accent-warm)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-display text-2xl md:text-3xl text-[var(--ink)] text-balance">
                    {opening.role}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Chip>{opening.contract}</Chip>
                    <Chip>{opening.location}</Chip>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-5">
                  <p className="text-[var(--ink-muted)] leading-relaxed text-pretty">
                    {opening.summary}
                  </p>
                  <div className="flex flex-col gap-3">
                    <span className="text-eyebrow text-[var(--ink-discreet)]">
                      Compétences recherchées
                    </span>
                    <ul className="flex flex-wrap gap-2">
                      {opening.skills.map((skill) => (
                        <li
                          key={skill}
                          className="text-xs tracking-wide text-[var(--ink-muted)] border border-[var(--line-strong)] px-3 py-1.5"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="lg:col-span-3 flex lg:justify-end lg:items-start">
                  <Button
                    href={`/recrutement/candidature?poste=${encodeURIComponent(opening.role)}`}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    Postuler
                  </Button>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function SpontaneousSection() {
  const { spontaneous } = recrutement;

  return (
    <section className="bg-[var(--bg)] border-b border-[var(--line)]">
      <Container size="wide" className="py-20 md:py-24">
        <Reveal>
          <div className="border border-[var(--line-strong)] bg-[var(--bg-elevated)] p-8 md:p-12 lg:p-16">
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-16 items-center">
              <div className="lg:col-span-7 flex flex-col gap-5">
                <span className="text-eyebrow flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-px w-8 bg-[var(--accent-warm)]"
                  />
                  Candidature spontanée
                </span>
                <h2 className="text-display text-2xl md:text-3xl lg:text-[2.25rem] text-balance">
                  {spontaneous.title}
                </h2>
                <p className="text-[var(--ink-muted)] text-lg leading-relaxed text-pretty">
                  {spontaneous.description}
                </p>
              </div>
              <div className="lg:col-span-5 flex flex-wrap gap-3 lg:justify-end">
                <Button href="/recrutement/candidature" variant="primary">
                  Envoyer une candidature
                </Button>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-3 text-[var(--ink)] border-b border-[var(--ink)] pb-1 text-sm tracking-wide hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors self-center"
                >
                  Nous écrire
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
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs tracking-wide uppercase text-[var(--ink)] bg-[var(--bg)] border border-[var(--line-strong)] px-3 py-1.5">
      {children}
    </span>
  );
}
