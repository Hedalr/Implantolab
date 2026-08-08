import { cookies } from "next/headers";
import { cache } from "react";
import { getSql } from "@/lib/db/client";
import {
  createSessionToken,
  hashToken,
} from "@/lib/auth/postgres/crypto";
import { PG_SESSION_COOKIE } from "@/lib/auth/postgres/cookies";
import type { ProfileRole } from "@/lib/roles";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PgSessionUser = {
  id: string;
  email: string;
  /** true si email_confirmed_at IS NULL (invite acceptée, mdp pas encore défini). */
  mustSetPassword: boolean;
};

export type PgProfile = {
  id: string;
  email: string;
  role: ProfileRole;
  fullName: string | null;
  sectorId: string | null;
  sectorName: string | null;
  sectorColor: string | null;
  leaveBalanceDays: number;
};

/** Lecture session depuis un cookie/bearer brut (middleware / API). */
export async function resolvePgSessionFromToken(
  token: string | undefined | null,
): Promise<PgSessionUser | null> {
  if (!token) return null;
  const sql = getSql();
  const rows = await sql<
    { id: string; email: string; email_confirmed_at: Date | string | null }[]
  >`
    select u.id, u.email, u.email_confirmed_at
      from public.sessions s
      join public.users u on u.id = s.user_id
      join public.profiles p on p.id = u.id
     where s.token_hash = ${hashToken(token)}
       and s.expires_at > now()
       and p.deleted_at is null
       and (u.banned_until is null or u.banned_until <= now())
     limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    mustSetPassword: row.email_confirmed_at == null,
  };
}

export const getPgSessionUser = cache(
  async (): Promise<PgSessionUser | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(PG_SESSION_COOKIE)?.value;
    return resolvePgSessionFromToken(token);
  },
);

export async function fetchPgProfile(
  userId: string,
  email: string,
): Promise<PgProfile | null> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      role: ProfileRole;
      full_name: string | null;
      sector_id: string | null;
      leave_balance_days: number;
      sector_name: string | null;
      sector_color: string | null;
    }[]
  >`
    select p.id,
           p.role,
           p.full_name,
           p.sector_id,
           p.leave_balance_days,
           s.name as sector_name,
           s.color as sector_color
      from public.profiles p
      left join public.sectors s on s.id = p.sector_id
     where p.id = ${userId}::uuid
     limit 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email,
    role: row.role,
    fullName: row.full_name,
    sectorId: row.sector_id,
    sectorName: row.sector_name,
    sectorColor: row.sector_color,
    leaveBalanceDays: row.leave_balance_days,
  };
}

export const getPgProfile = cache(async (): Promise<PgProfile | null> => {
  const user = await getPgSessionUser();
  if (!user) return null;
  return fetchPgProfile(user.id, user.email);
});

export async function createPgSessionToken(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const sql = getSql();
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await sql`
    insert into public.sessions (user_id, token_hash, expires_at)
    values (${userId}::uuid, ${tokenHash}, ${expiresAt})
  `;

  return { token, expiresAt };
}

export async function destroyPgSessionToken(
  token: string | undefined | null,
): Promise<void> {
  if (!token) return;
  const sql = getSql();
  await sql`
    delete from public.sessions where token_hash = ${hashToken(token)}
  `;
}
