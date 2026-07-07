import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CaseMedia,
  CaseMessage,
  CasePriority,
  CaseStatus,
  DentistContact,
  PatientCase,
} from "@/lib/labo/types";

/**
 * Requêtes de lecture du module Laboratoire, factorisées pour les server
 * components. Toutes ces requêtes tournent avec le client Supabase de la
 * session (RLS active : seul le personnel labo peut lire).
 */

type PatientCaseRow = {
  id: string;
  case_number: string;
  patient_name: string | null;
  patient_name_confidence: number | null;
  dentist_contact_id: string | null;
  dentist_name_raw: string | null;
  dentist_phone_e164: string | null;
  work_type: string | null;
  description: string | null;
  status: CaseStatus;
  priority: CasePriority;
  assigned_prosthetist_id: string | null;
  needs_review: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

type CaseMessageRow = {
  id: string;
  case_id: string;
  whatsapp_message_id: string | null;
  direction: "inbound" | "outbound";
  sender_phone_e164: string | null;
  body: string | null;
  raw_payload: unknown;
  received_at: string | null;
  created_at: string;
};

type CaseMediaRow = {
  id: string;
  case_id: string;
  message_id: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  sha256: string | null;
  whatsapp_media_id: string | null;
  original_filename: string | null;
  caption: string | null;
  created_at: string;
};

type DentistContactRow = {
  id: string;
  whatsapp_phone_e164: string;
  full_name: string | null;
  practice_id: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToCase(row: PatientCaseRow): PatientCase {
  return {
    id: row.id,
    caseNumber: row.case_number,
    patientName: row.patient_name,
    patientNameConfidence: row.patient_name_confidence,
    dentistContactId: row.dentist_contact_id,
    dentistNameRaw: row.dentist_name_raw,
    dentistPhoneE164: row.dentist_phone_e164,
    workType: row.work_type,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedProsthetistId: row.assigned_prosthetist_id,
    needsReview: row.needs_review,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: CaseMessageRow): CaseMessage {
  return {
    id: row.id,
    caseId: row.case_id,
    whatsappMessageId: row.whatsapp_message_id,
    direction: row.direction,
    senderPhoneE164: row.sender_phone_e164,
    body: row.body,
    rawPayload: row.raw_payload,
    receivedAt: row.received_at,
    createdAt: row.created_at,
  };
}

function rowToMedia(row: CaseMediaRow): CaseMedia {
  return {
    id: row.id,
    caseId: row.case_id,
    messageId: row.message_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    whatsappMediaId: row.whatsapp_media_id,
    originalFilename: row.original_filename,
    caption: row.caption,
    createdAt: row.created_at,
  };
}

function rowToContact(row: DentistContactRow): DentistContact {
  return {
    id: row.id,
    whatsappPhoneE164: row.whatsapp_phone_e164,
    fullName: row.full_name,
    practiceId: row.practice_id,
    email: row.email,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CaseListFilters = {
  search?: string;
  status?: CaseStatus | "all";
  needsReviewOnly?: boolean;
  assignedTo?: string;
};

export async function listCases(
  supabase: SupabaseClient,
  filters: CaseListFilters = {},
): Promise<PatientCase[]> {
  let query = supabase
    .from("patient_cases")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.needsReviewOnly) {
    query = query.eq("needs_review", true);
  }
  if (filters.assignedTo) {
    query = query.eq("assigned_prosthetist_id", filters.assignedTo);
  }
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();
    query = query.or(
      [
        `patient_name.ilike.%${s}%`,
        `dentist_name_raw.ilike.%${s}%`,
        `work_type.ilike.%${s}%`,
        `case_number.ilike.%${s}%`,
        `dentist_phone_e164.ilike.%${s}%`,
      ].join(","),
    );
  }

  const { data, error } = await query.limit(200);
  if (error || !data) return [];
  return (data as PatientCaseRow[]).map(rowToCase);
}

export async function countPendingReview(
  supabase: SupabaseClient,
): Promise<number> {
  const { count } = await supabase
    .from("patient_cases")
    .select("id", { count: "exact", head: true })
    .eq("needs_review", true);
  return count ?? 0;
}

export async function getCaseById(
  supabase: SupabaseClient,
  caseId: string,
): Promise<PatientCase | null> {
  const { data } = await supabase
    .from("patient_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();
  if (!data) return null;
  return rowToCase(data as PatientCaseRow);
}

export async function listMessagesForCase(
  supabase: SupabaseClient,
  caseId: string,
): Promise<CaseMessage[]> {
  const { data } = await supabase
    .from("case_messages")
    .select("*")
    .eq("case_id", caseId)
    .order("received_at", { ascending: true, nullsFirst: false });
  if (!data) return [];
  return (data as CaseMessageRow[]).map(rowToMessage);
}

export async function listMediaForCase(
  supabase: SupabaseClient,
  caseId: string,
): Promise<CaseMedia[]> {
  const { data } = await supabase
    .from("case_media")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });
  if (!data) return [];
  return (data as CaseMediaRow[]).map(rowToMedia);
}

export async function getDentistContact(
  supabase: SupabaseClient,
  id: string,
): Promise<DentistContact | null> {
  const { data } = await supabase
    .from("dentist_contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return rowToContact(data as DentistContactRow);
}

export async function listProsthetists(
  supabase: SupabaseClient,
): Promise<{ id: string; label: string }[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "prosthetist");
  if (!data) return [];
  return (data as { id: string; full_name: string | null }[]).map((row) => ({
    id: row.id,
    label: row.full_name ?? row.id.slice(0, 8),
  }));
}
