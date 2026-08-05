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
 * Hors Laboratoire ; consultable uniquement dans l'espace admin (visualisation).
 */
export const MODIFICATION_PROTHESE_CATEGORY: RequestCategory =
  "Modifications prothèse";

/** Sujets affichés dans Laboratoire (admin / chef / prothésiste). */
export const LAB_SUBJECTS = ["Infos complémentaires"] as const;

export function isLabSubject(
  subject: string,
): subject is (typeof LAB_SUBJECTS)[number] {
  return (LAB_SUBJECTS as readonly string[]).includes(subject);
}

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

/** True si le sujet ouvre un fil de discussion labo (inbox). */
export function isRequestInboxSubject(
  subject: string,
): subject is (typeof REQUEST_INBOX_SUBJECTS)[number] {
  return (REQUEST_INBOX_SUBJECTS as readonly string[]).includes(subject);
}

export type RequestMessage = {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string | null;
  body: string;
  createdAt: string;
};

export const REQUEST_MESSAGE_MAX_LENGTH = 2000;
