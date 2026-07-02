import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy Next.js (ex-middleware, renommé "proxy" en Next.js 16).
 * Protège uniquement la section /espace-praticien.
 *
 * - Rafraîchit la session Supabase (indispensable pour éviter les
 *   déconnexions aléatoires en SSR).
 * - Redirige vers /espace-praticien/login si aucune session valide,
 *   sauf sur les routes de login / callback auth / logout.
 * - Si Supabase n'est pas configuré : laisse passer (la page login
 *   affichera un message d'attente de configuration).
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname.startsWith("/espace-praticien/login");
  const isAuthRoute = pathname.startsWith("/espace-praticien/auth");
  const isLogoutRoute = pathname.startsWith("/espace-praticien/logout");

  if (!user && !isLoginRoute && !isAuthRoute && !isLogoutRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/espace-praticien/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/espace-praticien/:path*"],
};
