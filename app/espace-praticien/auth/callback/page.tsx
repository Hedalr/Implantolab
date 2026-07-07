"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { processAuthRedirect } from "@/lib/supabase/process-auth-redirect";

export default function AuthCallbackPage() {
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

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm text-[var(--ink-muted)]">Activation du compte…</p>
    </div>
  );
}
