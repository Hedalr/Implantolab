import "server-only";

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

/** Map Auth user id → email (listUsers). Dégrade en map vide si indisponible. */
export async function loadAuthEmailById(
  logContext: string,
): Promise<Map<string, string>> {
  const emailById = new Map<string, string>();
  if (!isServiceRoleConfigured()) return emailById;
  try {
    const admin = getServiceRoleSupabase();
    const { data } = await withAdminTimeout(
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    );
    for (const user of data.users ?? []) {
      if (user.email) emailById.set(user.id, user.email);
    }
  } catch (err) {
    console.warn(
      `[${logContext}] listUsers indisponible, e-mails masqués :`,
      err instanceof Error ? err.message : err,
    );
  }
  return emailById;
}

/**
 * URL publique du site (invitations e-mail, callbacks auth).
 * Sur Scalingo : définir `NEXT_PUBLIC_SITE_URL` (pas de VERCEL_URL).
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
