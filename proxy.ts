import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy Next.js 16 (ex-middleware).
 * Protège uniquement la section /espace-praticien.
 *
 * - Rafraîchit la session Supabase.
 * - Redirige vers /espace-praticien/login si aucune session valide,
 *   sauf sur login / callback auth / logout.
 *
 * Note : rester sur `proxy.ts` (convention Next 16). Le runtime Node
 * nécessite `outputFileTracingIncludes` dans next.config pour éviter
 * MIDDLEWARE_INVOCATION_FAILED sur Vercel.
 */
export async function proxy(request: NextRequest) {
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
    console.error("[proxy] échec session:", error);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: ["/espace-praticien/:path*"],
};
