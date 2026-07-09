export type RecrutementValue = {
  title: string;
  description: string;
};

export type RecrutementBenefit = {
  title: string;
  description: string;
  highlights?: string[];
};

export type RecrutementContract = "CDI" | "CDD" | "Alternance";

export type RecrutementOpening = {
  role: string;
  contract: RecrutementContract;
  location: string;
  summary: string;
  skills: string[];
};

export type RecrutementCta = {
  title: string;
  description: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
};

export type RecrutementContent = {
  eyebrow: string;
  title: string;
  intro: string;
  values: RecrutementValue[];
  benefits: RecrutementBenefit[];
  openings: RecrutementOpening[];
  stageAlternance: {
    title: string;
    description: string;
    highlights: string[];
  };
  cta: RecrutementCta;
};

export const recrutement: RecrutementContent = {
  eyebrow: "Recrutement",
  title: "Rejoindre l’équipe IMPLANTOLAB",
  intro:
    "IMPLANTOLAB est un laboratoire de prothèse dentaire à taille humaine, installé à Blois, où le savoir-faire artisanal rencontre les outils numériques les plus exigeants. Nous recherchons des collaboratrices et collaborateurs passionnés par la précision, curieux des évolutions techniques et attachés au travail bien fait.",
  values: [
    {
      title: "Précision quotidienne",
      description:
        "Chaque geste compte : ajustage, finitions, contrôle qualité. Nous cultivons l’exigence à tous les postes du Laboratoire.",
    },
    {
      title: "Formation continue",
      description:
        "Nous investissons dans la montée en compétences de l’équipe : formations techniques, nouveaux matériaux et protocoles implantaires.",
    },
    {
      title: "Innovation numérique",
      description:
        "Scanners, conception assistée, usinage 5 axes et impression 3D : le numérique est au cœur de notre pratique.",
    },
    {
      title: "Esprit d’équipe",
      description:
        "Un laboratoire à taille humaine où chacun connaît le travail de l’autre et où l’entraide est une évidence.",
    },
  ],
  benefits: [
    {
      title: "Accompagnement personnalisé",
      description:
        "Un accompagnement adapté à chaque poste de travail — prothèse amovible, prothèse conjointe, CFAO — pour vous faire progresser à votre rythme sur votre métier.",
    },
    {
      title: "Environnement technique moderne",
      description:
        "Parc numérique complet, ateliers organisés par secteur d’activité et instruments régulièrement calibrés.",
    },
    {
      title: "Cabinets partenaires reconnus",
      description:
        "Nous collaborons avec des praticiens exigeants sur des cas variés, de l’unitaire à la grande étendue implantaire.",
    },
    {
      title: "Locaux à Blois",
      description:
        "Un cadre de travail agréable en Loir-et-Cher, avec un rythme compatible avec la vie de famille.",
    },
    {
      title: "Contrat CDI et rémunération",
      description:
        "Salaire selon expérience, mutuelle et perspectives d’évolution au sein d’une structure stable.",
      highlights: [
        "Primes de performance",
        "Heures supplémentaires payées",
        "Avantages CE via une entreprise partenaire",
        "Partenariat avec AD Blois — équipe locale de basket",
        "Séminaire annuel d’équipe",
      ],
    },
  ],
  openings: [
    {
      role: "Prothésiste dentaire — CFAO / grattage de châssis métallique",
      contract: "CDI",
      location: "Blois (41)",
      summary:
        "Vous intervenez sur la prothèse amovible et la CFAO : conception numérique, usinage, métallurgie et grattage de châssis métallique. Vous rejoignez une équipe soudée et un plateau technique moderne.",
      skills: [
        "Prothèse amovible",
        "CFAO",
        "Métallurgie",
        "Grattage de châssis métallique",
        "Autonomie",
        "Rigueur",
      ],
    },
    {
      role: "Technicien(ne) CFAO",
      contract: "CDI",
      location: "Blois (41)",
      summary:
        "Vous pilotez notre chaîne numérique : réception des scans, conception CAO, préparation à l’usinage et à l’impression, contrôle qualité.",
      skills: [
        "Maîtrise CAO dentaire",
        "Usinage 5 axes",
        "Impression 3D résine",
        "Formats STL, PLY, OBJ",
        "Sens du détail",
      ],
    },
    {
      role: "Alternance prothèse dentaire",
      contract: "Alternance",
      location: "Blois (41)",
      summary:
        "Vous préparez un BTM ou un BTMS de prothésiste dentaire en alternance dans un laboratoire moderne, encadré(e) par des tuteurs expérimentés.",
      skills: [
        "Formation en cours (BTM / BTMS)",
        "Curiosité technique",
        "Rigueur et méthode",
        "Intérêt pour le numérique",
        "Esprit d’équipe",
      ],
    },
  ],
  stageAlternance: {
    title: "Demande de stage",
    description:
      "Vous êtes étudiant(e) en prothèse dentaire ou en bac professionnel (à partir de la 2ᵉ année) ? IMPLANTOLAB accueille chaque année des stagiaires au sein de son laboratoire de Blois. Envoyez votre CV et quelques mots sur votre projet : nous étudions chaque candidature avec attention.",
    highlights: [
      "Stage conventionné",
      "Ouvert aux étudiant(e)s en prothèse dentaire et bac pro (dès la 2ᵉ année)",
      "Encadrement par des prothésistes seniors",
      "Immersion sur l’ensemble de la chaîne CFAO",
      "Dépôt du CV et documents en pièces jointes",
    ],
  },
  cta: {
    title: "Envie de rejoindre IMPLANTOLAB ?",
    description:
      "Adressez-nous votre candidature (CV, quelques mots sur votre parcours et vos aspirations). Nous revenons vers vous rapidement pour un premier échange.",
    primary: {
      label: "Envoyer une candidature",
      href: "/recrutement/candidature",
    },
    secondary: {
      label: "Contacter le laboratoire",
      href: "/contact",
    },
  },
};
