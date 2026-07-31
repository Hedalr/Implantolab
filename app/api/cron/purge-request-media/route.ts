import { NextResponse } from "next/server";

import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { purgeRequestMediaStorage } from "@/lib/requests/purge-request-media";

/**
 * Cron quotidien : purge les objets Storage `request-media` en file d’attente
 * (métadonnées supprimées) et les orphelins détectés.
 *
 * Sécurité : header `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET manquant" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
