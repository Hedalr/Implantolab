import "server-only";

/**
 * Helpers annonces (postgres) — **sans authZ intrinsèque**.
 * Caller DOIT scoper :
 * - `listAllAnnouncementsPg` / `createAnnouncementPg` / `deleteAnnouncementPg`
 *   → admin only ;
 * - `listActiveAnnouncementsPg` → praticien (ou admin) après gate role.
 * Fail-closed `isUuid` sur delete.
 */
import { isUuid } from "@/lib/api/v1/ids";
import { getSql } from "@/lib/db/client";

export type PgAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  created_by: string;
  created_at: string;
  expires_at: string;
};

export type AnnouncementMutationErrorCode =
  | "validation"
  | "title"
  | "body"
  | "expires"
  | "not_found"
  | "save";

export type AnnouncementMutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: AnnouncementMutationErrorCode };

function toIso(value: Date | string): string {
  if (typeof value === "string") return value;
  return value.toISOString();
}

function mapAnnouncementRow(row: {
  id: string;
  title: string;
  body: string;
  created_by: string;
  created_at: Date | string;
  expires_at: Date | string;
}): PgAnnouncementRow {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    created_by: row.created_by,
    created_at: toIso(row.created_at),
    expires_at: toIso(row.expires_at),
  };
}

export function validateAnnouncementInput(params: {
  title: string;
  body: string;
  expiresAt: Date;
}): AnnouncementMutationResult | null {
  const title = params.title.trim();
  const body = params.body.trim();
  if (title.length < 1 || title.length > 120) {
    return { ok: false, error: "title" };
  }
  if (body.length < 1 || body.length > 2000) {
    return { ok: false, error: "body" };
  }
  if (Number.isNaN(params.expiresAt.getTime()) || params.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "expires" };
  }
  return null;
}

/** Admin-only list — caller gate `role === "admin"`. */
export async function listAllAnnouncementsPg(): Promise<PgAnnouncementRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      title: string;
      body: string;
      created_by: string;
      created_at: Date | string;
      expires_at: Date | string;
    }[]
  >`
    select id::text,
           title,
           body,
           created_by::text,
           created_at,
           expires_at
      from public.admin_announcements
     order by created_at desc
  `;
  return rows.map(mapAnnouncementRow);
}

/** Praticien (ou admin) — annonces non expirées ; caller gate role. */
export async function listActiveAnnouncementsPg(): Promise<PgAnnouncementRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      title: string;
      body: string;
      created_by: string;
      created_at: Date | string;
      expires_at: Date | string;
    }[]
  >`
    select id::text,
           title,
           body,
           created_by::text,
           created_at,
           expires_at
      from public.admin_announcements
     where expires_at > now()
     order by created_at desc
  `;
  return rows.map(mapAnnouncementRow);
}

/** Admin-only create — caller force `createdBy` = session admin. */
export async function createAnnouncementPg(params: {
  title: string;
  body: string;
  expiresAt: Date;
  createdBy: string;
}): Promise<AnnouncementMutationResult> {
  if (!isUuid(params.createdBy)) {
    return { ok: false, error: "validation" };
  }
  const title = params.title.trim();
  const body = params.body.trim();
  const invalid = validateAnnouncementInput({
    title,
    body,
    expiresAt: params.expiresAt,
  });
  if (invalid) return invalid;

  const sql = getSql();
  try {
    const rows = await sql<{ id: string }[]>`
      insert into public.admin_announcements (
        title,
        body,
        created_by,
        expires_at
      )
      values (
        ${title},
        ${body},
        ${params.createdBy}::uuid,
        ${params.expiresAt.toISOString()}::timestamptz
      )
      returning id::text
    `;
    return { ok: true, id: rows[0]?.id };
  } catch {
    return { ok: false, error: "save" };
  }
}

/** Admin-only delete — caller gate role ; `isUuid` fail-closed. */
export async function deleteAnnouncementPg(
  id: string,
): Promise<AnnouncementMutationResult> {
  if (!id || !isUuid(id)) return { ok: false, error: "validation" };

  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    delete from public.admin_announcements
     where id = ${id}::uuid
    returning id::text
  `;
  if (!rows[0]) return { ok: false, error: "not_found" };
  return { ok: true, id: rows[0].id };
}
