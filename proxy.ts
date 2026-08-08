import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isPostgresBackend } from "@/lib/db/backend";
import { updatePgSession } from "@/lib/auth/postgres/middleware";
import {
  clearPgSessionCookie,
  PG_SESSION_COOKIE,
} from "@/lib/auth/postgres/cookies";
import { redirectPublic } from "@/lib/http/public-url";

function isPublicAuthPath(pathname: string): boolean {
  return [
    "/espace-praticien/login",
    "/espace-praticien/auth",
    "/espace-praticien/logout",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isSetPasswordPath(pathname: string): boolean {
  return (
    pathname === "/espace-praticien/set-password" ||
    pathname.startsWith("/espace-praticien/set-password/")
  );
}

function redirectToLogin(
  request: NextRequest,
  options?: { clearSessionCookie?: boolean },
): NextResponse {
  const response = redirectPublic(request, "/espace-praticien/login", 307);
  // updatePgSession pose le clear sur `NextResponse.next` — si on redirige
  // à la place, il faut reposer le Set-Cookie ici, sinon le cookie mort reste.
  if (options?.clearSessionCookie) {
    clearPgSessionCookie(response);
  }
  return response;
}

/**
 * Proxy Next.js 16 (ex-middleware).
 * Protège uniquement la section /espace-praticien.
 *
 * - Rafraîchit la session (Supabase ou Postgres selon DATA_BACKEND).
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
    const { response, user } = isPostgresBackend()
      ? await updatePgSession(request)
      : await updateSession(request);

    if (!user && !isPublicPath) {
      const hadPgCookie = Boolean(
        request.cookies.get(PG_SESSION_COOKIE)?.value,
      );
      return redirectToLogin(request, {
        clearSessionCookie: isPostgresBackend() && hadPgCookie,
      });
    }

    // Invite acceptée mais mdp pas encore défini → uniquement set-password.
    if (
      isPostgresBackend() &&
      user &&
      "mustSetPassword" in user &&
      user.mustSetPassword &&
      !isPublicPath &&
      !isSetPasswordPath(pathname)
    ) {
      return redirectPublic(request, "/espace-praticien/set-password", 307);
    }

    return response;
  } catch (error) {
    console.error("[proxy] échec session:", error);
    if (isPublicPath) {
      return NextResponse.next({ request });
    }
    const hadPgCookie =
      isPostgresBackend() &&
      Boolean(request.cookies.get(PG_SESSION_COOKIE)?.value);
    return redirectToLogin(request, { clearSessionCookie: hadPgCookie });
  }
}

export const config = {
  matcher: ["/espace-praticien/:path*"],
};
