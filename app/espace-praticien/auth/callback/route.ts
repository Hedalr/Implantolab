import { NextResponse, type NextRequest } from "next/server";
import {
  getServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/**
 * GET /espace-praticien/auth/callback — route standard Supabase pour
 * échanger un `code` OAuth ou magic-link contre une session cookie.
 *
 * Non utilisée aujourd'hui (auth uniquement par email/mot de passe),
 * mais prête pour un futur passage à l'invite magic-link ou OAuth.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/espace-praticien";

  if (code && isSupabaseConfigured()) {
    try {
      const supabase = await getServerSupabase();
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      const errorUrl = url.clone();
      errorUrl.pathname = "/espace-praticien/login";
      errorUrl.search = "?error=1";
      return NextResponse.redirect(errorUrl);
    }
  }

  const target = url.clone();
  target.pathname = next.startsWith("/") ? next : "/espace-praticien";
  target.search = "";
  return NextResponse.redirect(target);
}
