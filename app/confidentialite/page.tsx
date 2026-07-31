import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/sections/PageHero";
import { site } from "@/content/fr/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Politique de confidentialité",
  description: `Politique de confidentialité du site ${site.name} et de l’espace praticien.`,
  path: "/confidentialite",
});

const POLICY_VERSION = "1.0";
const POLICY_DATE = "31 juillet 2026";

export default function ConfidentialitePage() {
  const { legal, contact } = site;

  return (
    <>
      <PageHero
        eyebrow="Informations"
        title="Politique de confidentialité"
        intro="Cette page décrit les traitements de données personnelles réalisés via le site public, l’espace praticien et l’application mobile Implantolab."
      />
      <section className="bg-[var(--bg-elevated)]">
        <Container size="narrow" className="py-14 md:py-20 lg:py-28 prose-fr">
          <article className="flex flex-col gap-10 text-[var(--ink-muted)] leading-relaxed">
            <p className="text-sm text-[var(--ink-discreet)]">
              Version {POLICY_VERSION} — {POLICY_DATE}. Document indicatif à
              faire relire avant publication définitive ; les durées de
              conservation patients restent à formaliser dans la matrice
              métier.
            </p>

            <Block title="Responsable du traitement">
              <p>
                <strong className="text-[var(--ink)]">{legal.companyName}</strong>
                , {legal.legalForm} au capital de {legal.capital},{" "}
                {contact.address.line1}, {contact.address.postalCode}{" "}
                {contact.address.city}. SIREN {legal.siren}.
              </p>
              <p>
                Pour toute question relative aux données personnelles ou pour
                exercer vos droits :{" "}
                <a
                  href={`mailto:${contact.email}`}
                  className="text-[var(--ink)] hover:text-[var(--accent)] underline underline-offset-4 break-all"
                >
                  {contact.email}
                </a>
                .
              </p>
            </Block>

            <Block title="Deux univers distincts">
              <p>
                Ce site comporte une partie publique (présentation, actualités,
                recrutement, contact) et un espace professionnel réservé aux
                praticiens partenaires et aux collaborateurs du laboratoire,
                également accessible via l’application mobile Implantolab. Les
                traitements décrits ci-dessous diffèrent selon l’univers.
              </p>
            </Block>

            <Block title="1. Visiteurs du site public">
              <p>
                Nous ne déposons aucun cookie de mesure d’audience, publicitaire
                ou de personnalisation. Les polices de caractères sont
                hébergées sur nos serveurs : aucune donnée n’est transmise à un
                tiers lors de leur chargement.
              </p>
              <p>
                La page Contact et le pied de page affichent une carte fournie
                par Google Maps. Son chargement automatique peut transmettre
                votre adresse IP à Google et donner lieu au dépôt de cookies
                tiers. Une solution de chargement sur action explicite est en
                cours de mise en place.
              </p>
            </Block>

            <Block title="2. Formulaire de contact">
              <p>
                Le formulaire de contact ouvre votre messagerie avec un message
                prérempli adressé à{" "}
                <a
                  href={`mailto:${contact.email}`}
                  className="text-[var(--ink)] hover:text-[var(--accent)] underline underline-offset-4 break-all"
                >
                  {contact.email}
                </a>
                . Aucune donnée n’est collectée ni stockée par le site : l’envoi
                et la conservation relèvent de votre client mail et de notre
                boîte de réception.
              </p>
              <p>
                Finalité : répondre à votre demande. Base légale : mesures
                précontractuelles ou intérêt légitime. Conservation côté
                laboratoire : durée nécessaire au traitement de la demande,
                puis archivage selon nos règles internes (indicatif : 3 ans à
                compter du dernier contact).
              </p>
            </Block>

            <Block title="3. Candidatures">
              <p>
                Le formulaire de candidature fonctionne de la même manière (
                <code className="text-[var(--ink)]">mailto:</code>
                ) : identité, coordonnées, poste visé et message sont
                préremplis ; le CV est joint manuellement dans votre client
                mail. Aucun fichier n’est téléversé ni stocké sur le site.
              </p>
              <p>
                Finalité : instruction de votre candidature. Base légale :
                consentement / mesures précontractuelles. Conservation côté
                laboratoire : 2 ans après le dernier échange, sauf demande de
                suppression anticipée.
              </p>
            </Block>

            <Block title="4. Espace praticien et application mobile — données professionnelles">
              <p>
                Données : identité professionnelle, email, rôle, secteur de
                rattachement, historique des demandes, périodes de fermeture de
                cabinet. Base légale : exécution du contrat de prestation.
                Conservation : durée de la relation contractuelle, puis 5 ans à
                des fins de preuve (soft delete des comptes).
              </p>
            </Block>

            <Block title="5. Données concernant les patients">
              <p>
                Dans le cadre de la fabrication de prothèses dentaires sur
                mesure, les praticiens partenaires nous transmettent des
                informations relatives à leurs patients : nom, description
                clinique du cas, et le cas échéant des photographies. Ces
                informations relèvent des catégories particulières de données
                au sens de l’article 9 du RGPD.
              </p>
              <p>
                Finalités : conception, fabrication et suivi qualité du
                dispositif médical sur mesure ; traçabilité réglementaire.
              </p>
              <p>
                Base légale : article 6.1.b (exécution du contrat conclu avec
                le praticien) combiné à l’article 9.2.h (gestion de services de
                santé), le traitement s’effectuant sous la responsabilité de
                professionnels soumis au secret professionnel.
              </p>
              <p>
                Accès : strictement limité, par contrôle d’accès technique, au
                praticien émetteur, aux collaborateurs du secteur de production
                concerné et aux administrateurs du laboratoire. Les
                photographies sont stockées dans un espace privé et ne sont
                accessibles que via des liens temporaires de courte durée.
              </p>
              <p>
                Conservation (indicative, en attendant la matrice métier) :
                données de dossier 10 ans à compter de la livraison du
                dispositif, conformément aux obligations de traçabilité
                applicables aux dispositifs médicaux sur mesure. Les
                photographies sont retirées du stockage privé lorsque la
                métadonnée associée est supprimée ; un nettoyage automatique
                traite aussi les fichiers orphelins.
              </p>
              <p>
                Rôle respectif : le praticien détermine les finalités du
                traitement des données de ses patients. Implantolab intervient
                en qualité de prestataire technique ; la qualification exacte
                (sous-traitant ou responsable conjoint) est précisée dans les
                conditions contractuelles conclues avec chaque cabinet.
                Implantolab n’a aucun contact direct avec les patients.
              </p>
            </Block>

            <Block title="6. Salariés du laboratoire">
              <p>
                Congés, soldes et périodes d’absence sont traités pour la
                gestion du personnel, sur la base des obligations légales de
                l’employeur, et conservés selon les durées légales applicables.
              </p>
            </Block>

            <Block title="7. Sous-traitants et hébergement">
              <p>
                Hébergement du site : {legal.hosting.name}. Base de données,
                authentification et stockage de fichiers :{" "}
                {legal.dataHosting.name}, infrastructure située dans l’Union
                européenne ({legal.dataHosting.region.replace(/^Union européenne — /, "")}
                ). Envoi d’emails transactionnels : Resend. Contenus
                éditoriaux : Notion.
              </p>
              <p>
                Certains de ces prestataires sont établis hors de l’Union
                européenne ; les transferts éventuels sont encadrés par les
                mécanismes contractuels applicables (clauses contractuelles
                types / Data Privacy Framework, selon le prestataire). La liste
                à jour peut être obtenue sur demande à{" "}
                <a
                  href={`mailto:${contact.email}`}
                  className="text-[var(--ink)] hover:text-[var(--accent)] underline underline-offset-4 break-all"
                >
                  {contact.email}
                </a>
                .
              </p>
              <p>
                Voir aussi les{" "}
                <Link
                  href="/mentions-legales"
                  className="text-[var(--ink)] hover:text-[var(--accent)] underline underline-offset-4"
                >
                  mentions légales
                </Link>
                .
              </p>
            </Block>

            <Block title="8. Sécurité">
              <p>
                Chiffrement des échanges (HTTPS), cloisonnement des accès par
                rôle appliqué au niveau de la base de données (RLS), stockage
                privé des fichiers avec liens temporaires, en-têtes de sécurité
                renforcés, absence de traceurs publicitaires ou d’analytics.
              </p>
            </Block>

            <Block title="9. Vos droits">
              <p>
                Vous disposez des droits d’accès, de rectification, d’effacement,
                de limitation, d’opposition et de portabilité, ainsi que du
                droit de définir des directives relatives au sort de vos
                données après votre décès. Ces droits s’exercent auprès de{" "}
                <a
                  href={`mailto:${contact.email}`}
                  className="text-[var(--ink)] hover:text-[var(--accent)] underline underline-offset-4 break-all"
                >
                  {contact.email}
                </a>
                , avec réponse sous un mois.
              </p>
              <p>
                Patients : si vous avez été pris en charge par un praticien
                travaillant avec Implantolab, adressez votre demande à votre
                chirurgien-dentiste, qui reste votre interlocuteur ; il la
                relaiera auprès de nos services.
              </p>
              <p>
                Vous pouvez également introduire une réclamation auprès de la
                Commission nationale de l’informatique et des libertés (CNIL),
                3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 —{" "}
                <a
                  href="https://www.cnil.fr"
                  className="text-[var(--ink)] hover:text-[var(--accent)] underline underline-offset-4"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.cnil.fr
                </a>
                .
              </p>
            </Block>

            <Block title="10. Cookies">
              <p>
                Seuls des cookies strictement nécessaires au fonctionnement de
                l’espace praticien sont déposés (maintien de la session
                authentifiée). Ils sont exemptés de consentement au sens de
                l’article 82 de la loi Informatique et Libertés et expirent
                après 7 jours, remis à zéro à chaque rafraîchissement de
                session. Aucun cookie publicitaire, de profilage ou de mesure
                d’audience tierce n’est utiliséé par Implantolab.
              </p>
              <p>
                La carte Google Maps peut déposer ses propres cookies tiers
                (voir section 1).
              </p>
            </Block>

            <Block title="11. Mise à jour">
              <p>
                Version {POLICY_VERSION} du {POLICY_DATE}. Toute modification
                substantielle sera publiée sur cette page.
              </p>
            </Block>
          </article>
        </Container>
      </section>
    </>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-2xl text-[var(--ink)]">{title}</h2>
      {children}
    </section>
  );
}
