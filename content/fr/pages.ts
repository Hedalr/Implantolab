export type SimplePageContent = {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  sections: {
    eyebrow?: string;
    title: string;
    body: string;
    items?: {
      title: string;
      description: string;
      photoKey?: string;
    }[];
  }[];
  cta: {
    title: string;
    description: string;
    primary: { label: string; href: string };
    secondary?: { label: string; href: string };
  };
};

export const implantologie: SimplePageContent = {
  slug: "implantologie",
  eyebrow: "Expertise",
  title: "Solutions prothétiques implantaires de précision",
  intro:
    "IMPLANTOLAB conçoit des restaurations sur implants pensées comme un prolongement de votre acte chirurgical : précision occlusale, esthétique gingivale et longévité du résultat clinique.",
  sections: [
    {
      eyebrow: "Réalisations",
      title: "Types de restaurations implantaires",
      body: "Nous prenons en charge l’ensemble des restaurations supra-implantaires courantes, en intégrant les contraintes biomécaniques et esthétiques propres à chaque indication.",
      items: [
        {
          title: "Couronne implantaire",
          description:
            "Transvissée ou scellée, en zircone monolithique ou céramique stratifiée.",
        },
        {
          title: "Bridge implantaire",
          description:
            "Étendue intermédiaire ou complète, conception assistée pour passivité optimale.",
        },
        {
          title: "Pilier personnalisé",
          description:
            "Profil d’émergence et angulation adaptés au cas clinique.",
        },
        {
          title: "Guide chirurgical",
          description:
            "Conception à partir de vos données 3D pour sécuriser l’acte chirurgical.",
        },
      ],
    },
    {
      eyebrow: "Protocole",
      title: "Un protocole implantaire structuré",
      body: "Réception du cas, validation du plan prothétique, fabrication selon le protocole défini, contrôle qualité dimensionnel et esthétique. Chaque étape est tracée pour garantir la régularité du résultat.",
    },
    {
      eyebrow: "Matériaux",
      title: "Matériaux sélectionnés pour la performance clinique",
      body: "Zircone 3Y dernière génération, céramiques stratifiées, titane et alliages biocompatibles : nous travaillons avec des matériaux certifiés et adaptés aux contraintes implantaires.",
    },
    {
      eyebrow: "Accompagnement",
      title: "Un partenaire technique disponible",
      body: "Vous bénéficiez d’un interlocuteur dédié pour discuter du cas, valider les choix techniques et anticiper les contraintes : pose, espace prothétique, design d’émergence et finitions. Pour chaque cas complexe, nous nous déplaçons directement en cabinet à vos côtés.",
    },
  ],
  cta: {
    title: "Vous avez un cas implantaire à adresser ?",
    description:
      "Décrivez-nous votre cas en quelques lignes : nous revenons rapidement vers vous avec une proposition technique et un délai.",
    primary: { label: "Envoyer un cas", href: "/contact?sujet=cas" },
    secondary: { label: "Demander un devis", href: "/contact?sujet=devis" },
  },
};

export const protheses: SimplePageContent = {
  slug: "protheses",
  eyebrow: "Prothèses",
  title: "Prothèses sur mesure, conjointes et amovibles",
  intro:
    "Une gamme complète de prothèses dentaires, conçues et finalisées dans nos ateliers, pour répondre à la diversité des indications cliniques et des attentes esthétiques.",
  sections: [
    {
      eyebrow: "Prothèse conjointe",
      title: "Couronnes, bridges et inlays",
      body: "Solutions céramiques, zircone monolithique, métal-céramique et inlays-onlays : chaque pièce est conçue pour son indication, avec un soin particulier porté à l’adaptation marginale et à l’intégration occlusale.",
    },
    {
      eyebrow: "Prothèse amovible",
      title: "Châssis, PEEK, hybride et résine",
      body: "Une offre complète de prothèses amovibles pour répondre à chaque indication clinique et au confort du patient.",
      items: [
        {
          title: "Châssis métallique",
          description:
            "Châssis stellite conçus pour la stabilité fonctionnelle et le confort quotidien.",
        },
        {
          title: "Châssis PEEK",
          description:
            "Alternative allégée et biocompatible, adaptée aux patients sensibles aux alliages métalliques.",
        },
        {
          title: "Prothèse hybride",
          description:
            "Restaurations combinées associant précision de la CFAO et savoir-faire artisanal.",
        },
        {
          title: "Résine définitive ou provisoire",
          description:
            "Prothèses résines complètes ou partielles, en version provisoire ou définitive selon l’indication.",
        },
      ],
    },
    {
      eyebrow: "Esthétique",
      title: "Restauration esthétique antérieure",
      body: "Facettes, couronnes esthétiques, stratifications céramiques : travail détaillé sur la teinte, la translucidité et la morphologie pour une intégration naturelle.",
    },
    {
      eyebrow: "Process",
      title: "De la commande à la livraison",
      body: "Réception de l’empreinte ou du fichier numérique, conception, validation, fabrication, contrôle qualité, expédition. Vous êtes informé à chaque étape clé.",
    },
  ],
  cta: {
    title: "Besoin d’un devis pour une prothèse spécifique ?",
    description:
      "Indiquez-nous le type de restauration, la zone concernée et vos contraintes : nous établissons une proposition adaptée.",
    primary: { label: "Demander un devis", href: "/contact?sujet=devis" },
    secondary: { label: "Nous contacter", href: "/contact" },
  },
};

export const fluxNumerique: SimplePageContent = {
  slug: "flux-numerique",
  eyebrow: "Numérique",
  title: "Flux numérique, interopérabilité et CFAO maîtrisés",
  intro:
    "Notre laboratoire intègre la chaîne numérique de bout en bout : de la réception du fichier patient à la fabrication CFAO, jusqu’au contrôle final. Interopérabilité assurée avec les principaux scanners du marché, pour une organisation pensée pour la fiabilité et la traçabilité.",
  sections: [
    {
      eyebrow: "Formats",
      title: "Formats et empreintes acceptés",
      body: "Nous acceptons les principaux formats du marché — STL, PLY, OBJ — issus des scanners intra-oraux courants, ainsi que les empreintes physiques numérisées au laboratoire. Interopérabilité garantie avec les scanners 3Shape, Medit, iTero et équivalents.",
    },
    {
      eyebrow: "Workflow",
      title: "Du scan à la prothèse",
      body: "Réception du fichier, contrôle qualité du scan, conception CAO, fabrication CFAO, finitions, contrôle. Le flux numérique est documenté et reproductible.",
      items: [
        {
          title: "Réception sécurisée",
          description:
            "Transfert via plateforme sécurisée ou portail praticien.",
          photoKey: "Contrôle dimensionnel",
        },
        {
          title: "Conception CAO",
          description:
            "Conception CAO validée par un technicien qualifié.",
          photoKey: "Conception CAO — poste technique",
        },
        {
          title: "Production CFAO",
          description:
            "Usinage et impression sur équipements professionnels.",
          photoKey: "Atelier CFAO",
        },
        {
          title: "Finitions atelier",
          description:
            "Maquillage, polissage et contrôle manuel par des prothésistes qualifiés.",
          photoKey: "Finition manuelle",
        },
      ],
    },
    {
      eyebrow: "Outils",
      title: "Un laboratoire à la veille de la technologie",
      body: "Logiciels de conception, scanners de laboratoire, fraiseuses et imprimantes : notre parc est sélectionné pour la précision et la cohérence du résultat clinique. Nous investissons régulièrement dans les dernières technologies du marché.",
      items: [
        {
          title: "Parc imprimantes résine",
          description:
            "HeyGears dernière génération, Formlabs automatisées et imprimante filaire pour couvrir toutes les indications.",
        },
        {
          title: "Parc usinage 5 axes",
          description:
            "Usineuses 5 axes iMES-iCore dernière génération pour zircone, PMMA et alliages.",
        },
        {
          title: "Micro-fusion métal",
          description:
            "Micro-fusion métal iMES-iCore réalisée en interne, sans sous-traitance.",
        },
        {
          title: "Conception 3Shape",
          description:
            "Conception sur 3Shape — nous sommes bêta-testeurs France sur les évolutions logicielles.",
        },
      ],
    },
    {
      eyebrow: "Sécurité",
      title: "Sécurité et confidentialité des données",
      body: "Les fichiers patients sont traités dans un environnement maîtrisé, avec des mesures de sécurité adaptées et une politique de conservation conforme aux exigences en vigueur.",
    },
  ],
  cta: {
    title: "Une question sur l’intégration de votre flux ?",
    description:
      "Notre équipe technique vous accompagne dans la mise en place ou l’optimisation de votre flux numérique avec le laboratoire.",
    primary: { label: "Nous contacter", href: "/contact?sujet=technique" },
  },
};

export const laboratoire: SimplePageContent = {
  slug: "laboratoire",
  eyebrow: "Laboratoire",
  title: "Un atelier maîtrisé, organisé par secteur d’activité",
  intro:
    "IMPLANTOLAB réunit une équipe de prothésistes dentaires expérimentés autour d’un objectif commun : produire des restaurations fiables, esthétiques et reproductibles, dans le respect des délais convenus. Postes de travail organisés par secteur d’activité, chaîne de production 100 % interne à Blois.",
  sections: [
    {
      eyebrow: "Savoir-faire",
      title: "Une équipe spécialisée par secteur d’activité",
      body: "Nos prothésistes interviennent sur leurs domaines d’expertise pour garantir la précision sur chaque cas. Postes de travail organisés par secteur d’activité, avec un référent technique par domaine.",
      items: [
        {
          title: "CFAO",
          description:
            "Conception, usinage et impression : notre chaîne numérique complète.",
        },
        {
          title: "Prothèses adjointes",
          description:
            "Châssis, PEEK, résines et prothèses hybrides.",
        },
        {
          title: "Prothèses conjointes",
          description:
            "Couronnes, bridges et inlays, en céramique, zircone ou métal-céramique.",
        },
        {
          title: "Implantologie",
          description:
            "Restaurations supra-implantaires, piliers personnalisés et guides chirurgicaux.",
        },
        {
          title: "Orthodontie simple",
          description:
            "Tout type de gouttière, sur mesure et en flux numérique.",
        },
      ],
    },
    {
      eyebrow: "Atelier",
      title: "Un atelier organisé pour la précision",
      body: "Espaces de travail dédiés à chaque secteur, parc CFAO calibré et instruments contrôlés régulièrement.",
    },
    {
      eyebrow: "Qualité",
      title: "Contrôle qualité documenté et écoute clinique",
      body: "Chaque restauration fait l’objet d’un contrôle qualité formalisé avant expédition : adaptation, dimensions, teinte, finitions. Nous restons à l’écoute des doléances des praticiens et de leurs patients pour ajuster nos protocoles et améliorer chaque étape.",
    },
    {
      eyebrow: "Traçabilité",
      title: "Traçabilité des matériaux et des étapes",
      body: "Lot des matériaux, étapes de fabrication, intervenants : la traçabilité est documentée et accessible sur demande pour chaque cas.",
    },
    {
      eyebrow: "Délais",
      title: "Engagement sur les délais",
      body: "Suite à une organisation bien structurée et contrôlée, notre planification interne nous permet de respecter les délais annoncés pour chaque type de réalisation, du cas unitaire au chantier implantaire complexe.",
    },
  ],
  cta: {
    title: "Découvrir le laboratoire",
    description:
      "Vous souhaitez en savoir plus sur notre organisation ou visiter l’atelier ? Contactez-nous pour convenir d’un échange.",
    primary: { label: "Prendre contact", href: "/contact" },
  },
};

export const casCliniques: SimplePageContent = {
  slug: "cas-cliniques",
  eyebrow: "Cas cliniques",
  title: "Cas cliniques et réalisations",
  intro:
    "Une sélection de cas représentatifs de notre activité : implantologie, esthétique antérieure et restaurations CFAO. Les cas présentés sont anonymisés et publiés avec l’accord du praticien.",
  sections: [
    {
      eyebrow: "Implantologie",
      title: "Restaurations supra-implantaires",
      body: "Couronnes implantaires unitaires, bridges implantaires, restaurations complètes : cas représentatifs de notre approche prothétique implantaire.",
    },
    {
      eyebrow: "Esthétique",
      title: "Restauration esthétique antérieure",
      body: "Facettes, couronnes céramiques, stratifications : cas illustrant le travail de la teinte, de la morphologie et de l’intégration tissulaire.",
    },
    {
      eyebrow: "CFAO",
      title: "Réalisations en flux numérique",
      body: "Cas conçus et produits via notre chaîne numérique, de la réception du scan à la livraison de la prothèse finalisée.",
    },
  ],
  cta: {
    title: "Un cas similaire à discuter ?",
    description:
      "Contactez-nous pour échanger sur votre cas et identifier la solution prothétique la plus adaptée.",
    primary: { label: "Discuter d’un cas", href: "/contact?sujet=cas" },
  },
};

export type CaseJourneyStep = {
  key: string;
  number: string;
  label: string;
  duration: string;
  title: string;
  description: string;
  details: string[];
  photoKey: string;
};

export const caseJourney: {
  eyebrow: string;
  title: string;
  description: string;
  steps: CaseJourneyStep[];
} = {
  eyebrow: "Parcours",
  title: "Le parcours d’un cas, du scan à la livraison",
  description:
    "De la réception de l’empreinte numérique à l’expédition de la restauration finie, chaque cas suit une chaîne de fabrication structurée et tracée. Parcourez les étapes.",
  steps: [
    {
      key: "scan",
      number: "01",
      label: "Scan",
      duration: "Jour 0",
      title: "Réception de l’empreinte numérique",
      description:
        "Le fichier transmis par le praticien — scanner intra-oral ou empreinte physique numérisée au laboratoire — est réceptionné et contrôlé avant son intégration dans notre chaîne de production.",
      details: [
        "Formats acceptés : STL, PLY, OBJ",
        "Vérification de la qualité et de la complétude du scan",
        "Ouverture du dossier de fabrication",
      ],
      photoKey: "Contrôle dimensionnel",
    },
    {
      key: "design",
      number: "02",
      label: "Design",
      duration: "Jour 1",
      title: "Conception assistée par ordinateur",
      description:
        "Nos techniciens modélisent la restauration sur poste de CAO en tenant compte de l’occlusion, du profil d’émergence et des contraintes biomécaniques propres au cas.",
      details: [
        "Modélisation sur mesure du cas",
        "Validation du plan prothétique",
        "Optimisation du fichier avant fabrication",
      ],
      photoKey: "Conception CAO — poste technique",
    },
    {
      key: "usinage",
      number: "03",
      label: "Usinage",
      duration: "Jour 2–3",
      title: "Usinage, impression et finitions",
      description:
        "La pièce est usinée sur nos centres 5 axes ou imprimée selon le matériau requis, puis reprise à la main par nos prothésistes pour la stratification et les finitions esthétiques.",
      details: [
        "Usinage 5 axes et impression 3D",
        "Zircone, titane ou résine biocompatible",
        "Finitions manuelles et contrôle en cours de fabrication",
      ],
      photoKey: "Atelier CFAO",
    },
    {
      key: "livraison",
      number: "04",
      label: "Livraison",
      duration: "Jour 4–5",
      title: "Contrôle qualité et livraison",
      description:
        "Chaque restauration fait l’objet d’un contrôle qualité formalisé — forme, teinte, adaptation — avant un conditionnement soigné et une expédition sécurisée vers le cabinet.",
      details: [
        "Contrôle qualité documenté et tracé",
        "Conditionnement adapté au transport",
        "Expédition dans le délai annoncé",
      ],
      photoKey: "Couronne céramique — finition",
    },
  ],
};
