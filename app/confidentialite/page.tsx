import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/sections/PageHero";
import { site } from "@/content/fr/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Politique de confidentialité",
  description: `Politique de confidentialité du site ${site.name}.`,
  path: "/confidentialite",
});

export default function ConfidentialitePage() {
  return (
    <>
      <PageHero
        eyebrow="Informations"
        title="Politique de confidentialité"
        intro="Cette page décrit la manière dont nous traitons les informations transmises via les formulaires du site et les coordonnées de contact."
      />
      <section className="bg-[var(--bg-elevated)]">
        <Container size="narrow" className="py-20 md:py-28">
          <article className="flex flex-col gap-10 text-[var(--ink-muted)] leading-relaxed">
            <Block title="Données collectées">
              <p>
                Les informations que vous transmettez via le formulaire de
                contact (nom, cabinet, email, téléphone, message) sont
                utilisées uniquement pour traiter votre demande et vous
                répondre.
              </p>
            </Block>
            <Block title="Conservation des données">
              <p>
                Les messages reçus sont conservés pour la durée nécessaire au
                traitement de la demande, puis archivés ou supprimés selon
                notre politique interne.
              </p>
            </Block>
            <Block title="Vos droits">
              <p>
                Conformément à la réglementation applicable, vous disposez
                d’un droit d’accès, de rectification et de suppression de vos
                données. Pour exercer ces droits, contactez-nous à l’adresse{" "}
                <a
                  href={`mailto:${site.contact.email}`}
                  className="text-[var(--ink)] hover:text-[var(--accent)] underline underline-offset-4"
                >
                  {site.contact.email}
                </a>
                .
              </p>
            </Block>
            <Block title="Cookies">
              <p>
                Ce site n’utilise pas de cookies de mesure d’audience à des
                fins publicitaires. Le détail des éventuels cookies techniques
                utilisés sera précisé ici.
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
