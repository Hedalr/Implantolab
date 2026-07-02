export type RecrutementValue = {
  title: string;
  description: string;
};

export type RecrutementBenefit = {
  title: string;
  description: string;
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
  spontaneous: {
    title: string;
    description: string;
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
        "Chaque geste compte : ajustage, finitions, contrôle qualité. Nous cultivons l’exigence à tous les postes de l’atelier.",
    },
    {
      title: "Formation continue",
      description:
        "Nous investissons dans la montée en compétences de l’équipe : formations CFAO, nouveaux matériaux, protocoles implantaires.",
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
      title: "Formation CFAO",
      description:
        "Accompagnement personnalisé sur nos logiciels de conception et nos équipements de fabrication.",
    },
    {
      title: "Environnement technique moderne",
      description:
        "Parc numérique complet, ateliers organisés par expertise et instruments régulièrement calibrés.",
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
    },
  ],
  openings: [
    {
      role: "Prothésiste dentaire senior — implantologie / CFAO",
      contract: "CDI",
      location: "Blois (41)",
      summary:
        "Vous prenez en charge des cas implantaires complexes, de la conception CAD à la finition céramique. Vous êtes un référent technique pour l’équipe.",
      skills: [
        "Implantologie prothétique",
        "Céramique stratifiée",
        "Conception CAD (exocad, 3Shape)",
        "5 ans d’expérience minimum",
        "Autonomie et rigueur",
      ],
    },
    {
      role: "Technicien(ne) CFAO",
      contract: "CDI",
      location: "Blois (41)",
      summary:
        "Vous pilotez notre chaîne numérique : réception des scans, conception CAD, préparation à l’usinage et à l’impression, contrôle qualité.",
      skills: [
        "Maîtrise CAD dentaire",
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
  spontaneous: {
    title: "Candidature spontanée",
    description:
      "Aucun poste ne correspond exactement à votre profil ? Nous restons à l’écoute des prothésistes, techniciens CFAO, céramistes et alternants motivés par notre approche. Envoyez-nous votre candidature : nous étudions chaque dossier avec attention.",
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
