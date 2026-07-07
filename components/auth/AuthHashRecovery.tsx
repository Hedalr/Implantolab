"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  processAuthRedirect,
  urlHasAuthTokens,
} from "@/lib/supabase/process-auth-redirect";

/**
 * Supabase renvoie parfois les tokens sur la Site URL (ex. /#access_token=…)
 * quand la Redirect URL du callback n'est pas autorisée. Ce composant
 * intercepte ce cas sur n'importe quelle page du site.
 */
export function AuthHashRecovery() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (window.location.pathname.startsWith("/espace-praticien/auth/callback")) {
      return;
    }
    if (!urlHasAuthTokens(window.location.href)) return;

    started.current = true;

    const supabase = getBrowserSupabase();
    if (!supabase) {
      router.replace("/espace-praticien/login?error=config");
      return;
    }

    void processAuthRedirect(supabase, window.location.href).then((result) => {
      if (result.ok) {
        router.replace(result.target);
        return;
      }
      router.replace("/espace-praticien/login?error=invite");
    });
  }, [router]);

  return null;
}
