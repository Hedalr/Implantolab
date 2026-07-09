import { PageHero } from "@/components/sections/PageHero";
import { PageSections } from "@/components/sections/PageSections";
import { PageCta } from "@/components/sections/PageCta";
import { PageSummaryNav } from "@/components/sections/PageSummaryNav";
import { laboratoire } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: laboratoire.title,
  description: laboratoire.intro,
  path: "/laboratoire",
});

const summary = [
  {
    label: "Savoir-faire",
    href: "/laboratoire#savoir-faire",
    eyebrow: "Équipe",
    description:
      "Prothésistes spécialisés par secteur d'activité, référents techniques par domaine.",
  },
  {
    label: "Atelier & équipements",
    href: "/laboratoire#atelier",
    eyebrow: "Production",
    description:
      "Espaces de travail dédiés, parc CFAO calibré, instruments contrôlés régulièrement.",
  },
  {
    label: "Qualité",
    href: "/laboratoire#qualite",
    eyebrow: "Rigueur",
    description:
      "Contrôle qualité formalisé et écoute clinique à chaque étape.",
  },
  {
    label: "Traçabilité",
    href: "/laboratoire#tracabilite",
    eyebrow: "Suivi",
    description:
      "Lot des matériaux, étapes de fabrication et intervenants documentés.",
  },
  {
    label: "Délais",
    href: "/laboratoire#delais",
    eyebrow: "Planning",
    description:
      "Planification interne conçue pour respecter les délais annoncés.",
  },
];

export default function LaboratoirePage() {
  return (
    <>
      <PageHero
        eyebrow={laboratoire.eyebrow}
        title={laboratoire.title}
        intro={laboratoire.intro}
      />
      <PageSummaryNav
        eyebrow="Sommaire"
        title="Ce que vous trouverez dans cette page"
        items={summary}
      />
      <PageSections sections={laboratoire.sections} />
      <PageCta cta={laboratoire.cta} />
    </>
  );
}
