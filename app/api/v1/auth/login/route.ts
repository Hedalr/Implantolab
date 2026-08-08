import { NextRequest } from "next/server";
import { isPostgresBackend } from "@/lib/db/backend";
import {
  apiSignIn,
  getClientIp,
  json,
  profileToJson,
} from "@/lib/api/v1/auth";

export const runtime = "nodejs";

/** POST { email, password } → { token, expiresAt, profile } */
export async function POST(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json(
      {
        error: "postgres_backend_required",
        hint: "Set DATA_BACKEND=postgres for Scalingo-local API.",
      },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return json({ error: "missing_credentials" }, { status: 400 });
  }

  const result = await apiSignIn(email, password, {
    clientIp: getClientIp(request),
  });
  if (!result.ok) {
    const headers: HeadersInit = {};
    if (result.status === 429 && result.retryAfterSec) {
      headers["Retry-After"] = String(result.retryAfterSec);
    }
    return json(
      { error: result.error },
      { status: result.status, headers },
    );
  }

  // Token bearer en JSON = contrat mobile (S14) ; Cache-Control: no-store via json().
  return json({
    token: result.token,
    expiresAt: result.expiresAt.toISOString(),
    profile: profileToJson(result.profile),
  });
}
