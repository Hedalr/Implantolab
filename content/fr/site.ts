export type NavLink = {
  label: string;
  href: string;
  children?: NavLink[];
};

export const site = {
  name: "IMPLANTOLAB",
  baseline: "Laboratoire de prothèse dentaire",
  description:
    "IMPLANTOLAB conçoit et fabrique des prothèses dentaires sur mesure pour les chirurgiens-dentistes, avec une chaîne de production interne 100 % Made in Blois.",
  url: "https://www.implantolab.fr",
  locale: "fr-FR",
  contact: {
    phone: "+33967359779",
    phoneDisplay: "09 67 35 97 79",
    email: "contact@implantolab.fr",
    address: {
      line1: "84 avenue de Châteaudun",
      line2: "",
      postalCode: "41000",
      city: "Blois",
      country: "France",
    },
    hours: [
      { label: "Lundi – Vendredi", value: "9h00 – 17h00" },
      { label: "Samedi – Dimanche", value: "Fermé" },
    ],
  },
  legal: {
    companyName: "IMPLANTOLAB",
    legalForm: "Société à responsabilité limitée",
    capital: "5 000 €",
    siren: "800 602 401",
    siret: "800 602 401 00039",
    rcs: "800 602 401 RCS Blois",
    vat: "FR12 800602401",
    activity:
      "Fabrication de matériel médico-chirurgical et dentaire (32.50A)",
    founded: "1 février 2014",
    publicationDirector: "Antoine LELIEVRE, gérant",
    annuaireUrl:
      "https://annuaire-entreprises.data.gouv.fr/entreprise/implantolab-800602401",
    hosting: {
      name: "Vercel Inc.",
      address: "340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis",
      url: "https://vercel.com",
    },
  },
};

export const primaryNav: NavLink[] = [
  {
    label: "Laboratoire",
    href: "/laboratoire",
    children: [
      { label: "Savoir-faire", href: "/laboratoire#savoir-faire" },
      { label: "Atelier & équipements", href: "/laboratoire#atelier" },
      { label: "Qualité & traçabilité", href: "/laboratoire#qualite" },
      { label: "Délais", href: "/laboratoire#delais" },
    ],
  },
  {
    label: "Expertises",
    href: "/expertises",
    children: [
      { label: "Implantologie", href: "/implantologie" },
      { label: "Prothèse conjointe", href: "/protheses#prothese-conjointe" },
      { label: "Prothèse amovible", href: "/protheses#prothese-amovible" },
    ],
  },
  { label: "Flux numérique", href: "/flux-numerique" },
  { label: "Actualités", href: "/actualites" },
  {
    label: "Recrutement",
    href: "/recrutement",
    children: [
      { label: "Postes ouverts", href: "/recrutement#postes" },
      { label: "Stage & alternance", href: "/recrutement#stage-alternance" },
      { label: "Nos valeurs & nous rejoindre", href: "/recrutement#valeurs" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

export const practitionerLink: NavLink = {
  label: "Espace praticien",
  href: "/espace-praticien",
};

export const footerColumns: { title: string; links: NavLink[] }[] = [
  {
    title: "Expertises",
    links: [
      { label: "Implantologie", href: "/implantologie" },
      { label: "Prothèse conjointe et amovible", href: "/protheses" },
      { label: "Flux numérique et CFAO", href: "/flux-numerique" },
    ],
  },
  {
    title: "Laboratoire",
    links: [
      { label: "Notre approche", href: "/laboratoire" },
      { label: "Actualités", href: "/actualites" },
      { label: "Recrutement", href: "/recrutement" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Praticiens",
    links: [
      { label: "Espace praticien", href: "/espace-praticien" },
      { label: "Demander un devis", href: "/contact?sujet=devis" },
      { label: "Envoyer un cas", href: "/contact?sujet=cas" },
      { label: "Question technique", href: "/contact?sujet=technique" },
    ],
  },
];

export const legalLinks: NavLink[] = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Politique de confidentialité", href: "/confidentialite" },
];
