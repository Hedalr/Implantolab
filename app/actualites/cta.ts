import { contactHref } from "@/lib/contact-subjects";

/** CTA partagé par la liste des actualités et la page d'article. */
export const actualitesCta = {
  title: "Un cas à adresser ?",
  description:
    "Vous avez un cas à adresser, une question technique ou un besoin de devis ? Notre équipe vous répond rapidement pour vous orienter vers la solution la plus adaptée.",
  primary: { label: "Nous contacter", href: contactHref() },
  secondary: {
    label: "Question technique",
    href: contactHref("technique"),
  },
};
