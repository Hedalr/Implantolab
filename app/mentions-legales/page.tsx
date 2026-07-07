import { Container } from "@/components/ui/Container";

import { PageHero } from "@/components/sections/PageHero";

import { site } from "@/content/fr/site";

import { pageMetadata } from "@/lib/metadata";



export const metadata = pageMetadata({

  title: "Mentions légales",

  description: `Mentions légales du site ${site.name}.`,

  path: "/mentions-legales",

});



export default function MentionsLegalesPage() {

  const { legal, contact } = site;



  return (

    <>

      <PageHero

        eyebrow="Informations"

        title="Mentions légales"

        intro="Informations légales relatives à l’éditeur du site, à l’hébergement et à la propriété intellectuelle."

      />

      <section className="bg-[var(--bg-elevated)]">

        <Container size="narrow" className="py-14 md:py-20 lg:py-28 prose-fr">

          <article className="flex flex-col gap-10 text-[var(--ink-muted)] leading-relaxed">

            <Block title="Éditeur du site">

              <p>

                <strong className="text-[var(--ink)]">{legal.companyName}</strong>{" "}

                — {legal.legalForm} au capital de {legal.capital}.

              </p>

              <p>

                Siège social : {contact.address.line1},{" "}

                {contact.address.postalCode} {contact.address.city},{" "}

                {contact.address.country}.

              </p>

              <p>Activité : {legal.activity}.</p>

              <ul className="flex flex-col gap-1 mt-2">

                <li>SIREN : {legal.siren}</li>

                <li>SIRET (siège) : {legal.siret}</li>

                <li>{legal.rcs}</li>

                <li>TVA intracommunautaire : {legal.vat}</li>

              </ul>

              <p className="mt-4">

                Téléphone : {contact.phoneDisplay} — Email :{" "}

                <a

                  href={`mailto:${contact.email}`}

                  className="text-[var(--ink)] hover:text-[var(--accent)] underline underline-offset-4 break-all"

                >

                  {contact.email}

                </a>

              </p>

              <p>

                Directeur de la publication : {legal.publicationDirector}.

              </p>

              <p className="text-sm text-[var(--ink-discreet)]">

                Informations issues de l’

                <a

                  href={legal.annuaireUrl}

                  className="underline underline-offset-4 hover:text-[var(--ink)] transition-colors break-all"

                  target="_blank"

                  rel="noopener noreferrer"

                >

                  annuaire des entreprises

                </a>

                .

              </p>

            </Block>

            <Block title="Hébergement">

              <p>

                Site hébergé par {legal.hosting.name} — {legal.hosting.address}.

              </p>

              <p>

                <a

                  href={legal.hosting.url}

                  className="text-[var(--ink)] hover:text-[var(--accent)] underline underline-offset-4 break-all"

                  target="_blank"

                  rel="noopener noreferrer"

                >

                  {legal.hosting.url.replace(/^https?:\/\//, "")}

                </a>

              </p>

            </Block>

            <Block title="Propriété intellectuelle">

              <p>

                L’ensemble des contenus présents sur ce site (textes,

                visuels, identité graphique) est protégé par le droit d’auteur.

                Toute reproduction non autorisée est interdite.

              </p>

            </Block>

            <Block title="Crédits">

              <p>

                Conception et développement : {site.name}. Photographies :

                visuels de prévisualisation (Unsplash) en attente de remplacement

                par les photographies officielles du laboratoire.

              </p>

            </Block>

          </article>

        </Container>

      </section>

    </>

  );

}



function Block({ title, children }: { title: string; children: React.ReactNode }) {

  return (

    <section className="flex flex-col gap-3">

      <h2 className="font-serif text-2xl text-[var(--ink)]">{title}</h2>

      {children}

    </section>

  );

}

