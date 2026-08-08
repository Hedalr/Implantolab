import { type NextRequest } from "next/server";
import { setPgSessionCookie } from "@/lib/auth/postgres/cookies";
import { isPostgresBackend } from "@/lib/db/backend";
import { redirectPublic } from "@/lib/http/public-url";
import { acceptInviteTokenPg } from "@/lib/rh/pg";

/**
 * Lien e-mail d’invitation / réactivation (postgres) :
 * vérifie le token, pose le cookie session, redirige vers set-password.
 */
export async function GET(request: NextRequest) {
  if (!isPostgresBackend()) {
    return redirectPublic(
      request,
      "/espace-praticien/login?error=config",
      303,
    );
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return redirectPublic(
      request,
      "/espace-praticien/login?error=invite",
      303,
    );
  }

  const result = await acceptInviteTokenPg(token);
  if (!result.ok) {
    return redirectPublic(
      request,
      result.error === "token-expired"
        ? "/espace-praticien/login?error=invite-expired"
        : "/espace-praticien/login?error=invite",
      303,
    );
  }
  if (!result.data) {
    return redirectPublic(
      request,
      "/espace-praticien/login?error=invite",
      303,
    );
  }

  const response = redirectPublic(
    request,
    "/espace-praticien/set-password",
    303,
  );
  setPgSessionCookie(response, result.data.token);
  return response;
}
