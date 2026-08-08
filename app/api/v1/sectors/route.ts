import { NextRequest } from "next/server";
import { isPostgresBackend } from "@/lib/db/backend";
import { json, loadProfile, requireApiUser } from "@/lib/api/v1/auth";
import { listLabSectorsPg } from "@/lib/requests/pg";

export const runtime = "nodejs";

/**
 * Liste des secteurs lab (id/name/color) — lecture authentifiée.
 * Aligné RLS `sectors_select_authenticated` ; profil requis (fail-closed).
 */
export async function GET(request: NextRequest) {
  if (!isPostgresBackend()) {
    return json({ error: "postgres_backend_required" }, { status: 503 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;

  const profile = await loadProfile(user.id, user.email);
  if (!profile) return json({ error: "profile_missing" }, { status: 404 });

  return json({ sectors: await listLabSectorsPg() });
}
