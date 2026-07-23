"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  processAuthRedirect,
  urlHasAuthTokens,
} from "@/lib/supabase/process-auth-redirect";

type UseAuthRedirectOptions = {
  /** When true, no-op unless the URL carries auth tokens. */
  requireTokens?: boolean;
  /** Skip when the current path starts with this prefix (e.g. dedicated callback page). */
  skipPathPrefix?: string;
};

/**
 * One-shot client effect: exchange invite/recovery tokens for a session,
 * then navigate to the target (or login on failure).
 */
export function useAuthRedirect(options: UseAuthRedirectOptions = {}) {
  const { requireTokens = false, skipPathPrefix } = options;
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (
      skipPathPrefix &&
      window.location.pathname.startsWith(skipPathPrefix)
    ) {
      return;
    }
    if (requireTokens && !urlHasAuthTokens(window.location.href)) return;

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
  }, [requireTokens, router, skipPathPrefix]);
}
