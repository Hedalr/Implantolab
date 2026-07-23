export type TeamMember = {
  name: string;
  role: string;
  bio?: string;
  photoKey?: string;
  tone?: "warm" | "cool" | "deep";
};

export type EphemeralInfo = {
  label: string;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
};

export const home = {
  hero: {
    slogan: {
      // Slogan officiel IMPLANTOLAB — ne pas modifier.
      line1: "Pour qu’un sourire",
      // Indent reproduisant "Pour qu’un so" pour que le "n" de
      // "ne se cache plus…" démarre exactement sous le "u" de "sourire".
      line2Offset: "Pour qu’un so",
      line2: "ne se cache plus…",
      emphasis: "sourire",
    },
    eyebrow: "Laboratoire de prothèse dentaire",
    title:
      "Prothèses dentaires sur mesure et flux numérique maîtrisé.",
    subtitle:
      "IMPLANTOLAB accompagne les chirurgiens-dentistes avec des solutions prothétiques fiables, esthétiques et conçues avec un haut niveau d’exigence technique.",
    primaryCta: { label: "Découvrir le laboratoire", href: "/laboratoire" },
    secondaryCta: { label: "Espace praticien", href: "/espace-praticien" },
    visualCaption: "Atelier IMPLANTOLAB — Blois",
    visualCaptionSecondary: "Savoir-faire artisanal — Blois",
  },

  solutions: {
    eyebrow: "Nos solutions",
    title: "Ce que nous fabriquons pour vos patients",
    description:
      "Une gamme complète pour couvrir vos indications quotidiennes : implantologie, prothèse conjointe, prothèse amovible, restauration esthétique et flux numérique de bout en bout.",
    items: [
      {
        key: "implantologie",
        number: "01",
        title: "Implantologie",
        description:
          "Couronnes transvissées, bridges implantaires, piliers personnalisés et guides chirurgicaux.",
        href: "/implantologie",
      },
      {
        key: "prothese-conjointe",
        number: "02",
        title: "Prothèse conjointe",
        description:
          "Couronnes céramiques, zircone monolithique, métal-céramique, bridges, inlays et onlays.",
        href: "/protheses#prothese-conjointe",
      },
      {
        key: "prothese-amovible",
        number: "03",
        title: "Prothèse amovible",
        description:
          "Châssis métalliques, PEEK, prothèses hybrides et résines définitives ou provisoires.",
        href: "/protheses#prothese-amovible",
      },
      {
        key: "esthetique",
        number: "04",
        title: "Esthétique",
        description:
          "Facettes, stratifications céramiques et restauration antérieure : teinte, translucidité, morphologie.",
        href: "/protheses#esthetique",
      },
      {
        key: "flux-numerique",
        number: "05",
        title: "Flux numérique",
        description:
          "CFAO de bout en bout : STL, PLY, OBJ, conception CAO, usinage 5 axes et impression 3D.",
        href: "/flux-numerique",
      },
    ],
    linkLabel: "Voir",
  },

  stats: {
    eyebrow: "IMPLANTOLAB en chiffres",
    title: "Un laboratoire ancré dans la précision et le numérique",
    description:
      "Depuis 2014, IMPLANTOLAB conjugue savoir-faire artisanal et outils CFAO pour accompagner les chirurgiens-dentistes dans leur pratique quotidienne.",
    items: [
      { value: 12, suffix: " ans +", label: "d’expérience" },
      { value: 100, suffix: "+", label: "cabinets dentaires partenaires" },
      { value: 90, suffix: " %", label: "de cas en flux numérique" },
      { value: 5, suffix: " jours", label: "délai moyen de fabrication" },
    ],
  },

  expertises: {
    eyebrow: "Approfondir",
    title: "Notre approche, expertise par expertise",
    description:
      "Pour chaque famille, la même exigence : matériaux sélectionnés, protocole documenté et interlocuteur unique. Parcourez nos approches détaillées.",
    tabs: [
      {
        key: "implantologie",
        label: "Implantologie",
        title: "Restaurations supra-implantaires",
        body: "Couronnes transvissées ou scellées, bridges implantaires, piliers personnalisés et guides chirurgicaux. Chaque restauration est conçue autour du profil d’émergence et de la biomécanique du cas.",
        bullets: [
          "Couronnes transvissées ou scellées",
          "Bridges implantaires — passivité optimisée",
          "Piliers personnalisés titane et zircone",
          "Guides chirurgicaux à partir de vos données 3D",
        ],
        href: "/implantologie",
        photo: "Détail pilier implantaire — atelier",
        tone: "warm" as const,
      },
      {
        key: "protheses",
        label: "Prothèses",
        title: "Prothèse conjointe et prothèse amovible",
        body: "Céramique, zircone monolithique, métal-céramique pour la prothèse conjointe ; châssis métalliques, PEEK, prothèses hybrides et résines définitives ou provisoires pour la prothèse amovible.",
        bullets: [
          "Couronnes céramiques et zircone",
          "Bridges céramo-céramiques et métal-céramique",
          "Châssis métalliques et PEEK",
          "Prothèse hybride et résine définitive ou provisoire",
        ],
        href: "/protheses",
        photo: "Couronne céramique — finition",
        tone: "cool" as const,
      },
      {
        key: "flux-numerique",
        label: "Flux numérique",
        title: "CFAO de bout en bout",
        body: "De la réception du scan intra-oral à l’usinage et à l’impression, notre chaîne numérique est documentée et reproductible. Interopérabilité assurée avec les scanners du marché.",
        bullets: [
          "Formats STL, PLY, OBJ",
          "Conception CAO validée par nos techniciens",
          "Usinage 5 axes et impression 3D",
          "Contrôle qualité automatisé et manuel",
        ],
        href: "/flux-numerique",
        photo: "Conception CAO — poste technique",
        tone: "deep" as const,
      },
    ],
  },

  gallery: {
    eyebrow: "L’atelier",
    title: "Le savoir-faire, en images",
    description:
      "Une plongée dans nos ateliers : équipe, machines et gestes qui font la précision d’IMPLANTOLAB. Suivez le fil du process, étape par étape.",
    photos: [
      {
        caption: "Poste de conception",
        step: "Conception",
        description:
          "Le fichier numérique du praticien est étudié et modélisé sur nos postes de CAO.",
        tone: "deep" as const,
        ratio: "landscape" as const,
      },
      {
        caption: "Atelier CFAO",
        step: "Usinage",
        description:
          "Usinage 5 axes et impression 3D, pilotés depuis notre atelier CFAO intégré.",
        tone: "cool" as const,
        ratio: "landscape" as const,
      },
      {
        caption: "Zircone brute",
        step: "Matériaux",
        description:
          "Blocs de zircone et disques bruts, sélectionnés avant la mise en forme.",
        tone: "cool" as const,
        ratio: "landscape" as const,
      },
      {
        caption: "Finition manuelle",
        step: "Finition",
        description:
          "Stratification, polissage et ajustements réalisés à la main par nos prothésistes.",
        tone: "warm" as const,
        ratio: "landscape" as const,
      },
      {
        caption: "Contrôle dimensionnel",
        step: "Contrôle qualité",
        description:
          "Chaque pièce est vérifiée avant expédition : forme, teinte, adaptation.",
        tone: "warm" as const,
        ratio: "landscape" as const,
      },
      {
        caption: "Équipe technique",
        step: "Équipe",
        description:
          "Une équipe de prothésistes spécialisés, présente à chaque étape du process.",
        tone: "deep" as const,
        ratio: "landscape" as const,
      },
    ],
  },

  ctaTriptych: {
    eyebrow: "Aller plus loin",
    title: "Comment souhaitez-vous nous solliciter ?",
    items: [
      {
        title: "Espace praticien",
        description:
          "Connectez-vous pour déclarer vos fermetures et échanger avec nos équipes.",
        cta: { label: "Se connecter", href: "/espace-praticien" },
        tone: "deep" as const,
      },
      {
        title: "Contact",
        description:
          "Devis, envoi de cas, question technique : notre équipe vous répond sous 1 jour ouvré.",
        cta: { label: "Nous écrire", href: "/contact" },
        tone: "warm" as const,
      },
      {
        title: "Recrutement",
        description:
          "Prothésiste, technicien CFAO, alternance : rejoignez une équipe passionnée.",
        cta: { label: "Voir les opportunités", href: "/recrutement" },
        tone: "deep" as const,
      },
    ],
  },

  contact: {
    eyebrow: "Contact",
    title: "Un cas à adresser ?",
    description:
      "Vous avez un cas à adresser, une question technique ou un besoin de devis ? Notre équipe vous répond rapidement pour vous orienter vers la solution la plus adaptée.",
    note: "Envoi de fichiers STL et espace praticien disponibles prochainement.",
  },

  team: {
    eyebrow: "L’équipe",
    title: "Les visages du laboratoire",
    description:
      "Une équipe de prothésistes, techniciens CFAO et coordinateurs, réunis à Blois autour d’une même exigence : la précision au service du patient.",
    footnote:
      "Photographies définitives à venir — séance photo prévue prochainement.",
    members: [
      {
        name: "Antoine Lelièvre",
        role: "Gérant — prothésiste dentaire",
        photoKey: "equipe:antoine-lelievre",
        tone: "deep",
      },
      {
        name: "Prothésiste CFAO",
        role: "Conception & usinage",
        tone: "cool",
      },
      {
        name: "Prothésiste conjointe",
        role: "Céramique & finitions",
        tone: "warm",
      },
      {
        name: "Prothésiste amovible",
        role: "Châssis & grattage",
        tone: "cool",
      },
      {
        name: "Coordination cabinets",
        role: "Suivi des dossiers praticiens",
        tone: "deep",
      },
      {
        name: "Alternant(e) — prothèse",
        role: "Formation en atelier",
        tone: "warm",
      },
    ] as TeamMember[],
  },

  ephemeral: {
    eyebrow: "À la une",
    items: [
      {
        label: "Équipement",
        title: "Micro-fusion iMES-iCore — installée en interne",
        description:
          "Fabrication métal complète sans sous-traitance, désormais opérationnelle à Blois.",
      },
      {
        label: "Recrutement",
        title: "Poste ouvert : prothésiste amovible / CFAO / grattage châssis",
        description:
          "Nous cherchons un prothésiste expérimenté pour rejoindre l’équipe.",
        cta: { label: "Voir le poste", href: "/recrutement#postes" },
      },
    ] as EphemeralInfo[],
  },
};
