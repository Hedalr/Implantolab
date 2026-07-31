export const CONTACT_SUBJECTS = [
  "Catalogue & tarifs",
  "Demande de rendez-vous",
  "Demande de devis",
  "Question technique",
  "Autre",
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

const SUBJECT_SLUGS = {
  catalogue: "Catalogue & tarifs",
  rdv: "Demande de rendez-vous",
  devis: "Demande de devis",
  technique: "Question technique",
  autre: "Autre",
} as const;

export type ContactSubjectSlug = keyof typeof SUBJECT_SLUGS;

export function resolveContactSubject(
  slug: string | undefined,
): ContactSubject {
  if (!slug) return CONTACT_SUBJECTS[0];
  const key = slug.toLowerCase();
  if (Object.hasOwn(SUBJECT_SLUGS, key)) {
    return SUBJECT_SLUGS[key as ContactSubjectSlug];
  }
  return CONTACT_SUBJECTS[0];
}

export function contactHref(slug?: ContactSubjectSlug): string {
  return slug ? `/contact?sujet=${slug}` : "/contact";
}
