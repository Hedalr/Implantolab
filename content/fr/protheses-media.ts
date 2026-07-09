import type { GallerySlide } from "@/components/ui/SwipeGallery";

/**
 * Galeries de réalisations réelles pour la page /protheses, fournies par le
 * laboratoire. Chaque galerie est rattachée à une section via son eyebrow.
 * Les photos sont anonymisées et publiées avec l'accord du praticien.
 */
export type ProthesesGallery = {
  label: string;
  slides: GallerySlide[];
};

export const prothesesGalleries: Record<string, ProthesesGallery> = {
  "Prothèse conjointe": {
    label: "Réalisations — prothèse conjointe",
    slides: [
      {
        type: "image",
        src: "/photos/protheses/conjointe-emax-1.jpg",
        alt: "Couronne conjointe full EMAX réalisée au laboratoire",
        caption: "Couronne conjointe — full EMAX",
      },
      {
        type: "image",
        src: "/photos/protheses/conjointe-emax-2.jpg",
        alt: "Couronne céramique EMAX, vue rapprochée",
        caption: "Couronne conjointe — full EMAX",
      },
      {
        type: "image",
        src: "/photos/protheses/conjointe-emax-3.jpg",
        alt: "Restauration céramique EMAX, intégration de la teinte",
        caption: "Couronne conjointe — full EMAX",
      },
      {
        type: "image",
        src: "/photos/protheses/conjointe-emax-4.jpg",
        alt: "Couronne full EMAX finalisée",
        caption: "Couronne conjointe — full EMAX",
      },
      {
        type: "image",
        src: "/photos/protheses/bridge-transvisse-1.jpg",
        alt: "Bridge transvissé micro-stratifié zircone",
        caption: "Bridge transvissé — zircone micro-stratifiée, rattrapage d’axe",
      },
      {
        type: "image",
        src: "/photos/protheses/bridge-transvisse-2.jpg",
        alt: "Bridge zircone stratifié, vue occlusale",
        caption: "Bridge transvissé — zircone micro-stratifiée, rattrapage d’axe",
      },
      {
        type: "image",
        src: "/photos/protheses/bridge-transvisse-3.jpg",
        alt: "Bridge transvissé, détail des puits de vis",
        caption: "Bridge transvissé — zircone micro-stratifiée, rattrapage d’axe",
      },
      {
        type: "image",
        src: "/photos/protheses/bridge-transvisse-4.jpg",
        alt: "Bridge transvissé finalisé sur modèle",
        caption: "Bridge transvissé — zircone micro-stratifiée, rattrapage d’axe",
      },
    ],
  },
  "Prothèse amovible": {
    label: "Réalisations — prothèse amovible & hybride",
    slides: [
      {
        type: "video",
        src: "/videos/complete-bimaxillaire.mp4",
        caption: "Prothèse complète bimaxillaire — présentation",
      },
      {
        type: "image",
        src: "/photos/protheses/bimaxillaire-1.jpg",
        alt: "Prothèse complète bimaxillaire, caractérisation esthétique",
        caption: "Prothèse complète bimaxillaire — caractérisation poussée",
      },
      {
        type: "image",
        src: "/photos/protheses/bimaxillaire-2.jpg",
        alt: "Prothèse complète bimaxillaire, vue de face",
        caption: "Prothèse complète bimaxillaire — caractérisation poussée",
      },
      {
        type: "image",
        src: "/photos/protheses/bimaxillaire-3.jpg",
        alt: "Prothèse complète bimaxillaire, détail des dents",
        caption: "Prothèse complète bimaxillaire — caractérisation poussée",
      },
      {
        type: "image",
        src: "/photos/protheses/bimaxillaire-4.jpg",
        alt: "Prothèse complète bimaxillaire finalisée",
        caption: "Prothèse complète bimaxillaire — caractérisation poussée",
      },
      {
        type: "image",
        src: "/photos/protheses/barre-implantaire-1.jpg",
        alt: "Barre implantaire hybride réalisée au laboratoire",
        caption: "Barre implantaire hybride",
      },
      {
        type: "image",
        src: "/photos/protheses/barre-implantaire-2.jpg",
        alt: "Barre implantaire hybride, vue rapprochée",
        caption: "Barre implantaire hybride",
      },
      {
        type: "image",
        src: "/photos/protheses/barre-implantaire-3.jpg",
        alt: "Barre implantaire hybride, détail d’ajustage",
        caption: "Barre implantaire hybride",
      },
      {
        type: "image",
        src: "/photos/protheses/mise-en-charge-1.jpg",
        alt: "Restauration complète en mise en charge immédiate sur six implants",
        caption: "Mise en charge immédiate — complet sur six implants, fausse gencive composite",
      },
    ],
  },
};
