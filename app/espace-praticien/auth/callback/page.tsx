"use client";

import { useAuthRedirect } from "@/components/auth/useAuthRedirect";

export default function AuthCallbackPage() {
  useAuthRedirect();

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm text-[var(--ink-muted)]">Activation du compte…</p>
    </div>
  );
}
