import type { NextResponse } from "next/server";

export const PG_SESSION_COOKIE = "il_session";

/**
 * Flags session cookie (web).
 * - HttpOnly : pas d’accès JS (XSS ne lit pas le token).
 * - SameSite=Lax : CSRF de base sur POST cross-site.
 * - Secure en production (HTTPS Scalingo) ; false en local HTTP.
 * - maxAge aligné sur SESSION_TTL_MS (7j) dans session.ts.
 */
export const PG_SESSION_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};

export function setPgSessionCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set(
    PG_SESSION_COOKIE,
    token,
    PG_SESSION_COOKIE_OPTIONS,
  );
}

export function clearPgSessionCookie(response: NextResponse): void {
  response.cookies.set(PG_SESSION_COOKIE, "", {
    ...PG_SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
}
