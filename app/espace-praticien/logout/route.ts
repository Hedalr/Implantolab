import { NextResponse, type NextRequest } from "next/server";
import {
  getServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/** POST logout → login (303). Échec signOut ignoré : on redirige quand même. */
export async function POST(request: NextRequest) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getServerSupabase();
      await supabase.auth.signOut();
    } catch {
      // Middleware nettoiera la session si besoin.
    }
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/espace-praticien/login";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
