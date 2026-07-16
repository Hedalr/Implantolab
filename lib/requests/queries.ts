import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LAB_SECTOR_NAMES,
  sortLabSectors,
  type LabSector,
} from "@/lib/sectors";

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
  practices: { name: string | null; city: string | null } | null;
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
  practices:
    | { name: string | null; city: string | null }
    | { name: string | null; city: string | null }[]
    | null;
  sectors:
    | { name: string | null; color: string | null }
    | { name: string | null; color: string | null }[]
    | null;
};

function extractRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function mapRequestRows(
  supabase: SupabaseClient,
  rows: RequestQueryRow[],
): Promise<AdminRequestRow[]> {
  const creatorIds = [
    ...new Set(rows.map((row) => row.created_by).filter(Boolean)),
  ] as string[];

  const profileNames = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", creatorIds);

    for (const profile of profiles ?? []) {
      const row = profile as { id: string; full_name: string | null };
      if (row.full_name) {
        profileNames.set(row.id, row.full_name);
      }
    }
  }

  return rows.map((row) => {
    const practiceRow = extractRelation(row.practices);
    const sectorRow = extractRelation(row.sectors);

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
      practices: practiceRow,
      creatorName: row.created_by
        ? (profileNames.get(row.created_by) ?? null)
        : null,
    };
  });
}

const REQUEST_SELECT =
  "id, subject, message, status, created_at, created_by, patient_name, sector_id, practices(name, city), sectors(name, color)";

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

export type LabRequestFilters = {
  status?: "all" | "open" | "closed";
  sectorId?: string | "all";
  /** Préfixe du nom patient (insensible à la casse). */
  patientQuery?: string;
  limit?: number;
};

export async function listLabRequests(
  supabase: SupabaseClient,
  filters: LabRequestFilters = {},
): Promise<AdminRequestRow[]> {
  const status = filters.status ?? "all";
  const sectorId = filters.sectorId ?? "all";
  const patientQuery = filters.patientQuery?.trim() ?? "";

  let query = supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (sectorId !== "all") {
    query = query.eq("sector_id", sectorId);
  }
  if (patientQuery) {
    // Recherche par début de nom patient (ex. "dup" → "Dupont").
    query = query.ilike("patient_name", `${patientQuery}%`);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return mapRequestRows(supabase, data as unknown as RequestQueryRow[]);
}

export async function listAdminRequests(
  supabase: SupabaseClient,
  status: "all" | "open" | "closed" = "all",
  limit?: number,
  patientQuery?: string,
): Promise<AdminRequestRow[]> {
  return listLabRequests(supabase, { status, limit, patientQuery });
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
