export const home = {
  hero: {
    eyebrow: "Laboratoire de prothèse dentaire",
    title:
      "Prothèses dentaires sur mesure, expertise implantaire et flux numérique maîtrisé.",
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
      { value: 10, suffix: "+", label: "années d’expertise" },
      { value: 90, suffix: " %", label: "de cas en flux numérique" },
      { value: 5, suffix: " j", label: "délai moyen de fabrication" },
      { value: 150, suffix: "+", label: "praticiens partenaires" },
    ],
  },

  expertises: {
    eyebrow: "Expertises",
    title: "Une gamme complète, un seul interlocuteur",
    description:
      "Implantologie, prothèse fixée, restauration esthétique, flux numérique et fabrication sur mesure. Sélectionnez une expertise pour découvrir notre approche.",
    tabs: [
      {
        key: "implantologie",
        label: "Implantologie",
        title: "Restaurations supra-implantaires",
        body: "Couronnes vissées ou scellées, bridges implantaires, piliers personnalisés et guides chirurgicaux. Chaque restauration est conçue autour du profil d’émergence et de la biomécanique du cas.",
        bullets: [
          "Couronnes implantaires en zircone ou céramique",
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
        title: "Prothèses fixées et amovibles",
        body: "Céramique, zircone monolithique, métal-céramique, châssis et prothèses adjointes. Chaque pièce est ajustée avec soin pour un rendu naturel et une occlusion stable.",
        bullets: [
          "Couronnes céramiques et zircone",
          "Bridges céramo-céramiques et métal-céramique",
          "Châssis et prothèses amovibles",
          "Restauration esthétique antérieure",
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
          "Conception CAD validée par nos techniciens",
          "Usinage 5 axes et impression 3D",
          "Contrôle qualité automatisé et manuel",
        ],
        href: "/flux-numerique",
        photo: "Conception CAD — poste technique",
        tone: "deep" as const,
      },
      {
        key: "laboratoire",
        label: "Fabrication",
        title: "Un atelier maîtrisé",
        body: "Postes de travail organisés par expertise, parc CFAO entretenu et prothésistes spécialisés : les conditions de fabrication sont pensées pour la stabilité du résultat.",
        bullets: [
          "Équipe de prothésistes spécialisés",
          "Parc CFAO maintenu et calibré",
          "Contrôle qualité systématique",
          "Traçabilité lot par lot",
        ],
        href: "/laboratoire",
        photo: "Contrôle qualité — atelier",
        tone: "warm" as const,
      },
    ],
  },

  gallery: {
    eyebrow: "L’atelier",
    title: "Le savoir-faire, en images",
    description:
      "Une plongée dans nos ateliers : équipe, machines et gestes qui font la précision d’IMPLANTOLAB.",
    photos: [
      { caption: "Atelier CFAO", tone: "cool" as const, ratio: "portrait" as const },
      { caption: "Finition manuelle", tone: "warm" as const, ratio: "square" as const },
      { caption: "Poste de conception", tone: "deep" as const, ratio: "square" as const },
      { caption: "Contrôle dimensionnel", tone: "warm" as const, ratio: "landscape" as const },
      { caption: "Zircone brute", tone: "cool" as const, ratio: "portrait" as const },
      { caption: "Équipe technique", tone: "deep" as const, ratio: "landscape" as const },
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
    title: "Un laboratoire à taille humaine, engagé pour la qualité",
    body: "IMPLANTOLAB réunit une équipe de prothésistes dentaires expérimentés autour d’un objectif commun : produire des restaurations fiables, esthétiques et reproductibles, dans le respect des délais convenus. Nous travaillons main dans la main avec les cabinets dentaires de la région Centre-Val de Loire et au-delà.",
    highlights: [
      "Équipe spécialisée par domaine d’expertise",
      "Communication directe avec un référent technique",
      "Locaux à Blois — Loir-et-Cher",
    ],
    link: { label: "Découvrir notre approche", href: "/laboratoire" },
    photoCaption: "Équipe IMPLANTOLAB — atelier",
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
        tone: "cool" as const,
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
