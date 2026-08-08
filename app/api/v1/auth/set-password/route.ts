import { NextRequest } from "next/server";
import {
  getBearerToken,
  json,
  requireApiUser,
} from "@/lib/api/v1/auth";
import { PG_SESSION_COOKIE } from "@/lib/auth/postgres/cookies";
import { isPostgresBackend } from "@/lib/db/backend";
import { consumeInviteOrResetTokenPg, setPasswordPg } from "@/lib/rh/pg";

export const runtime = "nodejs";

/**
 * Définit le mot de passe :
 * - session bearer / cookie déjà établie (allow password-pending), ou
 * - `token` d’invite/reset dans le body (consomme puis set, sans mint session).
 */
export async function POST(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  let body: { password?: string; confirm?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const password = String(body.password ?? "");
  const confirm = String(body.confirm ?? body.password ?? "");
  const inviteToken = String(body.token ?? "").trim();

  let userId: string;
  let keepSessionToken: string | null = null;

  if (inviteToken) {
    const consumed = await consumeInviteOrResetTokenPg(inviteToken);
    if (!consumed.ok) {
      const status =
        consumed.error === "token-expired"
          ? 410
          : consumed.error === "forbidden"
            ? 403
            : 400;
      return json({ error: consumed.error }, { status });
    }
    if (!consumed.data) {
      return json({ error: "token-invalid" }, { status: 400 });
    }
    userId = consumed.data.userId;
  } else {
    const user = await requireApiUser(request, { allowPasswordPending: true });
    if (user instanceof Response) return user;
    userId = user.id;
    keepSessionToken =
      getBearerToken(request) ??
      request.cookies.get(PG_SESSION_COOKIE)?.value ??
      null;
  }

  const result = await setPasswordPg({
    userId,
    password,
    confirm,
    keepSessionToken,
  });
  if (!result.ok) {
    const status =
      result.error === "password-short" ||
      result.error === "password-weak" ||
      result.error === "password-mismatch"
        ? 400
        : 500;
    return json({ error: result.error }, { status });
  }

  return json({ ok: true });
}
