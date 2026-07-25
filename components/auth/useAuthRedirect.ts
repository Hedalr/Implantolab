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
        router.replace(result.target);
        return;
      }
      router.replace("/espace-praticien/login?error=invite");
    });
  }, [router]);
}
