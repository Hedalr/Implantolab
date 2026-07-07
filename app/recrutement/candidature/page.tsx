import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { RecruitmentApplicationForm } from "@/components/sections/RecruitmentApplicationForm";
import { recrutement } from "@/content/fr/recrutement";
import { site } from "@/content/fr/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Envoyer sa candidature",
  description:
    "Postulez chez IMPLANTOLAB : joignez votre CV et présentez votre parcours. Prothésistes, techniciens CFAO et alternants bienvenus.",
  path: "/recrutement/candidature",
});

type SearchParams = Promise<{ poste?: string }>;

export default async function CandidaturePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { poste } = await searchParams;
  const openings = recrutement.openings.map((opening) => opening.role);

  return (
    <>
      <PageHero
        eyebrow="Recrutement"
        title="Envoyer sa candidature"
        intro="Joignez votre CV et quelques mots sur votre parcours. Notre équipe étudie chaque dossier avec attention et revient vers vous pour un premier échange."
      />

      <section className="bg-[var(--bg-elevated)] border-b border-[var(--line)]">
        <Container size="wide" className="py-14 md:py-20 lg:py-28">
          <div className="grid gap-14 lg:gap-20 lg:grid-cols-12 items-start">
            <Reveal className="lg:col-span-5 flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <span className="text-eyebrow flex items-center gap-3">
                  <span aria-hidden="true" className="h-px w-8 bg-[var(--accent-warm)]" />
                  Avant d’envoyer
                </span>
                <p className="text-[var(--ink-muted)] leading-relaxed max-w-md">
                  Préparez un CV à jour (PDF de préférence) et décrivez en
                  quelques lignes votre expérience, vos compétences et ce qui
                  vous attire chez IMPLANTOLAB.
                </p>
              </div>

              <ul className="flex flex-col gap-6 border-t border-[var(--line)] pt-8 text-sm">
                <li className="flex flex-col gap-1">
                  <span className="text-eyebrow">Email recrutement</span>
                  <a
                    href={`mailto:${site.contact.email}?subject=Candidature IMPLANTOLAB`}
                    className="font-serif text-lg sm:text-xl text-[var(--ink)] hover:text-[var(--accent)] transition-colors break-all"
                  >
                    {site.contact.email}
                  </a>
                  <a
                    href={`mailto:${site.contact.emailSecondary}?subject=Candidature IMPLANTOLAB`}
                    className="font-serif text-sm sm:text-base text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors break-all"
                  >
                    {site.contact.emailSecondary}
                  </a>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="text-eyebrow">Retour</span>
                  <Link
                    href="/recrutement"
                    className="tap-link gap-3 text-[var(--ink)] text-sm tracking-wide hover:text-[var(--accent)] transition-colors self-start"
                  >
                    <span className="inline-flex items-center gap-3 border-b border-current pb-1">
                      Voir les postes ouverts
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                        <path
                          d="M0 5H12M12 5L8 1M12 5L8 9"
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                      </svg>
                    </span>
                  </Link>
                </li>
              </ul>
            </Reveal>

            <Reveal delay={120} className="lg:col-span-7">
              <RecruitmentApplicationForm openings={openings} defaultPoste={poste} />
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
