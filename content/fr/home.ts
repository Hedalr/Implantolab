export const home = {
  hero: {
    slogan: {
      line1: "Pour qu’un sourire",
      // Espace invisible reproduisant "Pour qu’un sour" pour que le "n" de
      // "ne se cache plus…" démarre exactement sous le "i" de "sourire".
      line2Offset: "Pour qu’un sour",
      line2: "ne se cache plus…",
    },
    eyebrow: "Laboratoire de prothèse dentaire",
    title:
      "Prothèses dentaires sur mesure et flux numérique maîtrisé.",
    subtitle:
      "IMPLANTOLAB accompagne les chirurgiens-dentistes avec des solutions prothétiques fiables, esthétiques et conçues avec un haut niveau d’exigence technique.",
    primaryCta: { label: "Découvrir le laboratoire", href: "/laboratoire" },
    secondaryCta: { label: "Espace praticien", href: "/espace-praticien" },
    visualCaption: "Atelier IMPLANTOLAB — Blois",
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
    eyebrow: "Expertises",
    title: "Une gamme complète, un seul interlocuteur",
    description:
      "Implantologie, prothèse amovible, prothèse conjointe et flux numérique complet : une gamme complète, un seul interlocuteur. Sélectionnez une expertise pour découvrir notre approche.",
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

  reassurance: {
    intro:
      "Nous mettons à votre disposition un savoir-faire technique, une organisation rigoureuse et des outils numériques performants pour garantir des restaurations précises, des échanges fluides et des délais maîtrisés.",
    pillars: [
      {
        title: "Fabrication sur mesure",
        description:
          "Chaque restauration est conçue et ajustée selon les spécificités cliniques du cas.",
      },
      {
        title: "Expertise implantaire",
        description:
          "Protocoles adaptés aux contraintes implantaires, de la planification à la livraison.",
      },
      {
        title: "Flux numérique",
        description:
          "Intégration CFAO pour une chaîne numérique fiable et traçable.",
      },
      {
        title: "Délais maîtrisés",
        description:
          "Organisation interne structurée pour respecter vos plannings de soins.",
      },
      {
        title: "Accompagnement praticien",
        description:
          "Un interlocuteur technique disponible à chaque étape du cas.",
      },
    ],
  },

  labIntro: {
    eyebrow: "Le laboratoire",
    title: "Chaîne de production interne, un réel 100 % Made in Blois",
    body: "Chaque prothèse dentaire est fabriquée en interne, dans nos ateliers de Blois. Nous disposons de notre propre chaîne de production et d’un centre d’usinage dédié à nos clients — pas de sous-traitance : la totalité des étapes, de la conception CAO à la finition céramique, est réalisée par notre équipe de prothésistes.",
    highlights: [
      "Chaîne de production 100 % interne",
      "Centre d’usinage dédié à nos clients",
      "Locaux à Blois — Loir-et-Cher",
    ],
    // On retire le lien pour éviter la duplication avec le CTA du Hero
    // qui pointe déjà vers /laboratoire (voir Chantier 2.4 du plan).
    link: null as { label: string; href: string } | null,
    photoCaption: "Équipe IMPLANTOLAB — atelier",
    processEyebrow: "De la conception à la livraison",
    processFootnote: "Fabrication 100 % interne — Blois",
    processSteps: [
      {
        title: "Conception CAO",
        description:
          "Modélisation numérique du cas à partir de vos empreintes ou scans intra-oraux.",
      },
      {
        title: "Sélection des matériaux",
        description:
          "Choix de la zircone, du disilicate ou du titane adaptés à chaque restauration.",
      },
      {
        title: "Usinage & impression 3D",
        description:
          "Fabrication en CFAO 5 axes, pilotée depuis notre centre d’usinage intégré.",
      },
      {
        title: "Finition céramique",
        description:
          "Stratification, polissage et ajustements réalisés à la main par nos prothésistes.",
      },
      {
        title: "Contrôle qualité",
        description:
          "Vérification de la forme, de la teinte et de l’adaptation avant expédition.",
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

  news: {
    eyebrow: "Actualités",
    title: "Les dernières nouveautés du laboratoire",
    description:
      "Nouveaux matériaux, événements, ouvertures de postes : suivez la vie d’IMPLANTOLAB.",
    link: { label: "Toutes les actualités", href: "/actualites" },
  },

  quality: {
    eyebrow: "Laboratoire",
    title: "Rigueur, traçabilité et qualité de fabrication",
    description:
      "Notre laboratoire s’appuie sur des processus documentés, un contrôle qualité systématique et une équipe spécialisée pour garantir des restaurations conformes à vos exigences cliniques.",
    indicators: [
      {
        title: "Contrôle qualité",
        description:
          "Vérification systématique de chaque restauration avant expédition.",
      },
      {
        title: "Traçabilité complète",
        description:
          "Suivi des matériaux et des étapes de fabrication, lot par lot.",
      },
      {
        title: "Interlocuteur dédié",
        description:
          "Un référent technique pour le suivi de vos cas et de vos délais.",
      },
    ],
    link: { label: "Découvrir le laboratoire", href: "/laboratoire" },
    visualCaption: "Contrôle qualité — atelier",
  },

  contact: {
    eyebrow: "Contact",
    title: "Un cas à adresser ?",
    description:
      "Vous avez un cas à adresser, une question technique ou un besoin de devis ? Notre équipe vous répond rapidement pour vous orienter vers la solution la plus adaptée.",
    note: "Envoi de fichiers STL et espace praticien disponibles prochainement.",
  },
};
