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
] as const;

export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export function isRequestCategory(value: string): value is RequestCategory {
  return (REQUEST_CATEGORIES as readonly string[]).includes(value);
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
