import { NextResponse, type NextRequest } from "next/server";
import { ingestMessage, type IngestMessageInput } from "@/lib/labo/ingest";
import { requireAdmin } from "@/lib/supabase/server";

/**
 * Endpoint de simulation pour tester l'ingestion sans WhatsApp réel.
 *
 * Accessible uniquement aux admins connectés. Accepte un JSON du type :
 *
 *   {
 *     "from": "+33612345678",
 *     "text": "Bonjour, pour Mme Dupont, couronne 26. Photos ci-jointes.",
 *     "media": [
 *       { "url": "https://.../photo.jpg", "mimeType": "image/jpeg", "caption": "vue occlusale" }
 *     ]
 *   }
 *
 * Chaque `media.url` est téléchargée côté serveur puis stockée dans le bucket
 * `case-media` exactement comme le ferait le webhook Meta.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MockMediaInput = {
  url?: string;
  mimeType?: string;
  filename?: string;
  caption?: string;
};

type MockBody = {
  from?: string;
  text?: string;
  media?: MockMediaInput[];
  messageId?: string;
};

export async function POST(request: NextRequest) {
  await requireAdmin();

  let body: MockBody;
  try {
    body = (await request.json()) as MockBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.from) {
    return NextResponse.json(
      { error: "`from` requis (numéro E.164 ou local FR)." },
      { status: 400 },
    );
  }

  const media: IngestMessageInput["media"] = [];
  for (const m of body.media ?? []) {
    if (!m.url) continue;
    try {
      const res = await fetch(m.url);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      media.push({
        buffer,
        mimeType: m.mimeType ?? res.headers.get("content-type") ?? null,
        filename: m.filename ?? null,
        caption: m.caption ?? null,
      });
    } catch {
      // ignore individual media failure
    }
  }

  const input: IngestMessageInput = {
    whatsappMessageId:
      body.messageId ?? `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: body.from,
    timestamp: null,
    text: body.text ?? null,
    media,
    rawPayload: { source: "mock", body },
  };

  const result = await ingestMessage(input);
  return NextResponse.json({ ok: true, ...result });
}
