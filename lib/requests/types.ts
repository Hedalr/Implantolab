/**
 * Types partagés du module "Demandes" (espace praticien).
 *
 * Reflète les tables `requests` et `request_media` définies dans
 * `supabase/migrations/001_init.sql` et `004_request_media.sql`.
 */

export const REQUEST_CATEGORIES = [
  "Infos complémentaires",
  "Urgence",
  "Question",
  "Modifications prothèse",
] as const;

export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

/** Sujets de l'inbox admin / chef de secteur (Question + Urgence). */
export const REQUEST_INBOX_SUBJECTS = ["Question", "Urgence"] as const;

export const REQUEST_INBOX_LABEL = "Question/Urgence";

export function isRequestCategory(value: string): value is RequestCategory {
  return (REQUEST_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Catégorie déclenchant l'envoi automatique d'un email à la boîte dédiée
 * "Modifications prothèse" (qui déclenche à son tour l'impression d'une
 * étiquette côté laboratoire via une règle Outlook).
 * Voir `lib/email/prothese-notification.ts`.
 */
export const MODIFICATION_PROTHESE_CATEGORY: RequestCategory =
  "Modifications prothèse";

/** Affiche les catégories, y compris l'ancienne valeur "Demande". */
export function formatRequestCategory(subject: string): string {
  if (subject === "Demande") return "Infos complémentaires";
  return subject;
}

export type RequestMedia = {
  id: string;
  requestId: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  originalFilename: string | null;
  createdAt: string;
};
