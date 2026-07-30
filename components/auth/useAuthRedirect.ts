"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { processAuthRedirect } from "@/lib/supabase/process-auth-redirect";

/**
 * One-shot client effect: exchange invite/recovery tokens for a session,
 * then navigate to the target (or login on failure).
 */
export function useAuthRedirect() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const supabase = getBrowserSupabase();
    if (!supabase) {
      router.replace("/espace-praticien/login?error=config");
      return;
    }

    void processAuthRedirect(supabase, window.location.href).then((result) => {
      if (result.ok) {
        // Navigation "dure" (et non `router.replace`) : le layout
        // `/espace-praticien` est mis en cache côté client par le Router
        // Cache de Next.js. Un remplacement "soft" réutiliserait le rendu du
        // layout déjà affiché sur cette page de callback — rendu avec la
        // session encore active AVANT l'échange du token d'invitation (ex.
        // celle d'un admin déjà connecté dans ce navigateur). Un rechargement
        // complet force le serveur (proxy + layout) à relire les cookies
        // fraîchement posés par `processAuthRedirect` et à afficher le bon
        // utilisateur dans l'en-tête.
        window.location.replace(result.target);
        return;
      }
      router.replace("/espace-praticien/login?error=invite");
    });
  }, [router]);
}
