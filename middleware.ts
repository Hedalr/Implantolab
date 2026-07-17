import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware Edge (convention historique Next.js).
 *
 * On conserve volontairement `middleware.ts` plutôt que `proxy.ts` (Next 16) :
 * le runtime Node du proxy provoque un MIDDLEWARE_INVOCATION_FAILED /
 * EnvFileReadError sur Vercel pour /espace-praticien. Edge contourne ce bug.
 *
 * - Rafraîchit la session Supabase.
 * - Redirige vers /espace-praticien/login si aucune session valide,
 *   sauf sur login / callback auth / logout.
 */
export async function middleware(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error("[middleware] échec session:", error);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: ["/espace-praticien/:path*"],
};
