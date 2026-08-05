import "server-only";

import {
  getServiceRoleSupabase,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import type { PushTokenRow } from "@/lib/push/types";

/**
 * Tokens des admins + chefs de secteur du secteur donné (1–2 requêtes profils en parallèle + tokens).
 */
export async function getAdminAndSectorChefTokens(
  sectorId: string | null,
): Promise<PushTokenRow[]> {
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
  if (profileIds.length === 0 || !isServiceRoleConfigured()) return [];

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
