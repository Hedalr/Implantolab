"use client";

import { useAuthRedirect } from "@/components/auth/useAuthRedirect";

/**
 * Supabase renvoie parfois les tokens sur la Site URL (ex. /#access_token=…)
 * quand la Redirect URL du callback n'est pas autorisée. Ce composant
 * intercepte ce cas sur n'importe quelle page du site.
 */
export function AuthHashRecovery() {
  useAuthRedirect({
    requireTokens: true,
    skipPathPrefix: "/espace-praticien/auth/callback",
  });

  return null;
}
