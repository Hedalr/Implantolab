/**
 * Types partagés du module "Demandes" (espace praticien).
 *
 * Reflète les tables `requests` et `request_media` définies dans
 * `supabase/migrations/001_init.sql` et `004_request_media.sql`.
 */

import type { ProfileRole } from "@/lib/roles";

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

/** Sujets affichés dans Laboratoire (admin / chef / prothésiste). */
export const LAB_SUBJECTS = ["Infos complémentaires"] as const;

/** Legacy DB value for Infos complémentaires. */
const LAB_SUBJECT_LEGACY = "Demande";

/**
 * Aperçu `message` sur `GET /api/v1/requests` (list) — détail reste complet.
 * P2-7 / S6.
 */
export const REQUEST_LIST_MESSAGE_PREVIEW_CHARS = 120;

export function isRequestCategory(value: string): value is RequestCategory {
  return (REQUEST_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Sujets autorisés côté API pour un rôle lab (P2-7 / S5).
 * - prosthetist → labo only
 * - chef → labo + inbox Q/U
 * - admin / practitioner → null (pas de filtre forcé)
 */
export function allowedSubjectsForRole(
  role: ProfileRole,
): readonly string[] | null {
  if (role === "prosthetist") {
    return [...LAB_SUBJECTS, LAB_SUBJECT_LEGACY];
  }
  if (role === "chef_de_secteur") {
    return [...LAB_SUBJECTS, LAB_SUBJECT_LEGACY, ...REQUEST_INBOX_SUBJECTS];
  }
  return null;
}

/** Tronque le message pour les listes API (patient_name inchangé). */
export function previewRequestMessage(message: string): string {
  if (message.length <= REQUEST_LIST_MESSAGE_PREVIEW_CHARS) return message;
  return `${message.slice(0, REQUEST_LIST_MESSAGE_PREVIEW_CHARS)}…`;
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
