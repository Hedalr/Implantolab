import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/sections/PageHero";
import { PageCta } from "@/components/sections/PageCta";
import { PageSummaryNav } from "@/components/sections/PageSummaryNav";
import { recrutement } from "@/content/fr/recrutement";
import { getJobOpenings, type RecrutementOpening } from "@/lib/notion-jobs";
import { pageMetadata } from "@/lib/metadata";

export const revalidate = 600;

const summary = [
  {
    label: "Nos valeurs & nous rejoindre",
    href: "/recrutement#valeurs",
    eyebrow: "État d'esprit",
    description:
      "Ce qui nous anime et ce que nous vous offrons au quotidien.",
  },
  {
    label: "Postes ouverts",
    href: "/recrutement#postes",
    eyebrow: "Opportunités",
    description:
      "Les postes actuellement disponibles dans notre atelier de Blois.",
  },
  {
    label: "Stage & alternance",
    href: "/recrutement#stage-alternance",
    eyebrow: "Formation",
    description:
      "Rejoindre le laboratoire dans le cadre d'une formation en prothèse dentaire.",
  },
];

export const metadata = pageMetadata({
  title: "Recrutement",
  description: recrutement.intro,
  path: "/recrutement",
});

export default async function RecrutementPage() {
  const openings = await getJobOpenings();

  return (
    <>
      <PageHero
        eyebrow={recrutement.eyebrow}
        title={recrutement.title}
        intro={recrutement.intro}
      />

      <PageSummaryNav
        eyebrow="Sommaire"
        title="Comment souhaitez-vous nous rejoindre ?"
        items={summary}
      />

      <ValuesAndBenefitsSection />
      <OpeningsSection openings={openings} />
      <StageAlternanceSection />

      <PageCta cta={recrutement.cta} />
    </>
  );
}

function ValuesAndBenefitsSection() {
  const { values, benefits } = recrutement;

  return (
    <section
      id="valeurs"
      className="bg-[var(--bg-elevated)] border-b border-[var(--line)] scroll-mt-24"
    >
      <Container size="wide" className="py-16 md:py-24 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-end">
          <Reveal className="lg:col-span-7 flex flex-col gap-5">
            <span className="text-eyebrow flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-px w-8 bg-[var(--accent-warm)]"
              />
              Nos valeurs & pourquoi nous rejoindre
            </span>
            <h2 className="text-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] text-balance">
              Un état d’esprit partagé, un cadre humain et tourné vers l’avenir
            </h2>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-5">
            <p className="text-[var(--ink-muted)] text-base sm:text-lg leading-relaxed text-pretty">
              Nos valeurs guident nos gestes techniques ; notre organisation en
              fait un quotidien vivable et stimulant. Voici, en deux temps, ce
              qui nous anime et ce que nous vous offrons.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <span className="text-numeral text-eyebrow text-[var(--accent)]">
              I — Nos valeurs
            </span>
            <ul className="flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {values.map((value, index) => (
                <Reveal
                  as="li"
                  delay={index * 60}
                  key={value.title}
                  className="py-5 flex flex-col gap-2"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-numeral text-eyebrow text-[var(--accent-warm)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-serif text-lg leading-snug text-[var(--ink)]">
                      {value.title}
                    </h3>
                  </div>
                  <p className="text-sm text-[var(--ink-muted)] leading-relaxed pl-10">
                    {value.description}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            <span className="text-numeral text-eyebrow text-[var(--accent)]">
              II — Pourquoi nous rejoindre
            </span>
            <ul className="flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {benefits.map((benefit, index) => (
                <Reveal
                  as="li"
                  key={benefit.title}
                  delay={index * 60}
                  className="py-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_2fr] sm:gap-8 items-start"
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
                  <div className="flex flex-col gap-3">
                    <p className="text-[var(--ink-muted)] leading-relaxed text-pretty">
                      {benefit.description}
                    </p>
                    {benefit.highlights && benefit.highlights.length > 0 ? (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {benefit.highlights.map((highlight) => (
                          <li
                            key={highlight}
                            className="flex items-start gap-2 text-sm text-[var(--ink)] leading-relaxed"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-2 h-px w-3 bg-[var(--accent-warm)] shrink-0"
                            />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}

function OpeningsSection({ openings }: { openings: RecrutementOpening[] }) {
  const heading =
    openings.length > 0
      ? `${openings.length} opportunité${openings.length > 1 ? "s" : ""} pour rejoindre l’atelier`
      : "Aucun poste ouvert pour le moment";

  return (
    <section
      id="postes"
      className="bg-[var(--bg)] border-b border-[var(--line)] scroll-mt-24"
    >
      <Container size="wide" className="py-16 md:py-24 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16 items-end">
          <Reveal className="lg:col-span-8 flex flex-col gap-5">
            <span className="text-eyebrow flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-px w-8 bg-[var(--accent-warm)]"
              />
              Postes ouverts
            </span>
            <h2 className="text-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] text-balance">
              {heading}
            </h2>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-4">
            <p className="text-[var(--ink-muted)] leading-relaxed text-pretty">
              {openings.length > 0
                ? "Nos postes ouverts, actualisés régulièrement. Chaque candidature est étudiée par notre équipe."
                : "N’hésitez pas à nous adresser une candidature spontanée : nous étudions chaque profil avec attention."}
            </p>
          </Reveal>
        </div>

        {openings.length === 0 ? (
          <div className="mt-14 border border-[var(--line-strong)] bg-[var(--bg-elevated)] p-8 md:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <p className="text-[var(--ink-muted)] leading-relaxed max-w-xl text-pretty">
              Il n’y a pas d’offre publiée actuellement, mais votre profil peut nous intéresser
              pour une prochaine ouverture.
            </p>
            <Button
              href="/recrutement/candidature"
              variant="secondary"
              className="w-full sm:w-auto shrink-0"
            >
              Candidature spontanée
            </Button>
          </div>
        ) : (
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
        )}
      </Container>
    </section>
  );
}

function StageAlternanceSection() {
  const { stageAlternance } = recrutement;

  return (
    <section
      id="stage-alternance"
      className="bg-[var(--bg-elevated)] border-b border-[var(--line)] scroll-mt-24"
    >
      <Container size="wide" className="py-14 md:py-20 lg:py-28">
        <Reveal>
          <div className="border border-[var(--line-strong)] bg-[var(--bg)] p-6 sm:p-8 md:p-12 lg:p-16">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16 items-start">
              <div className="lg:col-span-7 flex flex-col gap-5">
                <span className="text-eyebrow flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-px w-8 bg-[var(--accent-warm)]"
                  />
                  Stage & alternance
                </span>
                <h2 className="text-display text-2xl md:text-3xl lg:text-[2.25rem] text-balance">
                  {stageAlternance.title}
                </h2>
                <p className="text-[var(--ink-muted)] text-base sm:text-lg leading-relaxed text-pretty">
                  {stageAlternance.description}
                </p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {stageAlternance.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-[var(--ink)] leading-relaxed"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 h-px w-4 bg-[var(--accent)] shrink-0"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-5 flex flex-col gap-4 lg:items-end">
                <Button
                  href="/recrutement/candidature?poste=Demande de stage"
                  variant="primary"
                  className="w-full sm:w-auto"
                >
                  Postuler pour un stage
                </Button>
                <Link
                  href="/contact"
                  className="tap-link gap-3 text-[var(--ink)] text-sm tracking-wide hover:text-[var(--accent)] transition-colors self-start lg:self-end"
                >
                  <span className="inline-flex items-center gap-3 border-b border-current pb-1">
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
                  </span>
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
