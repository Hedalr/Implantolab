import { NextResponse, type NextRequest } from "next/server";
import {
  getServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/**
 * POST /espace-praticien/logout — déconnecte l'utilisateur puis redirige
 * vers la page de login.
 * Le formulaire de la topbar cible cette route en méthode POST.
 */
export async function POST(request: NextRequest) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getServerSupabase();
      await supabase.auth.signOut();
    } catch {
      // On ignore : dans tous les cas on redirige vers login,
      // le middleware nettoiera la session si nécessaire.
    }
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/espace-praticien/login";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
