import "server-only";

/**
 * Helpers congés (postgres) — **sans authZ intrinsèque**.
 * Le caller (route API / server action) DOIT avoir scoper :
 * - `listMyLeaveRequestsPg` / `createLeaveRequestPg` / `deleteOwnLeaveRequestPg`
 *   → `profileId` = session courante (lab) ;
 * - `listAllLeaveRequestsPg` / `deleteLeaveRequestAsAdminPg` / `reviewLeaveRequestPg`
 *   → après `requireAdmin` / `role === "admin"` uniquement ;
 * - `listLeaveEmployeesPg` → admin RH.
 * Fail-closed `isUuid` sur les ids mutés pour éviter cast Postgres → 500.
 */
import { isUuid } from "@/lib/api/v1/ids";
import { getSql } from "@/lib/db/client";
import { SECTOR_LAB_ROLES } from "@/lib/roles";

export type LeaveStatus = "pending" | "approved" | "rejected";

export type PgLeaveRequestRow = {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  note: string | null;
  status: LeaveStatus;
  created_at: string;
  full_name: string | null;
  sector_id: string | null;
  sector_name: string | null;
  sector_color: string | null;
};

export type PgLeaveEmployeeRow = {
  id: string;
  full_name: string | null;
  sector_id: string | null;
  sector_name: string | null;
  sector_color: string | null;
};

export type LeaveMutationErrorCode =
  | "balance"
  | "conflict"
  | "profile"
  | "validation"
  | "order"
  | "note"
  | "not_found"
  | "forbidden"
  | "save";

export type LeaveMutationResult =
  | { ok: true; id?: string; detail?: string }
  | { ok: false; error: LeaveMutationErrorCode; detail?: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toDateString(value: Date | string): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function toIso(value: Date | string): string {
  if (typeof value === "string") return value;
  return value.toISOString();
}

function mapLeaveRow(row: {
  id: string;
  profile_id: string;
  start_date: Date | string;
  end_date: Date | string;
  days_count: number;
  note: string | null;
  status: LeaveStatus;
  created_at: Date | string;
  full_name: string | null;
  sector_id: string | null;
  sector_name: string | null;
  sector_color: string | null;
}): PgLeaveRequestRow {
  return {
    id: row.id,
    profile_id: row.profile_id,
    start_date: toDateString(row.start_date),
    end_date: toDateString(row.end_date),
    days_count: row.days_count,
    note: row.note,
    status: row.status,
    created_at: toIso(row.created_at),
    full_name: row.full_name,
    sector_id: row.sector_id,
    sector_name: row.sector_name,
    sector_color: row.sector_color,
  };
}

export function parseLeaveDbError(error: unknown): {
  code: LeaveMutationErrorCode;
  detail?: string;
} {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : String(error ?? "");

  if (message.includes("INSUFFICIENT_BALANCE")) {
    const detail = message
      .replace(/^[\s\S]*INSUFFICIENT_BALANCE:\s*/i, "")
      .replace(/\s*$/, "");
    return { code: "balance", detail: detail || undefined };
  }
  if (message.includes("SECTOR_CONFLICT")) {
    return { code: "conflict" };
  }
  if (message.includes("PROFILE_NOT_FOUND")) {
    return { code: "profile" };
  }
  return { code: "save" };
}

export function computeLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export function validateLeaveDates(
  startDate: string,
  endDate: string,
  note?: string | null,
): LeaveMutationResult | null {
  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
    return { ok: false, error: "validation" };
  }
  if (endDate < startDate) {
    return { ok: false, error: "order" };
  }
  if (note && note.length > 500) {
    return { ok: false, error: "note" };
  }
  return null;
}

/** Own-only — caller doit passer `profileId` de la session. */
export async function listMyLeaveRequestsPg(
  profileId: string,
): Promise<PgLeaveRequestRow[]> {
  if (!profileId || !isUuid(profileId)) return [];
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      profile_id: string;
      start_date: Date | string;
      end_date: Date | string;
      days_count: number;
      note: string | null;
      status: LeaveStatus;
      created_at: Date | string;
      full_name: string | null;
      sector_id: string | null;
      sector_name: string | null;
      sector_color: string | null;
    }[]
  >`
    select lr.id::text,
           lr.profile_id::text,
           lr.start_date,
           lr.end_date,
           lr.days_count,
           lr.note,
           lr.status,
           lr.created_at,
           p.full_name,
           p.sector_id::text as sector_id,
           s.name as sector_name,
           s.color as sector_color
      from public.leave_requests lr
      join public.profiles p on p.id = lr.profile_id
      left join public.sectors s on s.id = p.sector_id
     where lr.profile_id = ${profileId}::uuid
     order by lr.start_date asc
  `;
  return rows.map(mapLeaveRow);
}

/** Admin-only — caller doit `requireAdmin` / gate role avant appel. */
export async function listAllLeaveRequestsPg(): Promise<PgLeaveRequestRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      profile_id: string;
      start_date: Date | string;
      end_date: Date | string;
      days_count: number;
      note: string | null;
      status: LeaveStatus;
      created_at: Date | string;
      full_name: string | null;
      sector_id: string | null;
      sector_name: string | null;
      sector_color: string | null;
    }[]
  >`
    select lr.id::text,
           lr.profile_id::text,
           lr.start_date,
           lr.end_date,
           lr.days_count,
           lr.note,
           lr.status,
           lr.created_at,
           p.full_name,
           p.sector_id::text as sector_id,
           s.name as sector_name,
           s.color as sector_color
      from public.leave_requests lr
      join public.profiles p on p.id = lr.profile_id
      left join public.sectors s on s.id = p.sector_id
     order by lr.start_date asc
  `;
  return rows.map(mapLeaveRow);
}

export async function listLeaveEmployeesPg(): Promise<PgLeaveEmployeeRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      full_name: string | null;
      sector_id: string | null;
      sector_name: string | null;
      sector_color: string | null;
    }[]
  >`
    select p.id::text,
           p.full_name,
           p.sector_id::text as sector_id,
           s.name as sector_name,
           s.color as sector_color
      from public.profiles p
      left join public.sectors s on s.id = p.sector_id
     where p.role = any(${[...SECTOR_LAB_ROLES]}::text[])
       and p.deleted_at is null
     order by p.full_name asc nulls last
  `;
  return rows;
}

/** Create own — caller doit forcer `profileId`/`createdBy` = session lab. */
export async function createLeaveRequestPg(params: {
  profileId: string;
  createdBy: string;
  startDate: string;
  endDate: string;
  note?: string | null;
}): Promise<LeaveMutationResult> {
  const { profileId, createdBy, startDate, endDate } = params;
  if (!isUuid(profileId) || !isUuid(createdBy)) {
    return { ok: false, error: "validation" };
  }
  const note = params.note?.trim() ? params.note.trim() : null;

  const invalid = validateLeaveDates(startDate, endDate, note);
  if (invalid) return invalid;

  const daysCount = computeLeaveDays(startDate, endDate);
  const sql = getSql();

  try {
    const rows = await sql<{ id: string }[]>`
      insert into public.leave_requests (
        profile_id,
        start_date,
        end_date,
        days_count,
        note,
        created_by
      )
      values (
        ${profileId}::uuid,
        ${startDate}::date,
        ${endDate}::date,
        ${daysCount},
        ${note},
        ${createdBy}::uuid
      )
      returning id::text
    `;
    return { ok: true, id: rows[0]?.id };
  } catch (error) {
    const parsed = parseLeaveDbError(error);
    return { ok: false, error: parsed.code, detail: parsed.detail };
  }
}

/** Own-scoped delete — SQL borne `profile_id` + status pending/rejected. */
export async function deleteOwnLeaveRequestPg(params: {
  profileId: string;
  leaveId: string;
}): Promise<LeaveMutationResult> {
  if (!isUuid(params.profileId) || !isUuid(params.leaveId)) {
    return { ok: false, error: "validation" };
  }
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    delete from public.leave_requests
     where id = ${params.leaveId}::uuid
       and profile_id = ${params.profileId}::uuid
       and status in ('pending', 'rejected')
    returning id::text
  `;
  if (!rows[0]) return { ok: false, error: "not_found" };
  return { ok: true, id: rows[0].id };
}

/** Admin-only — caller doit gate role avant (pas de scope ownership). */
export async function deleteLeaveRequestAsAdminPg(
  leaveId: string,
): Promise<LeaveMutationResult> {
  if (!isUuid(leaveId)) return { ok: false, error: "validation" };
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    delete from public.leave_requests
     where id = ${leaveId}::uuid
    returning id::text
  `;
  if (!rows[0]) return { ok: false, error: "not_found" };
  return { ok: true, id: rows[0].id };
}

/** Admin-only review — caller doit `role === "admin"`. */
export async function reviewLeaveRequestPg(params: {
  leaveId: string;
  reviewerId: string;
  status: "approved" | "rejected";
}): Promise<LeaveMutationResult> {
  if (!isUuid(params.leaveId) || !isUuid(params.reviewerId)) {
    return { ok: false, error: "validation" };
  }
  const sql = getSql();
  try {
    const rows = await sql<{ id: string }[]>`
      update public.leave_requests
         set status = ${params.status},
             reviewed_by = ${params.reviewerId}::uuid,
             reviewed_at = now()
       where id = ${params.leaveId}::uuid
         and status = 'pending'
      returning id::text
    `;
    if (!rows[0]) return { ok: false, error: "not_found" };
    return { ok: true, id: rows[0].id };
  } catch (error) {
    const parsed = parseLeaveDbError(error);
    return { ok: false, error: parsed.code, detail: parsed.detail };
  }
}

/** Pour le panneau admin web (forme LeaveRequestDbRow). */
export function toLeaveRequestDbRow(row: PgLeaveRequestRow) {
  return {
    id: row.id,
    profile_id: row.profile_id,
    start_date: row.start_date,
    end_date: row.end_date,
    days_count: row.days_count,
    note: row.note,
    status: row.status,
    profiles: {
      full_name: row.full_name,
      sector_id: row.sector_id,
      sectors:
        row.sector_name || row.sector_color
          ? { name: row.sector_name, color: row.sector_color }
          : null,
    },
  };
}
