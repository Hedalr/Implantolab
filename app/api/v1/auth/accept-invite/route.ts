import { NextRequest } from "next/server";
import { json } from "@/lib/api/v1/auth";
import { isPostgresBackend } from "@/lib/db/backend";
import { acceptInviteTokenPg } from "@/lib/rh/pg";

export const runtime = "nodejs";

/** Échange un token d’invitation / reset contre une session bearer. */
export async function POST(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await acceptInviteTokenPg(String(body.token ?? ""));
  if (!result.ok) {
    const status =
      result.error === "token-expired"
        ? 410
        : result.error === "forbidden"
          ? 403
          : 400;
    return json({ error: result.error }, { status });
  }
  if (!result.data) {
    return json({ error: "token-invalid" }, { status: 400 });
  }

  return json({
    token: result.data.token,
    expiresAt: result.data.expiresAt.toISOString(),
    email: result.data.email,
    userId: result.data.userId,
  });
}
