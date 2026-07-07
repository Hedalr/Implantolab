import { NextResponse, type NextRequest } from "next/server";
import { verifyWhatsAppSignature } from "@/lib/whatsapp/verify";
import {
  extractMessagesFromMetaPayload,
  ingestMessage,
} from "@/lib/labo/ingest";

/**
 * Webhook WhatsApp Business Cloud API.
 *
 *   GET  → verification token (challenge Meta lors de la config du webhook).
 *   POST → réception d'un message entrant. Signature vérifiée en HMAC-SHA256.
 *
 * Docs : https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
 *
 * Ce handler renvoie systématiquement `200 OK` pour les webhooks POST valides
 * afin d'éviter que Meta ne mette la file d'attente en pause en cas d'erreur
 * transitoire. Les erreurs d'ingestion sont loggées, pas propagées.
 */

// Force Node.js runtime (createHmac + Supabase service_role client).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!expected) {
    return NextResponse.json(
      { error: "WHATSAPP_VERIFY_TOKEN non configuré côté serveur." },
      { status: 500 },
    );
  }

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Vérification échouée" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    return NextResponse.json(
      { error: "WHATSAPP_APP_SECRET non configuré côté serveur." },
      { status: 500 },
    );
  }

  if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
    // 401 sans détail : ne pas révéler la logique aux scanneurs.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const messages = extractMessagesFromMetaPayload(payload);

  // Fire-and-forget côté ingestion : on répond 200 rapidement à Meta, on
  // laisse la promise s'exécuter en tâche de fond. On log les erreurs.
  Promise.all(
    messages.map((message) =>
      ingestMessage(message).catch((err) => {
        console.error("[whatsapp-webhook] ingestion failed", err);
      }),
    ),
  );

  return NextResponse.json({ ok: true, received: messages.length });
}
