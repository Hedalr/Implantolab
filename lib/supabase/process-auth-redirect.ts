import type { EmailOtpType } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_TARGET = "/espace-praticien/set-password";

export type AuthRedirectResult =
  | { ok: true; target: string }
  | { ok: false; reason: "missing" | "error" };

/**
 * Lit code, token_hash ou #access_token depuis l'URL courante et ouvre
 * une session Supabase. Utilisé par le callback dédié et le filet de
 * sécurité global (quand Supabase renvoie vers la Site URL /).
 */
export async function processAuthRedirect(
  client: SupabaseClient,
  href: string,
): Promise<AuthRedirectResult> {
  const url = new URL(href);
  const next =
    url.searchParams.get("next") ?? DEFAULT_TARGET;
  const target = next.startsWith("/") ? next : DEFAULT_TARGET;

  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const access_token = hash.get("access_token");
  const refresh_token = hash.get("refresh_token");
  const hashType = hash.get("type");

  const isInvite =
    type === "invite" ||
    hashType === "invite" ||
    target.includes("set-password");

  try {
    if (isInvite) {
      await client.auth.signOut();
    }

    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (token_hash && type) {
      const { error } = await client.auth.verifyOtp({
        token_hash,
        type: type as EmailOtpType,
      });
      if (error) throw error;
    } else if (access_token && refresh_token) {
      const { error } = await client.auth.setSession({
        access_token,
        refresh_token,
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

export function urlHasAuthTokens(href: string): boolean {
  const url = new URL(href);
  if (url.searchParams.has("code")) return true;
  if (url.searchParams.has("token_hash")) return true;

  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  return hash.has("access_token") && hash.has("refresh_token");
}
