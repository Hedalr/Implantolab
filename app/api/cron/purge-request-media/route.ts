import { NextResponse } from "next/server";

import { assertBearerSecret } from "@/lib/api/assert-bearer-secret";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { purgeRequestMediaStorage } from "@/lib/requests/purge-request-media";
import { purgeRequestMediaStoragePg } from "@/lib/requests/purge-request-media-pg";
import { isPostgresBackend } from "@/lib/db/backend";
import { purgeStalePushTokens } from "@/lib/push/stale-tokens";

/**
 * Cron quotidien : purge les objets Storage `request-media` en file d’attente
 * (métadonnées supprimées) et les orphelins détectés.
 * Bonus (si `PUSH_TOKEN_TTL_DAYS`) : purge tokens push stale (`updated_at`).
 *
 * Sécurité : header `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron).
 */
export async function GET(request: Request) {
  const authError = assertBearerSecret(request, "CRON_SECRET");
  if (authError) return authError;

  let stalePushDeleted = 0;
  try {
    stalePushDeleted = await purgeStalePushTokens();
  } catch (error) {
    console.error("[cron/purge-request-media] stale push tokens", error);
  }

  if (isPostgresBackend()) {
    try {
      const result = await purgeRequestMediaStoragePg();
      return NextResponse.json({
        ok: true,
        backend: "postgres",
        ...result,
        stalePushDeleted,
      });
    } catch (error) {
      console.error("[cron/purge-request-media] postgres", error);
      return NextResponse.json(
        { error: "Échec de la purge storage local" },
        { status: 500 },
      );
    }
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquante" },
      { status: 500 },
    );
  }

  try {
    const result = await purgeRequestMediaStorage();
    return NextResponse.json({
      ok: true,
      backend: "supabase",
      ...result,
      stalePushDeleted,
    });
  } catch (error) {
    console.error("[cron/purge-request-media]", error);
    return NextResponse.json(
      { error: "Échec de la purge Storage" },
      { status: 500 },
    );
  }
}
