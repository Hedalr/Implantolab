import { NextRequest, NextResponse } from "next/server";
import { isPostgresBackend } from "@/lib/db/backend";
import { apiSignOut, json } from "@/lib/api/v1/auth";
import { clearPgSessionCookie } from "@/lib/auth/postgres/cookies";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }
  try {
    await apiSignOut(request);
  } catch {
    // Cookie clear ci-dessous même si le delete DB échoue.
  }
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  clearPgSessionCookie(response);
  return response;
}
