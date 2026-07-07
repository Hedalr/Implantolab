/**
 * Types partagés du module Laboratoire.
 *
 * Reflète les tables `patient_cases`, `case_messages`, `case_media`,
 * `dentist_contacts` définies dans supabase/migrations/002_labo.sql.
 */

export type CaseStatus =
  | "pending_review"
  | "received"
  | "in_progress"
  | "waiting_info"
  | "completed"
  | "delivered"
  | "archived";

export type CasePriority = "low" | "normal" | "high" | "urgent";

export type MessageDirection = "inbound" | "outbound";

export type PatientCase = {
  id: string;
  caseNumber: string;
  patientName: string | null;
  patientNameConfidence: number | null;
  dentistContactId: string | null;
  dentistNameRaw: string | null;
  dentistPhoneE164: string | null;
  workType: string | null;
  description: string | null;
  status: CaseStatus;
  priority: CasePriority;
  assignedProsthetistId: string | null;
  needsReview: boolean;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseMessage = {
  id: string;
  caseId: string;
  whatsappMessageId: string | null;
  direction: MessageDirection;
  senderPhoneE164: string | null;
  body: string | null;
  rawPayload: unknown;
  receivedAt: string | null;
  createdAt: string;
};

export type CaseMedia = {
  id: string;
  caseId: string;
  messageId: string | null;
  storageBucket: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  whatsappMediaId: string | null;
  originalFilename: string | null;
  caption: string | null;
  createdAt: string;
};

export type DentistContact = {
  id: string;
  whatsappPhoneE164: string;
  fullName: string | null;
  practiceId: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Résultat d'une extraction IA sur un message WhatsApp.
 * Tous les champs sont optionnels — l'IA peut ne rien deviner de fiable.
 */
export type CaseExtraction = {
  patientName: string | null;
  patientNameConfidence: number | null;
  dentistName: string | null;
  workType: string | null;
  description: string | null;
  priority: CasePriority | null;
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  pending_review: "À valider",
  received: "Reçu",
  in_progress: "En cours",
  waiting_info: "Info manquante",
  completed: "Terminé",
  delivered: "Livré",
  archived: "Archivé",
};

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};
