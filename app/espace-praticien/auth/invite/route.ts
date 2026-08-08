import { NextResponse, type NextRequest } from "next/server";
import { setPgSessionCookie } from "@/lib/auth/postgres/cookies";
import { isPostgresBackend } from "@/lib/db/backend";
import { acceptInviteTokenPg } from "@/lib/rh/pg";

/**
 * Lien e-mail d’invitation / réactivation (postgres) :
 * vérifie le token, pose le cookie session, redirige vers set-password.
 */
export async function GET(request: NextRequest) {
  if (!isPostgresBackend()) {
    const url = request.nextUrl.clone();
    url.pathname = "/espace-praticien/login";
    url.search = "?error=config";
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/espace-praticien/login";
    url.search = "?error=invite";
    return NextResponse.redirect(url, { status: 303 });
  }

  const result = await acceptInviteTokenPg(token);
  if (!result.ok) {
    const url = request.nextUrl.clone();
    url.pathname = "/espace-praticien/login";
    url.search =
      result.error === "token-expired"
        ? "?error=invite-expired"
        : "?error=invite";
    return NextResponse.redirect(url, { status: 303 });
  }
  if (!result.data) {
    const url = request.nextUrl.clone();
    url.pathname = "/espace-praticien/login";
    url.search = "?error=invite";
    return NextResponse.redirect(url, { status: 303 });
  }

  const dest = request.nextUrl.clone();
  dest.pathname = "/espace-praticien/set-password";
  dest.search = "";
  const response = NextResponse.redirect(dest, { status: 303 });
  setPgSessionCookie(response, result.data.token);
  return response;
}
