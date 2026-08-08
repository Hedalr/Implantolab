import "server-only";

import { isUuid } from "@/lib/api/v1/ids";
import { getSql } from "@/lib/db/client";
import {
  LAB_SECTOR_NAMES,
  sortLabSectors,
  type LabSector,
} from "@/lib/sectors";
import type { RequestMediaItem } from "@/components/requests/RequestMediaGallery";
import type { ProfileRole } from "@/lib/roles";
import { isSectorLabRole } from "@/lib/roles";
import type {
  AdminRequestRow,
  LabRequestFilters,
  LabRequestsPage,
} from "@/lib/requests/queries";
import { LAB_REQUESTS_PAGE_SIZE } from "@/lib/requests/queries";
import {
  allowedSubjectsForRole,
  previewRequestMessage,
} from "@/lib/requests/types";

export type PgRequestListRow = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  patient_name: string | null;
  sectors: { name: string | null; color: string | null } | null;
};

export type PgApiRequestRow = {
  id: string;
  subject: string;
  message: string;
  patient_name: string | null;
  status: string;
  sector_id: string | null;
  profile_id: string;
  created_by: string | null;
  created_at: Date;
  owner_name: string | null;
  sector_name: string | null;
  sector_color: string | null;
  creator_name: string | null;
};

export async function listLabSectorsPg(): Promise<LabSector[]> {
  const sql = getSql();
  const rows = await sql<{ id: string; name: string; color: string }[]>`
    select id::text, name, color
      from public.sectors
     where name = any(${[...LAB_SECTOR_NAMES]}::text[])
     order by name asc
  `;
  return sortLabSectors(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
    })),
  );
}

function toListRow(row: {
  id: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: Date | string;
  patient_name: string | null;
  sector_name: string | null;
  sector_color: string | null;
}): PgRequestListRow {
  return {
    id: row.id,
    subject: row.subject,
    message: row.message,
    status: row.status,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    patient_name: row.patient_name,
    sectors: row.sector_name
      ? { name: row.sector_name, color: row.sector_color }
      : null,
  };
}

export async function listMyRequestsPg(
  profileId: string,
): Promise<PgRequestListRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      subject: string;
      message: string;
      status: "open" | "closed";
      created_at: Date;
      patient_name: string | null;
      sector_name: string | null;
      sector_color: string | null;
    }[]
  >`
    select r.id::text,
           r.subject,
           r.message,
           r.status,
           r.created_at,
           r.patient_name,
           s.name as sector_name,
           s.color as sector_color
      from public.requests r
      left join public.sectors s on s.id = r.sector_id
     where r.profile_id = ${profileId}::uuid
     order by r.created_at desc
  `;

  return rows.map(toListRow);
}

/**
 * Résout le filtre sujets pour la list API (P2-7 / S5).
 * Lab : intersection query ∩ sujets autorisés (vide → aucune row).
 * Admin / praticien : filtre query optionnel inchangé.
 */
function resolveApiListSubjects(
  role: ProfileRole,
  requested: string[] | null | undefined,
): string[] | null {
  const forced = allowedSubjectsForRole(role);
  if (!forced) {
    return requested && requested.length > 0 ? requested : null;
  }
  if (!requested || requested.length === 0) {
    return [...forced];
  }
  return requested.filter((s) => forced.includes(s));
}

/** Liste role-scoped pour `/api/v1/requests` (évite 6 copies SQL). */
export async function listRequestsForApi(opts: {
  role: ProfileRole;
  profileId: string;
  sectorId: string | null;
  status: "open" | "closed" | null;
  limit: number;
  /** Admin-only: narrow by sector. Ignored for other roles. */
  filterSectorId?: string | null;
  subjects?: string[] | null;
}): Promise<PgApiRequestRow[]> {
  const sql = getSql();
  const {
    role,
    profileId,
    sectorId,
    status,
    limit,
    filterSectorId,
    subjects: requestedSubjects,
  } = opts;

  // Fail-closed : lab sans sector_id → aucune row (pas de fallback owner).
  const scope =
    role === "admin"
      ? sql`true`
      : isSectorLabRole(role)
        ? sectorId
          ? sql`r.sector_id = ${sectorId}::uuid`
          : sql`false`
        : sql`r.profile_id = ${profileId}::uuid`;

  const statusFilter = status
    ? sql`and r.status = ${status}`
    : sql``;

  const adminSectorFilter =
    role === "admin" && filterSectorId
      ? sql`and r.sector_id = ${filterSectorId}::uuid`
      : sql``;

  const subjects = resolveApiListSubjects(role, requestedSubjects);
  // null = pas de filtre ; [] = aucune row (lab a demandé un sujet hors scope).
  const subjectsFilter =
    subjects === null
      ? sql``
      : subjects.length === 0
        ? sql`and false`
        : sql`and r.subject = any(${subjects}::text[])`;

  const rows = await sql<PgApiRequestRow[]>`
    select r.id::text,
           r.subject,
           r.message,
           r.patient_name,
           r.status,
           r.sector_id::text,
           r.profile_id::text,
           r.created_by::text,
           r.created_at,
           p.full_name as owner_name,
           s.name as sector_name,
           s.color as sector_color,
           coalesce(creator.full_name, p.full_name) as creator_name
      from public.requests r
      join public.profiles p on p.id = r.profile_id
      left join public.sectors s on s.id = r.sector_id
      left join public.profiles creator on creator.id = r.created_by
     where ${scope}
       ${statusFilter}
       ${adminSectorFilter}
       ${subjectsFilter}
     order by r.created_at desc
     limit ${limit}
  `;

  // P2-7 / S6 : list = aperçu message ; patient_name complet ; détail = GET /:id.
  return rows.map((row) => ({
    ...row,
    message: previewRequestMessage(row.message),
  }));
}

export async function fetchRequestMediaItemsPg(
  requestIds: string[],
): Promise<Map<string, RequestMediaItem[]>> {
  const grouped = new Map<string, RequestMediaItem[]>();
  if (requestIds.length === 0) return grouped;

  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      request_id: string;
      original_filename: string | null;
      mime_type: string | null;
    }[]
  >`
    select id::text, request_id::text, original_filename, mime_type
      from public.request_media
     where request_id = any(${requestIds}::uuid[])
     order by created_at asc
  `;

  for (const row of rows) {
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

export async function countUnreadByRequestIdsPg(
  requestIds: string[],
  profileId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of requestIds) counts.set(id, 0);
  if (requestIds.length === 0) return counts;

  const sql = getSql();
  const rows = await sql<{ request_id: string; unread: number }[]>`
    select m.request_id::text as request_id,
           count(*)::int as unread
      from public.request_messages m
      left join public.request_thread_reads r
        on r.request_id = m.request_id
       and r.profile_id = ${profileId}::uuid
     where m.request_id = any(${requestIds}::uuid[])
       and m.sender_id <> ${profileId}::uuid
       and (r.last_read_at is null or m.created_at > r.last_read_at)
     group by m.request_id
  `;

  for (const row of rows) {
    counts.set(row.request_id, row.unread);
  }
  return counts;
}

export async function sectorExistsPg(sectorId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    select id::text from public.sectors where id = ${sectorId}::uuid limit 1
  `;
  return Boolean(rows[0]);
}

type PgLabRequestSqlRow = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: Date;
  created_by: string | null;
  patient_name: string | null;
  sector_id: string | null;
  sector_name: string | null;
  sector_color: string | null;
  creator_name: string | null;
};

function toAdminRequestRow(row: PgLabRequestSqlRow): AdminRequestRow {
  return {
    id: row.id,
    subject: row.subject,
    message: row.message,
    status: row.status,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    created_by: row.created_by,
    patientName: row.patient_name,
    sectorId: row.sector_id,
    sectorName: row.sector_name,
    sectorColor: row.sector_color,
    creatorName: row.creator_name,
  };
}

/**
 * Scope AuthZ obligatoire pour les listes labo (fail-closed).
 * - `"admin"` : après `requireAdmin*` — peut lister tous les secteurs
 *   (filtre optionnel `sectorId` dans les filters).
 * - `{ sectorId }` : prothésiste / chef — SQL toujours borné à ce secteur.
 *   `sectorId` vide / non-UUID → page vide (pas de SQL « ouvert »).
 */
export type LabRequestScope = "admin" | { sectorId: string };

function resolveLabSectorFilter(
  scope: LabRequestScope,
  filterSectorId: string | "all" | undefined,
): string | "all" | null {
  if (scope === "admin") {
    const sid = filterSectorId ?? "all";
    if (sid === "all") return "all";
    if (!isUuid(sid)) return null;
    return sid;
  }
  if (
    typeof scope === "object" &&
    scope !== null &&
    typeof scope.sectorId === "string" &&
    isUuid(scope.sectorId)
  ) {
    return scope.sectorId;
  }
  // Scope lab invalide / manquant → deny (fail-closed).
  return null;
}

/** Liste labo paginée (sujets / secteur / statut / patient) — miroir de `listLabRequests`. */
export async function listLabRequestsPg(
  filters: LabRequestFilters & { scope: LabRequestScope },
): Promise<LabRequestsPage> {
  const sql = getSql();
  const status = filters.status ?? "all";
  const patientQuery = filters.patientQuery?.trim() ?? "";
  const pageSize = Math.max(1, filters.pageSize ?? LAB_REQUESTS_PAGE_SIZE);
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * pageSize;
  const subjects =
    filters.subjects && filters.subjects.length > 0
      ? [...filters.subjects]
      : null;

  const sectorId = resolveLabSectorFilter(filters.scope, filters.sectorId);
  if (sectorId === null) {
    return { rows: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const statusFilter =
    status !== "all" ? sql`and r.status = ${status}` : sql``;
  const sectorFilter =
    sectorId !== "all"
      ? sql`and r.sector_id = ${sectorId}::uuid`
      : sql``;
  const subjectsFilter = subjects
    ? sql`and r.subject = any(${subjects}::text[])`
    : sql``;
  const patientFilter = patientQuery
    ? sql`and r.patient_name ilike ${`${patientQuery}%`}`
    : sql``;

  const countRows = await sql<{ count: number }[]>`
    select count(*)::int as count
      from public.requests r
     where true
       ${statusFilter}
       ${sectorFilter}
       ${subjectsFilter}
       ${patientFilter}
  `;
  const total = countRows[0]?.count ?? 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  if (total === 0) {
    return { rows: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const rows = await sql<PgLabRequestSqlRow[]>`
    select r.id::text,
           r.subject,
           r.message,
           r.status,
           r.created_at,
           r.created_by::text,
           r.patient_name,
           r.sector_id::text,
           s.name as sector_name,
           s.color as sector_color,
           coalesce(creator.full_name, owner.full_name) as creator_name
      from public.requests r
      left join public.sectors s on s.id = r.sector_id
      left join public.profiles creator on creator.id = r.created_by
      left join public.profiles owner on owner.id = r.profile_id
     where true
       ${statusFilter}
       ${sectorFilter}
       ${subjectsFilter}
       ${patientFilter}
     order by r.created_at desc
     limit ${pageSize}
     offset ${offset}
  `;

  return {
    rows: rows.map(toAdminRequestRow),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getLabRequestByIdPg(
  requestId: string,
  opts?: {
    /** Si fourni (prothésiste / chef), refuse les demandes hors secteur. */
    sectorId?: string | null;
  },
): Promise<AdminRequestRow | null> {
  const sql = getSql();
  const sectorId = opts?.sectorId ?? null;
  // Fail-closed : sectorId explicitement null → deny (lab sans secteur).
  if (opts && "sectorId" in opts && !sectorId) {
    return null;
  }
  const sectorFilter = sectorId
    ? sql`and r.sector_id = ${sectorId}::uuid`
    : sql``;

  const rows = await sql<PgLabRequestSqlRow[]>`
    select r.id::text,
           r.subject,
           r.message,
           r.status,
           r.created_at,
           r.created_by::text,
           r.patient_name,
           r.sector_id::text,
           s.name as sector_name,
           s.color as sector_color,
           coalesce(creator.full_name, owner.full_name) as creator_name
      from public.requests r
      left join public.sectors s on s.id = r.sector_id
      left join public.profiles creator on creator.id = r.created_by
      left join public.profiles owner on owner.id = r.profile_id
     where r.id = ${requestId}::uuid
       ${sectorFilter}
     limit 1
  `;
  const row = rows[0];
  return row ? toAdminRequestRow(row) : null;
}

/**
 * Met à jour le statut d'une demande.
 * Si `subjects` est fourni (ex. inbox Q/Urgence chef), filtre aussi sur le sujet.
 *
 * IMPORTANT (authZ) : `scope` obligatoire — fail-closed.
 * - `"admin"` : après `requireAdmin*` uniquement (pas de contrainte secteur).
 * - `{ sectorId }` : prothésiste / chef — UPDATE borné au secteur ; UUID invalide → false.
 */
export async function updateLabRequestStatusPg(opts: {
  requestId: string;
  status: "open" | "closed";
  scope: LabRequestScope;
  subjects?: readonly string[] | null;
}): Promise<boolean> {
  const sql = getSql();
  const { requestId, status, scope } = opts;
  if (!isUuid(requestId)) return false;

  let sectorId: string | null = null;
  if (scope === "admin") {
    sectorId = null;
  } else if (
    typeof scope === "object" &&
    scope !== null &&
    typeof scope.sectorId === "string" &&
    isUuid(scope.sectorId)
  ) {
    sectorId = scope.sectorId;
  } else {
    return false;
  }

  const subjects =
    opts.subjects && opts.subjects.length > 0 ? [...opts.subjects] : null;

  const sectorFilter = sectorId
    ? sql`and sector_id = ${sectorId}::uuid`
    : sql``;
  const subjectsFilter = subjects
    ? sql`and subject = any(${subjects}::text[])`
    : sql``;

  const rows = await sql<{ id: string }[]>`
    update public.requests
       set status = ${status}
     where id = ${requestId}::uuid
       ${sectorFilter}
       ${subjectsFilter}
    returning id::text
  `;
  return Boolean(rows[0]);
}
