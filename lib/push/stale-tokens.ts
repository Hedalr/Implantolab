import "server-only";

import { isPostgresBackend } from "@/lib/db/backend";
import { getSql } from "@/lib/db/client";
import {
  getServiceRoleSupabase,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";

/**
 * TTL optionnel (jours) pour tokens push non rafraîchis (`updated_at`).
 * Absent / invalide → cleanup désactivé (409 handoff sans unregister reste volontaire).
 */
export function getPushTokenTtlDays(): number | null {
  const raw = (process.env.PUSH_TOKEN_TTL_DAYS ?? "").trim();
  if (!raw) return null;
  const days = Number(raw);
  if (!Number.isFinite(days) || days <= 0) return null;
  return Math.min(Math.floor(days), 3650);
}

/**
 * Purge les tokens dont `updated_at` est plus vieux que le TTL.
 * No-op si `PUSH_TOKEN_TTL_DAYS` absent. Retourne le nombre de rows supprimées.
 */
export async function purgeStalePushTokens(): Promise<number> {
  const days = getPushTokenTtlDays();
  if (days == null) return 0;

  if (isPostgresBackend()) {
    const sql = getSql();
    const rows = await sql<{ id: string }[]>`
      delete from public.push_tokens
       where updated_at < now() - (${days}::int * interval '1 day')
      returning id::text
    `;
    return rows.length;
  }

  if (!isServiceRoleConfigured()) return 0;

  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const supabase = getServiceRoleSupabase();
  const { data, error } = await supabase
    .from("push_tokens")
    .delete()
    .lt("updated_at", cutoff)
    .select("id");
  if (error) {
    console.error("[push/stale] purge", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
