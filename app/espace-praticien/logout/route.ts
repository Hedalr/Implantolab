import { NextResponse, type NextRequest } from "next/server";
import {
  getServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { isPostgresBackend } from "@/lib/db/backend";
import {
  clearPgSessionCookie,
  PG_SESSION_COOKIE,
} from "@/lib/auth/postgres/cookies";
import { destroyPgSessionToken } from "@/lib/auth/postgres/session";

/** POST logout → login (303). Échec signOut ignoré : on redirige quand même. */
export async function POST(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/espace-praticien/login";
  redirectUrl.search = "";
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  if (isPostgresBackend()) {
    const token = request.cookies.get(PG_SESSION_COOKIE)?.value;
    try {
      await destroyPgSessionToken(token);
    } catch {
      // Cookie clear ci-dessous même si le delete DB échoue.
    }
    // Toujours retirer le cookie : un logout qui laisse il_session = session zombie.
    clearPgSessionCookie(response);
  } else {
    try {
      if (isSupabaseConfigured()) {
        const supabase = await getServerSupabase();
        await supabase.auth.signOut();
      }
    } catch {
      // Middleware nettoiera la session si besoin.
    }
  }

  return response;
}
