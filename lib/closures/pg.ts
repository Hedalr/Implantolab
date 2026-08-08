import "server-only";

/**
 * Helpers fermetures (postgres) — **sans authZ intrinsèque**.
 * Caller DOIT scoper :
 * - `listMyClosurePeriodsPg` / `createClosurePeriodPg` / `deleteOwnClosurePeriodPg`
 *   → `profileId` = session praticien ;
 * - `listAllClosurePeriodsPg` / `listPractitionersPg` / `deleteClosurePeriodAsAdminPg`
 *   → admin (calendrier / ops).
 * Fail-closed `isUuid` sur ids mutés.
 */
import { isUuid } from "@/lib/api/v1/ids";
import { getSql } from "@/lib/db/client";

export type PgClosurePeriodRow = {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  created_at: string;
  full_name: string | null;
};

export type PgPractitionerRow = {
  id: string;
  full_name: string | null;
};

export type ClosureMutationErrorCode =
  | "validation"
  | "order"
  | "note"
  | "not_found"
  | "forbidden"
  | "save";

export type ClosureMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: ClosureMutationErrorCode };

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

function mapClosureRow(row: {
  id: string;
  profile_id: string;
  start_date: Date | string;
  end_date: Date | string;
  note: string | null;
  created_at: Date | string;
  full_name: string | null;
}): PgClosurePeriodRow {
  return {
    id: row.id,
    profile_id: row.profile_id,
    start_date: toDateString(row.start_date),
    end_date: toDateString(row.end_date),
    note: row.note,
    created_at: toIso(row.created_at),
    full_name: row.full_name,
  };
}

export function validateClosureDates(
  startDate: string,
  endDate: string,
  note?: string | null,
): ClosureMutationResult | null {
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

/** Own-only — caller passe `profileId` session. */
export async function listMyClosurePeriodsPg(
  profileId: string,
): Promise<PgClosurePeriodRow[]> {
  if (!profileId || !isUuid(profileId)) return [];
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      profile_id: string;
      start_date: Date | string;
      end_date: Date | string;
      note: string | null;
      created_at: Date | string;
      full_name: string | null;
    }[]
  >`
    select cp.id::text,
           cp.profile_id::text,
           cp.start_date,
           cp.end_date,
           cp.note,
           cp.created_at,
           p.full_name
      from public.closure_periods cp
      join public.profiles p on p.id = cp.profile_id
     where cp.profile_id = ${profileId}::uuid
     order by cp.start_date asc
  `;
  return rows.map(mapClosureRow);
}

/** Admin calendar — toutes les fermetures + nom praticien. */
/** Admin calendrier — caller doit gate admin avant. */
export async function listAllClosurePeriodsPg(): Promise<PgClosurePeriodRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      profile_id: string;
      start_date: Date | string;
      end_date: Date | string;
      note: string | null;
      created_at: Date | string;
      full_name: string | null;
    }[]
  >`
    select cp.id::text,
           cp.profile_id::text,
           cp.start_date,
           cp.end_date,
           cp.note,
           cp.created_at,
           p.full_name
      from public.closure_periods cp
      join public.profiles p on p.id = cp.profile_id
     order by cp.start_date asc
  `;
  return rows.map(mapClosureRow);
}

export async function listPractitionersPg(): Promise<PgPractitionerRow[]> {
  const sql = getSql();
  return sql<PgPractitionerRow[]>`
    select id::text, full_name
      from public.profiles
     where role = 'practitioner'
       and deleted_at is null
     order by full_name asc nulls last
  `;
}

/** Create own — caller force `profileId`/`createdBy` = session praticien. */
export async function createClosurePeriodPg(params: {
  profileId: string;
  createdBy: string;
  startDate: string;
  endDate: string;
  note?: string | null;
}): Promise<ClosureMutationResult> {
  const { profileId, createdBy, startDate, endDate } = params;
  if (!isUuid(profileId) || !isUuid(createdBy)) {
    return { ok: false, error: "validation" };
  }
  const note = params.note?.trim() ? params.note.trim() : null;

  const invalid = validateClosureDates(startDate, endDate, note);
  if (invalid) return invalid;

  const sql = getSql();
  try {
    const rows = await sql<{ id: string }[]>`
      insert into public.closure_periods (
        profile_id,
        start_date,
        end_date,
        note,
        created_by
      )
      values (
        ${profileId}::uuid,
        ${startDate}::date,
        ${endDate}::date,
        ${note},
        ${createdBy}::uuid
      )
      returning id::text
    `;
    return { ok: true, id: rows[0]?.id };
  } catch {
    return { ok: false, error: "save" };
  }
}

/** Own-scoped delete — SQL borne `profile_id` (anti-IDOR). */
export async function deleteOwnClosurePeriodPg(params: {
  profileId: string;
  closureId: string;
}): Promise<ClosureMutationResult> {
  if (!isUuid(params.profileId) || !isUuid(params.closureId)) {
    return { ok: false, error: "validation" };
  }
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    delete from public.closure_periods
     where id = ${params.closureId}::uuid
       and profile_id = ${params.profileId}::uuid
    returning id::text
  `;
  if (!rows[0]) return { ok: false, error: "not_found" };
  return { ok: true, id: rows[0].id };
}

/** Admin delete any closure — caller DOIT gate `role === admin` (parité RLS). */
export async function deleteClosurePeriodAsAdminPg(
  closureId: string,
): Promise<ClosureMutationResult> {
  if (!isUuid(closureId)) {
    return { ok: false, error: "validation" };
  }
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    delete from public.closure_periods
     where id = ${closureId}::uuid
    returning id::text
  `;
  if (!rows[0]) return { ok: false, error: "not_found" };
  return { ok: true, id: rows[0].id };
}
