import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function isPublicAuthPath(pathname: string): boolean {
  return [
    "/espace-praticien/login",
    "/espace-praticien/auth",
    "/espace-praticien/logout",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirectToLogin(request: NextRequest): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/espace-praticien/login";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

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
  const pathname = request.nextUrl.pathname;
  const isPublicPath = isPublicAuthPath(pathname);

  try {
    const { response, user } = await updateSession(request);

    if (!user && !isPublicPath) {
      return redirectToLogin(request);
    }

    return response;
  } catch (error) {
    console.error("[proxy] échec session:", error);
    return isPublicPath
      ? NextResponse.next({ request })
      : redirectToLogin(request);
  }
}

export const config = {
  matcher: ["/espace-praticien/:path*"],
};
