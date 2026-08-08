import "server-only";

import {
  getServiceRoleSupabase,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import type { PushTokenRow } from "@/lib/push/types";
import { isPostgresBackend } from "@/lib/db/backend";
import { getSql } from "@/lib/db/client";

/**
 * Tokens des admins + chefs de secteur du secteur donné.
 */
export async function getAdminAndSectorChefTokens(
  sectorId: string | null,
): Promise<PushTokenRow[]> {
  if (isPostgresBackend()) {
    const sql = getSql();
    const rows = sectorId
      ? await sql<{ token: string; profile_id: string }[]>`
          select t.token, t.profile_id::text
            from public.push_tokens t
            join public.profiles p on p.id = t.profile_id
           where p.deleted_at is null
             and (
               p.role = 'admin'
               or (p.role = 'chef_de_secteur' and p.sector_id = ${sectorId}::uuid)
             )
        `
      : await sql<{ token: string; profile_id: string }[]>`
          select t.token, t.profile_id::text
            from public.push_tokens t
            join public.profiles p on p.id = t.profile_id
           where p.deleted_at is null
             and p.role = 'admin'
        `;
    return rows;
  }

  if (!isServiceRoleConfigured()) return [];

  const supabase = getServiceRoleSupabase();

  const adminQuery = supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .is("deleted_at", null);

  const chefQuery = sectorId
    ? supabase
        .from("profiles")
        .select("id")
        .eq("role", "chef_de_secteur")
        .eq("sector_id", sectorId)
        .is("deleted_at", null)
    : Promise.resolve({ data: [] as { id: string }[], error: null });

  const [adminResult, chefResult] = await Promise.all([adminQuery, chefQuery]);

  if (adminResult.error) {
    console.error("[push/recipients] admins", adminResult.error.message);
  }
  if (chefResult.error) {
    console.error("[push/recipients] chefs", chefResult.error.message);
  }

  const profileIds = [
    ...new Set([
      ...(adminResult.data ?? []).map((p) => p.id),
      ...(chefResult.data ?? []).map((p) => p.id),
    ]),
  ];

  return fetchTokensForProfiles(profileIds);
}

export async function getRequestOwnerTokens(
  profileId: string,
): Promise<PushTokenRow[]> {
  return fetchTokensForProfiles([profileId]);
}

/** Tokens praticiens actifs — jointure unique push_tokens ↔ profiles. */
export async function getAllPractitionerTokens(): Promise<PushTokenRow[]> {
  if (isPostgresBackend()) {
    const sql = getSql();
    return sql<{ token: string; profile_id: string }[]>`
      select t.token, t.profile_id::text
        from public.push_tokens t
        join public.profiles p on p.id = t.profile_id
       where p.role = 'practitioner'
         and p.deleted_at is null
    `;
  }

  if (!isServiceRoleConfigured()) return [];

  const supabase = getServiceRoleSupabase();
  const { data, error } = await supabase
    .from("push_tokens")
    .select("token, profile_id, profiles!inner(role, deleted_at)")
    .eq("profiles.role", "practitioner")
    .is("profiles.deleted_at", null);

  if (error) {
    console.error("[push/recipients] practitioners", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    token: row.token as string,
    profile_id: row.profile_id as string,
  }));
}

async function fetchTokensForProfiles(
  profileIds: string[],
): Promise<PushTokenRow[]> {
  if (profileIds.length === 0) return [];

  if (isPostgresBackend()) {
    const sql = getSql();
    return sql<{ token: string; profile_id: string }[]>`
      select token, profile_id::text
        from public.push_tokens
       where profile_id = any(${profileIds}::uuid[])
    `;
  }

  if (!isServiceRoleConfigured()) return [];

  const supabase = getServiceRoleSupabase();
  const { data, error } = await supabase
    .from("push_tokens")
    .select("token, profile_id")
    .in("profile_id", profileIds);

  if (error) {
    console.error("[push/recipients] tokens", error.message);
    return [];
  }

  return (data ?? []) as PushTokenRow[];
}
