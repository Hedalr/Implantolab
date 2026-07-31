import type {
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { RequestMediaItem } from "@/components/requests/RequestMediaGallery";
import { firstRelation } from "@/lib/supabase/relation";
import {
  LAB_SECTOR_NAMES,
  sortLabSectors,
  type LabSector,
} from "@/lib/sectors";
import type { RequestMessage } from "@/lib/requests/types";
import { REQUEST_MESSAGE_MAX_LENGTH } from "@/lib/requests/types";

export type AdminRequestRow = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  created_by: string | null;
  patientName: string | null;
  sectorId: string | null;
  sectorName: string | null;
  sectorColor: string | null;
  creatorName: string | null;
};

type RequestQueryRow = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  created_by: string | null;
  patient_name: string | null;
  sector_id: string | null;
  sectors:
    | { name: string | null; color: string | null }
    | { name: string | null; color: string | null }[]
    | null;
};

async function resolveProfileNames(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return names;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", unique);

  for (const profile of profiles ?? []) {
    const row = profile as { id: string; full_name: string | null };
    if (row.full_name) names.set(row.id, row.full_name);
  }
  return names;
}

async function mapRequestRows(
  supabase: SupabaseClient,
  rows: RequestQueryRow[],
): Promise<AdminRequestRow[]> {
  const profileNames = await resolveProfileNames(
    supabase,
    rows.map((row) => row.created_by).filter((id): id is string => Boolean(id)),
  );

  return rows.map((row) => {
    const sectorRow = firstRelation(row.sectors);

    return {
      id: row.id,
      subject: row.subject,
      message: row.message,
      status: row.status,
      created_at: row.created_at,
      created_by: row.created_by,
      patientName: row.patient_name,
      sectorId: row.sector_id,
      sectorName: sectorRow?.name ?? null,
      sectorColor: sectorRow?.color ?? null,
      creatorName: row.created_by
        ? (profileNames.get(row.created_by) ?? null)
        : null,
    };
  });
}

const REQUEST_SELECT =
  "id, subject, message, status, created_at, created_by, patient_name, sector_id, sectors(name, color)";

export async function listLabSectors(
  supabase: SupabaseClient,
): Promise<LabSector[]> {
  const { data, error } = await supabase
    .from("sectors")
    .select("id, name, color")
    .in("name", [...LAB_SECTOR_NAMES])
    .order("name", { ascending: true });

  if (error || !data) return [];
  return sortLabSectors(
    (data as LabSector[]).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
    })),
  );
}

/** Taille de page par défaut pour les listes labo / admin. */
export const LAB_REQUESTS_PAGE_SIZE = 30;

export type LabRequestFilters = {
  status?: RequestStatusFilter;
  sectorId?: string | "all";
  /** Préfixe du nom patient (insensible à la casse). */
  patientQuery?: string;
  /** Filtre optionnel sur les sujets (ex. inbox Question/Urgence). */
  subjects?: readonly string[];
  /** Page 1-indexée. */
  page?: number;
  pageSize?: number;
};

export type LabRequestsPage = {
  rows: AdminRequestRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listLabRequests(
  supabase: SupabaseClient,
  filters: LabRequestFilters = {},
): Promise<LabRequestsPage> {
  const status = filters.status ?? "all";
  const sectorId = filters.sectorId ?? "all";
  const patientQuery = filters.patientQuery?.trim() ?? "";
  const pageSize = Math.max(1, filters.pageSize ?? LAB_REQUESTS_PAGE_SIZE);
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("requests")
    .select(REQUEST_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (sectorId !== "all") {
    query = query.eq("sector_id", sectorId);
  }
  if (filters.subjects && filters.subjects.length > 0) {
    query = query.in("subject", [...filters.subjects]);
  }
  if (patientQuery) {
    // Recherche par début de nom patient (ex. "dup" → "Dupont").
    query = query.ilike("patient_name", `${patientQuery}%`);
  }

  const { data, error, count } = await query;
  if (error || !data) {
    return { rows: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count ?? 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const rows = await mapRequestRows(
    supabase,
    data as unknown as RequestQueryRow[],
  );

  return { rows, total, page, pageSize, totalPages };
}

export async function listAdminRequests(
  supabase: SupabaseClient,
  filters: LabRequestFilters = {},
): Promise<LabRequestsPage> {
  return listLabRequests(supabase, filters);
}

export async function getLabRequestById(
  supabase: SupabaseClient,
  requestId: string,
): Promise<AdminRequestRow | null> {
  const { data, error } = await supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) return null;
  const [mapped] = await mapRequestRows(supabase, [
    data as unknown as RequestQueryRow,
  ]);
  return mapped ?? null;
}

export const REQUEST_STATUS_FILTERS = ["all", "open", "closed"] as const;
export type RequestStatusFilter = (typeof REQUEST_STATUS_FILTERS)[number];

/** Normalise une valeur de statut (query string ou form) vers un filtre connu. */
export function parseRequestStatusFilter(
  value: string | string[] | undefined,
  fallback: RequestStatusFilter = "open",
): RequestStatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return REQUEST_STATUS_FILTERS.includes(raw as RequestStatusFilter)
    ? (raw as RequestStatusFilter)
    : fallback;
}

type RequestMediaDbRow = {
  id: string;
  request_id: string;
  original_filename: string | null;
  mime_type: string | null;
};

/**
 * Charge les photos jointes pour un lot de demandes et les regroupe par
 * `requestId`, prêtes à passer à `RequestMediaGallery`.
 */
export async function fetchRequestMediaItems(
  supabase: SupabaseClient,
  requestIds: string[],
): Promise<Map<string, RequestMediaItem[]>> {
  const grouped = new Map<string, RequestMediaItem[]>();
  if (requestIds.length === 0) return grouped;

  const { data } = await supabase
    .from("request_media")
    .select("id, request_id, original_filename, mime_type")
    .in("request_id", requestIds)
    .order("created_at", { ascending: true });

  for (const row of (data ?? []) as RequestMediaDbRow[]) {
    const list = grouped.get(row.request_id) ?? [];
    list.push({
      id: row.id,
      filename: row.original_filename,
      mimeType: row.mime_type,
    });
    grouped.set(row.request_id, list);
  }
  return grouped;
}

// ---------------------------------------------------------------------------
// Chat Question / Urgence
// ---------------------------------------------------------------------------

type RequestMessageDbRow = {
  id: string;
  request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

async function mapRequestMessages(
  supabase: SupabaseClient,
  rows: RequestMessageDbRow[],
): Promise<RequestMessage[]> {
  const names = await resolveProfileNames(
    supabase,
    rows.map((row) => row.sender_id),
  );

  return rows.map((row) => ({
    id: row.id,
    requestId: row.request_id,
    senderId: row.sender_id,
    senderName: names.get(row.sender_id) ?? null,
    body: row.body,
    createdAt: row.created_at,
  }));
}

function mapRequestMessageRow(row: RequestMessageDbRow): RequestMessage {
  return {
    id: row.id,
    requestId: row.request_id,
    senderId: row.sender_id,
    senderName: null,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function listRequestMessages(
  supabase: SupabaseClient,
  requestId: string,
): Promise<RequestMessage[]> {
  const { data, error } = await supabase
    .from("request_messages")
    .select("id, request_id, sender_id, body, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return mapRequestMessages(supabase, data as RequestMessageDbRow[]);
}

export async function sendRequestMessage(
  supabase: SupabaseClient,
  requestId: string,
  senderId: string,
  body: string,
): Promise<{ message: RequestMessage | null; error: string | null }> {
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > REQUEST_MESSAGE_MAX_LENGTH) {
    return {
      message: null,
      error: `Le message doit contenir entre 1 et ${REQUEST_MESSAGE_MAX_LENGTH} caractères.`,
    };
  }

  const { data, error } = await supabase
    .from("request_messages")
    .insert({
      request_id: requestId,
      sender_id: senderId,
      body: trimmed,
    })
    .select("id, request_id, sender_id, body, created_at")
    .single();

  if (error || !data) {
    return {
      message: null,
      error: error?.message ?? "Impossible d’envoyer le message.",
    };
  }

  const [mapped] = await mapRequestMessages(supabase, [
    data as RequestMessageDbRow,
  ]);
  return { message: mapped ?? null, error: null };
}

export async function markRequestThreadRead(
  supabase: SupabaseClient,
  requestId: string,
  profileId: string,
): Promise<void> {
  await supabase.from("request_thread_reads").upsert(
    {
      request_id: requestId,
      profile_id: profileId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "request_id,profile_id" },
  );
}

/**
 * Compte les messages non lus (envoyés par quelqu’un d’autre) par demande.
 */
export async function countUnreadByRequestIds(
  supabase: SupabaseClient,
  requestIds: string[],
  profileId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of requestIds) counts.set(id, 0);
  if (requestIds.length === 0) return counts;

  const [{ data: messages }, { data: reads }] = await Promise.all([
    supabase
      .from("request_messages")
      .select("request_id, created_at")
      .in("request_id", requestIds)
      .neq("sender_id", profileId),
    supabase
      .from("request_thread_reads")
      .select("request_id, last_read_at")
      .eq("profile_id", profileId)
      .in("request_id", requestIds),
  ]);

  const lastRead = new Map<string, string>();
  for (const row of reads ?? []) {
    const r = row as { request_id: string; last_read_at: string };
    lastRead.set(r.request_id, r.last_read_at);
  }

  for (const row of messages ?? []) {
    const msg = row as { request_id: string; created_at: string };
    const cutoff = lastRead.get(msg.request_id);
    if (!cutoff || msg.created_at > cutoff) {
      counts.set(msg.request_id, (counts.get(msg.request_id) ?? 0) + 1);
    }
  }

  return counts;
}

export function subscribeRequestMessages(
  supabase: SupabaseClient,
  requestId: string,
  onInsert: (message: RequestMessage) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`request-messages:${requestId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "request_messages",
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => {
        const row = payload.new as RequestMessageDbRow;
        if (!row?.id) return;
        // Pas de lookup profil ici : le client enrichit le nom via le fil déjà chargé.
        onInsert(mapRequestMessageRow(row));
      },
    )
    .subscribe();

  return channel;
}
