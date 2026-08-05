import { NextResponse } from "next/server";

import { assertBearerSecret } from "@/lib/api/assert-bearer-secret";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { purgeRequestMediaStorage } from "@/lib/requests/purge-request-media";

/**
 * Cron quotidien : purge les objets Storage `request-media` en file d’attente
 * (métadonnées supprimées) et les orphelins détectés.
 *
 * Sécurité : header `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron).
 */
export async function GET(request: Request) {
  const authError = assertBearerSecret(request, "CRON_SECRET");
  if (authError) return authError;

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquante" },
      { status: 500 },
    );
  }

  try {
    const result = await purgeRequestMediaStorage();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/purge-request-media]", error);
    return NextResponse.json(
      { error: "Échec de la purge Storage" },
      { status: 500 },
    );
  }
}
