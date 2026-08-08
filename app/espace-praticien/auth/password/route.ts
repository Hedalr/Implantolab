import { type NextRequest } from "next/server";
import { apiSignIn, getClientIp } from "@/lib/api/v1/auth";
import {
  PG_SESSION_COOKIE,
  setPgSessionCookie,
} from "@/lib/auth/postgres/cookies";
import { destroyPgSessionToken } from "@/lib/auth/postgres/session";
import { isPostgresBackend } from "@/lib/db/backend";
import { redirectPublic } from "@/lib/http/public-url";
import { homePathForRole } from "@/lib/roles";
import {
  getServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

function loginErrorRedirect(request: NextRequest, code: "1" | "config") {
  return redirectPublic(request, `/espace-praticien/login?error=${code}`, 303);
}

/** POST email/password → cookie session + redirect (303). */
export async function POST(request: NextRequest) {
  if (!isPostgresBackend() && !isSupabaseConfigured()) {
    return loginErrorRedirect(request, "config");
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return loginErrorRedirect(request, "1");
  }

  if (isPostgresBackend()) {
    const result = await apiSignIn(email, password, {
      clientIp: getClientIp(request),
    });
    if (!result.ok) {
      // Même redirect (error=1) pour 401/403/429 — pas d’énumération côté web.
      return loginErrorRedirect(request, "1");
    }

    // Anti-fixation : invalide l’ancien cookie éventuel avant d’en poser un nouveau.
    const previous = request.cookies.get(PG_SESSION_COOKIE)?.value;
    if (previous) {
      try {
        await destroyPgSessionToken(previous);
      } catch {
        // Nouveau cookie posé quand même.
      }
    }

    const response = redirectPublic(
      request,
      homePathForRole(result.profile.role),
      303,
    );
    setPgSessionCookie(response, result.token);
    return response;
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return loginErrorRedirect(request, "1");
  }

  return redirectPublic(request, "/espace-praticien", 303);
}
