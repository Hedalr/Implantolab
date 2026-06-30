export type SimplePageContent = {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  sections: {
    eyebrow?: string;
    title: string;
    body: string;
    items?: { title: string; description: string }[];
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
            "Vissée ou scellée, en zircone monolithique ou céramique stratifiée.",
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
      body: "Réception du cas, validation du plan prothétique, fabrication selon le protocole défini, contrôle qualité dimensionnel et esthétique, livraison documentée. Chaque étape est tracée pour garantir la régularité du résultat.",
    },
    {
      eyebrow: "Matériaux",
      title: "Matériaux sélectionnés pour la performance clinique",
      body: "Zircone haute translucidité, céramiques pressées, titane et alliages biocompatibles : nous travaillons avec des matériaux certifiés et adaptés aux contraintes implantaires.",
    },
    {
      eyebrow: "Accompagnement",
      title: "Un partenaire technique disponible",
      body: "Vous bénéficiez d’un interlocuteur dédié pour discuter du cas, valider les choix techniques et anticiper les contraintes : pose, espace prothétique, design d’émergence et finitions.",
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
  title: "Prothèses sur mesure, fixées et amovibles",
  intro:
    "Une gamme complète de prothèses dentaires, conçues et finalisées dans nos ateliers, pour répondre à la diversité des indications cliniques et des attentes esthétiques.",
  sections: [
    {
      eyebrow: "Prothèse fixée",
      title: "Couronnes, bridges et inlays",
      body: "Solutions céramiques, zircone monolithique, métal-céramique et inlays-onlays : chaque pièce est conçue pour son indication, avec un soin particulier porté à l’adaptation marginale et à l’intégration occlusale.",
    },
    {
      eyebrow: "Prothèse amovible",
      title: "Châssis et prothèses adjointes",
      body: "Châssis métalliques, prothèses adjointes partielles et complètes, conçus pour le confort du patient et la stabilité fonctionnelle. Réalisations en flux numérique lorsque cela améliore la précision.",
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
  title: "Flux numérique et CFAO maîtrisés",
  intro:
    "Notre laboratoire intègre la chaîne numérique de bout en bout : de la réception du fichier patient à la fabrication CFAO, jusqu’au contrôle final. Une organisation pensée pour la fiabilité et la traçabilité.",
  sections: [
    {
      eyebrow: "Formats",
      title: "Formats et empreintes acceptés",
      body: "Nous acceptons les principaux formats du marché (STL, PLY, OBJ) issus des scanners intra-oraux courants, ainsi que les empreintes physiques numérisées au laboratoire.",
    },
    {
      eyebrow: "Workflow",
      title: "Du scan à la prothèse",
      body: "Réception du fichier, contrôle qualité du scan, conception assistée par ordinateur, fabrication CFAO, finitions, contrôle. Le flux numérique est documenté et reproductible.",
      items: [
        {
          title: "Réception sécurisée",
          description:
            "Transfert via plateforme sécurisée ou portail praticien.",
        },
        {
          title: "Conception assistée",
          description:
            "Conception CAD validée par un technicien qualifié.",
        },
        {
          title: "Production CFAO",
          description:
            "Usinage et impression sur équipements professionnels.",
        },
        {
          title: "Finitions atelier",
          description:
            "Maquillage, polissage et contrôle dimensionnel manuel.",
        },
      ],
    },
    {
      eyebrow: "Outils",
      title: "Un parc technologique adapté",
      body: "Logiciels de conception, scanners de laboratoire, fraiseuses et imprimantes : notre parc est sélectionné pour la précision et la cohérence du résultat clinique.",
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
  title: "Un laboratoire engagé pour la qualité",
  intro:
    "IMPLANTOLAB réunit une équipe de prothésistes dentaires expérimentés autour d’un objectif commun : produire des restaurations fiables, esthétiques et reproductibles, dans le respect des délais convenus.",
  sections: [
    {
      eyebrow: "Savoir-faire",
      title: "Une équipe spécialisée",
      body: "Nos prothésistes interviennent sur leurs domaines d’expertise — implantologie, esthétique antérieure, CFAO, prothèse amovible — pour garantir la précision sur chaque cas.",
    },
    {
      eyebrow: "Atelier",
      title: "Atelier et équipements",
      body: "Espaces de travail organisés par poste, parc CFAO maintenu, instruments calibrés : les conditions de fabrication sont pensées pour la stabilité du résultat.",
    },
    {
      eyebrow: "Qualité",
      title: "Contrôle qualité documenté",
      body: "Chaque restauration fait l’objet d’un contrôle qualité formalisé avant expédition : adaptation, dimensions, teinte, finitions.",
    },
    {
      eyebrow: "Traçabilité",
      title: "Traçabilité des matériaux et des étapes",
      body: "Lot des matériaux, étapes de fabrication, intervenants : la traçabilité est documentée et accessible sur demande pour chaque cas.",
    },
    {
      eyebrow: "Délais",
      title: "Engagement sur les délais",
      body: "Notre organisation interne et notre planification nous permettent de respecter les délais annoncés pour chaque type de réalisation.",
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
