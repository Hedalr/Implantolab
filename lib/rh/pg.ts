import "server-only";

import { randomBytes } from "node:crypto";
import {
  createSessionToken,
  hashPassword,
  hashToken,
} from "@/lib/auth/postgres/crypto";
import { createPgSessionToken } from "@/lib/auth/postgres/session";
import { isUuid } from "@/lib/api/v1/ids";
import { getSql } from "@/lib/db/client";
import {
  isSectorLabRole,
  SECTOR_LAB_ROLES,
  type InviteRole,
  type ProfileRole,
  type SectorLabRole,
} from "@/lib/roles";

/** Allowlist invite — jamais `admin` (escalation). */
const INVITE_ROLES = new Set<InviteRole>([
  "practitioner",
  "prosthetist",
  "chef_de_secteur",
]);

function parseInviteRoleStrict(raw: string | undefined): InviteRole | null {
  const role = (raw ?? "practitioner").trim() || "practitioner";
  if (!INVITE_ROLES.has(role as InviteRole)) return null;
  return role as InviteRole;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Bannissement de facto permanent (soft-delete). */
const PERMANENT_BAN_UNTIL = new Date("9999-12-31T23:59:59.000Z");

/** Longueur mini + lettre + chiffre (au-delà du plancher OWASP ≥8). */
export const MIN_PASSWORD_LENGTH = 10;

export type PgSectorRow = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type PgRhProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: ProfileRole;
  sector_id: string | null;
  sector_name: string | null;
  sector_color: string | null;
  leave_balance_days: number;
  deleted_at: string | null;
  created_at: string;
  /** true si le compte n’a pas encore activé son mot de passe (invite pending). */
  invite_pending: boolean;
};

export type RhMutationErrorCode =
  | "validation"
  | "sector-name"
  | "sector-color"
  | "sector-duplicate"
  | "sector-save"
  | "sector-delete"
  | "employee-validation"
  | "employee-balance-invalid"
  | "employee-save"
  | "invite-validation"
  | "invite-sector"
  | "invite-exists"
  | "invite-exists-deleted"
  | "invite-failed"
  | "invite-not-pending"
  | "invite-smtp"
  | "delete-validation"
  | "delete-failed"
  | "reactivate-failed"
  | "token-invalid"
  | "token-expired"
  | "password-short"
  | "password-weak"
  | "password-mismatch"
  | "not_found"
  | "forbidden"
  | "save";

export type RhMutationResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: RhMutationErrorCode; detail?: string };

/** Valide password/confirm ; retourne le code d’erreur ou null si OK. */
export function checkPasswordPolicy(
  password: string,
  confirm: string,
): RhMutationErrorCode | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "password-short";
  if (password !== confirm) return "password-mismatch";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "password-weak";
  }
  return null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23503"
  );
}

/** Vérifie qu’un secteur existe (évite FK 23503 → 500). */
async function sectorExistsRhPg(sectorId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    select id::text from public.sectors where id = ${sectorId}::uuid limit 1
  `;
  return Boolean(rows[0]);
}

async function unusablePasswordHash(): Promise<string> {
  return hashPassword(`!invite!${randomBytes(32).toString("hex")}`);
}

function createRawToken(): string {
  return createSessionToken();
}

/** Tous les secteurs (admin RH). */
export async function listSectorsPg(): Promise<PgSectorRow[]> {
  const sql = getSql();
  const rows = await sql<
    { id: string; name: string; color: string; created_at: Date | string }[]
  >`
    select id::text, name, color, created_at
      from public.sectors
     order by name asc
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
  }));
}

export async function createSectorPg(params: {
  name: string;
  color: string;
}): Promise<RhMutationResult<{ id: string }>> {
  const name = params.name.trim();
  const color = params.color.trim() || "#94a3b8";
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "sector-name" };
  }
  if (!HEX_COLOR.test(color)) {
    return { ok: false, error: "sector-color" };
  }

  const sql = getSql();
  try {
    const rows = await sql<{ id: string }[]>`
      insert into public.sectors (name, color)
      values (${name}, ${color})
      returning id::text
    `;
    return { ok: true, data: { id: rows[0]!.id } };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "sector-duplicate" };
    }
    return { ok: false, error: "sector-save" };
  }
}

export async function updateSectorPg(params: {
  id: string;
  name: string;
  color: string;
}): Promise<RhMutationResult> {
  if (!params.id || !isUuid(params.id)) return { ok: false, error: "validation" };
  const name = params.name.trim();
  const color = params.color.trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "sector-name" };
  }
  if (!HEX_COLOR.test(color)) {
    return { ok: false, error: "sector-color" };
  }

  const sql = getSql();
  try {
    const rows = await sql<{ id: string }[]>`
      update public.sectors
         set name = ${name},
             color = ${color}
       where id = ${params.id}::uuid
      returning id::text
    `;
    if (!rows[0]) return { ok: false, error: "not_found" };
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "sector-duplicate" };
    }
    return { ok: false, error: "sector-save" };
  }
}

export async function deleteSectorPg(id: string): Promise<RhMutationResult> {
  if (!id || !isUuid(id)) return { ok: false, error: "validation" };
  const sql = getSql();
  try {
    const rows = await sql<{ id: string }[]>`
      delete from public.sectors
       where id = ${id}::uuid
      returning id::text
    `;
    if (!rows[0]) return { ok: false, error: "not_found" };
    return { ok: true };
  } catch {
    return { ok: false, error: "sector-delete" };
  }
}

async function listProfilesByRolesPg(
  roles: readonly ProfileRole[],
): Promise<PgRhProfileRow[]> {
  if (roles.length === 0) return [];
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      email: string;
      full_name: string | null;
      role: ProfileRole;
      sector_id: string | null;
      sector_name: string | null;
      sector_color: string | null;
      leave_balance_days: number;
      deleted_at: Date | string | null;
      created_at: Date | string;
      invite_pending: boolean;
    }[]
  >`
    select p.id::text,
           u.email,
           p.full_name,
           p.role,
           p.sector_id::text,
           s.name as sector_name,
           s.color as sector_color,
           p.leave_balance_days,
           p.deleted_at,
           p.created_at,
           (u.email_confirmed_at is null) as invite_pending
      from public.profiles p
      join public.users u on u.id = p.id
      left join public.sectors s on s.id = p.sector_id
     where p.role = any(${[...roles]}::text[])
     order by p.full_name asc nulls last, u.email asc
  `;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    sector_id: row.sector_id,
    sector_name: row.sector_name,
    sector_color: row.sector_color,
    leave_balance_days: row.leave_balance_days,
    deleted_at: toIso(row.deleted_at),
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
    invite_pending: Boolean(row.invite_pending),
  }));
}

export async function listLabEmployeesPg(): Promise<PgRhProfileRow[]> {
  return listProfilesByRolesPg([...SECTOR_LAB_ROLES]);
}

export async function listPractitionersPg(): Promise<PgRhProfileRow[]> {
  return listProfilesByRolesPg(["practitioner"]);
}

export async function updateEmployeeSectorPg(params: {
  profileId: string;
  sectorId: string | null;
}): Promise<RhMutationResult> {
  if (!params.profileId || !isUuid(params.profileId)) {
    return { ok: false, error: "employee-validation" };
  }
  if (params.sectorId && !isUuid(params.sectorId)) {
    return { ok: false, error: "employee-validation" };
  }
  if (params.sectorId && !(await sectorExistsRhPg(params.sectorId))) {
    return { ok: false, error: "invite-sector" };
  }
  const sql = getSql();
  try {
    const rows = await sql<{ id: string }[]>`
      update public.profiles
         set sector_id = ${params.sectorId}::uuid
       where id = ${params.profileId}::uuid
         and role = any(${[...SECTOR_LAB_ROLES]}::text[])
      returning id::text
    `;
    if (!rows[0]) return { ok: false, error: "employee-validation" };
    return { ok: true };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "invite-sector" };
    }
    console.error("[updateEmployeeSectorPg]", error);
    return { ok: false, error: "employee-save" };
  }
}

export async function updateEmployeeLeaveBalancePg(params: {
  profileId: string;
  leaveBalanceDays: number;
}): Promise<RhMutationResult> {
  if (!params.profileId || !isUuid(params.profileId)) {
    return { ok: false, error: "employee-validation" };
  }
  if (
    !Number.isFinite(params.leaveBalanceDays) ||
    params.leaveBalanceDays < 0 ||
    params.leaveBalanceDays > 365
  ) {
    return { ok: false, error: "employee-balance-invalid" };
  }

  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    update public.profiles
       set leave_balance_days = ${params.leaveBalanceDays}
     where id = ${params.profileId}::uuid
       and role = any(${[...SECTOR_LAB_ROLES]}::text[])
    returning id::text
  `;
  if (!rows[0]) return { ok: false, error: "employee-validation" };
  return { ok: true };
}

export type InviteCreated = {
  userId: string;
  email: string;
  role: InviteRole;
  /** Token brut (à envoyer par e-mail / smoke). */
  inviteToken: string;
  inviteUrl: string;
  expiresAt: string;
};

function buildInviteUrl(siteUrl: string, rawToken: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/espace-praticien/auth/invite?token=${encodeURIComponent(rawToken)}`;
}

export async function inviteUserPg(params: {
  email: string;
  fullName?: string;
  role?: string;
  sectorId?: string | null;
  siteUrl: string;
}): Promise<RhMutationResult<InviteCreated>> {
  const email = params.email.trim().toLowerCase();
  const fullName = (params.fullName ?? "").trim();
  const role = parseInviteRoleStrict(params.role);
  const sectorId =
    params.sectorId && params.sectorId.length > 0 ? params.sectorId : null;

  if (!role) {
    return { ok: false, error: "invite-validation" };
  }
  if (!email.includes("@")) {
    return { ok: false, error: "invite-validation" };
  }
  if (sectorId && !isUuid(sectorId)) {
    return { ok: false, error: "invite-sector" };
  }
  if (isSectorLabRole(role) && !sectorId) {
    return { ok: false, error: "invite-sector" };
  }
  // FK sector inexistant → 400 invite-sector (pas 500).
  if (sectorId && !(await sectorExistsRhPg(sectorId))) {
    return { ok: false, error: "invite-sector" };
  }

  const sql = getSql();
  const existing = await sql<
    { id: string; deleted_at: Date | string | null }[]
  >`
    select u.id::text, p.deleted_at
      from public.users u
      join public.profiles p on p.id = u.id
     where lower(u.email) = ${email}
     limit 1
  `;
  if (existing[0]) {
    return {
      ok: false,
      error: existing[0].deleted_at
        ? "invite-exists-deleted"
        : "invite-exists",
    };
  }

  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const passwordHash = await unusablePasswordHash();

  try {
    const userRows = await sql<{ id: string }[]>`
      insert into public.users (
        email,
        password_hash,
        invite_token_hash,
        invite_token_expires_at
      )
      values (
        ${email},
        ${passwordHash},
        ${tokenHash},
        ${expiresAt.toISOString()}::timestamptz
      )
      returning id::text
    `;
    const userId = userRows[0]?.id;
    if (!userId) return { ok: false, error: "invite-failed" };

    await sql`
      update public.profiles
         set role = ${role},
             full_name = ${fullName.length > 0 ? fullName : null},
             sector_id = ${isSectorLabRole(role) ? sectorId : null}::uuid
       where id = ${userId}::uuid
    `;

    return {
      ok: true,
      data: {
        userId,
        email,
        role,
        inviteToken: rawToken,
        inviteUrl: buildInviteUrl(params.siteUrl, rawToken),
        expiresAt: expiresAt.toISOString(),
      },
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "invite-exists" };
    }
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "invite-sector" };
    }
    console.error("[inviteUserPg]", error);
    return { ok: false, error: "invite-failed" };
  }
}

/**
 * Re-mint un token d’invite + URL pour un compte encore pending
 * (`email_confirmed_at` null, non soft-deleted, pas admin).
 * Le token brut ne doit jamais être renvoyé au client — e-mail seulement.
 */
export async function resendInviteUserPg(params: {
  profileId: string;
  siteUrl: string;
}): Promise<RhMutationResult<InviteCreated>> {
  if (!params.profileId || !isUuid(params.profileId)) {
    return { ok: false, error: "invite-validation" };
  }
  const sql = getSql();

  const rows = await sql<
    {
      id: string;
      email: string;
      role: ProfileRole;
      deleted_at: Date | string | null;
      email_confirmed_at: Date | string | null;
      full_name: string | null;
    }[]
  >`
    select p.id::text,
           u.email,
           p.role,
           p.deleted_at,
           u.email_confirmed_at,
           p.full_name
      from public.profiles p
      join public.users u on u.id = p.id
     where p.id = ${params.profileId}::uuid
     limit 1
  `;
  const target = rows[0];
  if (!target || target.role === "admin" || target.deleted_at) {
    return { ok: false, error: "invite-validation" };
  }
  if (target.email_confirmed_at) {
    return { ok: false, error: "invite-not-pending" };
  }
  if (!INVITE_ROLES.has(target.role as InviteRole)) {
    return { ok: false, error: "invite-validation" };
  }

  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  try {
    await sql`
      update public.users
         set invite_token_hash = ${tokenHash},
             invite_token_expires_at = ${expiresAt.toISOString()}::timestamptz,
             password_reset_token_hash = null,
             password_reset_expires_at = null
       where id = ${params.profileId}::uuid
         and email_confirmed_at is null
    `;

    return {
      ok: true,
      data: {
        userId: target.id,
        email: target.email,
        role: target.role as InviteRole,
        inviteToken: rawToken,
        inviteUrl: buildInviteUrl(params.siteUrl, rawToken),
        expiresAt: expiresAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[resendInviteUserPg]", error);
    return { ok: false, error: "invite-failed" };
  }
}

/**
 * Soft-delete (ban + deleted_at + wipe sessions).
 *
 * Idempotence documentée :
 * - 1ʳᵉ fois → `{ ok: true, data: { role, alreadyDeleted: false } }`
 * - déjà soft-deleted → `{ ok: true, data: { role, alreadyDeleted: true } }`
 *   (pas de re-ban silencieux ; réponse explicite pour l’admin / API).
 * - admin / id invalide → `delete-validation`.
 */
export async function softDeleteUserPg(
  profileId: string,
): Promise<RhMutationResult<{ role: ProfileRole; alreadyDeleted: boolean }>> {
  if (!profileId || !isUuid(profileId)) {
    return { ok: false, error: "delete-validation" };
  }
  const sql = getSql();

  const target = await sql<
    { id: string; role: ProfileRole; deleted_at: Date | string | null }[]
  >`
    select id::text, role, deleted_at
      from public.profiles
     where id = ${profileId}::uuid
     limit 1
  `;
  if (!target[0] || target[0].role === "admin") {
    return { ok: false, error: "delete-validation" };
  }
  if (target[0].deleted_at) {
    return {
      ok: true,
      data: { role: target[0].role, alreadyDeleted: true },
    };
  }

  try {
    await sql.begin(async (tx) => {
      await tx`
        update public.users
           set banned_until = ${PERMANENT_BAN_UNTIL.toISOString()}::timestamptz,
               invite_token_hash = null,
               invite_token_expires_at = null,
               password_reset_token_hash = null,
               password_reset_expires_at = null
         where id = ${profileId}::uuid
      `;
      await tx`
        update public.profiles
           set deleted_at = now()
         where id = ${profileId}::uuid
           and deleted_at is null
      `;
      await tx`
        delete from public.sessions where user_id = ${profileId}::uuid
      `;
    });
    return {
      ok: true,
      data: { role: target[0].role, alreadyDeleted: false },
    };
  } catch (error) {
    console.error("[softDeleteUserPg]", error);
    return { ok: false, error: "delete-failed" };
  }
}

export type ReactivateCreated = {
  userId: string;
  email: string;
  role: ProfileRole;
  resetToken: string;
  inviteUrl: string;
  expiresAt: string;
};

export async function reactivateUserPg(params: {
  profileId: string;
  siteUrl: string;
}): Promise<RhMutationResult<ReactivateCreated>> {
  if (!params.profileId || !isUuid(params.profileId)) {
    return { ok: false, error: "delete-validation" };
  }
  const sql = getSql();

  const rows = await sql<
    {
      id: string;
      email: string;
      role: ProfileRole;
      deleted_at: Date | string | null;
    }[]
  >`
    select p.id::text, u.email, p.role, p.deleted_at
      from public.profiles p
      join public.users u on u.id = p.id
     where p.id = ${params.profileId}::uuid
     limit 1
  `;
  const target = rows[0];
  if (!target || target.role === "admin" || !target.deleted_at) {
    return { ok: false, error: "delete-validation" };
  }

  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const passwordHash = await unusablePasswordHash();

  try {
    await sql.begin(async (tx) => {
      await tx`
        update public.users
           set banned_until = null,
               password_hash = ${passwordHash},
               email_confirmed_at = null,
               password_reset_token_hash = ${tokenHash},
               password_reset_expires_at = ${expiresAt.toISOString()}::timestamptz,
               invite_token_hash = null,
               invite_token_expires_at = null
         where id = ${params.profileId}::uuid
      `;
      await tx`
        update public.profiles
           set deleted_at = null
         where id = ${params.profileId}::uuid
      `;
      // Anciennes sessions (si une a survécu) + forcer le flux reset.
      await tx`
        delete from public.sessions where user_id = ${params.profileId}::uuid
      `;
    });

    return {
      ok: true,
      data: {
        userId: target.id,
        email: target.email,
        role: target.role,
        resetToken: rawToken,
        inviteUrl: buildInviteUrl(params.siteUrl, rawToken),
        expiresAt: expiresAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[reactivateUserPg]", error);
    return { ok: false, error: "reactivate-failed" };
  }
}

export async function permanentlyDeleteUserPg(
  profileId: string,
): Promise<RhMutationResult<{ role: ProfileRole }>> {
  if (!profileId || !isUuid(profileId)) {
    return { ok: false, error: "delete-validation" };
  }
  const sql = getSql();

  const target = await sql<
    { id: string; role: ProfileRole; deleted_at: Date | string | null }[]
  >`
    select id::text, role, deleted_at
      from public.profiles
     where id = ${profileId}::uuid
     limit 1
  `;
  if (!target[0] || target[0].role === "admin" || !target[0].deleted_at) {
    return { ok: false, error: "delete-validation" };
  }

  try {
    await sql`
      delete from public.users where id = ${profileId}::uuid
    `;
    return { ok: true, data: { role: target[0].role } };
  } catch (error) {
    console.error("[permanentlyDeleteUserPg]", error);
    return { ok: false, error: "delete-failed" };
  }
}

/**
 * Consomme atomiquement un token invite ou reset (single-use).
 * N’émet pas de session — utilisé par set-password (body token) et accept.
 */
export async function consumeInviteOrResetTokenPg(
  rawToken: string,
): Promise<RhMutationResult<{ userId: string; email: string }>> {
  const token = rawToken.trim();
  if (!token) return { ok: false, error: "token-invalid" };

  const sql = getSql();
  const tokenHash = hashToken(token);
  const rows = await sql<
    {
      id: string;
      email: string;
      invite_expires: Date | string | null;
      reset_expires: Date | string | null;
      match_invite: boolean;
      match_reset: boolean;
      deleted_at: Date | string | null;
      banned_until: Date | string | null;
    }[]
  >`
    select u.id::text,
           u.email,
           u.invite_token_expires_at as invite_expires,
           u.password_reset_expires_at as reset_expires,
           (u.invite_token_hash is not null and u.invite_token_hash = ${tokenHash}) as match_invite,
           (u.password_reset_token_hash is not null and u.password_reset_token_hash = ${tokenHash}) as match_reset,
           p.deleted_at,
           u.banned_until
      from public.users u
      join public.profiles p on p.id = u.id
     where (u.invite_token_hash = ${tokenHash}
         or u.password_reset_token_hash = ${tokenHash})
     limit 1
  `;

  const row = rows[0];
  if (!row || (!row.match_invite && !row.match_reset)) {
    return { ok: false, error: "token-invalid" };
  }
  if (row.deleted_at) {
    return { ok: false, error: "forbidden" };
  }
  if (row.banned_until && new Date(row.banned_until) > new Date()) {
    return { ok: false, error: "forbidden" };
  }

  const expires = row.match_invite ? row.invite_expires : row.reset_expires;
  if (!expires || new Date(expires) <= new Date()) {
    return { ok: false, error: "token-expired" };
  }

  // UPDATE … RETURNING : un seul gagnant en cas de multi-mint concurrent.
  const consumed = row.match_invite
    ? await sql<{ id: string }[]>`
        update public.users
           set invite_token_hash = null,
               invite_token_expires_at = null
         where id = ${row.id}::uuid
           and invite_token_hash = ${tokenHash}
           and invite_token_expires_at > now()
        returning id::text
      `
    : await sql<{ id: string }[]>`
        update public.users
           set password_reset_token_hash = null,
               password_reset_expires_at = null
         where id = ${row.id}::uuid
           and password_reset_token_hash = ${tokenHash}
           and password_reset_expires_at > now()
        returning id::text
      `;

  if (!consumed[0]) {
    return { ok: false, error: "token-invalid" };
  }

  return { ok: true, data: { userId: row.id, email: row.email } };
}

/** Consomme le token invite/reset puis émet une session (web + API accept). */
export async function acceptInviteTokenPg(
  rawToken: string,
): Promise<
  RhMutationResult<{ token: string; expiresAt: Date; email: string; userId: string }>
> {
  const consumed = await consumeInviteOrResetTokenPg(rawToken);
  if (!consumed.ok) return consumed;
  if (!consumed.data) return { ok: false, error: "token-invalid" };

  const session = await createPgSessionToken(consumed.data.userId);
  return {
    ok: true,
    data: {
      token: session.token,
      expiresAt: session.expiresAt,
      email: consumed.data.email,
      userId: consumed.data.userId,
    },
  };
}

export async function setPasswordPg(params: {
  userId: string;
  password: string;
  confirm: string;
  /** Session brute à conserver ; toutes les autres sont invalidées. */
  keepSessionToken?: string | null;
}): Promise<RhMutationResult> {
  const policyError = checkPasswordPolicy(params.password, params.confirm);
  if (policyError) return { ok: false, error: policyError };

  const passwordHash = await hashPassword(params.password);
  const sql = getSql();
  const keepHash = params.keepSessionToken
    ? hashToken(params.keepSessionToken)
    : null;

  const rows = await sql<{ id: string }[]>`
    update public.users
       set password_hash = ${passwordHash},
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           invite_token_hash = null,
           invite_token_expires_at = null,
           password_reset_token_hash = null,
           password_reset_expires_at = null
     where id = ${params.userId}::uuid
    returning id::text
  `;
  if (!rows[0]) return { ok: false, error: "not_found" };

  // Invalide les sessions multi-mint / anciennes ; garde la session courante.
  if (keepHash) {
    await sql`
      delete from public.sessions
       where user_id = ${params.userId}::uuid
         and token_hash <> ${keepHash}
    `;
  } else {
    await sql`
      delete from public.sessions
       where user_id = ${params.userId}::uuid
    `;
  }

  return { ok: true };
}

export type { SectorLabRole };
