import { NextResponse, type NextRequest } from "next/server";
import {
  destroyPgSessionToken,
  resolvePgSessionFromToken,
} from "@/lib/auth/postgres/session";
import {
  clearPgSessionCookie,
  PG_SESSION_COOKIE,
} from "@/lib/auth/postgres/cookies";

export async function updatePgSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: { id: string; email: string; mustSetPassword: boolean } | null;
}> {
  const token = request.cookies.get(PG_SESSION_COOKIE)?.value;
  const user = await resolvePgSessionFromToken(token);
  const response = NextResponse.next({ request });

  // Token présent mais session invalide (expiré / banned / deleted) :
  // détruit la row DB + retire le cookie (évite un cookie mort qui traîne).
  if (!user && token) {
    try {
      await destroyPgSessionToken(token);
    } catch {
      // Cookie clear ci-dessous même si le delete DB échoue.
    }
    clearPgSessionCookie(response);
  }

  return { response, user };
}
