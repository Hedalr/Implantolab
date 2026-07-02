import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase pour le browser (composants "use client").
 * Retourne `null` si les variables d'environnement Supabase ne sont pas
 * définies afin de ne pas casser le rendu côté client — les composants
 * appelants doivent gérer explicitement ce cas.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createBrowserClient(url, anonKey);
}
