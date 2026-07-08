import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Timeout par défaut (ms) pour les appels admin (listUsers, invite…) faits
 * depuis un Server Component ou une Server Action. Sur Vercel Hobby les
 * fonctions ont 10 s max ; on garde une marge pour que la page puisse
 * dégrader gracieusement plutôt que de renvoyer un 504.
 */
const ADMIN_CALL_TIMEOUT_MS = 6_000;

/**
 * Enveloppe une promesse avec un timeout. Rejette avec `Error("timeout")` si
 * la promesse ne s'est pas résolue dans le délai imparti — le code appelant
 * peut catcher cette erreur pour retomber sur un mode dégradé.
 */
export async function withAdminTimeout<T>(
  promise: Promise<T>,
  timeoutMs = ADMIN_CALL_TIMEOUT_MS,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`admin call timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Client Supabase avec clé service_role — réservé aux Server Actions admin. */
export function getServiceRoleSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante : les invitations praticiens nécessitent la clé service_role (Project Settings → API).",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** URL publique du site (invitations Supabase, callbacks auth). */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
