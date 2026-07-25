import type { EmailOtpType } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_TARGET = "/espace-praticien/set-password";
const AUTH_REDIRECT_ORIGIN = "https://auth.implantolab.invalid";

function isSupportedOtpType(type: string | null): type is EmailOtpType {
  return type === "invite" || type === "recovery";
}

export function getSafeAuthTarget(next: string | null): string {
  if (!next || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_TARGET;
  }

  try {
    const target = new URL(next, AUTH_REDIRECT_ORIGIN);
    const isInternalPath =
      target.pathname === "/espace-praticien" ||
      target.pathname.startsWith("/espace-praticien/");

    if (target.origin !== AUTH_REDIRECT_ORIGIN || !isInternalPath) {
      return DEFAULT_TARGET;
    }

    return `${target.pathname}${target.search}`;
  } catch {
    return DEFAULT_TARGET;
  }
}

export type AuthRedirectResult =
  | { ok: true; target: string }
  | { ok: false; reason: "missing" | "error" };

/**
 * Lit un code PKCE ou un token_hash à usage unique depuis le callback dédié,
 * puis ouvre une session Supabase.
 */
export async function processAuthRedirect(
  client: SupabaseClient,
  href: string,
): Promise<AuthRedirectResult> {
  const url = new URL(href);
  const target = getSafeAuthTarget(url.searchParams.get("next"));

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  try {
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (tokenHash && isSupportedOtpType(type)) {
      const { error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) throw error;
    } else {
      return { ok: false, reason: "missing" };
    }

    return { ok: true, target };
  } catch (error) {
    console.error("[processAuthRedirect]", error);
    return { ok: false, reason: "error" };
  }
}
